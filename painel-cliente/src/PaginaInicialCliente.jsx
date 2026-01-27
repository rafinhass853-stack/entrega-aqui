// PaginaInicialCliente.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, onSnapshot, query, doc, getDoc, where
} from 'firebase/firestore';
import {
  Search, MapPin, Filter, Home, ClipboardList, User, Calendar,
  ShoppingBag, Clock, Truck, Shield, Heart, Package, Star, X, ChevronRight, LogOut, LogIn
} from 'lucide-react';
import Cardapio from './Cardapio';
import Carrinho from './Carrinho';
import Cadastro from './Cadastro';
import EnviarPedido from './EnviarPedido';

const categorias = [
  { id: 'lanches', nome: '🍔 Lanches', icon: '🍔' },
  { id: 'japonesa', nome: '🍣 Japonesa', icon: '🍣' },
  { id: 'churrasco', nome: '🥩 Churrasco', icon: '🥩' },
  { id: 'pizza', nome: '🍕 Pizza', icon: '🍕' },
  { id: 'brasileira', nome: '🥘 Brasileira', icon: '🥘' },
  { id: 'italiana', nome: '🍝 Italiana', icon: '🍝' },
  { id: 'saudavel', nome: '🥗 Saudável', icon: '🥗' },
  { id: 'doces', nome: '🍰 Doces', icon: '🍰' },
  { id: 'sorvetes', nome: '🍦 Sorvetes', icon: '🍦' }
];

// Hook para detectar tamanho da tela
const useMediaQuery = (queryStr) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(queryStr);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, queryStr]);

  return matches;
};

