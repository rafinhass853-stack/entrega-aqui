import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ArrowLeft, ShoppingCart, Star, Clock, Tag, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

const Cardapio = ({ estabelecimento, onVoltar, onAbrirCarrinho }) => {
  const [cardapio, setCardapio] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [carrinho, setCarrinho] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Estados para o Modal de Sabores
  const [itemSelecionadoParaCombo, setItemSelecionadoParaCombo] = useState(null);
  const [saboresEscolhidos, setSaboresEscolhidos] = useState([]);

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

  // --- LÓGICA DE SABORES (ATUALIZADA PARA OBJETOS) ---
  const handleAdicionarClick = (item) => {
    if (item.complementos?.ativo) {
      setItemSelecionadoParaCombo(item);
      setSaboresEscolhidos([]);
    } else {
      confirmarAdicaoAoCarrinho(item, []);
    }
  };

  const toggleSabor = (sabor) => {
    // Comparamos pelo nome já que agora sabor é um objeto {nome, foto}
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

    // Criamos um ID único baseado nos nomes dos sabores escolhidos
    const nomesSabores = sabores.map(s => s.nome);
    const idUnico = item.id + (nomesSabores.length > 0 ? '-' + nomesSabores.join('-') : '');
    
    const itemNoCarrinho = carrinho.find(i => i.idUnico === idUnico);
    
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(i => 
        i.idUnico === idUnico ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, { ...item, idUnico, sabores: nomesSabores, quantidade: 1 }]);
    }

    setItemSelecionadoParaCombo(null);
    setSaboresEscolhidos([]);
  };

  const calcularTotal = () => carrinho.reduce((total, item) => total + (parseFloat(item.preco) * item.quantidade), 0);
  
  const itensPorCategoria = cardapio.reduce((acc, item) => {
    const categoria = item.categoria || 'sem-categoria';
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(item);
    return acc;
  }, {});

  const toggleCategoria = (categoria) => {
    setExpandedCategories(prev => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#0F3460', padding: '20px', position: 'sticky', top: 0, zIndex: 100, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    headerContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '600' },
    carrinhoButton: { background: '#10B981', border: 'none', borderRadius: '12px', padding: '10px 20px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    storeInfo: { textAlign: 'center', padding: '25px 20px', backgroundColor: 'white', marginBottom: '20px', borderRadius: '0 0 24px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    storeName: { fontSize: '28px', fontWeight: '900', color: '#0F3460', margin: '0 0 10px 0' },
    storeBadges: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' },
    badge: { display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    badgeOpen: { backgroundColor: '#D1FAE5', color: '#065F46' },
    badgeRating: { backgroundColor: '#FEF3C7', color: '#92400E' },
    badgeTime: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    cardapioContainer: { padding: '0 20px 100px' },
    categoriaSection: { marginBottom: '30px' },
    categoriaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    categoriaTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '700', color: '#0F3460', margin: 0 },
    itensGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    itemCard: { backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    itemImage: { width: '100%', height: '180px', objectFit: 'cover' },
    itemContent: { padding: '20px' },
    itemName: { fontSize: '18px', fontWeight: '700', color: '#0F3460', margin: '0 0 8px 0' },
    itemDescription: { fontSize: '14px', color: '#64748B', margin: '0 0 15px 0', lineHeight: 1.5 },
    itemFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    itemPrice: { fontSize: '20px', fontWeight: '800', color: '#10B981' },
    addButton: { backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },

    // MODAL DE SABORES ESTILIZADO COM FOTO
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', zIndex: 2000 },
    modalContent: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' },
    saborCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', borderRadius: '16px', border: '2px solid #F1F5F9', marginBottom: '10px', cursor: 'pointer', transition: '0.2s' },
    saborCardSelected: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
    saborImg: { width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', backgroundColor: '#F1F5F9' },
    checkboxCircle: { width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    
    carrinhoFlutuante: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 1000 },
    carrinhoAction: { backgroundColor: '#0F3460', color: 'white', border: 'none', borderRadius: '12px', padding: '15px 30px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}><ArrowLeft size={24} /> Voltar</button>
          <button onClick={() => onAbrirCarrinho(carrinho)} style={styles.carrinhoButton}>
            <ShoppingCart size={20} /> ({carrinho.reduce((total, item) => total + item.quantidade, 0)})
          </button>
        </div>
      </header>

      <div style={styles.storeInfo}>
        <h1 style={styles.storeName}>{estabelecimento.loginUsuario || 'Loja'}</h1>
        <div style={styles.storeBadges}>
            <span style={{ ...styles.badge, ...styles.badgeOpen }}>🟢 Aberto</span>
            <span style={{ ...styles.badge, ...styles.badgeRating }}><Star size={14} fill="#92400E" /> 4.9</span>
            <span style={{ ...styles.badge, ...styles.badgeTime }}><Clock size={14} /> 35-45 min</span>
        </div>
      </div>

      <div style={styles.cardapioContainer}>
        {Object.entries(itensPorCategoria).map(([categoria, itens]) => (
          <div key={categoria} style={styles.categoriaSection}>
            <div style={styles.categoriaHeader} onClick={() => toggleCategoria(categoria)}>
              <h3 style={styles.categoriaTitle}><Tag size={20} /> {categoria}</h3>
              {expandedCategories[categoria] ? <ChevronUp /> : <ChevronDown />}
            </div>
            
            {expandedCategories[categoria] && (
              <div style={styles.itensGrid}>
                {itens.map(item => (
                  <div key={item.id} style={styles.itemCard}>
                    {item.foto && <img src={item.foto} style={styles.itemImage} alt={item.nome} />}
                    <div style={styles.itemContent}>
                      <h4 style={styles.itemName}>{item.nome}</h4>
                      <p style={styles.itemDescription}>{item.descricao}</p>
                      <div style={styles.itemFooter}>
                        <span style={styles.itemPrice}>R$ {parseFloat(item.preco).toFixed(2)}</span>
                        <button onClick={() => handleAdicionarClick(item)} style={styles.addButton}>
                          {item.complementos?.ativo ? 'Ver Opções' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL DE SELEÇÃO DE SABORES COM FOTOS */}
      {itemSelecionadoParaCombo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <div>
                <h2 style={{margin: 0, color: '#0F3460', fontSize: '20px'}}>{itemSelecionadoParaCombo.nome}</h2>
                <p style={{margin: '5px 0 0 0', color: '#64748B', fontSize: '14px'}}>
                  {itemSelecionadoParaCombo.complementos.tituloGrupo} 
                  <span style={{color: '#10B981', fontWeight: 'bold', marginLeft: '8px'}}>
                    ({saboresEscolhidos.length} de {itemSelecionadoParaCombo.complementos.qtdMaxima})
                  </span>
                </p>
              </div>
              <button onClick={() => setItemSelecionadoParaCombo(null)} style={{background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '50%'}}><X size={20} /></button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px'}}>
              {itemSelecionadoParaCombo.complementos.opcoes.map((sabor, idx) => {
                const isSelected = saboresEscolhidos.find(s => s.nome === sabor.nome);
                return (
                  <div 
                    key={idx} 
                    style={{...styles.saborCard, ...(isSelected ? styles.saborCardSelected : {})}}
                    onClick={() => toggleSabor(sabor)}
                  >
                    <img src={sabor.foto || 'https://via.placeholder.com/60'} style={styles.saborImg} alt="" />
                    <span style={{flex: 1, fontWeight: '600', color: '#0F3460'}}>{sabor.nome}</span>
                    <div style={{...styles.checkboxCircle, ...(isSelected ? styles.checkboxActive : {})}}>
                      {isSelected && <Check size={14} color="white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => confirmarAdicaoAoCarrinho(itemSelecionadoParaCombo, saboresEscolhidos)}
              style={{
                ...styles.carrinhoAction, 
                width: '100%', 
                opacity: saboresEscolhidos.length >= itemSelecionadoParaCombo.complementos.qtdMinima ? 1 : 0.5,
                backgroundColor: saboresEscolhidos.length >= itemSelecionadoParaCombo.complementos.qtdMinima ? '#10B981' : '#CBD5E1'
              }}
              disabled={saboresEscolhidos.length < itemSelecionadoParaCombo.complementos.qtdMinima}
            >
              Confirmar Escolha • R$ {parseFloat(itemSelecionadoParaCombo.preco).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER CARRINHO */}
      {carrinho.length > 0 && (
        <div style={styles.carrinhoFlutuante}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
               <span style={{display: 'block', color: '#64748B', fontSize: '12px'}}>Total do pedido</span>
               <span style={{fontSize: '20px', fontWeight: '800', color: '#10B981'}}>R$ {calcularTotal().toFixed(2)}</span>
            </div>
            <button onClick={() => onAbrirCarrinho(carrinho)} style={styles.carrinhoAction}>Ver Carrinho</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cardapio;