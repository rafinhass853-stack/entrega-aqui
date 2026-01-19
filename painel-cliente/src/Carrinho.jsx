import React from 'react';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

const Carrinho = ({ carrinho, estabelecimento, onVoltar, onContinuar }) => {
  const atualizarQuantidade = (itemId, quantidade) => {
    // Esta função será passada do componente pai
    onContinuar('atualizarQuantidade', { itemId, quantidade });
  };

  const removerItem = (itemId) => {
    onContinuar('removerItem', { itemId });
  };

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
      gap: '15px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer'
    },
    headerTitle: {
      color: 'white',
      margin: 0,
      fontSize: '20px',
      fontWeight: '700'
    },
    content: {
      padding: '20px',
      paddingBottom: '200px'
    },
    storeInfo: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '16px',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    storeName: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#0F3460',
      margin: '0 0 10px 0'
    },
    storeAddress: {
      color: '#64748B',
      fontSize: '14px',
      margin: 0
    },
    carrinhoVazio: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    carrinhoVazioIcon: {
      color: '#94A3B8',
      marginBottom: '20px'
    },
    carrinhoVazioText: {
      color: '#64748B',
      fontSize: '16px',
      margin: '0 0 20px 0'
    },
    carrinhoVazioButton: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    itemList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    itemCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    itemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    },
    itemInfo: {
      flex: 1
    },
    itemName: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0F3460',
      margin: '0 0 5px 0'
    },
    itemDescription: {
      fontSize: '14px',
      color: '#64748B',
      margin: 0
    },
    itemPrice: {
      fontSize: '18px',
      fontWeight: '800',
      color: '#10B981'
    },
    itemControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginTop: '15px'
    },
    quantidadeControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    quantidadeButton: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#F1F5F9',
      color: '#0F3460',
      fontSize: '18px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    quantidadeText: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0F3460',
      minWidth: '30px',
      textAlign: 'center'
    },
    removerButton: {
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    resumo: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      padding: '25px 20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      zIndex: 1000
    },
    resumoContent: {
      maxWidth: '500px',
      margin: '0 auto'
    },
    resumoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    resumoLabel: {
      fontSize: '14px',
      color: '#64748B'
    },
    resumoValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0F3460'
    },
    resumoTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: '2px solid #E2E8F0'
    },
    resumoTotalLabel: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0F3460'
    },
    resumoTotalValue: {
      fontSize: '24px',
      fontWeight: '800',
      color: '#10B981'
    },
    continuarButton: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '18px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      width: '100%',
      marginTop: '20px',
      transition: 'background 0.3s ease'
    }
  };

  if (carrinho.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <button onClick={onVoltar} style={styles.backButton}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={styles.headerTitle}>Carrinho</h2>
          </div>
        </header>
        <div style={styles.content}>
          <div style={styles.carrinhoVazio}>
            <ShoppingBag size={64} style={styles.carrinhoVazioIcon} />
            <p style={styles.carrinhoVazioText}>Seu carrinho está vazio</p>
            <button onClick={onVoltar} style={styles.carrinhoVazioButton}>
              Voltar ao cardápio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={styles.headerTitle}>Carrinho</h2>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.storeInfo}>
          <h3 style={styles.storeName}>{estabelecimento.cliente}</h3>
          <p style={styles.storeAddress}>
            {estabelecimento.endereco?.bairro || 'Vila Santana'} • {estabelecimento.endereco?.cidade || 'Araraquara'}
          </p>
        </div>

        <div style={styles.itemList}>
          {carrinho.map(item => (
            <div key={item.id} style={styles.itemCard}>
              <div style={styles.itemHeader}>
                <div style={styles.itemInfo}>
                  <h4 style={styles.itemName}>{item.nome}</h4>
                  <p style={styles.itemDescription}>
                    {item.descricao || 'Sem descrição'}
                  </p>
                </div>
                <span style={styles.itemPrice}>
                  R$ {(parseFloat(item.preco) * item.quantidade).toFixed(2)}
                </span>
              </div>
              <div style={styles.itemControls}>
                <div style={styles.quantidadeControls}>
                  <button 
                    onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                    style={styles.quantidadeButton}
                  >
                    <Minus size={16} />
                  </button>
                  <span style={styles.quantidadeText}>{item.quantidade}</span>
                  <button 
                    onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                    style={styles.quantidadeButton}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => removerItem(item.id)}
                  style={styles.removerButton}
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.resumo}>
        <div style={styles.resumoContent}>
          <div style={styles.resumoRow}>
            <span style={styles.resumoLabel}>Subtotal</span>
            <span style={styles.resumoValue}>R$ {calcularSubtotal().toFixed(2)}</span>
          </div>
          <div style={styles.resumoRow}>
            <span style={styles.resumoLabel}>Taxa de entrega</span>
            <span style={styles.resumoValue}>
              {estabelecimento.taxaEntrega > 0 ? `R$ ${Number(estabelecimento.taxaEntrega).toFixed(2)}` : 'Grátis'}
            </span>
          </div>
          <div style={styles.resumoTotal}>
            <span style={styles.resumoTotalLabel}>Total</span>
            <span style={styles.resumoTotalValue}>R$ {calcularTotal().toFixed(2)}</span>
          </div>
          <button 
            onClick={() => onContinuar('continuar')}
            style={styles.continuarButton}
          >
            Continuar com o pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default Carrinho;