// Componente de Card de Estabelecimento
const EstabelecimentoCard = ({ estabelecimento, onClick, isMobile, isTablet }) => {
  const [favorito, setFavorito] = useState(false);

  const styles = {
    card: {
      backgroundColor: '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative'
    },
    cardImage: {
      height: isMobile ? '160px' : '180px',
      position: 'relative',
      overflow: 'hidden'
    },
    imagemEstabelecimento: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'transform 0.5s ease'
    },
    imagePlaceholder: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '60px',
      color: '#E2E8F0',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    statusBadge: {
      position: 'absolute',
      top: '12px',
      left: '12px',
      padding: '6px 14px',
      borderRadius: '20px',
      color: '#fff',
      fontSize: '11px',
      fontWeight: '900',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)'
    },
    favoritoButton: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      background: 'rgba(255,255,255,0.9)',
      border: 'none',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 1,
      transition: 'all 0.2s ease'
    },
    overlayInfo: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      color: 'white',
      padding: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardBody: {
      padding: isMobile ? '16px' : '20px'
    },
    estNome: {
      margin: 0,
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: '900',
      color: '#0F3460',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    estCategoria: {
      margin: '6px 0 0 0',
      fontSize: isMobile ? '12px' : '13px',
      color: '#718096',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    ratingContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginTop: '8px'
    },
    estDetails: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: isMobile ? '12px' : '13px',
      color: '#4A5568',
      marginTop: '16px',
      borderTop: '1px solid #EDF2F7',
      paddingTop: '12px'
    },
    infoTag: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      background: '#F7FAFC',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600'
    }
  };

  const rating = useMemo(() => (Math.random() * 1 + 4).toFixed(1), []);

  const nomeLoja = String(estabelecimento?.cliente || 'Loja');
  const primeiraLetra = nomeLoja?.[0] ? nomeLoja[0] : 'L';

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardImage}>
        {estabelecimento?.fotoUrl ? (
          <img
            src={estabelecimento.fotoUrl}
            style={styles.imagemEstabelecimento}
            alt={nomeLoja}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <div style={styles.imagePlaceholder}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px'
              }}
            >
              {primeiraLetra}
            </div>
          </div>
        )}

        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: estabelecimento?.aberto ? '#10B981' : '#EF4444'
          }}
        >
          {estabelecimento?.aberto ? '🟢 ABERTO' : '🔴 FECHADO'}
        </div>

        <button
          style={styles.favoritoButton}
          onClick={(e) => {
            e.stopPropagation();
            setFavorito(!favorito);
          }}
        >
          <Heart
            size={18}
            color={favorito ? '#EF4444' : '#CBD5E0'}
            fill={favorito ? '#EF4444' : 'none'}
          />
        </button>

        <div style={styles.overlayInfo}>
          <div style={{ fontSize: '11px', fontWeight: '600' }}>
            {estabelecimento?.textoHorario || 'Horário não definido'}
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '700',
              backdropFilter: 'blur(10px)'
            }}
          >
            🚀 {estabelecimento?.tempoEntrega ?? 30} min
          </div>
        </div>
      </div>

      <div style={styles.cardBody}>
        <h3 style={styles.estNome}>
          {nomeLoja}
          <ChevronRight size={18} color="#CBD5E0" />
        </h3>

        <p style={styles.estCategoria}>
          <span
            style={{
              background: '#F1F5F9',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            {estabelecimento?.categoria || 'lanches'}
          </span>
          <span>•</span>
          <MapPin size={12} />
          {estabelecimento?.endereco?.bairro || 'Bairro'}
        </p>

        <div style={styles.ratingContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                fill={star <= Math.floor(Number(rating)) ? '#FBBF24' : '#E2E8F0'}
                color={star <= Math.floor(Number(rating)) ? '#FBBF24' : '#E2E8F0'}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#4A5568', marginLeft: '4px' }}>
            {rating}
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>(150+)</span>
        </div>

        <div style={styles.estDetails}>
          <div style={styles.infoTag}>
            <Package size={12} />
            {estabelecimento?.endereco?.cidade || 'Cidade'}
          </div>

          <div
            style={{
              ...styles.infoTag,
              background: Number(estabelecimento?.taxaEntrega) === 0 ? '#D1FAE5' : '#F1F5F9',
              color: Number(estabelecimento?.taxaEntrega) === 0 ? '#065F46' : '#4A5568'
            }}
          >
            <Truck size={12} />
            {Number(estabelecimento?.taxaEntrega) === 0
              ? '📍 Consulte o frete pelo seu bairro'
              : `R$ ${Number(estabelecimento?.taxaEntrega || 0).toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
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

  const getDadosClienteStorage = () => {
    try {
      const raw = localStorage.getItem('dadosCliente');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      localStorage.removeItem('dadosCliente');
      return null;
    }
  };

  const [dadosCliente, setDadosCliente] = useState(getDadosClienteStorage);
  const [historicoPedidos, setHistoricoPedidos] = useState([]);
  const [filtroOrdenacao, setFiltroOrdenacao] = useState('relevancia');

  // ✅ NOVA LÓGICA DE HORÁRIOS (agora vem da subcoleção: estabelecimentos/{id}/config/horario)
  const diasSemana = useMemo(
    () => ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    []
  );

  const converterHorarioParaMinutos = useCallback((horarioStr) => {
    if (!horarioStr || typeof horarioStr !== 'string') return null;
    const [h, m] = horarioStr.split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }, []);

  const getHojeNome = useCallback(() => {
    return diasSemana[new Date().getDay()];
  }, [diasSemana]);

  const montarTextoHorarioHoje = useCallback((horarioFuncionamento) => {
    const hoje = getHojeNome();
    const diaObj = horarioFuncionamento?.[hoje];
    const abre = diaObj?.abre;
    const fecha = diaObj?.fecha;

    if (!abre || !fecha) return 'Horário não definido';
    if (abre === fecha) return 'Fechado hoje';
    return `${abre} às ${fecha}`;
  }, [getHojeNome]);

  const verificarAbertoAgora = useCallback((horarioFuncionamento) => {
    const hoje = getHojeNome();
    const diaObj = horarioFuncionamento?.[hoje];
    const abreStr = diaObj?.abre;
    const fechaStr = diaObj?.fecha;

    if (!abreStr || !fechaStr) return false;
    if (abreStr === fechaStr) return false;

    const abertura = converterHorarioParaMinutos(abreStr);
    const fechamento = converterHorarioParaMinutos(fechaStr);
    if (abertura == null || fechamento == null) return false;

    const agora = new Date();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    // fecha no dia seguinte (ex: 18:00 -> 02:00)
    if (fechamento < abertura) {
      return minutosAtuais >= abertura || minutosAtuais <= fechamento;
    }
    return minutosAtuais >= abertura && minutosAtuais <= fechamento;
  }, [converterHorarioParaMinutos, getHojeNome]);

  // --- BUSCA DE ESTABELECIMENTOS ---
  useEffect(() => {
    const estabelecimentosRef = collection(db, 'estabelecimentos');
    const q = query(estabelecimentosRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const listaPromises = snapshot.docs.map(async (docRef) => {
          const data = docRef.data();
          const id = docRef.id;

          let horarioFuncionamento = null;
          let textoHorario = 'Horário não definido';
          let abertoAgora = false;

          // Tempo de entrega simulado (você pode deixar igual)
          let tempoEntregaMin = 30;

          // Taxa: mantém sua regra atual
          let taxaEntregaCalculada = data.taxaEntrega ?? 0;

          // ✅ Buscar horário na NOVA subcoleção:
          // estabelecimentos/{id}/config/horario  -> { horarioFuncionamento: {...} }
          try {
            const horarioRef = doc(db, 'estabelecimentos', id, 'config', 'horario');
            const horarioSnap = await getDoc(horarioRef);

            if (horarioSnap.exists()) {
              const hData = horarioSnap.data();
              horarioFuncionamento = hData?.horarioFuncionamento || null;
              textoHorario = montarTextoHorarioHoje(horarioFuncionamento);
              abertoAgora = verificarAbertoAgora(horarioFuncionamento);

              const hora = new Date().getHours();
              if (hora >= 18 && hora <= 22) tempoEntregaMin = 45;
              else if (hora >= 11 && hora <= 14) tempoEntregaMin = 40;
              else tempoEntregaMin = 30;
            } else {
              // sem config -> fechado
              abertoAgora = false;
              textoHorario = 'Horário não definido';
            }
          } catch (e) {
            console.error('Erro ao ler horário:', e);
            abertoAgora = false;
            textoHorario = 'Horário não definido';
          }

          // Mantém sua lógica de taxa por faixas (se taxaEntregaCalculada = 0)
          try {
            if (taxaEntregaCalculada === 0) {
              const entregaDocRef = doc(db, 'estabelecimentos', id, 'configuracao', 'entrega');
              const entregaSnap = await getDoc(entregaDocRef);
              if (entregaSnap.exists()) {
                const entregaConfig = entregaSnap.data();
                const faixas = Array.isArray(entregaConfig?.faixas) ? entregaConfig.faixas : [];
                const faixaOrdenada = [...faixas].sort((a, b) => Number(a.ate || 0) - Number(b.ate || 0));
                taxaEntregaCalculada = Number(faixaOrdenada?.[0]?.valor ?? taxaEntregaCalculada ?? 0);
              }
            }
          } catch (e) {
            console.error('Erro ao calcular taxa:', e);
          }

          const enderecoData = data.endereco && typeof data.endereco === 'object' ? data.endereco : {};

          return {
            id,
            ...data,
            cliente: data.loginUsuario || data.cliente || 'Loja',
            categoria: data.categoria || 'lanches',
            endereco: {
              bairro: enderecoData.bairro || data.bairro || 'Bairro',
              cidade: enderecoData.cidade || data.cidade || 'Araraquara',
              rua: enderecoData.rua || ''
            },
            taxaEntrega: Number(taxaEntregaCalculada) || 0,
            tempoEntrega: tempoEntregaMin,

            // ✅ derivados do horário
            horarioFuncionamento,
            textoHorario,
            aberto: abertoAgora
          };
        });

        const listaCompleta = await Promise.all(listaPromises);
        setEstabelecimentos(listaCompleta);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setEstabelecimentos([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [montarTextoHorarioHoje, verificarAbertoAgora]);

  // --- BUSCAR HISTÓRICO ---
  useEffect(() => {
    if (!dadosCliente?.telefone) {
      setHistoricoPedidos([]);
      return;
    }
    const telBusca = String(dadosCliente.telefone);
    const q = query(collection(db, 'Pedidos'), where('cliente.telefone', '==', telBusca));
    return onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistoricoPedidos(
        lista.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0))
      );
    });
  }, [dadosCliente]);

  // --- FILTROS ---
  const estabelecimentosOrdenados = useMemo(() => {
    let filtrados = estabelecimentos.filter((est) => {
      const matchCidade = String(est?.endereco?.cidade || '').toLowerCase() === String(cidade || '').toLowerCase();
      const matchPesquisa = String(est?.cliente || '').toLowerCase().includes(String(pesquisa || '').toLowerCase());
      const matchCategoria = categoriasAtivas.length === 0 || categoriasAtivas.includes(est.categoria);
      const matchFrete = !filtroFreteGratis || Number(est.taxaEntrega) === 0;
      const matchAberto = !filtroAbertos || Boolean(est.aberto);
      return matchCidade && matchPesquisa && matchCategoria && matchFrete && matchAberto;
    });

    switch (filtroOrdenacao) {
      case 'tempo':
        return filtrados.sort((a, b) => (a.tempoEntrega || 0) - (b.tempoEntrega || 0));
      case 'frete':
        return filtrados.sort((a, b) => (a.taxaEntrega || 0) - (b.taxaEntrega || 0));
      case 'avaliacao':
        return filtrados.sort(() => Math.random() - 0.5);
      default:
        return filtrados;
    }
  }, [estabelecimentos, cidade, pesquisa, categoriasAtivas, filtroFreteGratis, filtroAbertos, filtroOrdenacao]);

  // --- FUNÇÕES ---
  const logout = () => {
    localStorage.removeItem('dadosCliente');
    setDadosCliente(null);
    setTelaAtual('home');
  };

  const atualizarQuantidade = (idUnico, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      setCarrinho((prev) => prev.filter((item) => item.idUnico !== idUnico));
    } else {
      setCarrinho((prev) =>
        prev.map((item) => (item.idUnico === idUnico ? { ...item, quantidade: novaQuantidade } : item))
      );
    }
  };

  const removerItem = (idUnico) => setCarrinho((prev) => prev.filter((item) => item.idUnico !== idUnico));

  const navegarParaCheckout = () => {
    if (dadosCliente) setTelaAtual('enviar');
    else setTelaAtual('cadastro');
  };

  const totalItensCarrinho = useMemo(
    () => carrinho.reduce((acc, item) => acc + (item.quantidade || 0), 0),
    [carrinho]
  );

  // Estilos (mantive os seus)
  const styles = {
    wrapper: {
      position: 'relative',
      minHeight: '100vh',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto',
      boxShadow: isMobile ? 'none' : '0 0 30px rgba(0,0,0,0.08)',
      background: '#F8FAFC'
    },
    container: {
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: isMobile ? '80px' : '20px'
    },
    header: {
      background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
      padding: isMobile ? '20px 16px' : '24px 20px',
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(15, 52, 96, 0.15)'
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    logoContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
    logo: { margin: 0, fontSize: isMobile ? '22px' : '26px', fontWeight: '900', letterSpacing: '-0.5px' },
    logoBlue: { color: '#fff' },
    logoGreen: { color: '#10B981' },
    locationSelector: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      padding: isMobile ? '8px 12px' : '10px 16px',
      borderRadius: '12px',
      minWidth: isMobile ? '160px' : '200px',
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)'
    },
    selectCity: {
      background: 'none',
      border: 'none',
      color: '#fff',
      outline: 'none',
      fontSize: isMobile ? '13px' : '14px',
      width: '100%',
      fontWeight: '600',
      cursor: 'pointer'
    },
    searchContainer: {
      display: 'flex',
      gap: '12px',
      backgroundColor: '#fff',
      padding: '12px',
      borderRadius: '14px',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      marginBottom: '16px'
    },
    searchInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontSize: isMobile ? '14px' : '16px',
      padding: '8px',
      fontWeight: '500',
      color: '#1E293B'
    },
    filterButton: {
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      border: 'none',
      borderRadius: '10px',
      padding: isMobile ? '10px' : '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    categoriesContainer: {
      display: 'flex',
      gap: '10px',
      overflowX: 'auto',
      marginTop: '20px',
      paddingBottom: '8px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    },
    categoryButton: {
      border: 'none',
      padding: isMobile ? '10px 16px' : '12px 20px',
      borderRadius: '50px',
      color: '#fff',
      whiteSpace: 'nowrap',
      fontSize: isMobile ? '13px' : '14px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)'
    },
    content: {
      padding: isMobile ? '20px 16px' : '24px 20px',
      paddingBottom: isMobile ? '100px' : '40px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: isMobile ? '20px' : '24px'
    },
    bottomNav: {
      position: 'fixed',
      bottom: 0,
      width: isMobile ? '100%' : 'calc(100% - 40px)',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      left: '50%',
      transform: 'translateX(-50%)',
      height: isMobile ? '80px' : '70px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      boxShadow: '0 -10px 25px rgba(0,0,0,0.08)',
      borderTop: '1px solid #E2E8F0',
      zIndex: 100,
      borderRadius: isMobile ? '24px 24px 0 0' : '20px 20px 0 0',
      padding: isMobile ? '0 10px' : '0'
    },
    navItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontSize: isMobile ? '10px' : '12px',
      gap: '6px',
      color: '#94A3B8',
      cursor: 'pointer',
      padding: isMobile ? '12px 16px' : '10px',
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      flex: 1
    },
    carrinhoBadge: {
      position: 'absolute',
      top: '-8px',
      right: '0px',
      backgroundColor: '#EF4444',
      color: 'white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      border: '2px solid white'
    },
    headerSimples: {
      background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
      padding: isMobile ? '20px 16px' : '24px 20px',
      color: 'white',
      textAlign: 'center',
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(15, 52, 96, 0.15)'
    },
    containerInterno: {
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    avatarLarge: {
      width: isMobile ? '80px' : '100px',
      height: isMobile ? '80px' : '100px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '32px' : '40px',
      color: '#fff',
      margin: '0 auto',
      fontWeight: 'bold',
      boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
    },
    perfilInfoBox: { textAlign: 'center', marginBottom: '30px', padding: '20px' },
    btnPrincipal: {
      width: '100%',
      padding: isMobile ? '16px' : '18px',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      fontSize: isMobile ? '15px' : '16px',
      transition: 'all 0.3s ease',
      marginTop: '16px',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
    },
    btnSecundario: {
      width: '100%',
      padding: isMobile ? '14px' : '16px',
      backgroundColor: 'transparent',
      color: '#EF4444',
      border: '2px solid #EF4444',
      borderRadius: '14px',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      marginTop: '16px',
      fontSize: isMobile ? '15px' : '16px',
      transition: 'all 0.3s ease'
    },
    enderecoResumo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: isMobile ? '16px' : '20px',
      backgroundColor: '#fff',
      borderRadius: '16px',
      color: '#4A5568',
      fontSize: isMobile ? '14px' : '15px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      marginBottom: '20px',
      border: '1px solid #E2E8F0'
    },
    filtrosSidebar: {
      position: 'fixed',
      top: 0,
      right: filtrosAbertos ? '0' : '-100%',
      width: isMobile ? '90%' : '350px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
      zIndex: 1000,
      transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      padding: '24px',
      overflowY: 'auto'
    },
    filtroHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #F1F5F9'
    },
    filtroTitle: { margin: 0, fontSize: '20px', color: '#0F3460', fontWeight: '900' },
    filtroOption: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: '#F8FAFC',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '1px solid #E2E8F0'
    },
    ordenacaoContainer: { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' },
    ordenacaoSelect: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#F8FAFC',
      fontSize: '14px',
      color: '#4A5568',
      outline: 'none',
      cursor: 'pointer'
    },
    resultadosInfo: {
      marginTop: '20px',
      padding: '16px',
      backgroundColor: '#F0FDF4',
      borderRadius: '12px',
      border: '1px solid #A7F3D0'
    }
  };

  const renderTelaHome = () => (
    <div style={{ ...styles.container }}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logoContainer}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '20px'
              }}
            >
              🏪
            </div>
            <div>
              <h1 style={styles.logo}>
                <span style={styles.logoBlue}>Entrega</span>
                <span style={styles.logoGreen}>Aqui</span>
              </h1>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                Delivery rápido e seguro
              </div>
            </div>
          </div>

          {dadosCliente ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.15)',
                padding: '8px 12px',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flexFD' ? 'flex' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                {String(dadosCliente?.nomeCompleto || 'C')[0]}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                Olá, {String(dadosCliente?.nomeCompleto || '').split(' ')[0] || 'Cliente'}
              </div>
            </div>
          ) : (
            <div style={styles.locationSelector}>
              <MapPin size={isMobile ? 18 : 20} color="#10B981" />
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
          )}
        </div>

        <div style={styles.searchContainer}>
          <Search size={isMobile ? 20 : 22} color="#10B981" />
          <input
            type="text"
            placeholder="Buscar lojas, restaurantes, lanches..."
            style={styles.searchInput}
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} style={styles.filterButton}>
            <Filter size={isMobile ? 20 : 22} color="#fff" />
          </button>
        </div>

        <div style={styles.categoriesContainer}>
          {categorias.map((cat) => {
            const isActive = categoriasAtivas.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() =>
                  setCategoriasAtivas((prev) =>
                    prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                  )
                }
                style={{
                  ...styles.categoryButton,
                  background: isActive
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'rgba(255,255,255,0.15)',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                <span>{cat.nome}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Filtros Sidebar */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}>🔍 Filtros e Ordenação</h3>
          <button
            onClick={() => setFiltrosAbertos(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
          >
            <X size={24} color="#666" />
          </button>
        </div>

        <div style={styles.ordenacaoContainer}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#4A5568' }}>
            Ordenar por:
          </label>
          <select value={filtroOrdenacao} onChange={(e) => setFiltroOrdenacao(e.target.value)} style={styles.ordenacaoSelect}>
            <option value="relevancia">🎯 Mais relevantes</option>
            <option value="tempo">🚀 Menor tempo de entrega</option>
            <option value="frete">💰 Menor valor de frete</option>
            <option value="avaliacao">⭐ Melhor avaliação</option>
          </select>
        </div>

        <div style={{ marginTop: '24px' }}>
          <div style={styles.filtroOption} onClick={() => setFiltroFreteGratis(!filtroFreteGratis)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Truck size={20} color="#059669" />
              </div>
              <div>
                <div style={{ fontWeight: '700', color: '#0F3460' }}>Frete Grátis</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Mostrar apenas com entrega grátis</div>
              </div>
            </div>
            <input type="checkbox" checked={filtroFreteGratis} readOnly style={{ transform: 'scale(1.4)', accentColor: '#10B981' }} />
          </div>

          <div style={styles.filtroOption} onClick={() => setFiltroAbertos(!filtroAbertos)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={20} color="#1D4ED8" />
              </div>
              <div>
                <div style={{ fontWeight: '700', color: '#0F3460' }}>Aberto Agora</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Mostrar apenas estabelecimentos abertos</div>
              </div>
            </div>
            <input type="checkbox" checked={filtroAbertos} readOnly style={{ transform: 'scale(1.4)', accentColor: '#10B981' }} />
          </div>
        </div>

        <div style={styles.resultadosInfo}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#065F46' }}>
              {estabelecimentosOrdenados.length} estabelecimento(s) encontrado(s)
            </div>
            <button
              onClick={() => {
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
                setCategoriasAtivas([]);
                setFiltroOrdenacao('relevancia');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#10B981',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
            >
              Limpar filtros
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#047857' }}>
            {cidade} • {categoriasAtivas.length > 0 ? `${categoriasAtivas.length} categoria(s) selecionada(s)` : 'Todas as categorias'}
          </div>
        </div>

        <button onClick={() => setFiltrosAbertos(false)} style={{ ...styles.btnPrincipal, marginTop: '24px' }}>
          Aplicar Filtros
        </button>
      </div>

      {filtrosAbertos && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setFiltrosAbertos(false)}
        />
      )}

      <main style={styles.content}>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              marginTop: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                border: '3px solid #F1F5F9',
                borderTopColor: '#10B981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <div>
              <h3 style={{ color: '#0F3460', marginBottom: '8px' }}>Buscando estabelecimentos...</h3>
              <p style={{ color: '#64748B', fontSize: '14px' }}>Estamos carregando as melhores opções para você</p>
            </div>
          </div>
        ) : estabelecimentosOrdenados.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              marginTop: '60px',
              padding: '40px 20px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.05)'
            }}
          >
            <Search size={60} color="#CBD5E1" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: '#0F3460', marginBottom: '12px', fontSize: '20px' }}>Nenhum estabelecimento encontrado</h3>
            <p style={{ color: '#64748B', marginBottom: '30px', fontSize: '15px' }}>
              {pesquisa ? `Nenhum resultado para "${pesquisa}"` : 'Tente ajustar os filtros ou buscar em outra cidade'}
            </p>
            <button
              onClick={() => {
                setPesquisa('');
                setCategoriasAtivas([]);
                setFiltroFreteGratis(false);
                setFiltroAbertos(false);
              }}
              style={{ ...styles.btnPrincipal, maxWidth: '200px', margin: '0 auto' }}
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {estabelecimentosOrdenados.map((est) => (
              <EstabelecimentoCard
                key={est.id}
                estabelecimento={est}
                onClick={() => {
                  setEstabelecimentoSelecionado(est);
                  setTelaAtual('cardapio');
                }}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderHistorico = () => (
    <div style={styles.containerInterno}>
      <header style={styles.headerSimples}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <ClipboardList size={isMobile ? 24 : 28} />
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: '900' }}>Meus Pedidos</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Histórico de todos os seus pedidos</p>
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? '20px 16px' : '24px 20px' }}>
        {historicoPedidos.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.05)'
            }}
          >
            <ClipboardList size={isMobile ? 48 : 60} color="#CBD5E0" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: '#0F3460', marginBottom: '12px', fontSize: '20px' }}>Nenhum pedido ainda</h3>
            <p style={{ color: '#718096', marginBottom: '30px', fontSize: '15px' }}>
              Faça seu primeiro pedido e acompanhe seu histórico aqui!
            </p>
            <button onClick={() => setTelaAtual('home')} style={{ ...styles.btnPrincipal, maxWidth: '300px', margin: '0 auto' }}>
              Explorar Estabelecimentos
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {historicoPedidos.map((p) => {
              const statusColors = {
                pendente: { bg: '#FEF3C7', color: '#92400E', icon: '⏳' },
                preparo: { bg: '#DBEAFE', color: '#1E40AF', icon: '👨‍🍳' },
                entrega: { bg: '#EDE9FE', color: '#5B21B6', icon: '🚚' },
                entregue: { bg: '#D1FAE5', color: '#065F46', icon: '✅' },
                concluido: { bg: '#D1FAE5', color: '#065F46', icon: '✅' },
                cancelado: { bg: '#FEE2E2', color: '#991B1B', icon: '❌' }
              };

              const status = statusColors[p.status] || statusColors.pendente;
              const dataPedido = p.dataCriacao?.toDate ? p.dataCriacao.toDate() : new Date();

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'white',
                    padding: isMobile ? '20px' : '24px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    borderLeft: `6px solid ${status.color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <strong style={{ fontSize: isMobile ? '16px' : '18px', color: '#0F3460' }}>
                          {p.restauranteNome || p.estabelecimento?.nome || 'Loja'}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            color: status.color,
                            fontWeight: '900',
                            backgroundColor: `${status.bg}`,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {status.icon} {String(p.status || 'pendente').toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {dataPedido.toLocaleDateString('pt-BR')}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {dataPedido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: '#10B981', whiteSpace: 'nowrap' }}>
                      R$ {Number(p.pagamento?.total || 0).toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      marginTop: '12px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#4A5568', marginBottom: '8px' }}>Itens do pedido:</div>
                    <div style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6' }}>
                      {(p.itens || []).slice(0, 3).map((i, idx) => (
                        <div key={idx} style={{ marginBottom: '4px' }}>
                          • {i.quantidade}x {i.nome}
                        </div>
                      ))}
                      {(p.itens || []).length > 3 && (
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                          + {(p.itens || []).length - 3} item(s)
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px',
                      fontSize: '12px',
                      color: '#94A3B8',
                      paddingTop: '16px',
                      borderTop: '1px solid #F1F5F9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={12} />
                      <span>Pedido #{p.numeroPedido || String(p.id || '').slice(-6).toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setEstabelecimentoSelecionado({ id: p.restauranteId, cliente: p.restauranteNome });
                        setTelaAtual('home');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#10B981',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Pedir novamente
                      <ChevronRight size={12} />
                    </button>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <User size={isMobile ? 24 : 28} />
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: '900' }}>Meu Perfil</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Gerencie sua conta e endereço</p>
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? '20px 16px' : '24px 20px' }}>
        {dadosCliente ? (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={styles.perfilInfoBox}>
              <div style={styles.avatarLarge}>{String(dadosCliente?.nomeCompleto || 'C')[0].toUpperCase()}</div>
              <h3 style={{ margin: '16px 0 8px 0', fontSize: isMobile ? '22px' : '26px', color: '#0F3460' }}>
                {dadosCliente.nomeCompleto}
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#F0FDF4',
                  borderRadius: '20px',
                  marginTop: '8px'
                }}
              >
                <Shield size={14} color="#059669" />
                <span style={{ color: '#065F46', fontSize: '13px', fontWeight: '600' }}>Cliente verificado</span>
              </div>
            </div>

            <div style={styles.enderecoResumo}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MapPin size={24} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '900', color: '#0F3460', fontSize: '15px' }}>Endereço Principal</div>
                <div style={{ fontSize: isMobile ? '14px' : '15px', marginTop: '4px', lineHeight: '1.5' }}>
                  {dadosCliente.rua}, {dadosCliente.numero} - {dadosCliente.bairro}
                  {dadosCliente.complemento && (
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{dadosCliente.complemento}</div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A5568', marginBottom: '16px' }}>
                Informações da Conta
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Telefone</span>
                  <span style={{ fontWeight: '600', color: '#0F3460' }}>{dadosCliente.telefone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Cidade</span>
                  <span style={{ fontWeight: '600', color: '#0F3460' }}>{dadosCliente.cidade || 'Não informada'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Pedidos realizados</span>
                  <span style={{ fontWeight: '600', color: '#0F3460' }}>{historicoPedidos.length}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setTelaAtual('cadastro')} style={styles.btnPrincipal}>
              <User size={20} /> Editar Cadastro
            </button>

            <button onClick={logout} style={styles.btnSecundario}>
              <LogOut size={20} /> Sair da conta
            </button>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
              maxWidth: '500px',
              margin: '0 auto'
            }}
          >
            <div style={styles.avatarLarge}>
              <User size={isMobile ? 40 : 48} />
            </div>
            <h2 style={{ color: '#0F3460', marginBottom: '12px', fontSize: '24px' }}>Olá, Visitante!</h2>
            <p style={{ color: '#64748B', marginBottom: '30px', fontSize: '16px', lineHeight: '1.6' }}>
              Acesse sua conta para ver seus pedidos, facilitar suas compras e ter uma experiência personalizada.
            </p>

            <button onClick={() => setTelaAtual('cadastro')} style={styles.btnPrincipal}>
              <LogIn size={20} /> Entrar ou Cadastrar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderConteudo = () => {
    switch (telaAtual) {
      case 'cardapio':
        return (
          <Cardapio
            estabelecimento={estabelecimentoSelecionado}
            carrinho={carrinho}
            setCarrinho={setCarrinho}
            onVoltar={() => setTelaAtual('home')}
            onAbrirCarrinho={() => setTelaAtual('carrinho')}
          />
        );
      case 'carrinho':
        return (
          <Carrinho
            carrinho={carrinho}
            setCarrinho={setCarrinho}
            onAtualizarQuantidade={atualizarQuantidade}
            onRemoverItem={removerItem}
            estabelecimento={estabelecimentoSelecionado}
            onVoltar={() => setTelaAtual('cardapio')}
            onIrParaCadastro={navegarParaCheckout}
          />
        );
      case 'cadastro':
        return (
          <Cadastro
            dadosCliente={dadosCliente}
            onContinuar={(d) => {
              setDadosCliente(d);
              setTelaAtual('perfil');
            }}
            onVoltar={() => setTelaAtual('perfil')}
          />
        );
      case 'enviar':
        return (
          <EnviarPedido
            carrinho={carrinho}
            estabelecimento={estabelecimentoSelecionado}
            dadosCliente={dadosCliente}
            onVoltar={() => setTelaAtual('carrinho')}
            onSucesso={() => {
              setCarrinho([]);
              setTelaAtual('historico');
            }}
          />
        );
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
          <div
            style={{ ...styles.navItem, color: telaAtual === 'home' ? '#10B981' : '#94A3B8' }}
            onClick={() => setTelaAtual('home')}
          >
            <Home size={isMobile ? 24 : 26} color={telaAtual === 'home' ? '#10B981' : '#94A3B8'} />
            <span style={{ fontWeight: telaAtual === 'home' ? '800' : '600' }}>Início</span>
          </div>

          <div
            style={{ ...styles.navItem, color: telaAtual === 'historico' ? '#10B981' : '#94A3B8' }}
            onClick={() => setTelaAtual('historico')}
          >
            <ClipboardList size={isMobile ? 24 : 26} color={telaAtual === 'historico' ? '#10B981' : '#94A3B8'} />
            <span style={{ fontWeight: telaAtual === 'historico' ? '800' : '600' }}>Pedidos</span>
          </div>

          <div style={{ ...styles.navItem, position: 'relative' }} onClick={() => setTelaAtual('carrinho')}>
            <ShoppingBag size={isMobile ? 24 : 26} color="#10B981" />
            <span style={{ color: '#10B981', fontWeight: '800' }}>Carrinho</span>
            {totalItensCarrinho > 0 && <div style={styles.carrinhoBadge}>{totalItensCarrinho > 9 ? '9+' : totalItensCarrinho}</div>}
          </div>

          <div
            style={{ ...styles.navItem, color: telaAtual === 'perfil' ? '#10B981' : '#94A3B8' }}
            onClick={() => setTelaAtual('perfil')}
          >
            <User size={isMobile ? 24 : 26} color={telaAtual === 'perfil' ? '#10B981' : '#94A3B8'} />
            <span style={{ fontWeight: telaAtual === 'perfil' ? '800' : '600' }}>Perfil</span>
          </div>
        </nav>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        select option {
          background: white;
          color: #1E293B;
        }
      `}</style>
    </div>
  );
};

export default PaginaInicialCliente;
