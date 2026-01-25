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
  Filter
} from 'lucide-react';

// Hook responsivo
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

/**
 * Helpers de preço / formatação
 */
const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const brl = (v) => {
  const num = toNumber(v);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Normaliza grupos do produto
 */
function normalizarGruposProduto(item) {
  if (!item) return [];

  // novo padrão
  if (Array.isArray(item.gruposOpcoes) && item.gruposOpcoes.length > 0) {
    return item.gruposOpcoes.map((g, idx) => ({
      id: g.id || `${item.id || 'prod'}_grupo_${idx}`,
      nomeGrupo: g.nomeGrupo || g.tituloGrupo || g.grupoNome || 'Opções',
      qtdMinima: Number(g.qtdMinima ?? 0),
      qtdMaxima: Number(g.qtdMaxima ?? 999),
      opcoes: Array.isArray(g.opcoes) ? g.opcoes : []
    }));
  }

  // antigo (complementos)
  if (item.complementos?.ativo) {
    const c = item.complementos;
    return [
      {
        id: `${item.id || 'prod'}_complementos`,
        nomeGrupo: c.tituloGrupo || 'Sabores / Opções',
        qtdMinima: Number(c.qtdMinima ?? 0),
        qtdMaxima: Number(c.qtdMaxima ?? 999),
        opcoes: Array.isArray(c.opcoes) ? c.opcoes : []
      }
    ];
  }

  return [];
}

/**
 * Normaliza foto da opção
 */
function getFotoOpcao(opt) {
  return opt?.fotoUrl || opt?.foto || opt?.imagem || opt?.imageUrl || null;
}

/**
 * Cria uma chave estável para o carrinho
 */
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

/**
 * Calcula total unitário
 */
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
  const [modoVisualizacao, setModoVisualizacao] = useState(isMobile ? 'grid' : 'list');
  const [showFilters, setShowFilters] = useState(false);
  const [ordem, setOrdem] = useState('nome');
  const [filtroPreco, setFiltroPreco] = useState({ min: '', max: '' });

  // Modal de personalização
  const [produtoModal, setProdutoModal] = useState(null);
  const [selecoes, setSelecoes] = useState({});

  const carrinhoRef = useRef(null);

  useEffect(() => {
    setModoVisualizacao(isMobile ? 'grid' : 'list');
  }, [isMobile]);

  useEffect(() => {
    if (!estabelecimento?.id) return;

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
      },
      (err) => console.error('Erro ao buscar cardápio:', err)
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
        (i) => i?.nome?.toLowerCase().includes(t) || i?.descricao?.toLowerCase().includes(t)
      );
    }

    // Filtro por preço
    if (filtroPreco.min || filtroPreco.max) {
      filtrado = filtrado.filter((item) => {
        const preco = toNumber(item.preco);
        const min = filtroPreco.min ? Number(filtroPreco.min) : 0;
        const max = filtroPreco.max ? Number(filtroPreco.max) : Infinity;
        return preco >= min && preco <= max;
      });
    }

    // Ordenação
    filtrado.sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome);
      if (ordem === 'preco-asc') return toNumber(a.preco) - toNumber(b.preco);
      if (ordem === 'preco-desc') return toNumber(b.preco) - toNumber(a.preco);
      return 0;
    });

    return filtrado;
  }, [cardapio, categoriaSelecionada, busca, filtroPreco, ordem]);

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
      'sem-categoria': '🍽️'
    };
    return icons[String(categoria || '').toLowerCase()] || '🍽️';
  };

  /**
   * Abrir modal se tiver grupos/ complementos
   */
  const handleAdicionarClick = (item) => {
    const grupos = normalizarGruposProduto(item);

    if (grupos.length > 0) {
      setProdutoModal(item);
      const init = {};
      grupos.forEach((g) => (init[g.id] = {}));
      setSelecoes(init);
      return;
    }

    // sem personalização
    adicionarNoCarrinho(item, []);
  };

  /**
   * Toggle da opção dentro de um grupo
   */
  const toggleOpcao = (grupo, opcao) => {
    const grupoId = grupo.id;
    const atualGrupo = selecoes[grupoId] || {};
    const nome = opcao.nome || 'Opção';

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

    const preco = toNumber(opcao.preco ?? opcao.precoUnitario ?? 0);
    const foto = getFotoOpcao(opcao);

    setSelecoes((prev) => ({
      ...prev,
      [grupoId]: {
        ...atualGrupo,
        [nome]: { nome, preco, qtd: 1, foto }
      }
    }));
  };

  /**
   * Confirma escolhas e adiciona no carrinho
   */
  const confirmarPersonalizacao = () => {
    if (!produtoModal) return;

    const grupos = normalizarGruposProduto(produtoModal);

    for (const g of grupos) {
      const selecionadas = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
      const min = Number(g.qtdMinima ?? 0);
      if (selecionadas < min) {
        alert(`Escolha pelo menos ${min} item(ns) em "${g.nomeGrupo}".`);
        return;
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

  /**
   * Adiciona no carrinho
   */
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

      return [
        ...prev,
        {
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
        }
      ];
    });

    if (carrinhoRef.current) {
      carrinhoRef.current.style.transform = 'scale(1.15)';
      setTimeout(() => {
        if (carrinhoRef.current) carrinhoRef.current.style.transform = 'scale(1)';
      }, 180);
    }
  };

  const styles = {
    container: { 
      backgroundColor: '#F8FAFC', 
      minHeight: '100vh', 
      fontFamily: 'sans-serif',
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    header: {
      backgroundColor: '#0F3460',
      padding: isMobile ? '14px' : '16px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomLeftRadius: '20px',
      borderBottomRightRadius: '20px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '700',
      fontSize: isMobile ? '14px' : '16px'
    },
    carrinhoButton: {
      background: '#10B981',
      border: 'none',
      borderRadius: '12px',
      padding: isMobile ? '8px 12px' : '10px 16px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      transition: 'transform 0.2s',
      fontWeight: '800',
      fontSize: isMobile ? '14px' : '16px',
      '&:hover': {
        backgroundColor: '#0DA271'
      }
    },

    storeInfo: {
      textAlign: 'center',
      padding: isMobile ? '18px 14px' : '20px 24px',
      backgroundColor: 'white',
      marginBottom: '10px',
      borderBottom: '1px solid #E2E8F0'
    },
    storeName: { 
      fontSize: isMobile ? '20px' : isTablet ? '24px' : '28px', 
      fontWeight: '900', 
      color: '#0F3460', 
      margin: '0 0 10px 0' 
    },
    storeBadges: { 
      display: 'flex', 
      justifyContent: 'center', 
      gap: isMobile ? '8px' : '12px', 
      flexWrap: 'wrap' 
    },
    badge: { 
      padding: isMobile ? '4px 8px' : '6px 12px', 
      borderRadius: '20px', 
      fontSize: isMobile ? '10px' : '12px', 
      fontWeight: '700' 
    },
    badgeOpen: { backgroundColor: '#D1FAE5', color: '#065F46' },
    badgeRating: { backgroundColor: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', gap: '4px' },
    badgeTime: { backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '4px' },

    filtrosContainer: {
      padding: isMobile ? '12px 14px' : '12px 24px',
      backgroundColor: 'white',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: isMobile ? '60px' : '70px',
      zIndex: 90
    },
    buscaContainer: { 
      display: 'flex', 
      gap: '10px', 
      alignItems: 'center',
      flexWrap: 'wrap' 
    },
    searchInput: {
      flex: 1,
      padding: isMobile ? '10px 12px' : '12px 16px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#F8FAFC',
      outline: 'none',
      fontSize: isMobile ? '14px' : '16px',
      minWidth: isMobile ? '200px' : '300px'
    },
    filterButton: {
      background: '#0F3460',
      border: 'none',
      borderRadius: '10px',
      padding: isMobile ? '10px' : '12px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    viewToggle: { 
      display: 'flex', 
      background: '#F1F5F9', 
      borderRadius: '12px', 
      padding: '3px',
      marginLeft: isMobile ? 'auto' : '10px'
    },
    viewButton: { 
      padding: isMobile ? '6px 8px' : '8px 12px', 
      borderRadius: '10px', 
      border: 'none', 
      background: 'none', 
      cursor: 'pointer', 
      color: '#64748B' 
    },
    viewButtonAtivo: { backgroundColor: 'white', color: '#0F3460', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },

    categoriasContainer: {
      display: 'flex',
      gap: isMobile ? '10px' : '15px',
      overflowX: 'auto',
      padding: isMobile ? '12px 14px' : '12px 24px',
      backgroundColor: 'white',
      borderBottom: '1px solid #F1F5F9',
      position: 'sticky',
      top: isMobile ? '120px' : '130px',
      zIndex: 80,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none' }
    },
    categoriaButton: { 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '5px', 
      border: 'none', 
      background: 'none', 
      cursor: 'pointer', 
      minWidth: isMobile ? '70px' : '80px' 
    },
    categoriaIcon: { fontSize: isMobile ? '20px' : '24px' },
    categoriaNome: { 
      fontSize: isMobile ? '11px' : '12px', 
      fontWeight: '800', 
      color: '#64748B', 
      textTransform: 'capitalize',
      textAlign: 'center'
    },
    categoriaNomeAtiva: { color: '#10B981' },

    shell: {
      display: isMobile ? 'block' : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
      gap: isMobile ? '0' : '20px',
      padding: isMobile ? '0' : '20px 24px 120px'
    },

    desktopSidebar: {
      display: isMobile ? 'none' : 'block',
      background: 'white',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid #E2E8F0',
      height: 'fit-content',
      position: 'sticky',
      top: '160px',
      maxHeight: 'calc(100vh - 180px)',
      overflowY: 'auto'
    },
    sideTitle: { 
      margin: '0 0 15px 0', 
      fontSize: '16px', 
      fontWeight: '900', 
      color: '#0F3460' 
    },
    sideCatBtn: (active) => ({
      width: '100%',
      textAlign: 'left',
      padding: '12px 15px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      background: active ? '#F0FDF4' : 'white',
      cursor: 'pointer',
      fontWeight: 800,
      color: active ? '#065F46' : '#0F3460',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4'
      }
    }),

    cardapioContainer: { 
      padding: isMobile ? '14px 14px 120px' : '0',
      backgroundColor: isMobile ? '#F8FAFC' : 'transparent'
    },
    categoriaSection: { 
      marginBottom: '24px',
      backgroundColor: isMobile ? 'white' : 'transparent',
      borderRadius: isMobile ? '12px' : '0',
      padding: isMobile ? '15px' : '0',
      boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
    },
    categoriaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #eee',
      marginBottom: '15px',
      cursor: 'pointer'
    },
    categoriaTitle: { 
      margin: 0, 
      fontSize: isMobile ? '16px' : '18px', 
      color: '#0F3460', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      textTransform: 'capitalize' 
    },
    categoriaCount: { 
      fontSize: '12px', 
      color: '#94A3B8', 
      fontWeight: 'normal',
      backgroundColor: '#F1F5F9',
      padding: '2px 8px',
      borderRadius: '10px'
    },

    itensGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: isMobile ? '12px' : '16px'
    },
    itensList: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px' 
    },

    itemCard: { 
      backgroundColor: 'white', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)', 
      border: '1px solid #F1F5F9',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
      }
    },
    itemImageContainer: { 
      width: '100%', 
      aspectRatio: '1/1', 
      overflow: 'hidden', 
      backgroundColor: '#f0f0f0' 
    },
    itemImage: { 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover', 
      display: 'block',
      transition: 'transform 0.3s',
      '&:hover': {
        transform: 'scale(1.05)'
      }
    },
    itemContent: { 
      padding: isMobile ? '12px' : '16px' 
    },
    itemName: { 
      margin: '0 0 6px 0', 
      fontSize: isMobile ? '14px' : '16px', 
      fontWeight: '900', 
      color: '#0F3460',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    itemDescription: {
      margin: '0 0 10px 0',
      fontSize: isMobile ? '11px' : '12px',
      color: '#64748B',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      height: isMobile ? '28px' : '32px',
      lineHeight: '14px'
    },
    itemFooter: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '10px' 
    },
    itemPrice: { 
      fontSize: isMobile ? '14px' : '16px', 
      fontWeight: '900', 
      color: '#10B981' 
    },
    addButton: {
      border: 'none',
      borderRadius: '10px',
      padding: isMobile ? '8px 12px' : '10px 16px',
      color: 'white',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '900',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background-color 0.2s'
    },

    itemCardList: { 
      backgroundColor: 'white', 
      padding: isMobile ? '12px' : '16px', 
      borderRadius: '14px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
      border: '1px solid #F1F5F9',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    },
    itemContentList: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '15px' 
    },
    itemActionsList: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '10px' : '15px' 
    },
    addButtonList: { 
      backgroundColor: '#10B981', 
      color: 'white', 
      border: 'none', 
      borderRadius: '10px', 
      padding: isMobile ? '8px 12px' : '10px 16px', 
      cursor: 'pointer', 
      fontWeight: '900',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0DA271'
      }
    },

    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: isMobile ? '0' : '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      width: isMobile ? '100%' : 'min(760px, 100%)',
      borderTopLeftRadius: isMobile ? '22px' : '18px',
      borderTopRightRadius: isMobile ? '22px' : '18px',
      borderRadius: isMobile ? '22px 22px 0 0' : '18px',
      padding: isMobile ? '18px' : '24px',
      maxHeight: isMobile ? '85vh' : '90vh',
      overflowY: 'auto'
    },
    modalHeader: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      gap: '12px', 
      marginBottom: '16px' 
    },
    modalTitle: { 
      margin: 0, 
      fontSize: isMobile ? '18px' : '22px', 
      fontWeight: '900', 
      color: '#0F3460' 
    },
    modalSub: { 
      margin: '5px 0 0 0', 
      fontSize: isMobile ? '12px' : '14px', 
      color: '#64748B' 
    },
    closeBtn: { 
      background: '#F1F5F9', 
      border: 'none', 
      borderRadius: '999px', 
      padding: '8px', 
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#E2E8F0'
      }
    },

    grupoBox: { 
      marginTop: '16px', 
      paddingTop: '14px', 
      borderTop: '1px solid #E2E8F0' 
    },
    grupoNome: { 
      margin: 0, 
      fontSize: isMobile ? '14px' : '16px', 
      fontWeight: '900', 
      color: '#0F3460' 
    },
    grupoLimites: { 
      margin: '4px 0 12px 0', 
      fontSize: isMobile ? '12px' : '14px', 
      color: '#64748B' 
    },

    opcaoCard: (selected) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: isMobile ? '12px' : '16px',
      borderRadius: '14px',
      border: `2px solid ${selected ? '#10B981' : '#E2E8F0'}`,
      background: selected ? '#F0FDF4' : 'white',
      cursor: 'pointer',
      marginBottom: '10px',
      transition: 'all 0.2s'
    }),
    opcaoImg: { 
      width: isMobile ? '48px' : '60px', 
      height: isMobile ? '48px' : '60px', 
      borderRadius: '10px', 
      objectFit: 'cover', 
      background: '#F1F5F9' 
    },
    checkboxCircle: { 
      width: '24px', 
      height: '24px', 
      borderRadius: '999px', 
      border: '2px solid #CBD5E1', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexShrink: 0
    },
    checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },

    btnConfirmar: (enabled) => ({
      width: '100%',
      padding: isMobile ? '16px' : '20px',
      borderRadius: '14px',
      border: 'none',
      backgroundColor: enabled ? '#10B981' : '#94A3B8',
      color: 'white',
      fontWeight: '900',
      fontSize: isMobile ? '16px' : '18px',
      marginTop: '20px',
      cursor: enabled ? 'pointer' : 'not-allowed',
      transition: 'background-color 0.2s'
    }),

    // Carrinho flutuante
    carrinhoFlutuante: {
      position: 'fixed',
      bottom: isMobile ? 18 : 22,
      right: isMobile ? '5%' : 24,
      left: isMobile ? '5%' : 'auto',
      width: isMobile ? '90%' : isTablet ? '320px' : '360px',
      backgroundColor: '#0F3460',
      padding: isMobile ? '14px 16px' : '16px 20px',
      borderRadius: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white',
      boxShadow: '0 10px 25px rgba(0,0,0,0.22)',
      zIndex: 1500,
      transition: 'transform 0.3s'
    },
    carrinhoAction: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: isMobile ? '10px 14px' : '12px 16px',
      fontWeight: '900',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      fontSize: isMobile ? '14px' : '16px',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0DA271'
      }
    },

    // Filtros Sidebar
    filtrosSidebar: {
      position: 'fixed',
      top: 0,
      right: showFilters ? '0' : '-100%',
      width: isMobile ? '85%' : '300px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
      zIndex: 2000,
      transition: 'right 0.3s ease',
      padding: '20px',
      overflowY: 'auto'
    },
    filtroHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '1px solid #E2E8F0'
    },
    filtroTitle: {
      margin: 0,
      fontSize: '20px',
      color: '#0F3460',
      fontWeight: 'bold'
    },
    filtroGroup: {
      marginBottom: '25px'
    },
    filtroLabel: {
      display: 'block',
      marginBottom: '10px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#4A5568'
    },
    filtroSelect: {
      width: '100%',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      fontSize: '14px',
      backgroundColor: '#F8FAFC'
    },
    filtroRange: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    filtroInput: {
      flex: 1,
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      fontSize: '14px'
    }
  };

  const ItemCardapio = ({ item, modo }) => {
    const grupos = normalizarGruposProduto(item);
    const temPersonalizacao = grupos.length > 0;

    if (modo === 'list') {
      return (
        <div style={styles.itemCardList}>
          <div style={styles.itemContentList}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={styles.itemName}>{item.nome}</h4>
              <p style={styles.itemDescription}>{item.descricao}</p>
              {item.foto && (
                <div style={{marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <div style={{width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden'}}>
                    <img src={item.foto} alt={item.nome} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                  <span style={styles.itemPrice}>{brl(item.preco)}</span>
                </div>
              )}
            </div>

            <div style={styles.itemActionsList}>
              {!item.foto && <span style={styles.itemPrice}>{brl(item.preco)}</span>}
              <button onClick={() => handleAdicionarClick(item)} style={styles.addButtonList}>
                {temPersonalizacao ? 'Personalizar' : <Plus size={isMobile ? 16 : 20} />}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.itemCard}>
        {item.foto && (
          <div style={styles.itemImageContainer}>
            <img src={item.foto} style={styles.itemImage} alt={item.nome} />
          </div>
        )}
        <div style={styles.itemContent}>
          <h4 style={styles.itemName}>{item.nome}</h4>
          <p style={styles.itemDescription}>{item.descricao}</p>
          <div style={styles.itemFooter}>
            <span style={styles.itemPrice}>{brl(item.preco)}</span>
            <button
              onClick={() => handleAdicionarClick(item)}
              style={{
                ...styles.addButton,
                backgroundColor: temPersonalizacao ? '#8B5CF6' : '#10B981'
              }}
            >
              {temPersonalizacao ? 'Personalizar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const podeConfirmar = useMemo(() => {
    if (!produtoModal) return false;

    const grupos = normalizarGruposProduto(produtoModal);
    for (const g of grupos) {
      const count = selecoes[g.id] ? Object.keys(selecoes[g.id]).length : 0;
      if (count < Number(g.qtdMinima ?? 0)) return false;
    }
    return true;
  }, [produtoModal, selecoes]);

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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onVoltar} style={styles.backButton}>
          <ArrowLeft size={isMobile ? 20 : 24} /> Voltar
        </button>

        <button ref={carrinhoRef} onClick={onAbrirCarrinho} style={styles.carrinhoButton}>
          <ShoppingCart size={isMobile ? 18 : 22} /> <span>({totalItensCarrinho})</span>
        </button>
      </header>

      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento?.cliente || 'Loja'}</h1>
        <div style={styles.storeBadges}>
          <span style={{ ...styles.badge, ...styles.badgeOpen }}>🟢 Aberto</span>
          <span style={{ ...styles.badge, ...styles.badgeRating }}>
            <Star size={isMobile ? 10 : 12} fill="#92400E" /> 4.9
          </span>
          <span style={{ ...styles.badge, ...styles.badgeTime }}>
            <ClockIcon size={isMobile ? 10 : 12} /> 30-45 min
          </span>
        </div>
      </div>

      <div style={styles.filtrosContainer}>
        <div style={styles.buscaContainer}>
          <div style={{position: 'relative', flex: 1, minWidth: isMobile ? '200px' : '300px'}}>
            <Search size={18} color="#64748B" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)'}} />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{...styles.searchInput, paddingLeft: '40px'}}
            />
          </div>

          <button onClick={() => setShowFilters(true)} style={styles.filterButton}>
            <Filter size={isMobile ? 18 : 20} />
          </button>

          <div style={styles.viewToggle}>
            <button
              onClick={() => setModoVisualizacao('grid')}
              style={{ ...styles.viewButton, ...(modoVisualizacao === 'grid' ? styles.viewButtonAtivo : {}) }}
              title="Grid"
            >
              <Grid size={isMobile ? 16 : 18} />
            </button>
            <button
              onClick={() => setModoVisualizacao('list')}
              style={{ ...styles.viewButton, ...(modoVisualizacao === 'list' ? styles.viewButtonAtivo : {}) }}
              title="Lista"
            >
              <List size={isMobile ? 16 : 18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros Sidebar */}
      <div style={styles.filtrosSidebar}>
        <div style={styles.filtroHeader}>
          <h3 style={styles.filtroTitle}>Filtros</h3>
          <button onClick={() => setShowFilters(false)} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            <X size={24} color="#666" />
          </button>
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.filtroLabel}>Ordenar por:</label>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)} style={styles.filtroSelect}>
            <option value="nome">Nome (A-Z)</option>
            <option value="preco-asc">Preço (Menor para Maior)</option>
            <option value="preco-desc">Preço (Maior para Menor)</option>
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
            />
            <span>até</span>
            <input
              type="number"
              placeholder="Máximo"
              value={filtroPreco.max}
              onChange={(e) => setFiltroPreco(prev => ({...prev, max: e.target.value}))}
              style={styles.filtroInput}
              min="0"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setFiltroPreco({min: '', max: ''});
            setOrdem('nome');
            setShowFilters(false);
          }} 
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Limpar Filtros
        </button>
      </div>
      {showFilters && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1999,
          display: isMobile ? 'block' : 'none'
        }} onClick={() => setShowFilters(false)} />
      )}

      <div style={styles.categoriasContainer}>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaSelecionada(cat)}
            style={styles.categoriaButton}
            title={cat}
          >
            <span style={styles.categoriaIcon}>{cat === 'todos' ? '🍽️' : getCategoriaIcon(cat)}</span>
            <span
              style={{
                ...styles.categoriaNome,
                ...(categoriaSelecionada === cat ? styles.categoriaNomeAtiva : {})
              }}
            >
              {cat === 'todos' ? 'Todos' : cat}
            </span>
          </button>
        ))}
      </div>

      <div style={styles.shell}>
        {!isMobile && (
          <aside style={styles.desktopSidebar}>
            <p style={styles.sideTitle}>Categorias</p>

            <button
              style={styles.sideCatBtn(categoriaSelecionada === 'todos')}
              onClick={() => setCategoriaSelecionada('todos')}
            >
              <span>🍽️ Todos</span>
              <span style={{ color: '#64748B', fontWeight: 900 }}>{cardapio.length}</span>
            </button>

            {Object.keys(itensPorCategoria).map((cat) => (
              <button
                key={cat}
                style={styles.sideCatBtn(categoriaSelecionada === cat)}
                onClick={() => setCategoriaSelecionada(cat)}
              >
                <span>
                  {getCategoriaIcon(cat)} {cat}
                </span>
                <span style={{ color: '#64748B', fontWeight: 900 }}>{itensPorCategoria[cat]?.length || 0}</span>
              </button>
            ))}
          </aside>
        )}

        <div style={styles.cardapioContainer}>
          {Object.entries(itensPorCategoria).map(([categoria, itens]) => (
            <div key={categoria} style={styles.categoriaSection}>
              <div style={styles.categoriaHeader} onClick={() => toggleCategoria(categoria)}>
                <h3 style={styles.categoriaTitle}>
                  {getCategoriaIcon(categoria)} {categoria}{' '}
                  <span style={styles.categoriaCount}>({itens.length})</span>
                </h3>
                {expandedCategories[categoria] ? 
                  <ChevronUp size={isMobile ? 20 : 24} color="#64748B" /> : 
                  <ChevronDown size={isMobile ? 20 : 24} color="#64748B" />
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
          ))}
        </div>
      </div>

      {/* MODAL PERSONALIZAR */}
      {produtoModal && (
        <div style={styles.modalOverlay} onClick={() => setProdutoModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{produtoModal.nome}</h2>
                <p style={styles.modalSub}>{produtoModal.descricao}</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setProdutoModal(null)} aria-label="Fechar">
                <X size={isMobile ? 18 : 20} />
              </button>
            </div>

            {normalizarGruposProduto(produtoModal).map((grupo) => {
              const selecionadas = selecoes[grupo.id] ? Object.keys(selecoes[grupo.id]).length : 0;

              return (
                <div key={grupo.id} style={styles.grupoBox}>
                  <p style={styles.grupoNome}>{grupo.nomeGrupo}</p>
                  <p style={styles.grupoLimites}>
                    Selecione {grupo.qtdMinima} a {grupo.qtdMaxima} — escolhido: <b>{selecionadas}</b>
                  </p>

                  {grupo.opcoes.map((opt, idx) => {
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
                          <img src={foto || 'https://via.placeholder.com/80'} style={styles.opcaoImg} alt="" />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, color: '#0F3460', fontSize: isMobile ? '14px' : '16px' }}>
                            {nome}
                          </div>
                          <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#10B981', fontWeight: 900 }}>
                            {preco > 0 ? `+ ${brl(preco)}` : 'Grátis'}
                          </div>
                        </div>

                        <div style={{ ...styles.checkboxCircle, ...(selected ? styles.checkboxActive : {}) }}>
                          {selected && <Check size={isMobile ? 14 : 16} color="white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <button style={styles.btnConfirmar(podeConfirmar)} disabled={!podeConfirmar} onClick={confirmarPersonalizacao}>
              Adicionar ao pedido • Total: {brl(calcularTotalModal())}
            </button>
          </div>
        </div>
      )}

      {/* CARRINHO FLUTUANTE */}
      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div>
            <div style={{ fontSize: isMobile ? '11px' : '12px', opacity: 0.85, fontWeight: 800 }}>Total sem entrega</div>
            <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 900 }}>{brl(calcularTotalCarrinhoSemEntrega())}</div>
          </div>
          <button onClick={onAbrirCarrinho} style={styles.carrinhoAction}>
            Ver carrinho <ShoppingCart size={isMobile ? 18 : 20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Cardapio;