import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Package, AlertCircle, MapPin, Clock, Shield, MessageCircle } from 'lucide-react';

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

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const calcAdicionais = (item) => {
  const grupos = Array.isArray(item?.escolhas) ? item.escolhas : [];
  let total = 0;

  grupos.forEach((g) => {
    (g?.itens || []).forEach((op) => {
      total += toNumber(op?.preco);
    });
  });

  return total;
};

const calcItemUnitarioFinal = (item) => {
  const base = toNumber(item?.precoBaseUnitario ?? item?.preco);
  return base + calcAdicionais(item);
};

const calcItemTotal = (item) => {
  const qtd = toNumber(item?.quantidade) || 1;
  return calcItemUnitarioFinal(item) * qtd;
};

const getStatusLoja = (estabelecimento) => {
  const flagAberto = estabelecimento?.aberto;
  
  if (typeof flagAberto === 'boolean') {
    return {
      aberto: flagAberto,
      mensagem: flagAberto ? 'Aberto agora' : 'Fechado no momento',
      cor: flagAberto ? '#10B981' : '#EF4444',
      icone: flagAberto ? '🟢' : '🔴'
    };
  }

  return { 
    aberto: true, 
    mensagem: 'Aberto', 
    cor: '#10B981', 
    icone: '🟢' 
  };
};

