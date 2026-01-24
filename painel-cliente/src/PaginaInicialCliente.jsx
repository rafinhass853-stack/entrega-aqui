import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, query, getDocs, doc, getDoc, where 
} from 'firebase/firestore';
import { 
  Search, MapPin, Filter, Home, ClipboardList, User, Calendar, CreditCard, Loader2, LogOut, UserPlus, LogIn
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

  // --- RENDERIZADORES ---
  const renderTelaHome = () => (
    <div style={{...styles.container, paddingBottom: '80px'}}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.logo}><span style={styles.logoBlue}>Entrega</span><span style={styles.logoGreen}>Aqui</span></h1>
          <div style={styles.locationSelector}>
            <MapPin size={18} color="#10B981" />
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
          <Search size={20} color="#10B981" />
          <input type="text" placeholder="Buscar lojas..." style={styles.searchInput} value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={styles.filterButton}><Filter size={20} color="#fff" /></button>
        </div>
        <div style={styles.categoriesContainer}>
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCategoriasAtivas(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
              style={{...styles.categoryButton, backgroundColor: categoriasAtivas.includes(cat.id) ? '#10B981' : '#0F3460'}}>{cat.nome}</button>
          ))}
        </div>
      </header>

      <main style={styles.content}>
        {loading ? (
            <div style={{textAlign: 'center', marginTop: '50px'}}><Loader2 className="animate-spin" size={40} color="#10B981" /></div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map(est => (
              <div key={est.id} style={styles.card} onClick={() => { setEstabelecimentoSelecionado(est); setTelaAtual('cardapio'); }}>
                <div style={styles.cardImage}>
                  {est.fotoUrl ? <img src={est.fotoUrl} style={styles.imagemEstabelecimento} alt="capa" /> : <div style={styles.imagePlaceholder}>{est.cliente[0]}</div>}
                  <div style={{...styles.statusBadge, backgroundColor: est.aberto ? '#10B981' : '#EF4444'}}>{est.aberto ? 'ABERTO' : 'FECHADO'}</div>
                </div>
                <div style={styles.cardBody}>
                  <h3 style={styles.estNome}>{est.cliente}</h3>
                  <p style={styles.estCategoria}>{est.categoria} • {est.endereco.bairro}</p>
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
      <header style={styles.headerSimples}><h2>🛍️ Meus Pedidos</h2></header>
      <div style={{padding: '20px'}}>
        {historicoPedidos.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px'}}>
            <ClipboardList size={48} color="#CBD5E0" style={{marginBottom: '15px'}} />
            <p style={{color: '#718096'}}>Você ainda não fez nenhum pedido.</p>
          </div>
        ) : (
          historicoPedidos.map(p => (
            <div key={p.id} style={{...styles.card, padding: '15px', marginBottom: '15px', borderLeft: '5px solid #10B981'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <strong>{p.estabelecimento?.nome || "Loja"}</strong>
                <span style={{fontSize: '12px', color: '#10B981', fontWeight: 'bold'}}>{p.status?.toUpperCase()}</span>
              </div>
              <p style={{fontSize: '13px', color: '#666', margin: '5px 0'}}>
                {p.itens?.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
              </p>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px'}}>
                <span>Total: R$ {p.pagamento?.total?.toFixed(2)}</span>
                <span style={{color: '#94A3B8'}}>{p.dataCriacao?.toDate().toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderPerfil = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}><h2>👤 Meu Perfil</h2></header>
      <div style={{padding: '20px'}}>
        {dadosCliente ? (
          <div style={styles.formPerfil}>
            <div style={styles.perfilInfoBox}>
              <div style={styles.avatarLarge}>{dadosCliente.nomeCompleto[0]}</div>
              <h3 style={{margin: '10px 0 5px 0'}}>{dadosCliente.nomeCompleto}</h3>
              <p style={{color: '#64748B', fontSize: '14px'}}>{dadosCliente.telefone}</p>
            </div>
            
            <div style={styles.enderecoResumo}>
              <MapPin size={16} />
              <span>{dadosCliente.rua}, {dadosCliente.numero} - {dadosCliente.bairro}</span>
            </div>

            <button onClick={logout} style={styles.btnSecundario}>
              <LogOut size={18} /> Sair da conta
            </button>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <div style={styles.avatarLarge}><User size={40} /></div>
            <h2 style={{color: '#0F3460', marginBottom: '10px'}}>Olá, Visitante!</h2>
            <p style={{color: '#64748B', marginBottom: '30px'}}>Acesse sua conta para ver seus pedidos e facilitar suas compras.</p>
            
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
        return <Cardapio estabelecimento={estabelecimentoSelecionado} carrinho={carrinho} setCarrinho={setCarrinho} onVoltar={() => setTelaAtual('home')} onAbrirCarrinho={() => setTelaAtual('carrinho')} />;
      case 'carrinho': 
        return <Carrinho carrinho={carrinho} onAtualizarQuantidade={atualizarQuantidade} onRemoverItem={removerItem} estabelecimento={estabelecimentoSelecionado} onVoltar={() => setTelaAtual('cardapio')} onIrParaCadastro={navegarParaCheckout} />;
      case 'cadastro': 
        return <Cadastro dadosCliente={dadosCliente} onContinuar={(d) => {setDadosCliente(d); setTelaAtual('perfil');}} onVoltar={() => setTelaAtual('perfil')} />;
      case 'enviar': 
        return <EnviarPedido carrinho={carrinho} estabelecimento={estabelecimentoSelecionado} dadosCliente={dadosCliente} onVoltar={() => setTelaAtual('carrinho')} onSucesso={() => {setCarrinho([]); setTelaAtual('historico');}} />;
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
          <div style={styles.navItem} onClick={() => setTelaAtual('home')}><Home color={telaAtual === 'home' ? '#10B981' : '#94A3B8'} /><span>Início</span></div>
          <div style={styles.navItem} onClick={() => setTelaAtual('historico')}><ClipboardList color={telaAtual === 'historico' ? '#10B981' : '#94A3B8'} /><span>Pedidos</span></div>
          <div style={styles.navItem} onClick={() => setTelaAtual('perfil')}><User color={telaAtual === 'perfil' ? '#10B981' : '#94A3B8'} /><span>Perfil</span></div>
        </nav>
      )}
    </div>
  );
};

const styles = {
    wrapper: { position: 'relative', minHeight: '100vh' },
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
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { backgroundColor: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer' },
    cardImage: { height: '160px', backgroundColor: '#eee', position: 'relative' },
    imagemEstabelecimento: { width: '100%', height: '100%', objectFit: 'cover' },
    imagePlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', color: '#ccc' },
    statusBadge: { position: 'absolute', top: '10px', left: '10px', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 'bold' },
    cardBody: { padding: '15px' },
    estNome: { margin: 0, fontSize: '17px', fontWeight: 'bold' },
    estCategoria: { margin: '0', fontSize: '13px', color: '#718096' },
    estDetails: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4A5568', marginTop: '12px', borderTop: '1px solid #EDF2F7', paddingTop: '10px' },
    bottomNav: { position: 'fixed', bottom: 0, width: '100%', height: '70px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-around', alignItems: 'center', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', borderTop: '1px solid #eee', zIndex: 100 },
    navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', gap: '4px', color: '#94A3B8', cursor: 'pointer' },
    headerSimples: { backgroundColor: '#0F3460', padding: '20px', color: 'white', textAlign: 'center', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' },
    containerInterno: { backgroundColor: '#F8FAFC', minHeight: '100vh' },
    avatarLarge: { width: '80px', height: '80px', borderRadius: '40px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#0F3460', margin: '0 auto', fontWeight: 'bold' },
    perfilInfoBox: { textAlign: 'center', marginBottom: '30px' },
    btnPrincipal: { width: '100%', padding: '16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' },
    btnSecundario: { width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', marginTop: '20px' },
    enderecoResumo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: '#fff', borderRadius: '12px', color: '#4A5568', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }
};

export default PaginaInicialCliente;