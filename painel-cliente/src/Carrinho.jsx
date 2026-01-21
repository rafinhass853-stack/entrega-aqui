import React from 'react';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

const Carrinho = ({ carrinho, estabelecimento, onVoltar, onAtualizarQuantidade, onRemoverItem, onIrParaCadastro }) => {
  
  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.preco) || 0;
      return total + (preco * item.quantidade);
    }, 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const taxaEntrega = parseFloat(estabelecimento?.taxaEntrega) || 0;
    return subtotal + taxaEntrega;
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#0F3460', padding: '20px', position: 'sticky', top: 0, zIndex: 100, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    headerContent: { display: 'flex', alignItems: 'center', gap: '15px' },
    backButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    headerTitle: { color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' },
    content: { padding: '20px', paddingBottom: '240px' }, // Aumentado para não cobrir o último item
    storeInfo: { backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    storeName: { fontSize: '20px', fontWeight: '700', color: '#0F3460', margin: '0 0 5px 0' },
    storeAddress: { color: '#64748B', fontSize: '13px', margin: 0 },
    addMaisButton: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px dashed #CBD5E1', backgroundColor: 'transparent', color: '#64748B', fontWeight: '600', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    itemList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    itemCard: { backgroundColor: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    itemHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    itemPrice: { fontWeight: '700', color: '#10B981' },
    itemControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
    quantidadeControls: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px' },
    btnQtde: { width: '28px', height: '28px', border: 'none', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    resumo: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: '20px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -10px 20px rgba(0,0,0,0.05)', zIndex: 1000 },
    btnFinalizar: { width: '100%', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '15px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }
  };

  if (carrinho.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <ShoppingBag size={64} color="#CBD5E1" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#0F3460' }}>Seu carrinho está vazio</h2>
          <p style={{ color: '#64748B', marginBottom: '30px' }}>Que tal escolher algo gostoso?</p>
          <button onClick={onVoltar} style={{...styles.btnFinalizar, marginTop: 0}}>Voltar ao Cardápio</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}><ArrowLeft size={24} /></button>
          <h2 style={styles.headerTitle}>Meu Carrinho</h2>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.storeInfo}>
          <h3 style={styles.storeName}>{estabelecimento.cliente || 'Loja'}</h3>
          <p style={styles.storeAddress}>Araraquara, SP</p>
        </div>

        <button onClick={onVoltar} style={styles.addMaisButton}>
          <Plus size={18} /> Adicionar mais itens
        </button>

        <div style={styles.itemList}>
          {carrinho.map((item) => (
            <div key={item.idUnico} style={styles.itemCard}>
              <div style={styles.itemHeader}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: '#0F3460', fontSize: '15px' }}>{item.nome}</h4>
                  {item.sabores?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {item.sabores.map((sabor, idx) => (
                        <span key={idx} style={{ fontSize: '10px', backgroundColor: '#F0FDF4', color: '#10B981', padding: '2px 8px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
                          {sabor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={styles.itemPrice}>R$ {(parseFloat(item.preco) * item.quantidade).toFixed(2)}</span>
              </div>
              
              <div style={styles.itemControls}>
                <button 
                  onClick={() => onRemoverItem(item.idUnico)} 
                  style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '5px' }}
                >
                  <Trash2 size={14} /> Remover
                </button>
                
                <div style={styles.quantidadeControls}>
                  <button 
                    onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade - 1)}
                    style={styles.btnQtde}
                    disabled={item.quantidade <= 1}
                  >
                    <Minus size={14} color={item.quantidade <= 1 ? "#CBD5E1" : "#0F3460"} />
                  </button>
                  <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center', color: '#0F3460' }}>{item.quantidade}</span>
                  <button 
                    onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade + 1)}
                    style={styles.btnQtde}
                  >
                    <Plus size={14} color="#0F3460" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.resumo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#64748B' }}>Subtotal</span>
          <span style={{ fontWeight: '600' }}>R$ {calcularSubtotal().toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ color: '#64748B' }}>Taxa de entrega</span>
          <span style={{ fontWeight: '600', color: '#10B981' }}>
            {parseFloat(estabelecimento.taxaEntrega) > 0 
              ? `R$ ${parseFloat(estabelecimento.taxaEntrega).toFixed(2)}` 
              : 'Grátis'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '15px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F3460' }}>Total</span>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#10B981' }}>R$ {calcularTotal().toFixed(2)}</span>
        </div>
        <button onClick={onIrParaCadastro} style={styles.btnFinalizar}>
          Finalizar Pedido
        </button>
      </div>
    </div>
  );
};

export default Carrinho;