const Carrinho = ({
  carrinho,
  estabelecimento,
  onVoltar,
  onAtualizarQuantidade,
  onRemoverItem,
  onIrParaCadastro
}) => {
  const { isMobile, isTablet } = useIsMobile();
  const [mostrarObservacoes, setMostrarObservacoes] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  const calcularSubtotal = () =>
    (Array.isArray(carrinho) ? carrinho : []).reduce((total, item) => total + calcItemTotal(item), 0);

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const taxaEntrega = toNumber(estabelecimento?.taxaEntrega);
    return subtotal + taxaEntrega;
  };

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
      padding: isMobile ? '20px 16px' : '24px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px',
      boxShadow: '0 4px 20px rgba(15, 52, 96, 0.15)'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '15px' : '20px'
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
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: 'rgba(255,255,255,0.25)',
        transform: 'scale(1.05)'
      }
    },
    headerTitle: {
      color: 'white',
      margin: 0,
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: '900',
      flex: 1
    },
    content: {
      padding: isMobile ? '20px 16px' : '24px 20px',
      paddingBottom: isMobile ? '220px' : '200px'
    },
    storeInfo: {
      background: 'white',
      padding: isMobile ? '20px' : '24px',
      borderRadius: '20px',
      marginBottom: '20px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: '1px solid #E2E8F0'
    },
    storeHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '15px'
    },
    storeAvatar: {
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '24px',
      flexShrink: 0
    },
    storeDetails: {
      flex: 1
    },
    storeName: {
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: '900',
      color: '#0F3460',
      margin: '0 0 6px 0'
    },
    storeMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '13px',
      color: '#64748B'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '800',
      marginLeft: 'auto'
    },
    storeFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '15px',
      borderTop: '1px solid #F1F5F9',
      fontSize: '14px',
      color: '#4A5568'
    },
    addMaisButton: {
      width: '100%',
      padding: isMobile ? '16px' : '18px',
      borderRadius: '14px',
      border: '2px dashed #10B981',
      backgroundColor: '#F0FDF4',
      color: '#065F46',
      fontWeight: '800',
      cursor: 'pointer',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: isMobile ? '15px' : '16px',
      transition: 'all 0.3s ease',
      '&:hover': {
        background: '#D1FAE5',
        transform: 'translateY(-2px)'
      }
    },
    itemList: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '16px' : '20px'
    },
    itemCard: {
      background: 'white',
      padding: isMobile ? '20px' : '24px',
      borderRadius: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      border: '1px solid #F1F5F9',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }
    },
    itemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '15px',
      alignItems: 'flex-start',
      gap: '15px'
    },
    itemContent: {
      flex: 1,
      display: 'flex',
      gap: '15px'
    },
    itemImage: {
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      overflow: 'hidden',
      flexShrink: 0,
      background: '#F1F5F9'
    },
    itemDetails: {
      flex: 1
    },
    itemName: {
      margin: 0,
      color: '#0F3460',
      fontSize: isMobile ? '16px' : '17px',
      fontWeight: '900',
      lineHeight: 1.4
    },
    itemPrice: {
      fontWeight: '900',
      color: '#10B981',
      fontSize: isMobile ? '16px' : '18px',
      whiteSpace: 'nowrap'
    },
    opcoesContainer: {
      marginTop: '10px',
      paddingLeft: '15px',
      borderLeft: '3px solid #E2E8F0'
    },
    grupoNome: {
      fontSize: '12px',
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    opcaoItem: {
      fontSize: isMobile ? '13px' : '14px',
      color: '#64748B',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    itemControls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #F1F5F9'
    },
    quantidadeControls: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '12px' : '15px',
      background: '#F8FAFC',
      padding: '6px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0'
    },
    btnQtde: {
      width: isMobile ? '36px' : '40px',
      height: isMobile ? '36px' : '40px',
      border: 'none',
      borderRadius: '10px',
      background: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: '#F1F5F9',
        transform: 'scale(1.05)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    },
    removerButton: {
      background: 'none',
      border: 'none',
      color: '#EF4444',
      fontSize: isMobile ? '13px' : '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderRadius: '10px',
      fontWeight: '700',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: '#FEF2F2'
      }
    },
    resumo: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      padding: isMobile ? '20px 16px' : '24px 20px',
      borderTopLeftRadius: '30px',
      borderTopRightRadius: '30px',
      boxShadow: '0 -15px 40px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: isMobile ? '100%' : isTablet ? '768px' : '1200px',
      margin: '0 auto'
    },
    resumoContent: {
      background: '#F8FAFC',
      padding: '20px',
      borderRadius: '16px',
      border: '1px solid #E2E8F0',
      marginBottom: '20px'
    },
    resumoLinha: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#64748B'
    },
    resumoTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '20px',
      fontWeight: '900',
      color: '#0F3460',
      paddingTop: '15px',
      borderTop: '2px solid #E2E8F0',
      marginTop: '10px'
    },
    btnFinalizar: {
      width: '100%',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      padding: isMobile ? '18px' : '20px',
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: '900',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.3s ease',
      '&:hover:not(:disabled)': {
        transform: 'translateY(-3px)',
        boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)'
      },
      '&:disabled': {
        background: '#CBD5E0',
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none'
      }
    },
    emptyState: {
      textAlign: 'center',
      padding: isMobile ? '80px 20px' : '120px 20px',
      maxWidth: '500px',
      margin: '0 auto'
    },
    emptyIcon: {
      margin: '0 auto 30px auto',
      padding: '25px',
      background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
      borderRadius: '50%',
      width: '100px',
      height: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyTitle: {
      color: '#0F3460',
      fontSize: isMobile ? '24px' : '28px',
      marginBottom: '15px',
      fontWeight: '900'
    },
    emptyText: {
      color: '#64748B',
      marginBottom: '30px',
      fontSize: isMobile ? '16px' : '18px',
      lineHeight: 1.6
    },
    alertBox: {
      background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
      border: '1px solid #F59E0B',
      color: '#92400E',
      padding: isMobile ? '16px' : '20px',
      borderRadius: '16px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '15px',
      fontSize: isMobile ? '14px' : '15px'
    },
    observacoesContainer: {
      marginTop: '20px',
      padding: '20px',
      background: '#F8FAFC',
      borderRadius: '16px',
      border: '1px solid #E2E8F0'
    },
    observacoesTextarea: {
      width: '100%',
      padding: '16px',
      borderRadius: '12px',
      border: '2px solid #E2E8F0',
      fontSize: '14px',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '80px',
      marginTop: '10px',
      backgroundColor: 'white',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#10B981',
        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
      }
    }
  };

  if (!Array.isArray(carrinho) || carrinho.length === 0) {
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
            <ShoppingBag size={isMobile ? 40 : 48} color="#CBD5E1" />
          </div>
          <h2 style={styles.emptyTitle}>Seu carrinho está vazio</h2>
          <p style={styles.emptyText}>
            Adicione itens deliciosos do cardápio para continuar com sua compra.
          </p>
          <button onClick={onVoltar} style={styles.btnFinalizar}>
            <ArrowLeft size={20} style={{transform: 'rotate(180deg)'}} />
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    );
  }

  const status = getStatusLoja(estabelecimento);
  const taxaEntregaNum = toNumber(estabelecimento?.taxaEntrega);
  const subtotal = calcularSubtotal();
  const total = calcularTotal();
  const economiaFrete = taxaEntregaNum === 0 ? 0 : Math.min(taxaEntregaNum, 5);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={isMobile ? 24 : 28} />
          </button>
          <h2 style={styles.headerTitle}>Meu Carrinho</h2>
          <div style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {!status.aberto && (
          <div style={styles.alertBox}>
            <AlertCircle size={isMobile ? 20 : 24} />
            <div style={{flex: 1}}>
              <div style={{fontWeight: '800', marginBottom: '4px'}}>Estabelecimento fechado</div>
              <div>O pedido poderá ser realizado apenas quando estiver aberto.</div>
            </div>
          </div>
        )}

        <div style={styles.storeInfo}>
          <div style={styles.storeHeader}>
            <div style={styles.storeAvatar}>
              {estabelecimento?.cliente?.[0]?.toUpperCase() || 'L'}
            </div>
            <div style={styles.storeDetails}>
              <h3 style={styles.storeName}>{estabelecimento?.cliente || 'Loja'}</h3>
              <div style={styles.storeMeta}>
                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <MapPin size={14} /> {estabelecimento?.endereco?.bairro || 'Bairro'}
                </span>
                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Clock size={14} /> {estabelecimento?.tempoEntrega || 30} min
                </span>
              </div>
            </div>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: `${status.cor}20`,
                color: status.cor
              }}
            >
              {status.icone} {status.mensagem}
            </span>
          </div>
          
          <div style={styles.storeFooter}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Shield size={16} color="#10B981" />
              <span style={{fontSize: '13px', color: '#64748B'}}>Compra segura</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <MessageCircle size={16} color="#3B82F6" />
              <span style={{fontSize: '13px', color: '#64748B'}}>Suporte 24h</span>
            </div>
          </div>
        </div>

        <button onClick={onVoltar} style={styles.addMaisButton}>
          <Plus size={isMobile ? 20 : 22} /> Adicionar mais itens
        </button>

        <div style={styles.itemList}>
          {carrinho.map((item) => {
            const itemTotal = calcItemTotal(item);
            
            return (
              <div key={item.idUnico} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <div style={styles.itemContent}>
                    {item.foto && (
                      <div style={styles.itemImage}>
                        <img
                          src={item.foto}
                          alt={item.nome}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={styles.itemDetails}>
                      <h4 style={styles.itemName}>{item.nome}</h4>
                      
                      {Array.isArray(item.escolhas) && item.escolhas.length > 0 && (
                        <div style={styles.opcoesContainer}>
                          {item.escolhas.map((grupo, idx) => (
                            <div key={idx}>
                              {grupo.grupoNome && (
                                <div style={styles.grupoNome}>{grupo.grupoNome}</div>
                              )}
                              {(grupo.itens || []).map((opcao, opIdx) => (
                                <div key={opIdx} style={styles.opcaoItem}>
                                  <span style={{ color: '#10B981', fontWeight: '900' }}>+</span>
                                  {opcao.nome}{' '}
                                  {toNumber(opcao.preco) > 0 && (
                                    <span style={{ color: '#059669', fontWeight: '700' }}>
                                      (R$ {toNumber(opcao.preco).toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <span style={styles.itemPrice}>
                    R$ {itemTotal.toFixed(2)}
                  </span>
                </div>

                <div style={styles.itemControls}>
                  <button
                    onClick={() => onRemoverItem(item.idUnico)}
                    style={styles.removerButton}
                  >
                    <Trash2 size={isMobile ? 16 : 18} /> Remover
                  </button>

                  <div style={styles.quantidadeControls}>
                    <button
                      onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade - 1)}
                      style={styles.btnQtde}
                      disabled={item.quantidade <= 1}
                    >
                      <Minus
                        size={isMobile ? 16 : 18}
                        color={item.quantidade <= 1 ? '#CBD5E1' : '#0F3460'}
                      />
                    </button>

                    <span
                      style={{
                        fontWeight: '900',
                        minWidth: '24px',
                        textAlign: 'center',
                        color: '#0F3460',
                        fontSize: isMobile ? '16px' : '18px'
                      }}
                    >
                      {item.quantidade}
                    </span>

                    <button
                      onClick={() => onAtualizarQuantidade(item.idUnico, item.quantidade + 1)}
                      style={styles.btnQtde}
                    >
                      <Plus size={isMobile ? 16 : 18} color="#0F3460" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {mostrarObservacoes && (
          <div style={styles.observacoesContainer}>
            <div style={{fontSize: '15px', fontWeight: '800', color: '#0F3460', marginBottom: '10px'}}>
              Observações do pedido
            </div>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, entrega na portaria, etc..."
              style={styles.observacoesTextarea}
            />
            <button
              onClick={() => setMostrarObservacoes(false)}
              style={{
                marginTop: '15px',
                padding: '12px 20px',
                background: '#0F3460',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Salvar Observações
            </button>
          </div>
        )}
      </div>

      <div style={styles.resumo}>
        <div style={styles.resumoContent}>
          <div style={styles.resumoLinha}>
            <span>Subtotal ({carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'})</span>
            <span style={{fontWeight: '700'}}>R$ {subtotal.toFixed(2)}</span>
          </div>
          
          <div style={styles.resumoLinha}>
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              Taxa de entrega
              {taxaEntregaNum === 0 && (
                <span style={{
                  background: '#10B981',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '900'
                }}>
                  GRÁTIS
                </span>
              )}
            </span>
            <span style={{fontWeight: '700', color: taxaEntregaNum === 0 ? '#10B981' : '#64748B'}}>
              {taxaEntregaNum > 0 ? `R$ ${taxaEntregaNum.toFixed(2)}` : 'Grátis'}
            </span>
          </div>
          
          {economiaFrete > 0 && subtotal < 30 && (
            <div style={{
              ...styles.resumoLinha,
              color: '#059669',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              <span>🎯 Adicione mais R$ {(30 - subtotal).toFixed(2)} e ganhe frete grátis!</span>
            </div>
          )}
          
          <div style={styles.resumoTotal}>
            <span>TOTAL</span>
            <span style={{color: '#10B981'}}>R$ {total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={() => setMostrarObservacoes(!mostrarObservacoes)}
            style={{
              flex: 1,
              padding: '16px',
              background: '#F1F5F9',
              color: '#4A5568',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: '#E2E8F0'
              }
            }}
          >
            {mostrarObservacoes ? 'Cancelar' : '+ Observações'}
          </button>
          
          <button
            onClick={onIrParaCadastro}
            style={{
              ...styles.btnFinalizar,
              flex: 2
            }}
            disabled={!status.aberto}
          >
            {status.aberto ? (
              <>
                <ShoppingBag size={isMobile ? 20 : 22} />
                Finalizar Pedido
              </>
            ) : (
              'Aguardando Abertura'
            )}
          </button>
        </div>
        
        {!status.aberto && (
          <div
            style={{
              fontSize: '13px',
              color: '#F59E0B',
              textAlign: 'center',
              marginTop: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '700'
            }}
          >
            <AlertCircle size={14} />
            Este estabelecimento está fechado no momento
          </div>
        )}
        
        <div style={{
          marginTop: '20px',
          paddingTop: '15px',
          borderTop: '1px solid #E2E8F0',
          fontSize: '12px',
          color: '#94A3B8',
          textAlign: 'center'
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <Shield size={12} />
            <span>Pagamento 100% seguro • Entrega garantida</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carrinho;