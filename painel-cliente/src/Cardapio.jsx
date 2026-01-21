import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { 
  ArrowLeft, ShoppingCart, Star, Clock, Tag, ChevronDown, ChevronUp, X, Check, 
  Search, Filter, Grid, List, Plus, Minus, Sparkles, Flame, Leaf, TrendingUp, Clock as ClockIcon
} from 'lucide-react';

// RECEBENDO carrinho E setCarrinho VIA PROPS DO PAI
const Cardapio = ({ estabelecimento, onVoltar, onAbrirCarrinho, carrinho, setCarrinho }) => {
  const [cardapio, setCardapio] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [itemSelecionadoParaCombo, setItemSelecionadoParaCombo] = useState(null);
  const [saboresEscolhidos, setSaboresEscolhidos] = useState([]);
  const [busca, setBusca] = useState('');
  const [modoVisualizacao, setModoVisualizacao] = useState('grid');
  const [filtroPreco, setFiltroPreco] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [itemAnimando, setItemAnimando] = useState(null);
  
  const carrinhoRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!estabelecimento) return;

    const fetchCardapio = async () => {
      try {
        const cardapioRef = collection(db, 'estabelecimentos', estabelecimento.id, 'cardapio');
        const q = query(cardapioRef, orderBy('nome'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cardapioData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const categoriasUnicas = [...new Set(cardapioData.map(item => item.categoria || 'sem-categoria'))];
          setCategorias(['todos', ...categoriasUnicas]);
          setCardapio(cardapioData);

          const expanded = {};
          categoriasUnicas.forEach(cat => { expanded[cat] = true; });
          setExpandedCategories(expanded);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
      }
    };

    fetchCardapio();
  }, [estabelecimento]);

  const handleAdicionarClick = (item) => {
    if (item.complementos?.ativo) {
      setItemSelecionadoParaCombo(item);
      setSaboresEscolhidos([]);
    } else {
      confirmarAdicaoAoCarrinho(item, []);
    }
  };

  const toggleSabor = (sabor) => {
    const jaSelecionado = saboresEscolhidos.find(s => s.nome === sabor.nome);
    if (jaSelecionado) {
      setSaboresEscolhidos(saboresEscolhidos.filter(s => s.nome !== sabor.nome));
    } else {
      if (saboresEscolhidos.length < itemSelecionadoParaCombo.complementos.qtdMaxima) {
        setSaboresEscolhidos([...saboresEscolhidos, sabor]);
      } else {
        alert(`Escolha no máximo ${itemSelecionadoParaCombo.complementos.qtdMaxima} sabores.`);
      }
    }
  };

  const confirmarAdicaoAoCarrinho = (item, sabores) => {
    if (item.complementos?.ativo && sabores.length < item.complementos.qtdMinima) {
      alert(`Escolha pelo menos ${item.complementos.qtdMinima} sabores.`);
      return;
    }

    const nomesSabores = sabores.map(s => s.nome);
    const idUnico = item.id + (nomesSabores.length > 0 ? '-' + nomesSabores.sort().join('-') : '');
    const itemNoCarrinho = carrinho.find(i => i.idUnico === idUnico);
    
    setItemAnimando(idUnico);
    
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(i => 
        i.idUnico === idUnico ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, { 
        ...item, 
        idUnico, 
        sabores: nomesSabores, 
        quantidade: 1 
      }]);
    }

    if (carrinhoRef.current) {
      carrinhoRef.current.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (carrinhoRef.current) carrinhoRef.current.style.transform = 'scale(1)';
      }, 200);
    }

    setTimeout(() => setItemAnimando(null), 500);
    setItemSelecionadoParaCombo(null);
    setSaboresEscolhidos([]);
  };

  const calcularTotal = () => carrinho.reduce((total, item) => total + (parseFloat(item.preco) * item.quantidade), 0);
  
  const cardapioFiltrado = useMemo(() => {
    let filtrado = [...cardapio];
    if (categoriaSelecionada !== 'todos') {
      filtrado = filtrado.filter(item => item.categoria === categoriaSelecionada);
    }
    if (busca) {
      const termoBusca = busca.toLowerCase();
      filtrado = filtrado.filter(item => 
        item.nome.toLowerCase().includes(termoBusca) || 
        item.descricao?.toLowerCase().includes(termoBusca)
      );
    }
    if (filtroPreco === 'asc') filtrado.sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
    else if (filtroPreco === 'desc') filtrado.sort((a, b) => parseFloat(b.preco) - parseFloat(a.preco));
    return filtrado;
  }, [cardapio, categoriaSelecionada, busca, filtroPreco]);

  const itensPorCategoria = useMemo(() => {
    return cardapioFiltrado.reduce((acc, item) => {
      const categoria = item.categoria || 'sem-categoria';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(item);
      return acc;
    }, {});
  }, [cardapioFiltrado]);

  const toggleCategoria = (categoria) => {
    setExpandedCategories(prev => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      'lanches': '🍔', 'japonesa': '🍣', 'churrasco': '🥩', 'pizza': '🍕',
      'brasileira': '🥘', 'italiana': '🍝', 'saudavel': '🥗', 'doces': '🍰', 'sorvetes': '🍦'
    };
    return icons[categoria?.toLowerCase()] || '🍽️';
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' },
    header: { backgroundColor: '#0F3460', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    backButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    carrinhoButton: { background: '#10B981', border: 'none', borderRadius: '12px', padding: '8px 15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s' },
    storeInfo: { textAlign: 'center', padding: '20px', backgroundColor: 'white', marginBottom: '10px' },
    storeName: { fontSize: '24px', fontWeight: '800', color: '#0F3460', margin: '0 0 5px 0' },
    storeBadges: { display: 'flex', justifyContent: 'center', gap: '10px' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    badgeOpen: { backgroundColor: '#D1FAE5', color: '#065F46' },
    badgeRating: { backgroundColor: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', gap: '3px' },
    badgeTime: { backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '3px' },
    filtrosContainer: { padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0' },
    buscaContainer: { display: 'flex', gap: '10px' },
    searchInput: { flex: 1, padding: '10px 15px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' },
    filtroButton: { background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer' },
    viewToggle: { display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px' },
    viewButton: { padding: '6px 10px', borderRadius: '7px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' },
    viewButtonAtivo: { backgroundColor: 'white', color: '#0F3460', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    categoriasContainer: { display: 'flex', gap: '15px', overflowX: 'auto', padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #F1F5F9' },
    categoriaButton: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer', minWidth: '60px' },
    categoriaIcon: { fontSize: '22px' },
    categoriaNome: { fontSize: '10px', fontWeight: '700', color: '#64748B' },
    categoriaAtiva: { color: '#10B981' },
    cardapioContainer: { padding: '15px', paddingBottom: '120px' },
    categoriaSection: { marginBottom: '25px' },
    categoriaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '15px', cursor: 'pointer' },
    categoriaTitle: { margin: 0, fontSize: '18px', color: '#0F3460', display: 'flex', alignItems: 'center', gap: '8px' },
    categoriaCount: { fontSize: '12px', color: '#94A3B8', fontWeight: 'normal' },
    itensGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    itensList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    itemCard: { backgroundColor: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    // AJUSTE FOTO QUADRADA
    itemImageContainer: { width: '100%', aspectRatio: '1/1', overflow: 'hidden', backgroundColor: '#f0f0f0' },
    itemImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    itemContent: { padding: '12px' },
    itemName: { margin: '0 0 5px 0', fontSize: '15px', fontWeight: '700', color: '#0F3460' },
    // AJUSTE DESCRIÇÃO LIMITADA
    itemDescription: { margin: '0 0 10px 0', fontSize: '12px', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '32px', lineHeight: '16px' },
    itemFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    itemPrice: { fontSize: '15px', fontWeight: '800', color: '#10B981' },
    addButton: { border: 'none', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
    itemCardList: { backgroundColor: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    itemContentList: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
    itemActionsList: { display: 'flex', alignItems: 'center', gap: '10px' },
    addButtonList: { backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '20px', maxHeight: '80vh', overflowY: 'auto' },
    saborCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '8px', cursor: 'pointer' },
    saborCardSelected: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
    saborImg: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' },
    checkboxCircle: { width: '20px', height: '20px', borderRadius: '10px', border: '2px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    carrinhoFlutuante: { position: 'fixed', bottom: 20, left: '5%', width: '90%', backgroundColor: '#0F3460', padding: '15px 20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 900 },
    carrinhoAction: { backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
  };

  const ItemCardapio = ({ item, modo }) => {
    if (modo === 'list') {
      return (
        <div style={styles.itemCardList}>
          <div style={styles.itemContentList}>
            <div style={{flex: 1}}>
              <h4 style={styles.itemName}>{item.nome}</h4>
              <p style={styles.itemDescription}>{item.descricao}</p>
            </div>
            <div style={styles.itemActionsList}>
              <span style={styles.itemPrice}>R$ {parseFloat(item.preco).toFixed(2)}</span>
              <button onClick={() => handleAdicionarClick(item)} style={styles.addButtonList}>
                {item.complementos?.ativo ? 'Personalizar' : <Plus size={16} />}
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
            <span style={styles.itemPrice}>R$ {parseFloat(item.preco).toFixed(2)}</span>
            <button onClick={() => handleAdicionarClick(item)} style={{...styles.addButton, backgroundColor: item.complementos?.ativo ? '#8B5CF6' : '#10B981'}}>
              {item.complementos?.ativo ? 'Personalizar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onVoltar} style={styles.backButton}><ArrowLeft size={20} /> Voltar</button>
        <button ref={carrinhoRef} onClick={onAbrirCarrinho} style={styles.carrinhoButton}>
          <ShoppingCart size={18} /> <span>({carrinho.reduce((acc, i) => acc + i.quantidade, 0)})</span>
        </button>
      </header>

      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento.cliente || 'Loja'}</h1>
        <div style={styles.storeBadges}>
          <span style={{...styles.badge, ...styles.badgeOpen}}>🟢 Aberto</span>
          <span style={{...styles.badge, ...styles.badgeRating}}><Star size={12} fill="#92400E" /> 4.9</span>
          <span style={{...styles.badge, ...styles.badgeTime}}><ClockIcon size={12} /> 30-45 min</span>
        </div>
      </div>

      <div style={styles.filtrosContainer}>
        <div style={styles.buscaContainer}>
          <input type="text" placeholder="Buscar no cardápio..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
          <div style={styles.viewToggle}>
            <button onClick={() => setModoVisualizacao('grid')} style={{...styles.viewButton, ...(modoVisualizacao === 'grid' ? styles.viewButtonAtivo : {})}}><Grid size={16} /></button>
            <button onClick={() => setModoVisualizacao('list')} style={{...styles.viewButton, ...(modoVisualizacao === 'list' ? styles.viewButtonAtivo : {})}}><List size={16} /></button>
          </div>
        </div>
      </div>

      <div style={styles.categoriasContainer}>
        {categorias.map(cat => (
          <button key={cat} onClick={() => setCategoriaSelecionada(cat)} style={{...styles.categoriaButton, ...(categoriaSelecionada === cat ? styles.categoriaAtiva : {})}}>
            <span style={styles.categoriaIcon}>{cat === 'todos' ? '🍽️' : getCategoriaIcon(cat)}</span>
            <span style={styles.categoriaNome}>{cat}</span>
          </button>
        ))}
      </div>

      <div style={styles.cardapioContainer}>
        {Object.entries(itensPorCategoria).map(([categoria, itens]) => (
          <div key={categoria} style={styles.categoriaSection}>
            <div style={styles.categoriaHeader} onClick={() => toggleCategoria(categoria)}>
              <h3 style={styles.categoriaTitle}>{getCategoriaIcon(categoria)} {categoria} <span style={styles.categoriaCount}>({itens.length})</span></h3>
              {expandedCategories[categoria] ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </div>
            {expandedCategories[categoria] && (
              <div style={modoVisualizacao === 'grid' ? styles.itensGrid : styles.itensList}>
                {itens.map(item => <ItemCardapio key={item.id} item={item} modo={modoVisualizacao} />)}
              </div>
            )}
          </div>
        ))}
      </div>

      {itemSelecionadoParaCombo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <div>
                <h2 style={{margin: 0, fontSize: '20px'}}>{itemSelecionadoParaCombo.nome}</h2>
                <p style={{fontSize: '13px', color: '#666'}}>Escolha de {itemSelecionadoParaCombo.complementos.qtdMinima} a {itemSelecionadoParaCombo.complementos.qtdMaxima} sabores</p>
              </div>
              <button onClick={() => setItemSelecionadoParaCombo(null)} style={{background: '#eee', border: 'none', borderRadius: '50%', padding: '5px'}}><X size={20}/></button>
            </div>
            {itemSelecionadoParaCombo.complementos.opcoes.map((sabor, idx) => {
              const isSelected = saboresEscolhidos.find(s => s.nome === sabor.nome);
              return (
                <div key={idx} style={{...styles.saborCard, ...(isSelected ? styles.saborCardSelected : {})}} onClick={() => toggleSabor(sabor)}>
                  <img src={sabor.foto || 'https://via.placeholder.com/50'} style={styles.saborImg} alt="" />
                  <span style={{flex: 1, fontWeight: 'bold'}}>{sabor.nome}</span>
                  <div style={{...styles.checkboxCircle, ...(isSelected ? styles.checkboxActive : {})}}>{isSelected && <Check size={12} color="white" />}</div>
                </div>
              );
            })}
            <button 
              onClick={() => confirmarAdicaoAoCarrinho(itemSelecionadoParaCombo, saboresEscolhidos)}
              style={{width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', opacity: saboresEscolhidos.length >= itemSelecionadoParaCombo.complementos.qtdMinima ? 1 : 0.5}}
              disabled={saboresEscolhidos.length < itemSelecionadoParaCombo.complementos.qtdMinima}
            >
              Adicionar ao Pedido • R$ {parseFloat(itemSelecionadoParaCombo.preco).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div>
            <span style={{fontSize: '12px', opacity: 0.8}}>Total sem entrega</span>
            <div style={{fontSize: '18px', fontWeight: 'bold'}}>R$ {calcularTotal().toFixed(2)}</div>
          </div>
          <button onClick={onAbrirCarrinho} style={styles.carrinhoAction}>Ver Carrinho <ShoppingCart size={18}/></button>
        </div>
      )}
    </div>
  );
};

export default Cardapio;