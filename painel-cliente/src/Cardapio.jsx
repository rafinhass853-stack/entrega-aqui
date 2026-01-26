import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  X,
  Check,
  Grid,
  List,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock as ClockIcon,
  Search,
  Filter,
  Heart,
  Shield,
  Package,
  ChevronRight,
  Info,
  Tag
} from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };

    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet };
}

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const brl = (v) => {
  const num = toNumber(v);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function normalizarGruposProduto(item) {
  if (!item) return [];

  if (Array.isArray(item.gruposOpcoes) && item.gruposOpcoes.length > 0) {
    return item.gruposOpcoes.map((g, idx) => ({
      id: g.id || `${item.id || 'prod'}_grupo_${idx}`,
      nomeGrupo: g.nomeGrupo || g.tituloGrupo || g.grupoNome || 'Opções',
      qtdMinima: Number(g.qtdMinima ?? 0),
      qtdMaxima: Number(g.qtdMaxima ?? 999),
      obrigatorio: g.obrigatorio || false,
      opcoes: Array.isArray(g.opcoes) ? g.opcoes : []
    }));
  }

  if (item.complementos?.ativo) {
    const c = item.complementos;
    return [
      {
        id: `${item.id || 'prod'}_complementos`,
        nomeGrupo: c.tituloGrupo || 'Sabores / Opções',
        qtdMinima: Number(c.qtdMinima ?? 0),
        qtdMaxima: Number(c.qtdMaxima ?? 999),
        obrigatorio: c.obrigatorio || false,
        opcoes: Array.isArray(c.opcoes) ? c.opcoes : []
      }
    ];
  }

  return [];
}

function getFotoOpcao(opt) {
  return opt?.fotoUrl || opt?.foto || opt?.imagem || opt?.imageUrl || null;
}

function criarIdUnico(produto, escolhas) {
  const base = produto?.id || 'produto';
  const escolhasOrdenadas = (escolhas || [])
    .map((g) => ({
      grupoNome: g.grupoNome,
      itens: (g.itens || [])
        .map((i) => ({
          nome: i.nome,
          preco: toNumber(i.preco),
          qtd: Number(i.qtd || 1)
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome))
    }))
    .sort((a, b) => a.grupoNome.localeCompare(b.grupoNome));

  return `${base}::${JSON.stringify(escolhasOrdenadas)}`;
}

function calcularTotalUnitario(precoBaseUnitario, escolhas) {
  const base = toNumber(precoBaseUnitario);
  const add = (escolhas || []).reduce((acc, g) => {
    const somaGrupo = (g.itens || []).reduce((a2, it) => a2 + toNumber(it.preco) * Number(it.qtd || 1), 0);
    return acc + somaGrupo;
  }, 0);
  return base + add;
}

const Cardapio = ({ estabelecimento, onVoltar, onAbrirCarrinho, carrinho, setCarrinho }) => {
  const { isMobile, isTablet } = useIsMobile();

  const [cardapio, setCardapio] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [busca, setBusca] = useState('');
  const [modoVisualizacao, setModoVisualizacao] = useState(isMobile ? 'grid' : 'grid');
  const [showFilters, setShowFilters] = useState(false);
  const [ordem, setOrdem] = useState('nome');
  const [filtroPreco, setFiltroPreco] = useState({ min: '', max: '' });
  const [produtoModal, setProdutoModal] = useState(null);
  const [selecoes, setSelecoes] = useState({});
  const [favoritos, setFavoritos] = useState({});
  const [loading, setLoading] = useState(true);

  const carrinhoRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setModoVisualizacao(isMobile ? 'grid' : 'grid');
  }, [isMobile]);

  useEffect(() => {
    if (!estabelecimento?.id) return;

    setLoading(true);
    const cardapioRef = collection(db, 'estabelecimentos', estabelecimento.id, 'cardapio');
    const q = query(cardapioRef, orderBy('nome'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cardapioData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const cats = [...new Set(cardapioData.map((i) => i.categoria || 'sem-categoria'))].filter(Boolean);
        setCategorias(['todos', ...cats]);
        setCardapio(cardapioData);

        const expanded = {};
        cats.forEach((c) => (expanded[c] = true));
        setExpandedCategories(expanded);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar cardápio:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [estabelecimento]);

  const cardapioFiltrado = useMemo(() => {
    let filtrado = [...cardapio];

    if (categoriaSelecionada !== 'todos') {
      filtrado = filtrado.filter((i) => (i.categoria || 'sem-categoria') === categoriaSelecionada);
    }

    if (busca.trim()) {
      const t = busca.toLowerCase();
      filtrado = filtrado.filter(
        (i) => 
          i?.nome?.toLowerCase().includes(t) || 
          i?.descricao?.toLowerCase().includes(t) ||
          i?.categoria?.toLowerCase().includes(t)
      );
    }

    if (filtroPreco.min || filtroPreco.max) {
      filtrado = filtrado.filter((item) => {
        const preco = toNumber(item.preco);
        const min = filtroPreco.min ? Number(filtroPreco.min) : 0;
        const max = filtroPreco.max ? Number(filtroPreco.max) : Infinity;
        return preco >= min && preco <= max;
      });
    }

    filtrado.sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome);
      if (ordem === 'preco-asc') return toNumber(a.preco) - toNumber(b.preco);
      if (ordem === 'preco-desc') return toNumber(b.preco) - toNumber(a.preco);
      if (ordem === 'popular') {
        const favA = favoritos[a.id] ? 1 : 0;
        const favB = favoritos[b.id] ? 1 : 0;
        return favB - favA;
      }
      return 0;
    });

    return filtrado;
  }, [cardapio, categoriaSelecionada, busca, filtroPreco, ordem, favoritos]);

  const itensPorCategoria = useMemo(() => {
    return cardapioFiltrado.reduce((acc, item) => {
      const cat = item.categoria || 'sem-categoria';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [cardapioFiltrado]);

  const totalItensCarrinho = useMemo(
    () => carrinho.reduce((acc, i) => acc + Number(i.quantidade || 0), 0),
    [carrinho]
  );

  const calcularTotalCarrinhoSemEntrega = () =>
    carrinho.reduce((total, item) => total + toNumber(item.precoTotalItem || 0), 0);

  const toggleCategoria = (categoria) => {
    setExpandedCategories((prev) => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      lanches: '🍔',
      japonesa: '🍣',
      churrasco: '🥩',
      pizza: '🍕',
      brasileira: '🥘',
      italiana: '🍝',
      saudavel: '🥗',
      doces: '🍰',
      sorvetes: '🍦',
      'sem-categoria': '🍽️',
      bebidas: '🥤',
      combos: '🎁',
      promocoes: '🔥'
    };
    return icons[String(categoria || '').toLowerCase()] || '🍽️';
  };

  const handleAdicionarClick = (item) => {
    const grupos = normalizarGruposProduto(item);

    if (grupos.length > 0 && grupos.some(g => g.opcoes.length > 0)) {
      setProdutoModal(item);
      const init = {};
      grupos.forEach((g) => (init[g.id] = {}));
      setSelecoes(init);
      return;
    }

    adicionarNoCarrinho(item, []);
  };

  const toggleOpcao = (grupo, opcao) => {
    const grupoId = grupo.id;
    const atualGrupo = selecoes[grupoId] || {};
    const nome = opcao.nome || 'Opção';
    const preco = toNumber(opcao.preco ?? opcao.precoUnitario ?? 0);

    const jaExiste = !!atualGrupo[nome];
    const selecionadasCount = Object.keys(atualGrupo).length;

    if (jaExiste) {
      const novoGrupo = { ...atualGrupo };
      delete novoGrupo[nome];
      setSelecoes((prev) => ({ ...prev, [grupoId]: novoGrupo }));
      return;
    }

    if (selecionadasCount >= Number(grupo.qtdMaxima || 999)) {
      alert(`Você pode escolher no máximo ${grupo.qtdMaxima} item(ns) em "${grupo.nomeGrupo}".`);
      return;
    }

    const foto = getFotoOpcao(opcao);

    setSelecoes((prev) => ({
      ...prev,
      [grupoId]: {
        ...atualGrupo,
        [nome]: { nome, preco, qtd: 1, foto }
      }
    }));
  };

  const confirmarPersonalizacao = () => {
    if (!produtoModal) return;

    const grupos = normalizarGruposProduto(produtoModal);

    for (const g of grupos) {
      if (g.obrigatorio) {
        const selecionadas = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
        const min = Number(g.qtdMinima ?? 0);
        if (selecionadas < min) {
          alert(`Escolha pelo menos ${min} item(ns) em "${g.nomeGrupo}".`);
          return;
        }
      }
    }

    const escolhas = grupos.map((g) => {
      const mapa = selecoes[g.id] || {};
      const itens = Object.values(mapa).map((it) => ({
        nome: it.nome,
        preco: toNumber(it.preco),
        qtd: Number(it.qtd || 1),
        foto: it.foto || null
      }));
      return { grupoNome: g.nomeGrupo, itens };
    });

    adicionarNoCarrinho(produtoModal, escolhas);
    setProdutoModal(null);
  };

  const adicionarNoCarrinho = (produto, escolhas) => {
    const precoBaseUnitario = toNumber(produto.preco);
    const unit = calcularTotalUnitario(precoBaseUnitario, escolhas);

    const idUnico = criarIdUnico(produto, escolhas);

    setCarrinho((prev) => {
      const existente = prev.find((i) => i.idUnico === idUnico);
      if (existente) {
        return prev.map((i) => {
          if (i.idUnico !== idUnico) return i;
          const novaQtd = Number(i.quantidade || 1) + 1;
          return {
            ...i,
            quantidade: novaQtd,
            precoTotalItem: unit * novaQtd
          };
        });
      }

      const novoItem = {
        id: produto.id,
        idUnico,
        nome: produto.nome,
        foto: produto.foto || null,
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
        precoBaseUnitario,
        escolhas,
        quantidade: 1,
        precoTotalItem: unit * 1
      };

      // Animação de confirmação
      if (carrinhoRef.current) {
        carrinhoRef.current.style.transform = 'scale(1.2)';
        carrinhoRef.current.style.color = '#10B981';
        setTimeout(() => {
          if (carrinhoRef.current) {
            carrinhoRef.current.style.transform = 'scale(1)';
            carrinhoRef.current.style.color = '';
          }
        }, 300);
      }

      return [...prev, novoItem];
    });
  };

  const toggleFavorito = (produtoId) => {
    setFavoritos(prev => ({
      ...prev,
      [produtoId]: !prev[produtoId]
    }));
  };

  const calcularTotalModal = () => {
    if (!produtoModal) return 0;
    const base = toNumber(produtoModal.preco);
    const grupos = normalizarGruposProduto(produtoModal);
    let extras = 0;
    
    grupos.forEach(g => {
      const selecionadas = selecoes[g.id] || {};
      Object.values(selecionadas).forEach(opcao => {
        extras += toNumber(opcao.preco) * (opcao.qtd || 1);
      });
    });
    
    return base + extras;
  };

  const podeConfirmar = useMemo(() => {
    if (!produtoModal) return false;

    const grupos = normalizarGruposProduto(produtoModal);
    for (const g of grupos) {
      if (g.obrigatorio) {
        const count = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
        if (count < Number(g.qtdMinima ?? 0)) return false;
      }
    }
    return true;
  }, [produtoModal, selecoes]);

  const styles = {
    container: { 
      backgroundColor: '#F8FAFC', 
      minHeight: '100vh', 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    header: {
      background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
      padding: isMobile ? '16px' : '20px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px',
      boxShadow: '0 4px 20px rgba(15, 52, 96, 0.15)'
    },
    backButton: {
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '12px',
      padding: '10px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '700',
      fontSize: isMobile ? '14px' : '16px',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(255,255,255,0.25)'
      }
    },
    carrinhoButton: {
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '12px',
      padding: isMobile ? '10px 14px' : '12px 18px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontWeight: '800',
      fontSize: isMobile ? '14px' : '16px',
      position: 'relative',
      '&:hover': {
        background: 'rgba(255,255,255,0.25)',
        transform: 'translateY(-2px)'
      }
    },
    carrinhoBadge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      backgroundColor: '#EF4444',
      color: 'white',
      borderRadius: '50%',
      width: '22px',
      height: '22px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      border: '2px solid rgba(15, 52, 96, 1)'
    },

    storeInfo: {
      textAlign: 'center',
      padding: isMobile ? '20px 16px' : '24px',
      backgroundColor: 'white',
      marginBottom: '10px',
      borderBottom: '1px solid #E2E8F0'
    },
    storeName: { 
      fontSize: isMobile ? '24px' : isTablet ? '28px' : '32px', 
      fontWeight: '900', 
      color: '#0F3460', 
      margin: '0 0 12px 0' 
    },
    storeBadges: { 
      display: 'flex', 
      justifyContent: 'center', 
      gap: isMobile ? '10px' : '15px', 
      flexWrap: 'wrap' 
    },
    badge: { 
      padding: isMobile ? '6px 12px' : '8px 16px', 
      borderRadius: '20px', 
      fontSize: isMobile ? '11px' : '12px', 
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    badgeOpen: { backgroundColor: '#D1FAE5', color: '#065F46' },
    badgeRating: { backgroundColor: '#FEF3C7', color: '#92400E' },
    badgeTime: { backgroundColor: '#DBEAFE', color: '#1E40AF' },

    filtrosContainer: {
      padding: isMobile ? '16px' : '20px 24px',
      backgroundColor: 'white',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: isMobile ? '60px' : '80px',
      zIndex: 90
    },
    buscaContainer: { 
      display: 'flex', 
      gap: '12px', 
      alignItems: 'center',
      flexWrap: 'wrap' 
    },
    searchInput: {
      flex: 1,
      padding: isMobile ? '12px 16px 12px 44px' : '14px 20px 14px 48px',
      borderRadius: '14px',
      border: '2px solid #E2E8F0',
      backgroundColor: '#F8FAFC',
      outline: 'none',
      fontSize: isMobile ? '15px' : '16px',
      minWidth: isMobile ? '200px' : '300px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      '&:focus': {
        borderColor: '#10B981',
        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
      }
    },
    filterButton: {
      background: '#0F3460',
      border: 'none',
      borderRadius: '12px',
      padding: isMobile ? '12px' : '14px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: '#1E40AF',
        transform: 'scale(1.05)'
      }
    },
    viewToggle: { 
      display: 'flex', 
      background: '#F1F5F9', 
      borderRadius: '12px', 
      padding: '4px',
      marginLeft: isMobile ? 'auto' : '10px'
    },
    viewButton: { 
      padding: isMobile ? '8px 12px' : '10px 14px', 
      borderRadius: '10px', 
      border: 'none', 
      background: 'none', 
      cursor: 'pointer', 
      color: '#64748B',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: isMobile ? '12px' : '14px'
    },
    viewButtonAtivo: { backgroundColor: 'white', color: '#0F3460', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },

    categoriasContainer: {
      display: 'flex',
      gap: isMobile ? '12px' : '16px',
      overflowX: 'auto',
      padding: isMobile ? '16px' : '20px 24px',
      backgroundColor: 'white',
      borderBottom: '1px solid #F1F5F9',
      position: 'sticky',
      top: isMobile ? '130px' : '150px',
      zIndex: 80,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none' }
    },
    categoriaButton: { 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '8px', 
      border: 'none', 
      background: 'none', 
      cursor: 'pointer', 
      minWidth: isMobile ? '80px' : '90px',
      padding: '12px 8px',
      borderRadius: '16px',
      transition: 'all 0.3s ease'
    },
    categoriaIcon: { fontSize: isMobile ? '24px' : '28px' },
    categoriaNome: { 
      fontSize: isMobile ? '12px' : '13px', 
      fontWeight: '800', 
      color: '#64748B', 
      textTransform: 'capitalize',
      textAlign: 'center'
    },
    categoriaNomeAtiva: { color: '#10B981' },
    categoriaButtonAtiva: {
      background: '#F0FDF4',
      border: '2px solid #10B981',
      transform: 'translateY(-2px)'
    },

    shell: {
      display: isMobile ? 'block' : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
      gap: isMobile ? '0' : '24px',
      padding: isMobile ? '0' : '24px',
      paddingBottom: isMobile ? '140px' : '120px'
    },

    desktopSidebar: {
      display: isMobile ? 'none' : 'block',
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid #E2E8F0',
      height: 'fit-content',
      position: 'sticky',
      top: '200px',
      maxHeight: 'calc(100vh - 220px)',
      overflowY: 'auto',
      boxShadow: '0 8px 25px rgba(0,0,0,0.05)'
    },
    sideTitle: { 
      margin: '0 0 20px 0', 
      fontSize: '18px', 
      fontWeight: '900', 
      color: '#0F3460',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    sideCatBtn: (active) => ({
      width: '100%',
      textAlign: 'left',
      padding: '16px 20px',
      borderRadius: '16px',
      border: '2px solid #E2E8F0',
      background: active ? '#F0FDF4' : 'white',
      cursor: 'pointer',
      fontWeight: 800,
      color: active ? '#065F46' : '#0F3460',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
        transform: 'translateX(5px)'
      }
    }),

    cardapioContainer: { 
      padding: isMobile ? '16px 16px 140px' : '0',
      backgroundColor: isMobile ? '#F8FAFC' : 'transparent'
    },
    categoriaSection: { 
      marginBottom: '32px',
      backgroundColor: isMobile ? 'white' : 'transparent',
      borderRadius: isMobile ? '20px' : '0',
      padding: isMobile ? '20px' : '0',
      boxShadow: isMobile ? '0 8px 25px rgba(0,0,0,0.08)' : 'none'
    },
    categoriaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      borderBottom: '2px solid #F1F5F9',
      marginBottom: '20px',
      cursor: 'pointer'
    },
    categoriaTitle: { 
      margin: 0, 
      fontSize: isMobile ? '20px' : '22px', 
      color: '#0F3460', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      textTransform: 'capitalize',
      fontWeight: '900'
    },
    categoriaCount: { 
      fontSize: '14px', 
      color: '#94A3B8', 
      fontWeight: 'normal',
      backgroundColor: '#F1F5F9',
      padding: '6px 12px',
      borderRadius: '20px'
    },

    itensGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: isMobile ? '20px' : '24px'
    },
    itensList: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px' 
    },

    itemCard: { 
      backgroundColor: 'white', 
      borderRadius: '20px', 
      overflow: 'hidden', 
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)', 
      border: '1px solid #F1F5F9',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }
    },
    itemImageContainer: { 
      width: '100%', 
      height: isMobile ? '180px' : '200px',
      overflow: 'hidden', 
      backgroundColor: '#F1F5F9',
      position: 'relative'
    },
    itemImage: { 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover', 
      display: 'block',
      transition: 'transform 0.6s ease'
    },
    favoritoButton: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      background: 'rgba(255,255,255,0.9)',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 2,
      transition: 'all 0.3s ease',
      '&:hover': {
        background: 'white',
        transform: 'scale(1.1)'
      }
    },
    itemPromoBadge: {
      position: 'absolute',
      top: '12px',
      left: '12px',
      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '900',
      zIndex: 2
    },
    itemContent: { 
      padding: isMobile ? '20px' : '24px' 
    },
    itemName: { 
      margin: '0 0 8px 0', 
      fontSize: isMobile ? '16px' : '18px', 
      fontWeight: '900', 
      color: '#0F3460',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    itemDescription: {
      margin: '0 0 16px 0',
      fontSize: isMobile ? '13px' : '14px',
      color: '#64748B',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      height: isMobile ? '40px' : '44px',
      lineHeight: '1.5'
    },
    itemFooter: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '16px' 
    },
    itemPrice: { 
      fontSize: isMobile ? '18px' : '20px', 
      fontWeight: '900', 
      color: '#10B981' 
    },
    addButton: {
      border: 'none',
      borderRadius: '12px',
      padding: isMobile ? '10px 16px' : '12px 20px',
      color: 'white',
      fontSize: isMobile ? '13px' : '14px',
      fontWeight: '900',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.3s ease',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
      }
    },

    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center'
    },
    loadingSpinner: {
      width: '60px',
      height: '60px',
      border: '3px solid #F1F5F9',
      borderTopColor: '#10B981',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '20px'
    },

    filtrosSidebar: {
      position: 'fixed',
      top: 0,
      right: showFilters ? '0' : '-100%',
      width: isMobile ? '90%' : '380px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '-15px 0 40px rgba(0,0,0,0.15)',
      zIndex: 2000,
      transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      padding: '24px',
      overflowY: 'auto'
    },
    filtroHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '20px',
      borderBottom: '2px solid #F1F5F9'
    },
    filtroTitle: {
      margin: 0,
      fontSize: '24px',
      color: '#0F3460',
      fontWeight: '900',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    filtroGroup: {
      marginBottom: '30px'
    },
    filtroLabel: {
      display: 'block',
      marginBottom: '12px',
      fontSize: '15px',
      fontWeight: '800',
      color: '#4A5568'
    },
    filtroSelect: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '2px solid #E2E8F0',
      fontSize: '15px',
      backgroundColor: '#F8FAFC',
      color: '#4A5568',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        borderColor: '#10B981'
      }
    },
    filtroRange: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    filtroInput: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: '10px',
      border: '2px solid #E2E8F0',
      fontSize: '15px',
      backgroundColor: '#F8FAFC',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        borderColor: '#10B981'
      }
    },

    carrinhoFlutuante: {
      position: 'fixed',
      bottom: isMobile ? '20px' : '24px',
      right: isMobile ? '5%' : '24px',
      left: isMobile ? '5%' : 'auto',
      width: isMobile ? '90%' : isTablet ? '340px' : '380px',
      background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
      padding: isMobile ? '20px' : '24px',
      borderRadius: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white',
      boxShadow: '0 15px 40px rgba(15, 52, 96, 0.3)',
      zIndex: 1500,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    carrinhoAction: {
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      padding: isMobile ? '12px 20px' : '14px 24px',
      fontWeight: '900',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      whiteSpace: 'nowrap',
      fontSize: isMobile ? '15px' : '16px',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
      }
    },

    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: isMobile ? '0' : '20px',
      backdropFilter: 'blur(5px)'
    },
    modalContent: {
      backgroundColor: 'white',
      width: isMobile ? '100%' : 'min(800px, 100%)',
      borderTopLeftRadius: isMobile ? '32px' : '24px',
      borderTopRightRadius: isMobile ? '32px' : '24px',
      borderRadius: isMobile ? '32px 32px 0 0' : '24px',
      padding: isMobile ? '24px' : '32px',
      maxHeight: isMobile ? '85vh' : '90vh',
      overflowY: 'auto',
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
    },
    modalHeader: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      gap: '16px', 
      marginBottom: '24px' 
    },
    modalTitle: { 
      margin: 0, 
      fontSize: isMobile ? '22px' : '26px', 
      fontWeight: '900', 
      color: '#0F3460' 
    },
    modalSub: { 
      margin: '8px 0 0 0', 
      fontSize: isMobile ? '14px' : '16px', 
      color: '#64748B' 
    },
    closeBtn: { 
      background: '#F1F5F9', 
      border: 'none', 
      borderRadius: '50%', 
      padding: '10px', 
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      flexShrink: 0,
      '&:hover': {
        backgroundColor: '#E2E8F0'
      }
    },

    grupoBox: { 
      marginTop: '24px', 
      paddingTop: '20px', 
      borderTop: '2px solid #F1F5F9' 
    },
    grupoNome: { 
      margin: 0, 
      fontSize: isMobile ? '16px' : '18px', 
      fontWeight: '900', 
      color: '#0F3460' 
    },
    grupoLimites: { 
      margin: '8px 0 20px 0', 
      fontSize: isMobile ? '13px' : '14px', 
      color: '#64748B' 
    },

    opcaoCard: (selected) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: isMobile ? '16px' : '20px',
      borderRadius: '16px',
      border: `3px solid ${selected ? '#10B981' : '#E2E8F0'}`,
      background: selected ? '#F0FDF4' : 'white',
      cursor: 'pointer',
      marginBottom: '12px',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: selected ? '#10B981' : '#CBD5E1',
        transform: 'translateX(5px)'
      }
    }),
    opcaoImg: { 
      width: isMobile ? '60px' : '70px', 
      height: isMobile ? '60px' : '70px', 
      borderRadius: '12px', 
      objectFit: 'cover', 
      background: '#F1F5F9',
      flexShrink: 0
    },
    checkboxCircle: { 
      width: '28px', 
      height: '28px', 
      borderRadius: '50%', 
      border: '3px solid #CBD5E1', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.2s ease'
    },
    checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },

    btnConfirmar: (enabled) => ({
      width: '100%',
      padding: isMobile ? '18px' : '22px',
      borderRadius: '16px',
      border: 'none',
      background: enabled ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#CBD5E0',
      color: 'white',
      fontWeight: '900',
      fontSize: isMobile ? '16px' : '18px',
      marginTop: '24px',
      cursor: enabled ? 'pointer' : 'not-allowed',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      boxShadow: enabled ? '0 4px 20px rgba(16, 185, 129, 0.3)' : 'none',
      '&:hover:enabled': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)'
      }
    }),
  };

  const ItemCardapio = ({ item, modo }) => {
    const grupos = normalizarGruposProduto(item);
    const temPersonalizacao = grupos.length > 0 && grupos.some(g => g.opcoes.length > 0);
    const isFavorito = favoritos[item.id];
    const temPromocao = toNumber(item.preco) < 30;

    if (modo === 'list') {
      return (
        <div style={styles.itemCard}>
          <div style={{ display: 'flex', padding: '20px', gap: '20px', alignItems: 'flex-start' }}>
            {item.foto && (
              <div style={{ width: '100px', height: '100px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.foto} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={styles.itemName}>{item.nome}</h4>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorito(item.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                >
                  <Heart size={20} color={isFavorito ? '#EF4444' : '#CBD5E0'} fill={isFavorito ? '#EF4444' : 'none'} />
                </button>
              </div>
              
              <p style={styles.itemDescription}>{item.descricao}</p>
              
              <div style={styles.itemFooter}>
                <span style={styles.itemPrice}>{brl(item.preco)}</span>
                <button
                  onClick={() => handleAdicionarClick(item)}
                  style={{
                    ...styles.addButton,
                    background: temPersonalizacao ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  }}
                >
                  {temPersonalizacao ? 'Personalizar' : <Plus size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.itemCard}>
        <div style={styles.itemImageContainer}>
          {item.foto ? (
            <img src={item.foto} style={styles.itemImage} alt={item.nome} />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '48px'
            }}>
              {item.nome[0]}
            </div>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id);
            }}
            style={styles.favoritoButton}
          >
            <Heart size={20} color={isFavorito ? '#EF4444' : '#CBD5E0'} fill={isFavorito ? '#EF4444' : 'none'} />
          </button>
          
          {temPromocao && (
            <div style={styles.itemPromoBadge}>
              <Tag size={12} /> PROMOÇÃO
            </div>
          )}
        </div>
        
        <div style={styles.itemContent}>
          <h4 style={styles.itemName}>{item.nome}</h4>
          <p style={styles.itemDescription}>{item.descricao}</p>
          
          {grupos.length > 0 && (
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '12px', 
              color: '#8B5CF6', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Info size={12} />
              {grupos.length} opção(ões) disponível(is)
            </div>
          )}
          
          <div style={styles.itemFooter}>
            <span style={styles.itemPrice}>{brl(item.preco)}</span>
            <button
              onClick={() => handleAdicionarClick(item)}
              style={{
                ...styles.addButton,
                background: temPersonalizacao ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              }}
            >
              {temPersonalizacao ? 'Personalizar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={20} /> Voltar
          </button>
          <div style={{ width: '40px' }}></div>
        </header>
        
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <h3 style={{ color: '#0F3460', marginBottom: '8px' }}>Carregando cardápio...</h3>
          <p style={{ color: '#64748B' }}>
            Buscando as delícias de {estabelecimento?.cliente || 'o estabelecimento'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        select { appearance: none; }
      `}</style>
      
      <header style={styles.header}>
        <button onClick={onVoltar} style={styles.backButton}>
          <ArrowLeft size={isMobile ? 20 : 24} /> Voltar
        </button>

        <button ref={carrinhoRef} onClick={onAbrirCarrinho} style={styles.carrinhoButton}>
          <ShoppingCart size={isMobile ? 20 : 24} />
          <span>Carrinho</span>
          {totalItensCarrinho > 0 && (
            <div style={styles.carrinhoBadge}>
              {totalItensCarrinho > 9 ? '9+' : totalItensCarrinho}
            </div>
          )}
        </button>
      </header>

      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento?.cliente || 'Loja'}</h1>
        <div style={styles.storeBadges}>
          <span style={{ ...styles.badge, ...styles.badgeOpen }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></div>
            Aberto agora
          </span>
          <span style={{ ...styles.badge, ...styles.badgeRating }}>
            <Star size={12} fill="#FBBF24" /> 4.9
          </span>
          <span style={{ ...styles.badge, ...styles.badgeTime }}>
            <ClockIcon size={12} /> 30-45 min
          </span>
        </div>
      </div>

      <div style={styles.filtrosContainer}>
        <div style={styles.buscaContainer}>
          <div style={{position: 'relative', flex: 1, minWidth: isMobile ? '200px' : '300px'}}>
            <Search size={20} color="#64748B" style={{position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)'}} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar no cardápio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button onClick={() => setShowFilters(true)} style={styles.filterButton}>
            <Filter size={isMobile ? 20 : 22} />
          </button>

          <div style={styles.viewToggle}>
            <button
              onClick={() => setModoVisualizacao('grid')}
              style={{ ...styles.viewButton, ...(modoVisualizacao === 'grid' ? styles.viewButtonAtivo : {}) }}
              title="Grid"
            >
              <Grid size={isMobile ? 18 : 20} />
              {!isMobile && 'Grid'}
            </button>
            <button
              onClick={() => setModoVisualizacao('list')}
              style={{ ...styles.viewButton, ...(modoVisualizacao === 'list' ? styles.viewButtonAtivo : {}) }}
              title="Lista"
            >
              <List size={isMobile ? 18 : 20} />
              {!isMobile && 'Lista'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros Sidebar */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}><Filter size={24} /> Filtros</h3>
          <button onClick={() => setShowFilters(false)} style={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.filtroLabel}>Ordenar por:</label>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)} style={styles.filtroSelect}>
            <option value="nome">📝 Nome (A-Z)</option>
            <option value="preco-asc">💰 Preço (Menor → Maior)</option>
            <option value="preco-desc">💰 Preço (Maior → Menor)</option>
            <option value="popular">🔥 Mais populares</option>
          </select>
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.filtroLabel}>Faixa de Preço:</label>
          <div style={styles.filtroRange}>
            <input
              type="number"
              placeholder="Mínimo"
              value={filtroPreco.min}
              onChange={(e) => setFiltroPreco(prev => ({...prev, min: e.target.value}))}
              style={styles.filtroInput}
              min="0"
              step="0.01"
            />
            <span style={{color: '#64748B', fontWeight: '700'}}>até</span>
            <input
              type="number"
              placeholder="Máximo"
              value={filtroPreco.max}
              onChange={(e) => setFiltroPreco(prev => ({...prev, max: e.target.value}))}
              style={styles.filtroInput}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setFiltroPreco({min: '', max: ''});
            setOrdem('nome');
            setBusca('');
            setShowFilters(false);
          }} 
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontWeight: '900',
            cursor: 'pointer',
            marginTop: '20px',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
            }
          }}
        >
          🗑️ Limpar Todos os Filtros
        </button>
        
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#F0FDF4',
          borderRadius: '16px',
          border: '1px solid #A7F3D0'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
            <Package size={20} color="#059669" />
            <div style={{fontSize: '14px', fontWeight: '800', color: '#065F46'}}>
              {cardapioFiltrado.length} produtos encontrados
            </div>
          </div>
          <div style={{fontSize: '13px', color: '#047857'}}>
            {categoriaSelecionada === 'todos' ? 'Todas as categorias' : `Categoria: ${categoriaSelecionada}`}
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1999,
            backdropFilter: 'blur(3px)'
          }} 
          onClick={() => setShowFilters(false)} 
        />
      )}

      <div style={styles.categoriasContainer}>
        {categorias.map((cat) => {
          const isActive = categoriaSelecionada === cat;
          const count = cat === 'todos' 
            ? cardapio.length 
            : cardapio.filter(i => (i.categoria || 'sem-categoria') === cat).length;
          
          return (
            <button
              key={cat}
              onClick={() => setCategoriaSelecionada(cat)}
              style={{
                ...styles.categoriaButton,
                ...(isActive ? styles.categoriaButtonAtiva : {})
              }}
              title={cat}
            >
              <span style={styles.categoriaIcon}>
                {cat === 'todos' ? '🍽️' : getCategoriaIcon(cat)}
              </span>
              <span
                style={{
                  ...styles.categoriaNome,
                  ...(isActive ? styles.categoriaNomeAtiva : {})
                }}
              >
                {cat === 'todos' ? 'Todos' : cat}
              </span>
              <span style={{
                fontSize: '11px',
                color: isActive ? '#10B981' : '#94A3B8',
                fontWeight: '700',
                background: isActive ? '#D1FAE5' : '#F1F5F9',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={styles.shell}>
        {!isMobile && (
          <aside style={styles.desktopSidebar}>
            <p style={styles.sideTitle}><Package size={20} /> Categorias</p>

            <button
              style={styles.sideCatBtn(categoriaSelecionada === 'todos')}
              onClick={() => setCategoriaSelecionada('todos')}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{fontSize: '20px'}}>🍽️</span>
                <span>Todos</span>
              </div>
              <span style={{ color: '#64748B', fontWeight: 900 }}>{cardapio.length}</span>
            </button>

            {Object.keys(itensPorCategoria).map((cat) => (
              <button
                key={cat}
                style={styles.sideCatBtn(categoriaSelecionada === cat)}
                onClick={() => setCategoriaSelecionada(cat)}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span style={{fontSize: '20px'}}>{getCategoriaIcon(cat)}</span>
                  <span style={{textTransform: 'capitalize'}}>{cat}</span>
                </div>
                <span style={{ color: '#64748B', fontWeight: 900 }}>{itensPorCategoria[cat]?.length || 0}</span>
              </button>
            ))}
          </aside>
        )}

        <div style={styles.cardapioContainer}>
          {Object.keys(itensPorCategoria).length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 20px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.05)'
            }}>
              <Search size={60} color="#CBD5E1" style={{ marginBottom: '20px' }} />
              <h3 style={{ color: '#0F3460', marginBottom: '12px' }}>Nenhum produto encontrado</h3>
              <p style={{ color: '#64748B', marginBottom: '30px' }}>
                {busca ? `Nenhum resultado para "${busca}"` : 'Tente selecionar outra categoria'}
              </p>
              <button 
                onClick={() => {
                  setBusca('');
                  setCategoriaSelecionada('todos');
                }}
                style={{
                  ...styles.addButton,
                  maxWidth: '200px',
                  margin: '0 auto'
                }}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            Object.entries(itensPorCategoria).map(([categoria, itens]) => (
              <div key={categoria} style={styles.categoriaSection}>
                <div style={styles.categoriaHeader} onClick={() => toggleCategoria(categoria)}>
                  <h3 style={styles.categoriaTitle}>
                    <span style={{fontSize: '24px'}}>{getCategoriaIcon(categoria)}</span> 
                    {categoria}
                    <span style={styles.categoriaCount}>({itens.length})</span>
                  </h3>
                  {expandedCategories[categoria] ? 
                    <ChevronUp size={isMobile ? 24 : 28} color="#64748B" /> : 
                    <ChevronDown size={isMobile ? 24 : 28} color="#64748B" />
                  }
                </div>

                {expandedCategories[categoria] && (
                  <div style={modoVisualizacao === 'grid' ? styles.itensGrid : styles.itensList}>
                    {itens.map((item) => (
                      <ItemCardapio key={item.id} item={item} modo={modoVisualizacao} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL PERSONALIZAR */}
      {produtoModal && (
        <div style={styles.modalOverlay} onClick={() => setProdutoModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{flex: 1}}>
                <h2 style={styles.modalTitle}>{produtoModal.nome}</h2>
                <p style={styles.modalSub}>{produtoModal.descricao}</p>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px'}}>
                  <div style={{
                    padding: '6px 12px',
                    background: '#F0FDF4',
                    color: '#065F46',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Tag size={14} />
                    {brl(produtoModal.preco)} base
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}>
                    {produtoModal.categoria}
                  </div>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={() => setProdutoModal(null)}>
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>

            {normalizarGruposProduto(produtoModal).map((grupo) => {
              const selecionadas = selecoes[grupo.id] ? Object.keys(selecoes[grupo.id]).length : 0;
              const obrigatorioText = grupo.obrigatorio ? ' (Obrigatório)' : ' (Opcional)';

              return (
                <div key={grupo.id} style={styles.grupoBox}>
                  <p style={styles.grupoNome}>{grupo.nomeGrupo}{obrigatorioText}</p>
                  <p style={styles.grupoLimites}>
                    {grupo.qtdMinima > 0 
                      ? `Selecione ${grupo.qtdMinima} a ${grupo.qtdMaxima} opções` 
                      : `Selecione até ${grupo.qtdMaxima} opções`} 
                    • escolhido: <b style={{color: '#10B981'}}>{selecionadas}</b>
                  </p>

                  {grupo.opcoes.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#64748B'
                    }}>
                      Nenhuma opção disponível para este grupo.
                    </div>
                  ) : (
                    grupo.opcoes.map((opt, idx) => {
                      const nome = opt.nome || `Opção ${idx + 1}`;
                      const preco = toNumber(opt.preco ?? opt.precoUnitario ?? 0);
                      const foto = getFotoOpcao(opt);
                      const selected = !!(selecoes[grupo.id] && selecoes[grupo.id][nome]);

                      return (
                        <div
                          key={`${grupo.id}_${idx}`}
                          style={styles.opcaoCard(selected)}
                          onClick={() => toggleOpcao(grupo, { ...opt, nome, preco, fotoUrl: foto })}
                        >
                          {foto && (
                            <img src={foto || 'https://via.placeholder.com/80'} style={styles.opcaoImg} alt={nome} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '900', color: '#0F3460', fontSize: isMobile ? '15px' : '16px' }}>
                              {nome}
                            </div>
                            {opt.descricao && (
                              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                                {opt.descricao}
                              </div>
                            )}
                            <div style={{ marginTop: '8px', fontWeight: '900', color: preco > 0 ? '#10B981' : '#059669', fontSize: isMobile ? '14px' : '15px' }}>
                              {preco > 0 ? `+ ${brl(preco)}` : 'Grátis'}
                            </div>
                          </div>

                          <div style={{ ...styles.checkboxCircle, ...(selected ? styles.checkboxActive : {}) }}>
                            {selected && <Check size={isMobile ? 16 : 18} color="white" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}

            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: '#F0FDF4',
              borderRadius: '16px',
              border: '2px solid #A7F3D0'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '700', color: '#047857'}}>Total do item</div>
                  <div style={{fontSize: '12px', color: '#059669'}}>Incluindo opções selecionadas</div>
                </div>
                <div style={{fontSize: '24px', fontWeight: '900', color: '#065F46'}}>
                  {brl(calcularTotalModal())}
                </div>
              </div>
            </div>

            <button 
              style={styles.btnConfirmar(podeConfirmar)} 
              disabled={!podeConfirmar} 
              onClick={confirmarPersonalizacao}
            >
              <ShoppingCart size={20} />
              Adicionar ao carrinho • {brl(calcularTotalModal())}
            </button>
          </div>
        </div>
      )}

      {/* CARRINHO FLUTUANTE */}
      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', opacity: 0.9, fontWeight: '700' }}>
              Total sem entrega
            </div>
            <div style={{ fontSize: isMobile ? '22px' : '24px', fontWeight: '900', marginTop: '4px' }}>
              {brl(calcularTotalCarrinhoSemEntrega())}
            </div>
          </div>
          <button onClick={onAbrirCarrinho} style={styles.carrinhoAction}>
            Ver carrinho ({totalItensCarrinho}) <ShoppingCart size={isMobile ? 20 : 22} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Cardapio;