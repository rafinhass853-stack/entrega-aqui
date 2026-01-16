import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDocs
} from 'firebase/firestore';

const Faturamento = ({ user, isMobile }) => {
  const [periodo, setPeriodo] = useState('hoje');
  const [dadosFaturamento, setDadosFaturamento] = useState({
    faturamentoBruto: 0,
    taxasEntrega: 0,
    comissoesPlataformas: 0,
    faturamentoLiquido: 0,
    formasPagamento: {
      pix: 0,
      cartao: 0,
      dinheiro: 0
    },
    transacoes: []
  });

  useEffect(() => {
    fetchFaturamentoData();
  }, [user, periodo]);

  const fetchFaturamentoData = async () => {
    if (!user) return;

    try {
      // Simulação de dados
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      
      let dataInicio, dataFim;
      
      switch (periodo) {
        case 'hoje':
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
          dataFim = new Date(hoje.setHours(23, 59, 59, 999));
          break;
        case 'ontem':
          dataInicio = new Date(ontem.setHours(0, 0, 0, 0));
          dataFim = new Date(ontem.setHours(23, 59, 59, 999));
          break;
        case 'semana':
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 7);
          dataFim = new Date();
          break;
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
          dataFim = new Date(hoje.setHours(23, 59, 59, 999));
      }

      // Buscar pedidos no período
      const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
      const q = query(
        pedidosRef,
        where('dataPedido', '>=', dataInicio),
        where('dataPedido', '<=', dataFim),
        where('status', '==', 'entregue')
      );

      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular métricas
      const faturamentoBruto = pedidos.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
      const taxasEntrega = pedidos.reduce((sum, pedido) => sum + (pedido.taxaEntrega || 0), 0);
      const comissoesPlataformas = faturamentoBruto * 0.15; // 15% de comissão
      const faturamentoLiquido = faturamentoBruto - comissoesPlataformas;

      // Formas de pagamento (simulação)
      const formasPagamento = {
        pix: faturamentoBruto * 0.4,
        cartao: faturamentoBruto * 0.45,
        dinheiro: faturamentoBruto * 0.15
      };

      // Transações recentes
      const transacoes = pedidos.slice(0, 10).map(pedido => ({
        id: pedido.id,
        data: pedido.dataPedido?.toDate() || new Date(),
        valor: pedido.total || 0,
        formaPagamento: pedido.formaPagamento || 'cartao',
        status: 'concluído',
        pedidoNumero: pedido.numero || pedido.id.slice(-6)
      }));

      setDadosFaturamento({
        faturamentoBruto,
        taxasEntrega,
        comissoesPlataformas,
        faturamentoLiquido,
        formasPagamento,
        transacoes
      });

    } catch (error) {
      console.error('Erro ao buscar faturamento:', error);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const periodos = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: 'semana', label: 'Últimos 7 dias' },
    { id: 'mes', label: 'Este mês' }
  ];

  const formasPagamento = [
    { id: 'pix', label: 'PIX', cor: '#48BB78', icone: '🏦' },
    { id: 'cartao', label: 'Cartão', cor: '#4299E1', icone: '💳' },
    { id: 'dinheiro', label: 'Dinheiro', cor: '#F6E05E', icone: '💵' }
  ];

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Faturamento</h1>
            <p style={styles.subtitle}>
              Acompanhe seu fluxo de caixa e formas de pagamento
            </p>
          </div>
          <div style={styles.filtros}>
            {periodos.map(p => (
              <button
                key={p.id}
                style={{
                  ...styles.filtroBtn,
                  ...(periodo === p.id ? styles.filtroBtnAtivo : {})
                }}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* Cards de Métricas */}
        <div style={styles.metricasGrid}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>💰</span>
              <h3 style={styles.metricaTitulo}>Faturamento Bruto</h3>
            </div>
            <div style={styles.metricaValor}>
              {formatarMoeda(dadosFaturamento.faturamentoBruto)}
            </div>
            <div style={styles.metricaDesc}>
              Valor total das vendas
            </div>
          </div>

          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>🚚</span>
              <h3 style={styles.metricaTitulo}>Taxas de Entrega</h3>
            </div>
            <div style={styles.metricaValor}>
              {formatarMoeda(dadosFaturamento.taxasEntrega)}
            </div>
            <div style={styles.metricaDesc}>
              Receita com entregas
            </div>
          </div>

          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>📱</span>
              <h3 style={styles.metricaTitulo}>Comissões</h3>
            </div>
            <div style={styles.metricaValor}>
              {formatarMoeda(dadosFaturamento.comissoesPlataformas)}
            </div>
            <div style={styles.metricaDesc}>
              Taxas de plataformas
            </div>
          </div>

          <div style={{...styles.metricaCard, backgroundColor: 'rgba(72, 187, 120, 0.1)', borderColor: '#48BB78'}}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>💎</span>
              <h3 style={styles.metricaTitulo}>Faturamento Líquido</h3>
            </div>
            <div style={{...styles.metricaValor, color: '#48BB78'}}>
              {formatarMoeda(dadosFaturamento.faturamentoLiquido)}
            </div>
            <div style={styles.metricaDesc}>
              Receita líquida
            </div>
          </div>
        </div>

        {/* Gráfico de Formas de Pagamento */}
        <div style={styles.chartSection}>
          <h2 style={styles.sectionTitle}>💳 Formas de Pagamento</h2>
          <div style={styles.chartContainer}>
            <div style={styles.pieChart}>
              {formasPagamento.map((forma, index) => {
                const porcentagem = dadosFaturamento.faturamentoBruto > 0 
                  ? (dadosFaturamento.formasPagamento[forma.id] / dadosFaturamento.faturamentoBruto) * 100 
                  : 0;
                
                return (
                  <div key={forma.id} style={styles.pieItem}>
                    <div style={styles.pieLabel}>
                      <span style={{color: forma.cor, marginRight: '8px'}}>{forma.icone}</span>
                      <span>{forma.label}</span>
                      <span style={styles.piePercent}>{porcentagem.toFixed(1)}%</span>
                    </div>
                    <div style={styles.pieBar}>
                      <div 
                        style={{
                          width: `${porcentagem}%`,
                          backgroundColor: forma.cor,
                          height: '8px',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                    <div style={styles.pieValue}>
                      {formatarMoeda(dadosFaturamento.formasPagamento[forma.id])}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fluxo de Caixa Detalhado */}
        <div style={styles.fluxoSection}>
          <h2 style={styles.sectionTitle}>📊 Fluxo de Caixa Detalhado</h2>
          <div style={styles.fluxoGrid}>
            <div style={styles.fluxoCard}>
              <h3 style={styles.fluxoTitulo}>Entradas</h3>
              <div style={styles.fluxoLista}>
                <div style={styles.fluxoItem}>
                  <span>Vendas Diretas</span>
                  <span style={styles.fluxoValorPositivo}>
                    {formatarMoeda(dadosFaturamento.faturamentoBruto * 0.6)}
                  </span>
                </div>
                <div style={styles.fluxoItem}>
                  <span>iFood/Ifood</span>
                  <span style={styles.fluxoValorPositivo}>
                    {formatarMoeda(dadosFaturamento.faturamentoBruto * 0.4)}
                  </span>
                </div>
                <div style={styles.fluxoItem}>
                  <span>Taxas de Entrega</span>
                  <span style={styles.fluxoValorPositivo}>
                    {formatarMoeda(dadosFaturamento.taxasEntrega)}
                  </span>
                </div>
                <div style={styles.fluxoTotal}>
                  <strong>Total Entradas</strong>
                  <strong style={styles.fluxoValorPositivo}>
                    {formatarMoeda(dadosFaturamento.faturamentoBruto + dadosFaturamento.taxasEntrega)}
                  </strong>
                </div>
              </div>
            </div>

            <div style={styles.fluxoCard}>
              <h3 style={styles.fluxoTitulo}>Saídas</h3>
              <div style={styles.fluxoLista}>
                <div style={styles.fluxoItem}>
                  <span>Comissões Plataformas</span>
                  <span style={styles.fluxoValorNegativo}>
                    -{formatarMoeda(dadosFaturamento.comissoesPlataformas)}
                  </span>
                </div>
                <div style={styles.fluxoItem}>
                  <span>Taxas Cartão</span>
                  <span style={styles.fluxoValorNegativo}>
                    -{formatarMoeda(dadosFaturamento.formasPagamento.cartao * 0.03)}
                  </span>
                </div>
                <div style={styles.fluxoItem}>
                  <span>Despesas Operacionais</span>
                  <span style={styles.fluxoValorNegativo}>
                    -{formatarMoeda(dadosFaturamento.faturamentoBruto * 0.3)}
                  </span>
                </div>
                <div style={styles.fluxoTotal}>
                  <strong>Total Saídas</strong>
                  <strong style={styles.fluxoValorNegativo}>
                    -{formatarMoeda(dadosFaturamento.comissoesPlataformas + (dadosFaturamento.formasPagamento.cartao * 0.03) + (dadosFaturamento.faturamentoBruto * 0.3))}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Transações */}
        <div style={styles.transacoesSection}>
          <h2 style={styles.sectionTitle}>📋 Transações Recentes</h2>
          <div style={styles.transacoesTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCol}>Data/Hora</div>
              <div style={styles.tableCol}>Pedido</div>
              <div style={styles.tableCol}>Valor</div>
              <div style={styles.tableCol}>Pagamento</div>
              <div style={styles.tableCol}>Status</div>
            </div>
            
            {dadosFaturamento.transacoes.length === 0 ? (
              <div style={styles.emptyTransacoes}>
                <span>📊</span>
                <p>Nenhuma transação encontrada no período</p>
              </div>
            ) : (
              dadosFaturamento.transacoes.map(transacao => (
                <div key={transacao.id} style={styles.tableRow}>
                  <div style={styles.tableCol}>
                    {transacao.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={styles.tableCol}>
                    #{transacao.pedidoNumero}
                  </div>
                  <div style={styles.tableCol}>
                    <strong>{formatarMoeda(transacao.valor)}</strong>
                  </div>
                  <div style={styles.tableCol}>
                    <span style={{
                      ...styles.pagamentoBadge,
                      backgroundColor: transacao.formaPagamento === 'pix' ? 'rgba(72, 187, 120, 0.1)' :
                                     transacao.formaPagamento === 'cartao' ? 'rgba(66, 153, 225, 0.1)' :
                                     'rgba(246, 224, 94, 0.1)',
                      color: transacao.formaPagamento === 'pix' ? '#48BB78' :
                            transacao.formaPagamento === 'cartao' ? '#4299E1' :
                            '#F6E05E'
                    }}>
                      {transacao.formaPagamento === 'pix' ? 'PIX' :
                       transacao.formaPagamento === 'cartao' ? 'Cartão' : 'Dinheiro'}
                    </span>
                  </div>
                  <div style={styles.tableCol}>
                    <span style={styles.statusBadge}>
                      ✅ {transacao.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: '30px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  filtros: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  filtroBtn: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    color: '#A0AEC0',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  filtroBtnAtivo: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    borderColor: '#4FD1C5'
  },
  metricasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  metricaCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px'
  },
  metricaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px'
  },
  metricaIcone: {
    fontSize: '24px'
  },
  metricaTitulo: {
    color: '#81E6D9',
    fontSize: '16px',
    margin: 0
  },
  metricaValor: {
    color: '#4FD1C5',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  metricaDesc: {
    color: '#A0AEC0',
    fontSize: '14px'
  },
  chartSection: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '40px'
  },
  sectionTitle: {
    color: '#4FD1C5',
    fontSize: '20px',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  chartContainer: {
    padding: '20px'
  },
  pieChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  pieItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  pieLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#81E6D9',
    fontSize: '16px'
  },
  piePercent: {
    color: '#4FD1C5',
    fontWeight: 'bold'
  },
  pieBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '8px'
  },
  pieValue: {
    color: '#A0AEC0',
    fontSize: '14px',
    textAlign: 'right'
  },
  fluxoSection: {
    marginBottom: '40px'
  },
  fluxoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px'
  },
  fluxoCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '25px'
  },
  fluxoTitulo: {
    color: '#4FD1C5',
    fontSize: '18px',
    marginBottom: '20px'
  },
  fluxoLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  fluxoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)'
  },
  fluxoValorPositivo: {
    color: '#48BB78',
    fontWeight: 'bold'
  },
  fluxoValorNegativo: {
    color: '#F56565',
    fontWeight: 'bold'
  },
  fluxoTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '15px',
    borderTop: '2px solid rgba(79, 209, 197, 0.2)',
    marginTop: '10px',
    color: '#81E6D9',
    fontSize: '16px'
  },
  transacoesSection: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '30px',
    overflow: 'hidden'
  },
  transacoesTable: {
    overflowX: 'auto'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
    gap: '20px',
    padding: '15px 0',
    borderBottom: '2px solid rgba(79, 209, 197, 0.2)',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '14px',
    minWidth: '800px'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
    gap: '20px',
    padding: '15px 0',
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)',
    color: '#A0AEC0',
    fontSize: '14px',
    minWidth: '800px',
    alignItems: 'center'
  },
  tableCol: {
    display: 'flex',
    alignItems: 'center'
  },
  pagamentoBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  statusBadge: {
    color: '#48BB78',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  emptyTransacoes: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#A0AEC0'
  }
};

export default Faturamento;