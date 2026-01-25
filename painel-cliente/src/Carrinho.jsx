import React from 'react';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Package, AlertCircle } from 'lucide-react';

// Hook responsivo
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = React.useState(() => window.innerWidth < 1024);

  React.useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };

    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet };
};

const Carrinho = ({ carrinho, estabelecimento, onVoltar, onAtualizarQuantidade, onRemoverItem, onIrParaCadastro }) => {
  const { isMobile, isTablet } = useIsMobile();
  
  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.precoBaseUnitario || item.preco) || 0;
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
      fontFamily: "'Inter', sans-serif",
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    header: { 
      backgroundColor: '#0F3460', 
      padding: isMobile ? '18px' : '20px', 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      borderBottomLeftRadius: '24px', 
      borderBottomRightRadius: '24px' 
    },
    headerContent: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '12px' : '15px' 
    },
    backButton: { 
      background: 'none', 
      border: 'none', 
      color: 'white', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      padding: '5px'
    },
    headerTitle: { 
      color: 'white', 
      margin: 0, 
      fontSize: isMobile ? '18px' : '20px', 
      fontWeight: '700' 
    },
    content: { 
      padding: isMobile ? '15px' : '20px', 
      paddingBottom: isMobile ? '200px' : '180px' 
    },
    storeInfo: { 
      backgroundColor: 'white', 
      padding: isMobile ? '15px' : '20px', 
      borderRadius: '16px', 
      marginBottom: '20px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '1px solid #E2E8F0'
    },
    storeName: { 
      fontSize: isMobile ? '18px' : '20px', 
      fontWeight: '700', 
      color: '#0F3460', 
      margin: '0 0 8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    storeAddress: { 
      color: '#64748B', 
      fontSize: isMobile ? '12px' : '13px', 
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    storeStatus: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      marginLeft: '10px'
    },
    addMaisButton: { 
      width: '100%', 
      padding: isMobile ? '14px' : '16px', 
      borderRadius: '12px', 
      border: '2px dashed #CBD5E1', 
      backgroundColor: 'transparent', 
      color: '#64748B', 
      fontWeight: '600', 
      cursor: 'pointer', 
      marginBottom: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '8px',
      fontSize: isMobile ? '14px' : '16px',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4'
      }
    },
    itemList: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: isMobile ? '10px' : '12px' 
    },
    itemCard: { 
      backgroundColor: 'white', 
      padding: isMobile ? '12px' : '15px', 
      borderRadius: '16px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid #F1F5F9',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }
    },
    itemHeader: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginBottom: '10px',
      alignItems: 'flex-start',
      gap: '10px'
    },
    itemPrice: { 
      fontWeight: '700', 
      color: '#10B981',
      fontSize: isMobile ? '14px' : '16px',
      whiteSpace: 'nowrap'
    },
    itemControls: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: '10px' 
    },
    quantidadeControls: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '8px' : '12px', 
      backgroundColor: '#F1F5F9', 
      padding: '4px', 
      borderRadius: '8px' 
    },
    btnQtde: { 
      width: isMobile ? '28px' : '32px', 
      height: isMobile ? '28px' : '32px', 
      border: 'none', 
      borderRadius: '6px', 
      backgroundColor: 'white', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#F8FAFC'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    },
    resumo: { 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: 'white', 
      padding: isMobile ? '15px' : '20px', 
      borderTopLeftRadius: '24px', 
      borderTopRightRadius: '24px', 
      boxShadow: '0 -10px 20px rgba(0,0,0,0.05)', 
      zIndex: 1000,
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    btnFinalizar: { 
      width: '100%', 
      backgroundColor: '#10B981', 
      color: 'white', 
      border: 'none', 
      borderRadius: '12px', 
      padding: isMobile ? '16px' : '18px', 
      fontSize: isMobile ? '16px' : '18px', 
      fontWeight: '700', 
      cursor: 'pointer', 
      marginTop: '15px', 
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#0DA271'
      },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    emptyState: {
      textAlign: 'center', 
      padding: isMobile ? '60px 20px' : '100px 20px',
      maxWidth: '400px',
      margin: '0 auto'
    },
    emptyIcon: {
      margin: '0 auto 20px auto',
      padding: '20px',
      backgroundColor: '#F1F5F9',
      borderRadius: '50%',
      width: '80px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyTitle: {
      color: '#0F3460',
      fontSize: isMobile ? '20px' : '24px',
      marginBottom: '10px'
    },
    emptyText: {
      color: '#64748B',
      marginBottom: '30px',
      fontSize: isMobile ? '14px' : '16px',
      lineHeight: 1.5
    },
    opcoesContainer: {
      marginTop: '8px',
      paddingLeft: '10px',
      borderLeft: '2px solid #E2E8F0'
    },
    opcaoItem: {
      fontSize: isMobile ? '11px' : '12px',
      color: '#64748B',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    alertBox: {
      backgroundColor: '#FEF3C7',
      border: '1px solid #F59E0B',
      color: '#92400E',
      padding: isMobile ? '10px' : '12px',
      borderRadius: '10px',
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      fontSize: isMobile ? '12px' : '13px'
    }
  };

  if (carrinho.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <button onClick={onVoltar} style={styles.backButton}>
              <ArrowLeft size={isMobile ? 24 : 28} />
            </button>
            <h2 style={styles.headerTitle}>Meu Carrinho</h2>
          </div>
        </header>

        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <ShoppingBag size={isMobile ? 32 : 40} color="#CBD5E1" />
          </div>
          <h2 style={styles.emptyTitle}>Seu carrinho está vazio</h2>
          <p style={styles.emptyText}>
            Adicione itens deliciosos do cardápio para continuar com sua compra.
          </p>
          <button onClick={onVoltar} style={styles.btnFinalizar}>
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

  const horarioFuncionamento = () => {
    const now = new Date();
    const hora = now.getHours();
    const minuto = now.getMinutes();
    
    // Exemplo: verificar se está entre 18h e 23h
    const aberto = hora >= 18 && hora < 23;
    
    return {
      aberto,
      mensagem: aberto ? 'Aberto agora' : 'Fechado no momento',
      cor: aberto ? '#10B981' : '#EF4444'
    };
  };

  const horario = horarioFuncionamento();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={isMobile ? 24 : 28} />
          </button>
          <h2 style={styles.headerTitle}>Meu Carrinho</h2>
        </div>
      </header>

      <div style={styles.content}>
        {!horario.aberto && (
          <div style={styles.alertBox}>
            <AlertCircle size={isMobile ? 16 : 18} />
            <div>
              <strong>Estabelecimento fechado</strong>
              <div>O pedido poderá ser realizado apenas quando estiver aberto.</div>
            </div>
          </div>
        )}

        <div style={styles.storeInfo}>
          <h3 style={styles.storeName}>
            {estabelecimento.cliente || 'Loja'}
            <span style={{...styles.storeStatus, backgroundColor: `${horario.cor}20`, color: horario.cor}}>
              {horario.aberto ? '🟢' : '🔴'} {horario.mensagem}
            </span>
          </h3>
          <p style={styles.storeAddress}>
            <Package size={isMobile ? 12 : 14} />
            {estabelecimento.endereco?.bairro || 'Araraquara'}, SP • 🚀 {estabelecimento.tempoEntrega || 30} min
          </p>
        </div>

        <button onClick={onVoltar} style={styles.addMaisButton}>
          <Plus size={isMobile ? 18 : 20} /> Adicionar mais itens
        </button>

        <div style={styles.itemList}>
          {carrinho.map((item) => (
            <div key={item.idUnico} style={styles.itemCard}>
              <div style={styles.itemHeader}>
                <div style={{ flex: 1 }}>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '10px'}}>
                    {item.foto && (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <img 
                          src={item.foto} 
                          alt={item.nome} 
                          style={{width: '100%', height: '100%', objectFit: 'cover'}}
                        />
                      </div>
                    )}
                    <div style={{flex: 1}}>
                      <h4 style={{ 
                        margin: 0, 
                        color: '#0F3460', 
                        fontSize: isMobile ? '14px' : '15px',
                        lineHeight: 1.3
                      }}>
                        {item.nome}
                      </h4>
                      {item.escolhas?.map((grupo, idx) => (
                        <div key={idx} style={styles.opcoesContainer}>
                          <div style={{fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '2px'}}>
                            {grupo.grupoNome}:
                          </div>
                          {grupo.itens.map((opcao, opIdx) => (
                            <div key={opIdx} style={styles.opcaoItem}>
                              <span style={{color: '#10B981', fontWeight: 'bold'}}>+</span>
                              {opcao.nome} {opcao.preco > 0 && `(R$ ${opcao.preco.toFixed(2)})`}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <span style={styles.itemPrice}>
                  R$ {((parseFloat(item.precoBaseUnitario || item.preco) || 0) * item.quantidade).toFixed(2)}
                </span>
              </div>
              
              <div style={styles.itemControls}>
                <button 
                  onClick={() => onRemoverItem(item.idUnico)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#EF4444', 
                    fontSize: isMobile ? '12px' : '13px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    padding: '5px',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: '#FEF2F2'
                    }
                  }}
                >
                  <Trash2 size={isMobile ? 14 : 16} /> Remover
                </button>
                
                <div style={styles.quantidadeControls}>
                  <button 
                    onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade - 1)}
                    style={styles.btnQtde}
                    disabled={item.quantidade <= 1}
                  >
                    <Minus size={isMobile ? 14 : 16} color={item.quantidade <= 1 ? "#CBD5E1" : "#0F3460"} />
                  </button>
                  <span style={{ 
                    fontWeight: '700', 
                    minWidth: '20px', 
                    textAlign: 'center', 
                    color: '#0F3460',
                    fontSize: isMobile ? '14px' : '16px'
                  }}>
                    {item.quantidade}
                  </span>
                  <button 
                    onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade + 1)}
                    style={styles.btnQtde}
                  >
                    <Plus size={isMobile ? 14 : 16} color="#0F3460" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.resumo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ color: '#64748B', fontSize: isMobile ? '13px' : '14px' }}>Subtotal</span>
          <span style={{ fontWeight: '600', fontSize: isMobile ? '15px' : '16px' }}>
            R$ {calcularSubtotal().toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
          <span style={{ color: '#64748B', fontSize: isMobile ? '13px' : '14px' }}>Taxa de entrega</span>
          <span style={{ fontWeight: '600', color: '#10B981', fontSize: isMobile ? '15px' : '16px' }}>
            {parseFloat(estabelecimento.taxaEntrega) > 0 
              ? `R$ ${parseFloat(estabelecimento.taxaEntrega).toFixed(2)}` 
              : 'Grátis'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '15px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#0F3460' }}>Total</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
          <span style={{ fontSize: isMobile ? '22px' : '24px', fontWeight: '800', color: '#10B981' }}>
            R$ {calcularTotal().toFixed(2)}
          </span>
        </div>
        <button 
          onClick={onIrParaCadastro} 
          style={styles.btnFinalizar}
          disabled={!horario.aberto}
        >
          {horario.aberto ? (
            <>
              <ShoppingBag size={isMobile ? 20 : 22} />
              Finalizar Pedido
            </>
          ) : (
            'Aguardando Abertura'
          )}
        </button>
        
        {!horario.aberto && (
          <div style={{
            fontSize: '12px',
            color: '#F59E0B',
            textAlign: 'center',
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}>
            <AlertCircle size={12} />
            Este estabelecimento está fechado no momento
          </div>
        )}
      </div>
    </div>
  );
};

export default Carrinho;