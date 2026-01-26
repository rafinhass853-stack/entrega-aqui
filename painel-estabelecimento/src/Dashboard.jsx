import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  collection, getDocs, query, where, 
  orderBy, startAt, endAt 
} from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, Package, 
  CreditCard, Users, Clock 
} from 'lucide-react';

const Dashboard = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('hoje');
  const [metrics, setMetrics] = useState({
    faturamentoHoje: 0,
    pedidosHoje: 0,
    produtosAtivos: 0,
    entregadoresAtivos: 0,
    taxaEntregaHoje: 0,
    pedidosPendentes: 0,
    topProdutos: [],
    faturamentoOntem: 0,
    crescimento: 0
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, periodo]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Definir datas
      const hoje = new Date();
      const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));
      const fimHoje = new Date(hoje.setHours(23, 59, 59, 999));
      
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const inicioOntem = new Date(ontem.setHours(0, 0, 0, 0));
      const fimOntem = new Date(ontem.setHours(23, 59, 59, 999));

      // Buscar pedidos de hoje
      const pedidosRef = collection(db, 'Pedidos');
      const qHoje = query(
        pedidosRef,
        where('estabelecimentoId', '==', user.uid),
        where('dataCriacao', '>=', inicioHoje),
        where('dataCriacao', '<=', fimHoje),
        orderBy('dataCriacao', 'desc')
      );

      const qOntem = query(
        pedidosRef,
        where('estabelecimentoId', '==', user.uid),
        where('dataCriacao', '>=', inicioOntem),
        where('dataCriacao', '<=', fimOntem)
      );

      // Buscar produtos ativos
      const produtosRef = collection(db, 'estabelecimentos', user.uid, 'cardapio');
      const qProdutos = query(produtosRef, where('ativo', '!=', false));

      // Buscar entregadores ativos
      const entregadoresRef = collection(db, 'estabelecimentos', user.uid, 'entregadores');
      const qEntregadores = query(entregadoresRef, where('ativo', '==', true));

      // Executar todas as consultas em paralelo
      const [
        pedidosHojeSnap,
        pedidosOntemSnap,
        produtosSnap,
        entregadoresSnap
      ] = await Promise.all([
        getDocs(qHoje),
        getDocs(qOntem),
        getDocs(qProdutos),
        getDocs(qEntregadores)
      ]);

      // Processar pedidos de hoje
      const pedidosHoje = pedidosHojeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pedidosOntem = pedidosOntemSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Cálculos
      const faturamentoHoje = pedidosHoje.reduce((sum, p) => sum + (p.pagamento?.total || 0), 0);
      const faturamentoOntem = pedidosOntem.reduce((sum, p) => sum + (p.pagamento?.total || 0), 0);
      const taxaEntregaHoje = pedidosHoje.reduce((sum, p) => sum + (p.pagamento?.taxaEntrega || 0), 0);
      const pedidosPendentes = pedidosHoje.filter(p => p.status === 'pendente').length;
      
      // Calcular crescimento
      const crescimento = faturamentoOntem > 0 
        ? ((faturamentoHoje - faturamentoOntem) / faturamentoOntem * 100).toFixed(1)
        : faturamentoHoje > 0 ? 100 : 0;

      // Top produtos
      const vendasPorProduto = {};
      pedidosHoje.forEach(pedido => {
        pedido.itens?.forEach(item => {
          if (!vendasPorProduto[item.nome]) {
            vendasPorProduto[item.nome] = 0;
          }
          vendasPorProduto[item.nome] += item.quantidade || 1;
        });
      });

      const topProdutos = Object.entries(vendasPorProduto)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      setMetrics({
        faturamentoHoje,
        pedidosHoje: pedidosHoje.length,
        produtosAtivos: produtosSnap.size,
        entregadoresAtivos: entregadoresSnap.size,
        taxaEntregaHoje,
        pedidosPendentes,
        topProdutos,
        faturamentoOntem,
        crescimento: parseFloat(crescimento)
      });

    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Layout isMobile={isMobile}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        {/* Cabeçalho */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Dashboard</h1>
            <p style={styles.subtitle}>Visão geral do seu estabelecimento</p>
          </div>
          
          <div style={styles.periodoSelector}>
            {['hoje', 'ontem', 'semana', 'mes'].map(p => (
              <button
                key={p}
                style={{
                  ...styles.periodoBtn,
                  ...(periodo === p ? styles.periodoBtnAtivo : {})
                }}
                onClick={() => setPeriodo(p)}
              >
                {p === 'hoje' ? 'Hoje' : 
                 p === 'ontem' ? 'Ontem' : 
                 p === 'semana' ? '7 dias' : '30 dias'}
              </button>
            ))}
          </div>
        </header>

        {/* Grid de Métricas */}
        <div style={styles.metricsGrid}>
          <MetricCard 
            title="Faturamento Hoje" 
            value={formatCurrency(metrics.faturamentoHoje)}
            icon={<CreditCard size={24} />}
            change={metrics.crescimento}
            color="#4FD1C5"
          />
          
          <MetricCard 
            title="Pedidos Hoje" 
            value={metrics.pedidosHoje}
            icon={<Package size={24} />}
            change={metrics.pedidosHoje - metrics.pedidosHoje}
            color="#10B981"
          />
          
          <MetricCard 
            title="Pedidos Pendentes" 
            value={metrics.pedidosPendentes}
            icon={<Clock size={24} />}
            color={metrics.pedidosPendentes > 0 ? "#F59E0B" : "#10B981"}
          />
          
          <MetricCard 
            title="Taxas de Entrega" 
            value={formatCurrency(metrics.taxaEntregaHoje)}
            icon="🚚"
            color="#8B5CF6"
          />
          
          <MetricCard 
            title="Produtos Ativos" 
            value={metrics.produtosAtivos}
            icon="🍔"
            color="#3B82F6"
          />
          
          <MetricCard 
            title="Entregadores Ativos" 
            value={metrics.entregadoresAtivos}
            icon={<Users size={24} />}
            color="#EC4899"
          />
        </div>

        {/* Seção Inferior */}
        <div style={styles.lowerSection}>
          {/* Top Produtos */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🏆 Produtos Mais Vendidos Hoje</h3>
            <div style={styles.topProductsList}>
              {metrics.topProdutos.length > 0 ? (
                metrics.topProdutos.map((produto, index) => (
                  <div key={index} style={styles.topProductItem}>
                    <div style={styles.productRank}>
                      <span style={styles.rankNumber}>{index + 1}</span>
                    </div>
                    <div style={styles.productInfo}>
                      <div style={styles.productName}>{produto.nome}</div>
                      <div style={styles.productStats}>
                        <span style={styles.productQuantity}>{produto.quantidade} vendas</span>
                      </div>
                    </div>
                    <div style={styles.productBar}>
                      <div 
                        style={{
                          width: `${(produto.quantidade / (metrics.topProdutos[0]?.quantidade || 1)) * 100}%`,
                          backgroundColor: '#4FD1C5',
                          height: '6px',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>
                  <span>📊</span>
                  <p>Nenhuma venda registrada hoje</p>
                </div>
              )}
            </div>
          </div>

          {/* Comparativo */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📈 Comparativo de Faturamento</h3>
            <div style={styles.comparisonChart}>
              <div style={styles.barComparison}>
                <div style={styles.barLabel}>
                  <span>Hoje</span>
                  <span style={styles.barValue}>{formatCurrency(metrics.faturamentoHoje)}</span>
                </div>
                <div style={styles.barContainer}>
                  <div 
                    style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: 'rgba(79, 209, 197, 0.1)',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      style={{
                        width: `${Math.min(100, (metrics.faturamentoHoje / Math.max(metrics.faturamentoHoje, metrics.faturamentoOntem)) * 100)}%`,
                        height: '100%',
                        backgroundColor: '#4FD1C5',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div style={styles.barComparison}>
                <div style={styles.barLabel}>
                  <span>Ontem</span>
                  <span style={styles.barValue}>{formatCurrency(metrics.faturamentoOntem)}</span>
                </div>
                <div style={styles.barContainer}>
                  <div 
                    style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: 'rgba(160, 174, 192, 0.1)',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      style={{
                        width: `${Math.min(100, (metrics.faturamentoOntem / Math.max(metrics.faturamentoHoje, metrics.faturamentoOntem)) * 100)}%`,
                        height: '100%',
                        backgroundColor: '#A0AEC0',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div style={styles.growthIndicator}>
              {metrics.crescimento > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
                  <TrendingUp size={20} />
                  <span>Crescimento de {Math.abs(metrics.crescimento)}% em relação a ontem</span>
                </div>
              ) : metrics.crescimento < 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F56565' }}>
                  <TrendingDown size={20} />
                  <span>Queda de {Math.abs(metrics.crescimento)}% em relação a ontem</span>
                </div>
              ) : (
                <div style={{ color: '#A0AEC0' }}>
                  <span>Sem variação em relação a ontem</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Componente de Cartão de Métrica
const MetricCard = ({ title, value, icon, change, color }) => {
  return (
    <div style={{
      ...styles.metricCard,
      borderLeft: `4px solid ${color}`,
      borderTopLeftRadius: '0',
      borderBottomLeftRadius: '0'
    }}>
      <div style={styles.metricHeader}>
        <div style={{ color, fontSize: '14px', fontWeight: '600' }}>
          {title}
        </div>
        <div style={{ color, fontSize: '24px' }}>
          {icon}
        </div>
      </div>
      
      <div style={styles.metricValue}>
        {value}
      </div>
      
      {change !== undefined && (
        <div style={styles.metricChange}>
          <span style={{ 
            color: change >= 0 ? '#10B981' : '#F56565',
            fontSize: '12px'
          }}>
            {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
          </span>
          <span style={{ fontSize: '12px', color: '#A0AEC0' }}>
            vs período anterior
          </span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { 
    maxWidth: '1200px', 
    margin: '0 auto', 
    width: '100%' 
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    color: '#4FD1C5',
    fontSize: '28px',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#81E6D9',
    opacity: 0.8,
    fontSize: '14px'
  },
  periodoSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  periodoBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    background: 'rgba(0, 35, 40, 0.6)',
    color: '#A0AEC0',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease'
  },
  periodoBtnAtivo: {
    background: '#4FD1C5',
    color: '#00171A',
    borderColor: '#4FD1C5'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  metricCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px',
    transition: 'transform 0.2s ease',
    '&:hover': {
      transform: 'translateY(-4px)'
    }
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  metricValue: {
    color: '#4FD1C5',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  metricChange: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px'
  },
  lowerSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px'
  },
  cardTitle: {
    color: '#4FD1C5',
    fontSize: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  topProductsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  topProductItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px'
  },
  productRank: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  productStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  productQuantity: {
    color: '#81E6D9',
    fontSize: '12px'
  },
  productBar: {
    width: '80px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 0',
    color: '#A0AEC0'
  },
  comparisonChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '20px'
  },
  barComparison: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  barLabel: {
    width: '80px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  barValue: {
    fontSize: '12px',
    color: '#A0AEC0'
  },
  barContainer: {
    flex: 1
  },
  growthIndicator: {
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    fontSize: '14px'
  }
};

export default Dashboard;