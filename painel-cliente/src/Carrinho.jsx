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

// Helpers de preço (padroniza carrinho/checkout/painel)
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

/**
 * ✅ Regra de abertura:
 * 1) Se o estabelecimento tiver booleano aberto (aberto/isOpen/statusAberto/open), usa ele.
 * 2) Senão calcula por horário.
 * 3) Se não tiver nada, assume ABERTO.
 */
const getStatusLoja = (estabelecimento) => {
  const flagAberto =
    estabelecimento?.aberto ??
    estabelecimento?.isOpen ??
    estabelecimento?.statusAberto ??
    estabelecimento?.open;

  if (typeof flagAberto === 'boolean') {
    return {
      aberto: flagAberto,
      mensagem: flagAberto ? 'Aberto agora' : 'Fechado no momento',
      cor: flagAberto ? '#10B981' : '#EF4444'
    };
  }

  const parseHM = (str) => {
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (Number.isNaN(h) || Number.isNaN(min)) return null;
    return { h, min };
  };

  const horarioStr =
    estabelecimento?.horarioFuncionamento ||
    estabelecimento?.horario ||
    estabelecimento?.funcionamento ||
    estabelecimento?.horarioAtendimento;

  const ab = parseHM(estabelecimento?.horarioAbertura);
  const fe = parseHM(estabelecimento?.horarioFechamento);

  let abertura = ab;
  let fechamento = fe;

  if ((!abertura || !fechamento) && typeof horarioStr === 'string') {
    const match = horarioStr.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
    if (match) {
      abertura = parseHM(match[1]);
      fechamento = parseHM(match[2]);
    }
  }

  if (abertura && fechamento) {
    const agora = new Date();

    const inicio = new Date();
    inicio.setHours(abertura.h, abertura.min, 0, 0);

    const fim = new Date();
    fim.setHours(fechamento.h, fechamento.min, 0, 0);

    let aberto;
    if (fim < inicio) {
      aberto = agora >= inicio || agora <= fim;
    } else {
      aberto = agora >= inicio && agora <= fim;
    }

    return {
      aberto,
      mensagem: aberto ? 'Aberto agora' : 'Fechado no momento',
      cor: aberto ? '#10B981' : '#EF4444'
    };
  }

  return { aberto: true, mensagem: 'Aberto', cor: '#10B981' };
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
      transition: 'all 0.2s'
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
      border: '1px solid #F1F5F9'
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
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    btnFinalizarDisabled: { opacity: 0.7, cursor: 'not-allowed' },
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

  const status = getStatusLoja(estabelecimento);
  const taxaEntregaNum = toNumber(estabelecimento?.taxaEntrega);

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
        {!status.aberto && (
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
            {estabelecimento?.cliente || 'Loja'}
            <span
              style={{
                ...styles.storeStatus,
                backgroundColor: `${status.cor}20`,
                color: status.cor
              }}
            >
              {status.aberto ? '🟢' : '🔴'} {status.mensagem}
            </span>
          </h3>

          <p style={styles.storeAddress}>
            <Package size={isMobile ? 12 : 14} />
            {estabelecimento?.endereco?.bairro || 'Araraquara'}, SP • 🚀{' '}
            {estabelecimento?.tempoEntrega || 30} min
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {item.foto && (
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        <img
                          src={item.foto}
                          alt={item.nome}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          color: '#0F3460',
                          fontSize: isMobile ? '14px' : '15px',
                          lineHeight: 1.3
                        }}
                      >
                        {item.nome}
                      </h4>

                      {Array.isArray(item.escolhas) && item.escolhas.map((grupo, idx) => (
                        <div key={idx} style={styles.opcoesContainer}>
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#94A3B8',
                              fontWeight: 'bold',
                              marginBottom: '2px'
                            }}
                          >
                            {grupo.grupoNome}:
                          </div>
                          {(grupo.itens || []).map((opcao, opIdx) => (
                            <div key={opIdx} style={styles.opcaoItem}>
                              <span style={{ color: '#10B981', fontWeight: 'bold' }}>+</span>
                              {opcao.nome}{' '}
                              {toNumber(opcao.preco) > 0 && `(R$ ${toNumber(opcao.preco).toFixed(2)})`}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <span style={styles.itemPrice}>
                  R$ {calcItemTotal(item).toFixed(2)}
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
                    borderRadius: '6px'
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
                    <Minus
                      size={isMobile ? 14 : 16}
                      color={item.quantidade <= 1 ? '#CBD5E1' : '#0F3460'}
                    />
                  </button>

                  <span
                    style={{
                      fontWeight: '700',
                      minWidth: '20px',
                      textAlign: 'center',
                      color: '#0F3460',
                      fontSize: isMobile ? '14px' : '16px'
                    }}
                  >
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
            {taxaEntregaNum > 0 ? `R$ ${taxaEntregaNum.toFixed(2)}` : 'Grátis'}
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
          style={{ ...styles.btnFinalizar, ...(status.aberto ? {} : styles.btnFinalizarDisabled) }}
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

        {!status.aberto && (
          <div
            style={{
              fontSize: '12px',
              color: '#F59E0B',
              textAlign: 'center',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <AlertCircle size={12} />
            Este estabelecimento está fechado no momento
          </div>
        )}
      </div>
    </div>
  );
};

export default Carrinho;
