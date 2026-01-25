import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, query, getDocs, doc, getDoc, where 
} from 'firebase/firestore';
import { 
  Search, MapPin, Filter, Home, ClipboardList, User, Calendar, CreditCard, Loader2, LogOut, UserPlus, LogIn, X
} from 'lucide-react';
import Cardapio from './Cardapio';
import Carrinho from './Carrinho';
import Cadastro from './Cadastro';
import EnviarPedido from './EnviarPedido';

const categorias = [
  { id: 'lanches', nome: '🍔 Lanches' },
  { id: 'japonesa', nome: '🍣 Japonesa' },
  { id: 'churrasco', nome: '🥩 Churrasco' },
  { id: 'pizza', nome: '🍕 Pizza' },
  { id: 'brasileira', nome: '🥘 Brasileira' },
  { id: 'italiana', nome: '🍝 Italiana' },
  { id: 'saudavel', nome: '🥗 Saudável' },
  { id: 'doces', nome: '🍰 Doces' },
  { id: 'sorvetes', nome: '🍦 Sorvetes' }
];

// Hook para detectar tamanho da tela
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};

const PaginaInicialCliente = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const [telaAtual, setTelaAtual] = useState('home');
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [cidade, setCidade] = useState('Araraquara');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [filtroFreteGratis, setFiltroFreteGratis] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [carrinho, setCarrinho] = useState([]);
  const [dadosCliente, setDadosCliente] = useState(JSON.parse(localStorage.getItem('dadosCliente')) || null);
  const [historicoPedidos, setHistoricoPedidos] = useState([]);

  // --- LÓGICA DE HORÁRIOS ---
  const converterHorarioParaMinutos = useCallback((horarioStr) => {
    if (!horarioStr || typeof horarioStr !== 'string') return 0;
    const [h, m] = horarioStr.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const verificarSeEstaAberto = useCallback((horarioData) => {
    if (!horarioData || !horarioData.aberto) return false;
    const agora = new Date();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const abertura = converterHorarioParaMinutos(horarioData.inicio);
    const fechamento = converterHorarioParaMinutos(horarioData.fim);
    if (fechamento < abertura) return minutosAtuais >= abertura || minutosAtuais <= fechamento;
    return minutosAtuais >= abertura && minutosAtuais <= fechamento;
  }, [converterHorarioParaMinutos]);

  // --- BUSCA DE ESTABELECIMENTOS ---
  useEffect(() => {
    const estabelecimentosRef = collection(db, 'estabelecimentos');
    const q = query(estabelecimentosRef);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const listaPromises = snapshot.docs.map(async (docRef) => {
        const data = docRef.data();
        const id = docRef.id;
        let horarioHojeString = "Horário não definido";
        let abertoAgora = false;
        try {
          const sistemaDocRef = doc(db, 'estabelecimentos', id, 'configuracao', 'sistema');
          const sistemaSnap = await getDoc(sistemaDocRef);
          if (sistemaSnap.exists()) {
            const config = sistemaSnap.data();
            const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
            const hojeNome = diasSemana[new Date().getDay()];
            const horarioHoje = config.horarios?.find(h => h.dia === hojeNome);
            abertoAgora = verificarSeEstaAberto(horarioHoje);
            horarioHojeString = horarioHoje?.aberto ? `${horarioHoje.inicio} às ${horarioHoje.fim}` : "Fechado hoje";
          }
        } catch (e) { console.error(e); }

        return {
          id, ...data,
          cliente: data.loginUsuario || data.cliente || "Loja",
          aberto: abertoAgora,
          textoHorario: horarioHojeString,
          categoria: data.categoria || 'lanches',
          taxaEntrega: data.taxaEntrega || 0,
          tempoEntrega: data.tempoEntrega || 30,
          endereco: { bairro: data.endereco?.bairro || data.bairro || 'Bairro', cidade: data.endereco?.cidade || data.cidade || 'Araraquara' }
        };
      });
      const listaCompleta = await Promise.all(listaPromises);
      setEstabelecimentos(listaCompleta);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [verificarSeEstaAberto]);

  // --- BUSCAR HISTÓRICO ---
  useEffect(() => {
    if (!dadosCliente?.telefone) {
      setHistoricoPedidos([]);
      return;
    }
    const telBusca = String(dadosCliente.telefone);
    const q = query(collection(db, "Pedidos"), where("cliente.telefone", "==", telBusca));
    return onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoricoPedidos(lista.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0)));
    });
  }, [dadosCliente]);

  // --- FILTROS ---
  const estabelecimentosOrdenados = useMemo(() => {
    return estabelecimentos.filter(est => {
      const matchCidade = est.endereco.cidade.toLowerCase() === cidade.toLowerCase();
      const matchPesquisa = est.cliente.toLowerCase().includes(pesquisa.toLowerCase());
      const matchCategoria = categoriasAtivas.length === 0 || categoriasAtivas.includes(est.categoria);
      const matchFrete = !filtroFreteGratis || Number(est.taxaEntrega) === 0;
      const matchAberto = !filtroAbertos || est.aberto;
      return matchCidade && matchPesquisa && matchCategoria && matchFrete && matchAberto;
    });
  }, [estabelecimentos, cidade, pesquisa, categoriasAtivas, filtroFreteGratis, filtroAbertos]);

  // --- FUNÇÕES DE GERENCIAMENTO ---
  const logout = () => {
    localStorage.removeItem('dadosCliente');
    setDadosCliente(null);
    setTelaAtual('home');
  };

  const atualizarQuantidade = (idUnico, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      setCarrinho(prev => prev.filter(item => item.idUnico !== idUnico));
    } else {
      setCarrinho(prev => prev.map(item => 
        item.idUnico === idUnico ? { ...item, quantidade: novaQuantidade } : item
      ));
    }
  };

  const removerItem = (idUnico) => {
    setCarrinho(prev => prev.filter(item => item.idUnico !== idUnico));
  };

  const navegarParaCheckout = () => {
    if (dadosCliente) {
      setTelaAtual('enviar');
    } else {
      setTelaAtual('cadastro');
    }
  };

  // Estilos responsivos
  const styles = {
    wrapper: { 
      position: 'relative', 
      minHeight: '100vh',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto',
      boxShadow: isMobile ? 'none' : '0 0 20px rgba(0,0,0,0.1)'
    },
    container: { 
      backgroundColor: '#F8FAFC', 
      minHeight: '100vh', 
      fontFamily: 'sans-serif',
      paddingBottom: isMobile ? '80px' : '20px'
    },
    header: { 
      backgroundColor: '#0F3460', 
      padding: isMobile ? '15px' : '20px', 
      borderBottomLeftRadius: '20px', 
      borderBottomRightRadius: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerTop: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '15px',
      flexWrap: 'wrap',
      gap: '10px'
    },
    logo: { 
      margin: 0, 
      fontSize: isMobile ? '20px' : '24px',
      whiteSpace: 'nowrap'
    },
    logoBlue: { color: '#fff' },
    logoGreen: { color: '#10B981' },
    locationSelector: { 
      display: 'flex', 
      alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      padding: isMobile ? '4px 8px' : '5px 10px', 
      borderRadius: '10px',
      minWidth: isMobile ? '150px' : 'auto'
    },
    selectCity: { 
      background: 'none', 
      border: 'none', 
      color: '#fff', 
      outline: 'none',
      fontSize: isMobile ? '12px' : '14px',
      width: '100%'
    },
    searchContainer: { 
      display: 'flex', 
      gap: '10px', 
      backgroundColor: '#fff', 
      padding: '10px', 
      borderRadius: '12px',
      alignItems: 'center'
    },
    searchInput: { 
      flex: 1, 
      border: 'none', 
      outline: 'none',
      fontSize: isMobile ? '14px' : '16px',
      padding: '5px'
    },
    filterButton: { 
      backgroundColor: '#10B981', 
      border: 'none', 
      borderRadius: '8px', 
      padding: isMobile ? '6px' : '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    categoriesContainer: { 
      display: 'flex', 
      gap: '10px', 
      overflowX: 'auto', 
      marginTop: '15px', 
      paddingBottom: '5px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    },
    categoryButton: { 
      border: 'none', 
      padding: isMobile ? '6px 12px' : '8px 15px', 
      borderRadius: '15px', 
      color: '#fff', 
      whiteSpace: 'nowrap',
      fontSize: isMobile ? '12px' : '14px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    content: { 
      padding: isMobile ? '15px' : '20px',
      paddingBottom: isMobile ? '100px' : '40px'
    },
    grid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', 
      gap: isMobile ? '15px' : '20px'
    },
    card: { 
      backgroundColor: '#fff', 
      borderRadius: '15px', 
      overflow: 'hidden', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)', 
      cursor: 'pointer',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
      }
    },
    cardImage: { 
      height: isMobile ? '140px' : '160px', 
      backgroundColor: '#eee', 
      position: 'relative',
      overflow: 'hidden'
    },
    imagemEstabelecimento: { 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover',
      transition: 'transform 0.3s',
      '&:hover': {
        transform: 'scale(1.05)'
      }
    },
    imagePlaceholder: { 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: '50px', 
      color: '#ccc' 
    },
    statusBadge: { 
      position: 'absolute', 
      top: '10px', 
      left: '10px', 
      padding: '4px 10px', 
      borderRadius: '6px', 
      color: '#fff', 
      fontSize: '11px', 
      fontWeight: 'bold',
      zIndex: 1
    },
    cardBody: { 
      padding: isMobile ? '12px' : '15px' 
    },
    estNome: { 
      margin: 0, 
      fontSize: isMobile ? '15px' : '17px', 
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    estCategoria: { 
      margin: '0', 
      fontSize: isMobile ? '12px' : '13px', 
      color: '#718096' 
    },
    estDetails: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      fontSize: isMobile ? '12px' : '13px', 
      color: '#4A5568', 
      marginTop: '12px', 
      borderTop: '1px solid #EDF2F7', 
      paddingTop: '10px' 
    },
    bottomNav: { 
      position: 'fixed', 
      bottom: 0, 
      width: isMobile ? '100%' : 'calc(100% - 40px)',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      left: '50%',
      transform: 'translateX(-50%)',
      height: '70px', 
      backgroundColor: 'white', 
      display: 'flex', 
      justifyContent: 'space-around', 
      alignItems: 'center', 
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', 
      borderTop: '1px solid #eee', 
      zIndex: 100,
      borderRadius: isMobile ? '0' : '20px 20px 0 0'
    },
    navItem: { 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      fontSize: isMobile ? '10px' : '12px', 
      gap: '4px', 
      color: '#94A3B8', 
      cursor: 'pointer',
      padding: '10px',
      borderRadius: '8px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#F1F5F9'
      }
    },
    headerSimples: { 
      backgroundColor: '#0F3460', 
      padding: isMobile ? '15px' : '20px', 
      color: 'white', 
      textAlign: 'center', 
      borderBottomLeftRadius: '20px', 
      borderBottomRightRadius: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    containerInterno: { 
      backgroundColor: '#F8FAFC', 
      minHeight: '100vh',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    avatarLarge: { 
      width: isMobile ? '60px' : '80px', 
      height: isMobile ? '60px' : '80px', 
      borderRadius: isMobile ? '30px' : '40px', 
      backgroundColor: '#E2E8F0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: isMobile ? '24px' : '32px', 
      color: '#0F3460', 
      margin: '0 auto', 
      fontWeight: 'bold' 
    },
    perfilInfoBox: { 
      textAlign: 'center', 
      marginBottom: '30px' 
    },
    btnPrincipal: { 
      width: '100%', 
      padding: isMobile ? '14px' : '16px', 
      backgroundColor: '#10B981', 
      color: 'white', 
      border: 'none', 
      borderRadius: '12px', 
      fontWeight: 'bold', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '10px', 
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '16px',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0DA271'
      }
    },
    btnSecundario: { 
      width: '100%', 
      padding: isMobile ? '12px' : '14px', 
      backgroundColor: 'transparent', 
      color: '#EF4444', 
      border: '1px solid #EF4444', 
      borderRadius: '12px', 
      fontWeight: 'bold', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '10px', 
      cursor: 'pointer', 
      marginTop: '20px',
      fontSize: isMobile ? '14px' : '16px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#FEF2F2'
      }
    },
    enderecoResumo: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      padding: isMobile ? '12px' : '15px', 
      backgroundColor: '#fff', 
      borderRadius: '12px', 
      color: '#4A5568', 
      fontSize: isMobile ? '13px' : '14px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      marginBottom: '15px'
    },
    filtrosSidebar: {
      position: 'fixed',
      top: 0,
      right: filtrosAbertos ? '0' : '-100%',
      width: isMobile ? '85%' : '300px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
      zIndex: 1000,
      transition: 'right 0.3s ease',
      padding: '20px',
      overflowY: 'auto'
    },
    filtroHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '1px solid #E2E8F0'
    },
    filtroTitle: {
      margin: 0,
      fontSize: '18px',
      color: '#0F3460'
    },
    filtroOption: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#F8FAFC',
      borderRadius: '10px',
      cursor: 'pointer'
    }
  };

  const renderTelaHome = () => (
    <div style={{...styles.container}}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.logo}><span style={styles.logoBlue}>Entrega</span><span style={styles.logoGreen}>Aqui</span></h1>
          <div style={styles.locationSelector}>
            <MapPin size={isMobile ? 16 : 18} color="#10B981" />
            <select value={cidade} onChange={(e) => setCidade(e.target.value)} style={styles.selectCity}>
              <option value="Araraquara">Araraquara, SP</option>
              <option value="São Carlos">São Carlos, SP</option>
              <option value="São Simão">São Simão, SP</option>
              <option value="Ribeirão Preto">Ribeirão Preto, SP</option>
              <option value="Mogi Guaçu">Mogi Guaçu, SP</option>
              <option value="Mogi Mirim">Mogi Mirim, SP</option>
              <option value="Campinas">Campinas, SP</option>
              <option value="Poços de Caldas">Poços de Caldas, MG</option>
            </select>
          </div>
        </div>
        <div style={styles.searchContainer}>
          <Search size={isMobile ? 18 : 20} color="#10B981" />
          <input type="text" placeholder="Buscar lojas..." style={styles.searchInput} value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={styles.filterButton}>
            <Filter size={isMobile ? 18 : 20} color="#fff" />
          </button>
        </div>
        <div style={styles.categoriesContainer}>
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCategoriasAtivas(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
              style={{...styles.categoryButton, backgroundColor: categoriasAtivas.includes(cat.id) ? '#10B981' : '#0F3460'}}>
              {cat.nome}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros Sidebar */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}>Filtros</h3>
          <button onClick={() => setFiltrosAbertos(false)} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            <X size={24} color="#666" />
          </button>
        </div>
        
        <div style={styles.filtroOption} onClick={() => setFiltroFreteGratis(!filtroFreteGratis)}>
          <span>🚚 Frete Grátis</span>
          <input type="checkbox" checked={filtroFreteGratis} readOnly style={{transform: 'scale(1.2)'}} />
        </div>
        
        <div style={styles.filtroOption} onClick={() => setFiltroAbertos(!filtroAbertos)}>
          <span>🟢 Aberto Agora</span>
          <input type="checkbox" checked={filtroAbertos} readOnly style={{transform: 'scale(1.2)'}} />
        </div>
        
        <div style={{marginTop: '20px', padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '10px'}}>
          <p style={{margin: 0, fontSize: '12px', color: '#065F46'}}>
            {estabelecimentosOrdenados.length} estabelecimento(s) encontrado(s)
          </p>
        </div>
      </div>
      {filtrosAbertos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: isMobile ? 'block' : 'none'
        }} onClick={() => setFiltrosAbertos(false)} />
      )}

      <main style={styles.content}>
        {loading ? (
            <div style={{textAlign: 'center', marginTop: '50px'}}>
              <Loader2 className="animate-spin" size={isMobile ? 30 : 40} color="#10B981" />
              <p style={{color: '#64748B', marginTop: '10px'}}>Carregando estabelecimentos...</p>
            </div>
        ) : estabelecimentosOrdenados.length === 0 ? (
          <div style={{textAlign: 'center', marginTop: '50px', padding: '20px'}}>
            <Search size={48} color="#CBD5E1" />
            <h3 style={{color: '#0F3460', marginTop: '15px'}}>Nenhum estabelecimento encontrado</h3>
            <p style={{color: '#64748B'}}>Tente ajustar os filtros ou buscar outra cidade</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map(est => (
              <div key={est.id} style={styles.card} onClick={() => { setEstabelecimentoSelecionado(est); setTelaAtual('cardapio'); }}>
                <div style={styles.cardImage}>
                  {est.fotoUrl ? 
                    <img src={est.fotoUrl} style={styles.imagemEstabelecimento} alt={est.cliente} /> : 
                    <div style={styles.imagePlaceholder}>{est.cliente[0]}</div>
                  }
                  <div style={{...styles.statusBadge, backgroundColor: est.aberto ? '#10B981' : '#EF4444'}}>
                    {est.aberto ? 'ABERTO' : 'FECHADO'}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}>
                    {est.textoHorario}
                  </div>
                </div>
                <div style={styles.cardBody}>
                  <h3 style={styles.estNome}>{est.cliente}</h3>
                  <p style={styles.estCategoria}>
                    {est.categoria} • {est.endereco.bairro}
                  </p>
                  <div style={styles.estDetails}>
                    <span>🚀 {est.tempoEntrega} min</span>
                    <span style={{ color: Number(est.taxaEntrega) === 0 ? '#10B981' : '#666', fontWeight: 'bold' }}>
                      {Number(est.taxaEntrega) === 0 ? 'Frete Grátis' : `R$ ${Number(est.taxaEntrega).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderHistorico = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}>
        <h2 style={{margin: 0, fontSize: isMobile ? '18px' : '20px'}}>🛍️ Meus Pedidos</h2>
        <p style={{margin: '5px 0 0 0', fontSize: '12px', opacity: 0.8}}>Histórico de todos os seus pedidos</p>
      </header>
      <div style={{padding: isMobile ? '15px' : '20px'}}>
        {historicoPedidos.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <ClipboardList size={isMobile ? 40 : 48} color="#CBD5E0" style={{marginBottom: '15px'}} />
            <h3 style={{color: '#0F3460', marginBottom: '10px'}}>Nenhum pedido ainda</h3>
            <p style={{color: '#718096', marginBottom: '20px'}}>Faça seu primeiro pedido!</p>
            <button onClick={() => setTelaAtual('home')} style={styles.btnPrincipal}>
              Explorar Estabelecimentos
            </button>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {historicoPedidos.map(p => {
              const statusColors = {
                pendente: '#F59E0B',
                preparo: '#3B82F6',
                entrega: '#8B5CF6',
                entregue: '#10B981',
                cancelado: '#EF4444'
              };
              
              return (
                <div key={p.id} style={{
                  backgroundColor: 'white',
                  padding: isMobile ? '12px' : '15px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  borderLeft: `5px solid ${statusColors[p.status] || '#CBD5E0'}`
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px'}}>
                        <strong style={{fontSize: isMobile ? '14px' : '16px'}}>
                          {p.restauranteNome || p.estabelecimento?.nome || "Loja"}
                        </strong>
                        <span style={{
                          fontSize: '10px',
                          color: statusColors[p.status] || '#666',
                          fontWeight: 'bold',
                          backgroundColor: `${statusColors[p.status]}15`,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {p.status?.toUpperCase()}
                        </span>
                      </div>
                      <p style={{fontSize: isMobile ? '12px' : '13px', color: '#666', margin: '5px 0'}}>
                        {p.itens?.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                      </p>
                    </div>
                    <span style={{
                      fontSize: isMobile ? '14px' : '16px',
                      fontWeight: 'bold',
                      color: '#10B981'
                    }}>
                      R$ {p.pagamento?.total?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#94A3B8',
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: '10px'
                  }}>
                    <span>#{p.numeroPedido || p.id.slice(-6)}</span>
                    <span>{p.dataCriacao?.toDate().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPerfil = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}>
        <h2 style={{margin: 0, fontSize: isMobile ? '18px' : '20px'}}>👤 Meu Perfil</h2>
        <p style={{margin: '5px 0 0 0', fontSize: '12px', opacity: 0.8}}>Gerencie sua conta e endereço</p>
      </header>
      <div style={{padding: isMobile ? '15px' : '20px'}}>
        {dadosCliente ? (
          <div style={styles.formPerfil}>
            <div style={styles.perfilInfoBox}>
              <div style={styles.avatarLarge}>{dadosCliente.nomeCompleto[0]}</div>
              <h3 style={{margin: '10px 0 5px 0', fontSize: isMobile ? '18px' : '20px'}}>{dadosCliente.nomeCompleto}</h3>
              <p style={{color: '#64748B', fontSize: isMobile ? '13px' : '14px'}}>{dadosCliente.telefone}</p>
            </div>
            
            <div style={styles.enderecoResumo}>
              <MapPin size={isMobile ? 14 : 16} color="#10B981" />
              <div style={{flex: 1}}>
                <div style={{fontWeight: 'bold', color: '#0F3460'}}>Endereço Principal</div>
                <div style={{fontSize: isMobile ? '12px' : '13px'}}>
                  {dadosCliente.rua}, {dadosCliente.numero} - {dadosCliente.bairro}
                </div>
                {dadosCliente.complemento && (
                  <div style={{fontSize: '12px', color: '#64748B', marginTop: '2px'}}>
                    {dadosCliente.complemento}
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setTelaAtual('cadastro')} style={styles.btnPrincipal}>
              <User size={18} /> Editar Cadastro
            </button>

            <button onClick={logout} style={styles.btnSecundario}>
              <LogOut size={18} /> Sair da conta
            </button>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <div style={styles.avatarLarge}><User size={isMobile ? 30 : 40} /></div>
            <h2 style={{color: '#0F3460', marginBottom: '10px', fontSize: isMobile ? '18px' : '24px'}}>Olá, Visitante!</h2>
            <p style={{color: '#64748B', marginBottom: '30px', fontSize: isMobile ? '14px' : '16px'}}>
              Acesse sua conta para ver seus pedidos e facilitar suas compras.
            </p>
            
            <button onClick={() => setTelaAtual('cadastro')} style={styles.btnPrincipal}>
              <LogIn size={18} /> Entrar ou Cadastrar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderConteudo = () => {
    switch (telaAtual) {
      case 'cardapio': 
        return <Cardapio 
          estabelecimento={estabelecimentoSelecionado} 
          carrinho={carrinho} 
          setCarrinho={setCarrinho} 
          onVoltar={() => setTelaAtual('home')} 
          onAbrirCarrinho={() => setTelaAtual('carrinho')} 
        />;
      case 'carrinho':
  return (
    <Carrinho
      carrinho={carrinho}
      setCarrinho={setCarrinho}   // ✅ ADICIONE ISSO
      onAtualizarQuantidade={atualizarQuantidade}
      onRemoverItem={removerItem}
      estabelecimento={estabelecimentoSelecionado}
      onVoltar={() => setTelaAtual('cardapio')}
      onIrParaCadastro={navegarParaCheckout}
    />
  );

      case 'cadastro': 
        return <Cadastro 
          dadosCliente={dadosCliente} 
          onContinuar={(d) => {setDadosCliente(d); setTelaAtual('perfil');}} 
          onVoltar={() => setTelaAtual('perfil')} 
        />;
      case 'enviar': 
        return <EnviarPedido 
          carrinho={carrinho} 
          estabelecimento={estabelecimentoSelecionado} 
          dadosCliente={dadosCliente} 
          onVoltar={() => setTelaAtual('carrinho')} 
          onSucesso={() => {setCarrinho([]); setTelaAtual('historico');}} 
        />;
      case 'historico': 
        return renderHistorico();
      case 'perfil': 
        return renderPerfil();
      default: 
        return renderTelaHome();
    }
  };

  return (
    <div style={styles.wrapper}>
      {renderConteudo()}
      {['home', 'historico', 'perfil'].includes(telaAtual) && (
        <nav style={styles.bottomNav}>
          <div style={styles.navItem} onClick={() => setTelaAtual('home')}>
            <Home size={isMobile ? 20 : 24} color={telaAtual === 'home' ? '#10B981' : '#94A3B8'} />
            <span style={{color: telaAtual === 'home' ? '#10B981' : '#94A3B8'}}>Início</span>
          </div>
          <div style={styles.navItem} onClick={() => setTelaAtual('historico')}>
            <ClipboardList size={isMobile ? 20 : 24} color={telaAtual === 'historico' ? '#10B981' : '#94A3B8'} />
            <span style={{color: telaAtual === 'historico' ? '#10B981' : '#94A3B8'}}>Pedidos</span>
          </div>
          <div style={styles.navItem} onClick={() => setTelaAtual('perfil')}>
            <User size={isMobile ? 20 : 24} color={telaAtual === 'perfil' ? '#10B981' : '#94A3B8'} />
            <span style={{color: telaAtual === 'perfil' ? '#10B981' : '#94A3B8'}}>Perfil</span>
          </div>
        </nav>
      )}
    </div>
  );
};

export default PaginaInicialCliente;