import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, query, getDocs, doc, getDoc 
} from 'firebase/firestore';
import { 
  Search, Star, MapPin, Clock, 
  Filter, Tag
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

const PaginaInicialCliente = () => {
  const [telaAtual, setTelaAtual] = useState('home');
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [cidade, setCidade] = useState('Araraquara');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [ordenacao, setOrdenacao] = useState('relevancia');
  const [filtroFreteGratis, setFiltroFreteGratis] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [carrinho, setCarrinho] = useState([]);
  const [dadosCliente, setDadosCliente] = useState(null);

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
    
    // Suporte para horários que passam da meia-noite (ex: 18:00 às 02:00)
    if (fechamento < abertura) {
        return minutosAtuais >= abertura || minutosAtuais <= fechamento;
    }
    
    return minutosAtuais >= abertura && minutosAtuais <= fechamento;
  }, [converterHorarioParaMinutos]);

  useEffect(() => {
    const estabelecimentosRef = collection(db, 'estabelecimentos');
    const q = query(estabelecimentosRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const listaPromises = snapshot.docs.map(async (docRef) => {
        const data = docRef.data();
        const id = docRef.id;

        // 1. BUSCAR HORÁRIOS (configuracao -> sistema)
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
            
            if (horarioHoje?.aberto) {
                horarioHojeString = `${horarioHoje.inicio} às ${horarioHoje.fim}`;
            } else {
                horarioHojeString = "Fechado hoje";
            }
          }
        } catch (e) { console.error("Erro ao buscar horários:", e); }

        // 2. BUSCAR QTD ITENS NO CARDÁPIO
        let qtdItens = 0;
        try {
          const cardapioRef = collection(db, 'estabelecimentos', id, 'cardapio');
          const cardapioSnap = await getDocs(cardapioRef);
          qtdItens = cardapioSnap.size;
        } catch (e) { console.error("Erro cardapio:", e); }

        return {
          id,
          ...data,
          // Ajustado para 'loginUsuario' conforme seu print do Firestore
          cliente: data.loginUsuario || data.cliente || "Loja",
          fotoUrl: data.fotoUrl || null, // Foto na raiz do doc
          aberto: abertoAgora,
          textoHorario: horarioHojeString,
          quantidadeItensCardapio: qtdItens,
          categoria: data.categoria || 'lanches',
          taxaEntrega: data.taxaEntrega || 0,
          tempoEntrega: data.tempoEntrega || 30,
          avaliacao: data.avaliacao || 5.0,
          endereco: {
            bairro: data.endereco?.bairro || data.bairro || 'Bairro',
            cidade: data.endereco?.cidade || data.cidade || 'Araraquara'
          }
        };
      });

      const listaCompleta = await Promise.all(listaPromises);
      setEstabelecimentos(listaCompleta);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [verificarSeEstaAberto]);

  // --- FILTROS ---
  const estabelecimentosOrdenados = useMemo(() => {
    return estabelecimentos
      .filter(est => {
        const matchCidade = est.endereco.cidade.toLowerCase() === cidade.toLowerCase();
        const matchPesquisa = est.cliente.toLowerCase().includes(pesquisa.toLowerCase());
        const matchCategoria = categoriasAtivas.length === 0 || categoriasAtivas.includes(est.categoria);
        const matchFrete = !filtroFreteGratis || Number(est.taxaEntrega) === 0;
        const matchAberto = !filtroAbertos || est.aberto;
        
        return matchCidade && matchPesquisa && matchCategoria && matchFrete && matchAberto;
      });
  }, [estabelecimentos, cidade, pesquisa, categoriasAtivas, filtroFreteGratis, filtroAbertos]);

  const handleSelecionarEstabelecimento = (est) => {
    setEstabelecimentoSelecionado(est);
    setTelaAtual('cardapio');
  };

  const renderTelaHome = () => (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.logo}><span style={styles.logoBlue}>Entrega</span><span style={styles.logoGreen}>Aqui</span></h1>
          <div style={styles.locationSelector}>
            <MapPin size={18} color="#10B981" />
            <select value={cidade} onChange={(e) => setCidade(e.target.value)} style={styles.selectCity}>
              <option value="Araraquara">Araraquara, SP</option>
              <option value="São Carlos">São Carlos, SP</option>
            </select>
          </div>
        </div>

        <div style={styles.searchContainer}>
          <Search size={20} color="#10B981" />
          <input 
            type="text" 
            placeholder="Buscar lojas ou pratos..."
            style={styles.searchInput}
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={styles.filterButton}>
            <Filter size={20} color="#fff" />
          </button>
        </div>

        <div style={styles.categoriesContainer}>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriasAtivas(prev => 
                prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
              )}
              style={{
                ...styles.categoryButton,
                backgroundColor: categoriasAtivas.includes(cat.id) ? '#10B981' : '#0F3460'
              }}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </header>

      {filtrosAbertos && (
        <div style={styles.filtersPanel}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <input type="checkbox" checked={filtroFreteGratis} onChange={(e) => setFiltroFreteGratis(e.target.checked)} />
              <span> Frete Grátis</span>
            </label>
            <label style={styles.filterLabel}>
              <input type="checkbox" checked={filtroAbertos} onChange={(e) => setFiltroAbertos(e.target.checked)} />
              <span> Aberto Agora</span>
            </label>
          </div>
        </div>
      )}

      <main style={styles.content}>
        <h2 style={styles.sectionTitle}>Lojas em {cidade} ({estabelecimentosOrdenados.length})</h2>
        
        {loading ? (
          <div style={styles.loadingState}>Carregando lojas...</div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map(est => (
              <div key={est.id} style={styles.card} onClick={() => handleSelecionarEstabelecimento(est)}>
                <div style={styles.cardImage}>
                   {est.fotoUrl ? (
                     <img src={est.fotoUrl} style={styles.imagemEstabelecimento} alt="capa" />
                   ) : (
                     <div style={styles.imagePlaceholder}>{est.cliente[0]}</div>
                   )}
                   
                   {/* Badge de Aberto/Fechado */}
                   <div style={{
                     ...styles.statusBadge,
                     backgroundColor: est.aberto ? '#10B981' : '#EF4444'
                   }}>
                     {est.aberto ? 'ABERTO' : 'FECHADO'}
                   </div>
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.cardHeaderInfo}>
                    <h3 style={styles.estNome}>{est.cliente}</h3>
                    <div style={styles.rating}>
                      <Star size={14} fill="#FBBF24" color="#FBBF24" /> 
                      <span>{est.avaliacao}</span>
                    </div>
                  </div>

                  <p style={styles.estCategoria}>{est.categoria} • {est.endereco.bairro}</p>
                  
                  <div style={styles.horarioInfo}>
                    <Clock size={12} />
                    <span>{est.textoHorario}</span>
                  </div>

                  <div style={styles.estDetails}>
                    <span>🚀 {est.tempoEntrega} min</span>
                    <span>•</span>
                    <span style={{ color: Number(est.taxaEntrega) === 0 ? '#10B981' : '#666', fontWeight: 'bold' }}>
                      {Number(est.taxaEntrega) === 0 ? 'Frete Grátis' : `Entrega: R$ ${Number(est.taxaEntrega).toFixed(2)}`}
                    </span>
                    <span style={styles.cardapioBadge}><Tag size={12} /> {est.quantidadeItensCardapio} itens</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderTela = () => {
    switch (telaAtual) {
      case 'cardapio': return <Cardapio estabelecimento={estabelecimentoSelecionado} onVoltar={() => setTelaAtual('home')} onAbrirCarrinho={(c) => {setCarrinho(c); setTelaAtual('carrinho');}} />;
      case 'carrinho': return <Carrinho carrinho={carrinho} estabelecimento={estabelecimentoSelecionado} onVoltar={() => setTelaAtual('cardapio')} onContinuar={() => setTelaAtual('cadastro')} />;
      case 'cadastro': return <Cadastro onContinuar={(d) => {setDadosCliente(d); setTelaAtual('enviar');}} onVoltar={() => setTelaAtual('carrinho')} />;
      case 'enviar': return <EnviarPedido carrinho={carrinho} estabelecimento={estabelecimentoSelecionado} dadosCliente={dadosCliente} onVoltar={() => setTelaAtual('cadastro')} onSucesso={() => setTelaAtual('home')} />;
      default: return renderTelaHome();
    }
  };

  return renderTela();
};

const styles = {
  container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { backgroundColor: '#0F3460', padding: '20px', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  logo: { margin: 0, fontSize: '24px' },
  logoBlue: { color: '#fff' },
  logoGreen: { color: '#10B981' },
  locationSelector: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '10px' },
  selectCity: { background: 'none', border: 'none', color: '#fff', outline: 'none' },
  searchContainer: { display: 'flex', gap: '10px', backgroundColor: '#fff', padding: '10px', borderRadius: '12px' },
  searchInput: { flex: 1, border: 'none', outline: 'none' },
  filterButton: { backgroundColor: '#10B981', border: 'none', borderRadius: '8px', padding: '5px' },
  categoriesContainer: { display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '15px', paddingBottom: '5px' },
  categoryButton: { border: 'none', padding: '8px 15px', borderRadius: '15px', color: '#fff', whiteSpace: 'nowrap' },
  content: { padding: '20px' },
  sectionTitle: { fontSize: '18px', color: '#0F3460', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s' },
  cardImage: { height: '160px', backgroundColor: '#eee', position: 'relative' },
  imagemEstabelecimento: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', color: '#ccc', fontWeight: 'bold' },
  statusBadge: { position: 'absolute', top: '10px', left: '10px', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
  cardBody: { padding: '15px' },
  cardHeaderInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
  estNome: { margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#1A202C' },
  rating: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#FBBF24', fontWeight: 'bold' },
  estCategoria: { margin: '0', fontSize: '13px', color: '#718096' },
  horarioInfo: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4A5568', margin: '8px 0' },
  estDetails: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4A5568', marginTop: '12px', borderTop: '1px solid #EDF2F7', paddingTop: '10px' },
  cardapioBadge: { marginLeft: 'auto', fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' },
  filtersPanel: { padding: '10px 20px', backgroundColor: '#fff', margin: '10px', borderRadius: '8px' },
  filterLabel: { marginRight: '20px', fontSize: '14px', color: '#4A5568', cursor: 'pointer' },
  loadingState: { padding: '60px', textAlign: 'center', color: '#718096' }
};

export default PaginaInicialCliente;