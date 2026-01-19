import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { ArrowLeft, ShoppingCart, Star, Clock, Bike, Tag, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const Cardapio = ({ estabelecimento, onVoltar, onAbrirCarrinho }) => {
  const [cardapio, setCardapio] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [carrinho, setCarrinho] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    if (!estabelecimento) return;

    const fetchCardapio = async () => {
      try {
        const cardapioRef = collection(db, 'estabelecimentos', estabelecimento.id, 'cardapio');
        const q = query(cardapioRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cardapioData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Agrupar por categoria
          const categoriasUnicas = [...new Set(cardapioData.map(item => item.categoria || 'sem-categoria'))];
          setCategorias(['todos', ...categoriasUnicas]);
          setCardapio(cardapioData);

          // Expandir todas as categorias inicialmente
          const expanded = {};
          categoriasUniques.forEach(cat => {
            expanded[cat] = true;
          });
          setExpandedCategories(expanded);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
      }
    };

    fetchCardapio();
  }, [estabelecimento]);

  const adicionarAoCarrinho = (item) => {
    const itemNoCarrinho = carrinho.find(i => i.id === item.id);
    
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(i => 
        i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, { ...item, quantidade: 1 }]);
    }
  };

  const removerDoCarrinho = (itemId) => {
    setCarrinho(carrinho.filter(item => item.id !== itemId));
  };

  const atualizarQuantidade = (itemId, quantidade) => {
    if (quantidade < 1) {
      removerDoCarrinho(itemId);
      return;
    }
    
    setCarrinho(carrinho.map(item => 
      item.id === itemId ? { ...item, quantidade } : item
    ));
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.preco) || 0;
      return total + (preco * item.quantidade);
    }, 0);
  };

  const itensPorCategoria = cardapio.reduce((acc, item) => {
    const categoria = item.categoria || 'sem-categoria';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(item);
    return acc;
  }, {});

  const itensFiltrados = categoriaSelecionada === 'todos' 
    ? cardapio 
    : cardapio.filter(item => item.categoria === categoriaSelecionada);

  const toggleCategoria = (categoria) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const styles = {
    container: {
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      backgroundColor: '#0F3460',
      padding: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '16px',
      fontWeight: '600'
    },
    carrinhoButton: {
      background: '#10B981',
      border: 'none',
      borderRadius: '12px',
      padding: '10px 20px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px'
    },
    storeInfo: {
      textAlign: 'center',
      padding: '25px 20px',
      backgroundColor: 'white',
      marginBottom: '20px',
      borderRadius: '0 0 24px 24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    storeName: {
      fontSize: '28px',
      fontWeight: '900',
      color: '#0F3460',
      margin: '0 0 10px 0'
    },
    storeBadges: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: '10px',
      marginBottom: '15px'
    },
    badge: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    },
    badgeOpen: {
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    badgeRating: {
      backgroundColor: '#FEF3C7',
      color: '#92400E'
    },
    badgeTime: {
      backgroundColor: '#DBEAFE',
      color: '#1E40AF'
    },
    badgeDelivery: {
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    storeAddress: {
      color: '#64748B',
      fontSize: '14px',
      marginTop: '10px'
    },
    categoriasContainer: {
      display: 'flex',
      gap: '10px',
      padding: '0 20px 20px',
      overflowX: 'auto',
      scrollbarWidth: 'none'
    },
    categoriaButton: {
      padding: '10px 20px',
      borderRadius: '20px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.3s ease'
    },
    categoriaAtiva: {
      backgroundColor: '#10B981',
      color: 'white'
    },
    categoriaInativa: {
      backgroundColor: '#E2E8F0',
      color: '#64748B'
    },
    cardapioContainer: {
      padding: '0 20px 100px'
    },
    categoriaSection: {
      marginBottom: '30px'
    },
    categoriaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '12px',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    categoriaTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '18px',
      fontWeight: '700',
      color: '#0F3460',
      margin: 0
    },
    itensGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    },
    itemCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      transition: 'transform 0.3s ease',
      ':hover': {
        transform: 'translateY(-5px)'
      }
    },
    itemImage: {
      width: '100%',
      height: '180px',
      objectFit: 'cover'
    },
    itemContent: {
      padding: '20px'
    },
    itemName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0F3460',
      margin: '0 0 8px 0'
    },
    itemDescription: {
      fontSize: '14px',
      color: '#64748B',
      margin: '0 0 15px 0',
      lineHeight: 1.5
    },
    itemFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    itemPrice: {
      fontSize: '20px',
      fontWeight: '800',
      color: '#10B981'
    },
    addButton: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
    },
    carrinhoFlutuante: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      padding: '20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      zIndex: 1000
    },
    carrinhoContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    carrinhoInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '5px'
    },
    carrinhoItems: {
      fontSize: '14px',
      color: '#64748B'
    },
    carrinhoTotal: {
      fontSize: '20px',
      fontWeight: '800',
      color: '#10B981'
    },
    carrinhoAction: {
      backgroundColor: '#0F3460',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '15px 30px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    emptyText: {
      color: '#64748B',
      fontSize: '16px',
      margin: '20px 0'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={24} />
            Voltar
          </button>
          <h2 style={{ color: 'white', margin: 0 }}>Cardápio</h2>
          <button onClick={() => onAbrirCarrinho(carrinho)} style={styles.carrinhoButton}>
            <ShoppingCart size={20} />
            Carrinho ({carrinho.reduce((total, item) => total + item.quantidade, 0)})
          </button>
        </div>
      </header>

      {/* Informações do estabelecimento */}
      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento.cliente}</h1>
        <div style={styles.storeBadges}>
          <span style={{ ...styles.badge, ...styles.badgeOpen }}>
            {estabelecimento.aberto ? '🟢 Aberto agora' : '🔴 Fechado'}
          </span>
          <span style={{ ...styles.badge, ...styles.badgeRating }}>
            <Star size={14} /> {estabelecimento.avaliacao || 4.9}
          </span>
          <span style={{ ...styles.badge, ...styles.badgeTime }}>
            <Clock size={14} /> {estabelecimento.tempoEntrega || 25}-{estabelecimento.tempoEntrega + 10 || 35} min
          </span>
          <span style={{ ...styles.badge, ...styles.badgeDelivery }}>
            <Bike size={14} /> {estabelecimento.taxaEntrega > 0 ? `R$ ${Number(estabelecimento.taxaEntrega).toFixed(2)}` : 'Frete Grátis'}
          </span>
        </div>
        <p style={styles.storeAddress}>
          {estabelecimento.endereco?.bairro || 'Vila Santana'} • {estabelecimento.endereco?.cidade || 'Araraquara'}
        </p>
      </div>

      {/* Filtros de categoria */}
      <div style={styles.categoriasContainer}>
        <button
          onClick={() => setCategoriaSelecionada('todos')}
          style={{
            ...styles.categoriaButton,
            ...(categoriaSelecionada === 'todos' ? styles.categoriaAtiva : styles.categoriaInativa)
          }}
        >
          Todos
        </button>
        {categorias
          .filter(cat => cat !== 'todos')
          .map(categoria => (
            <button
              key={categoria}
              onClick={() => setCategoriaSelecionada(categoria)}
              style={{
                ...styles.categoriaButton,
                ...(categoriaSelecionada === categoria ? styles.categoriaAtiva : styles.categoriaInativa)
              }}
            >
              {categoria === 'sem-categoria' ? 'Outros' : categoria}
            </button>
          ))}
      </div>

      {/* Lista do cardápio */}
      <div style={styles.cardapioContainer}>
        {categoriaSelecionada === 'todos' ? (
          // Mostrar por categorias
          Object.entries(itensPorCategoria).map(([categoria, itens]) => (
            <div key={categoria} style={styles.categoriaSection}>
              <div 
                style={styles.categoriaHeader}
                onClick={() => toggleCategoria(categoria)}
              >
                <h3 style={styles.categoriaTitle}>
                  <Tag size={20} />
                  {categoria === 'sem-categoria' ? 'Outros' : categoria}
                  <span style={{ fontSize: '14px', color: '#64748B' }}>
                    ({itens.length} itens)
                  </span>
                </h3>
                {expandedCategories[categoria] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {expandedCategories[categoria] && (
                <div style={styles.itensGrid}>
                  {itens.map(item => (
                    <div key={item.id} style={styles.itemCard}>
                      {item.foto && (
                        <img src={item.foto} alt={item.nome} style={styles.itemImage} />
                      )}
                      <div style={styles.itemContent}>
                        <h4 style={styles.itemName}>{item.nome}</h4>
                        <p style={styles.itemDescription}>
                          {item.descricao || 'Sem descrição'}
                        </p>
                        <div style={styles.itemFooter}>
                          <span style={styles.itemPrice}>
                            R$ {item.preco ? Number(item.preco).toFixed(2) : '0.00'}
                          </span>
                          <button 
                            onClick={() => adicionarAoCarrinho(item)}
                            style={styles.addButton}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          // Mostrar apenas itens da categoria selecionada
          <div style={styles.itensGrid}>
            {itensFiltrados.map(item => (
              <div key={item.id} style={styles.itemCard}>
                {item.foto && (
                  <img src={item.foto} alt={item.nome} style={styles.itemImage} />
                )}
                <div style={styles.itemContent}>
                  <h4 style={styles.itemName}>{item.nome}</h4>
                  <p style={styles.itemDescription}>
                    {item.descricao || 'Sem descrição'}
                  </p>
                  <div style={styles.itemFooter}>
                    <span style={styles.itemPrice}>
                      R$ {item.preco ? Number(item.preco).toFixed(2) : '0.00'}
                    </span>
                    <button 
                      onClick={() => adicionarAoCarrinho(item)}
                      style={styles.addButton}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cardapio.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Nenhum produto disponível no momento</p>
          </div>
        )}
      </div>

      {/* Carrinho flutuante */}
      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div style={styles.carrinhoContent}>
            <div style={styles.carrinhoInfo}>
              <span style={styles.carrinhoItems}>
                {carrinho.reduce((total, item) => total + item.quantidade, 0)} itens
              </span>
              <span style={styles.carrinhoTotal}>
                R$ {calcularTotal().toFixed(2)}
              </span>
            </div>
            <button 
              onClick={() => onAbrirCarrinho(carrinho)}
              style={styles.carrinhoAction}
            >
              Ver Carrinho
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cardapio;