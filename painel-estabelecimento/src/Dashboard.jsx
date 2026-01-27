// Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import {
  TrendingUp,
  TrendingDown,
  Package,
  CreditCard,
  Users,
  Clock
} from 'lucide-react';

const Dashboard = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('hoje');

  const [metrics, setMetrics] = useState({
    faturamento: 0,
    pedidos: 0,
    produtosAtivos: 0,
    entregadoresAtivos: 0,
    taxaEntrega: 0,
    pedidosPendentes: 0,
    topProdutos: [],
    faturamentoAnterior: 0,
    pedidosAnterior: 0,
    crescimento: 0,
    crescimentoPedidos: 0,
  });

  const estId = useMemo(() => {
    // se você tiver user.estabelecimentoId no auth/perfil, ele ganha prioridade
    return user?.estabelecimentoId || user?.uid || null;
  }, [user]);

  useEffect(() => {
    if (!estId) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estId, periodo]);

  const getRange = (p) => {
    const now = new Date();

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };

    if (p === 'hoje') {
      const inicio = startOfDay(now);
      const fim = endOfDay(now);

      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const inicioAnterior = startOfDay(y);
      const fimAnterior = endOfDay(y);

      return { inicio, fim, inicioAnterior, fimAnterior, label: 'Hoje', labelAnterior: 'Ontem' };
    }

    if (p === 'ontem') {
      const o = new Date(now);
      o.setDate(o.getDate() - 1);
      const inicio = startOfDay(o);
      const fim = endOfDay(o);

      const a = new Date(now);
      a.setDate(a.getDate() - 2);
      const inicioAnterior = startOfDay(a);
      const fimAnterior = endOfDay(a);

      return { inicio, fim, inicioAnterior, fimAnterior, label: 'Ontem', labelAnterior: 'Anteontem' };
    }

    if (p === 'semana') {
      // últimos 7 dias (inclui hoje)
      const inicio = startOfDay(new Date(now));
      inicio.setDate(inicio.getDate() - 6);
      const fim = endOfDay(now);

      // 7 dias anteriores a esses
      const inicioAnterior = startOfDay(new Date(inicio));
      inicioAnterior.setDate(inicioAnterior.getDate() - 7);
      const fimAnterior = endOfDay(new Date(inicio));
      fimAnterior.setDate(fimAnterior.getDate() - 1);

      return { inicio, fim, inicioAnterior, fimAnterior, label: '7 dias', labelAnterior: '7 dias ant.' };
    }

    // mes = últimos 30 dias (inclui hoje)
    const inicio = startOfDay(new Date(now));
    inicio.setDate(inicio.getDate() - 29);
    const fim = endOfDay(now);

    const inicioAnterior = startOfDay(new Date(inicio));
    inicioAnterior.setDate(inicioAnterior.getDate() - 30);
    const fimAnterior = endOfDay(new Date(inicio));
    fimAnterior.setDate(fimAnterior.getDate() - 1);

    return { inicio, fim, inicioAnterior, fimAnterior, label: '30 dias', labelAnterior: '30 dias ant.' };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { inicio, fim, inicioAnterior, fimAnterior } = getRange(periodo);

      const pedidosRef = collection(db, 'Pedidos');

      // Pedidos do período atual
      const qAtual = query(
        pedidosRef,
        where('estabelecimentoId', '==', estId),
        where('dataCriacao', '>=', inicio),
        where('dataCriacao', '<=', fim),
        orderBy('dataCriacao', 'desc')
      );

      // Pedidos do período anterior (para comparar)
      const qAnterior = query(
        pedidosRef,
        where('estabelecimentoId', '==', estId),
        where('dataCriacao', '>=', inicioAnterior),
        where('dataCriacao', '<=', fimAnterior),
        orderBy('dataCriacao', 'desc')
      );

      // Produtos ativos
      const produtosRef = collection(db, 'estabelecimentos', estId, 'cardapio');
      const qProdutos = query(produtosRef, where('ativo', '!=', false));

      // Entregadores ativos
      const entregadoresRef = collection(db, 'estabelecimentos', estId, 'entregadores');
      const qEntregadores = query(entregadoresRef, where('ativo', '==', true));

      const [atualSnap, anteriorSnap, produtosSnap, entregadoresSnap] = await Promise.all([
        getDocs(qAtual),
        getDocs(qAnterior),
        getDocs(qProdutos),
        getDocs(qEntregadores),
      ]);

      const pedidosAtual = atualSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pedidosAnterior = anteriorSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const toNumber = (v) => {
        const n = Number(String(v ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      };

      const faturamento = pedidosAtual.reduce((sum, p) => sum + toNumber(p?.pagamento?.total), 0);
      const faturamentoAnterior = pedidosAnterior.reduce((sum, p) => sum + toNumber(p?.pagamento?.total), 0);

      const taxaEntrega = pedidosAtual.reduce((sum, p) => sum + toNumber(p?.pagamento?.taxaEntrega), 0);

      const pedidosPendentes = pedidosAtual.filter(p => (p?.status || '').toLowerCase() === 'pendente').length;

      // crescimento faturamento
      const crescimento = faturamentoAnterior > 0
        ? ((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100
        : faturamento > 0 ? 100 : 0;

      // crescimento pedidos
      const crescimentoPedidos = pedidosAnterior.length > 0
        ? ((pedidosAtual.length - pedidosAnterior.length) / pedidosAnterior.length) * 100
        : pedidosAtual.length > 0 ? 100 : 0;

      // Top produtos do período atual
      const vendasPorProduto = {};
      pedidosAtual.forEach(pedido => {
        (pedido?.itens || []).forEach(item => {
          const nome = item?.nome || 'Item';
          const qtd = toNumber(item?.quantidade) || 1;
          vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
        });
      });

      const topProdutos = Object.entries(vendasPorProduto)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      setMetrics({
        faturamento,
        pedidos: pedidosAtual.length,
        produtosAtivos: produtosSnap.size,
        entregadoresAtivos: entregadoresSnap.size,
        taxaEntrega,
        pedidosPendentes,
        topProdutos,
        faturamentoAnterior,
        pedidosAnterior: pedidosAnterior.length,
        crescimento,
        crescimentoPedidos,
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const labelsPeriodo = useMemo(() => {
    const r = getRange(periodo);
    return { atual: r.label, anterior: r.labelAnterior };
  }, [periodo]);

  if (loading) {
    return (
      <Layout isMobile={isMobile}>
        <div style={styles.loadingWrap}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.page}>
        <div style={styles.container}>
          {/* Cabeçalho */}
          <header style={styles.header}>
            <div style={styles.headerLeft}>
              <h1 style={styles.title}>📊 Dashboard</h1>
              <p style={styles.subtitle}>Visão geral do seu estabelecimento</p>
            </div>

            <div style={styles.periodoSelector}>
              <PeriodoBtn ativo={periodo === 'hoje'} onClick={() => setPeriodo('hoje')} label="Hoje" />
              <PeriodoBtn ativo={periodo === 'ontem'} onClick={() => setPeriodo('ontem')} label="Ontem" />
              <PeriodoBtn ativo={periodo === 'semana'} onClick={() => setPeriodo('semana')} label="7 dias" />
              <PeriodoBtn ativo={periodo === 'mes'} onClick={() => setPeriodo('mes')} label="30 dias" />
            </div>
          </header>

          {/* Grid de Métricas (AJUSTADO PARA NÃO CORTAR) */}
          <div
            style={{
              ...styles.metricsGrid,
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fit, minmax(240px, 1fr))'
            }}
          >
            <MetricCard
              title={`Faturamento (${labelsPeriodo.atual})`}
              value={formatCurrency(metrics.faturamento)}
              icon={<CreditCard size={22} />}
              change={metrics.crescimento}
              changeLabel={`vs ${labelsPeriodo.anterior}`}
              color="#4FD1C5"
              highlight
            />

            <MetricCard
              title={`Pedidos (${labelsPeriodo.atual})`}
              value={metrics.pedidos}
              icon={<Package size={22} />}
              change={metrics.crescimentoPedidos}
              changeLabel={`vs ${labelsPeriodo.anterior}`}
              color="#10B981"
            />

            <MetricCard
              title="Pedidos Pendentes"
              value={metrics.pedidosPendentes}
              icon={<Clock size={22} />}
              color={metrics.pedidosPendentes > 0 ? "#F59E0B" : "#10B981"}
              helper={metrics.pedidosPendentes > 0 ? 'Atenção nos pendentes' : 'Tudo em dia'}
            />

            <MetricCard
              title={`Taxas de Entrega (${labelsPeriodo.atual})`}
              value={formatCurrency(metrics.taxaEntrega)}
              icon="🚚"
              color="#8B5CF6"
              helper="Total de taxas somadas"
            />

            <MetricCard
              title="Produtos Ativos"
              value={metrics.produtosAtivos}
              icon="🍔"
              color="#3B82F6"
              helper="Itens visíveis no cardápio"
            />

            <MetricCard
              title="Entregadores Ativos"
              value={metrics.entregadoresAtivos}
              icon={<Users size={22} />}
              color="#EC4899"
              helper="Entregadores habilitados"
            />
          </div>

          {/* Seção inferior */}
          <div
            style={{
              ...styles.lowerSection,
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))'
            }}
          >
            {/* Top Produtos */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🏆 Produtos Mais Vendidos ({labelsPeriodo.atual})</h3>

              <div style={styles.topProductsList}>
                {metrics.topProdutos.length > 0 ? (
                  metrics.topProdutos.map((produto, index) => {
                    const max = metrics.topProdutos[0]?.quantidade || 1;
                    const pct = Math.max(6, Math.min(100, (produto.quantidade / max) * 100));

                    return (
                      <div key={`${produto.nome}-${index}`} style={styles.topProductItem}>
                        <div style={styles.productRank}>{index + 1}</div>

                        <div style={styles.productInfo}>
                          <div style={styles.productName} title={produto.nome}>
                            {produto.nome}
                          </div>
                          <div style={styles.productQuantity}>{produto.quantidade} vendas</div>

                          <div style={styles.productBarTrack}>
                            <div style={{ ...styles.productBarFill, width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: 26 }}>📊</div>
                    <p style={{ margin: 0 }}>Nenhuma venda registrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comparativo */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📈 Comparativo de Faturamento</h3>

              <div style={styles.comparisonChart}>
                <BarComparison
                  label={labelsPeriodo.atual}
                  value={metrics.faturamento}
                  valueFmt={formatCurrency(metrics.faturamento)}
                  max={Math.max(metrics.faturamento, metrics.faturamentoAnterior) || 1}
                  fill="#4FD1C5"
                />

                <BarComparison
                  label={labelsPeriodo.anterior}
                  value={metrics.faturamentoAnterior}
                  valueFmt={formatCurrency(metrics.faturamentoAnterior)}
                  max={Math.max(metrics.faturamento, metrics.faturamentoAnterior) || 1}
                  fill="#A0AEC0"
                />
              </div>

              <div style={styles.growthIndicator}>
                {metrics.crescimento > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10B981' }}>
                    <TrendingUp size={18} />
                    <span style={styles.growthText}>Crescimento de {Math.abs(metrics.crescimento).toFixed(1)}% vs {labelsPeriodo.anterior}</span>
                  </div>
                ) : metrics.crescimento < 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F56565' }}>
                    <TrendingDown size={18} />
                    <span style={styles.growthText}>Queda de {Math.abs(metrics.crescimento).toFixed(1)}% vs {labelsPeriodo.anterior}</span>
                  </div>
                ) : (
                  <div style={{ color: '#A0AEC0' }}>
                    <span style={styles.growthText}>Sem variação vs {labelsPeriodo.anterior}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

/* ---------- Componentes ---------- */

const PeriodoBtn = ({ ativo, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      ...styles.periodoBtn,
      ...(ativo ? styles.periodoBtnAtivo : {})
    }}
  >
    {label}
  </button>
);

const MetricCard = ({ title, value, icon, change, changeLabel, color, helper, highlight }) => {
  const [hover, setHover] = useState(false);

  const hasChange = typeof change === 'number' && Number.isFinite(change);

  return (
    <div
      style={{
        ...styles.metricCard,
        borderLeft: `4px solid ${color}`,
        boxShadow: highlight ? '0 0 0 1px rgba(79, 209, 197, 0.18), 0 10px 30px rgba(0,0,0,0.25)' : styles.metricCard.boxShadow,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.metricHeader}>
        <div style={styles.metricTitle}>{title}</div>
        <div style={{ color, fontSize: 22, lineHeight: 1 }}>{icon}</div>
      </div>

      <div style={{ ...styles.metricValue, color }}>
        {value}
      </div>

      {helper ? <div style={styles.metricHelper}>{helper}</div> : null}

      {hasChange ? (
        <div style={styles.metricChange}>
          <span style={{
            color: change >= 0 ? '#10B981' : '#F56565',
            fontSize: 12,
            fontWeight: 600
          }}>
            {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
          </span>

          <span style={{ fontSize: 12, color: '#A0AEC0' }}>
            {changeLabel || 'vs período anterior'}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const BarComparison = ({ label, value, valueFmt, max, fill }) => {
  const pct = Math.max(3, Math.min(100, (value / (max || 1)) * 100));

  return (
    <div style={styles.barRow}>
      <div style={styles.barLabelCol}>
        <div style={styles.barLabelText}>{label}</div>
        <div style={styles.barValue}>{valueFmt}</div>
      </div>

      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: fill }} />
      </div>
    </div>
  );
};

/* ---------- Styles (AJUSTADOS PRA NÃO ESCONDER) ---------- */

const styles = {
  page: {
    width: '100%',
    overflowX: 'hidden', // evita “card cortado” quando o layout fica apertado
  },
  container: {
    width: '100%',
    maxWidth: '1100px', // menor que 1200 pra caber com sidebar
    margin: '0 auto',
    padding: '18px 16px',
    boxSizing: 'border-box',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  headerLeft: { minWidth: 220 },
  title: {
    color: '#4FD1C5',
    fontSize: 28,
    margin: 0,
    lineHeight: 1.15,
  },
  subtitle: {
    color: '#81E6D9',
    opacity: 0.85,
    fontSize: 14,
    margin: '6px 0 0 0',
  },

  periodoSelector: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  periodoBtn: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(79, 209, 197, 0.22)',
    background: 'rgba(0, 35, 40, 0.55)',
    color: '#A0AEC0',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  periodoBtnAtivo: {
    background: '#4FD1C5',
    color: '#00171A',
    borderColor: '#4FD1C5',
    fontWeight: 700,
  },

  metricsGrid: {
    display: 'grid',
    gap: 14,
    marginBottom: 16,
    alignItems: 'stretch',
  },

  metricCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.60)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: 14,
    padding: 16,
    boxSizing: 'border-box',
    transition: 'transform 0.15s ease',
    boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
    minHeight: 118,
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  metricTitle: {
    color: '#BFEFED',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 6,
    letterSpacing: 0.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricHelper: {
    color: '#A0AEC0',
    fontSize: 12,
    marginBottom: 10,
  },
  metricChange: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  lowerSection: {
    display: 'grid',
    gap: 14,
    alignItems: 'start',
  },
  card: {
    backgroundColor: 'rgba(0, 35, 40, 0.60)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: 14,
    padding: 16,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  cardTitle: {
    color: '#4FD1C5',
    fontSize: 16,
    margin: '0 0 14px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  topProductsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  topProductItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  productRank: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 209, 197, 0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 900,
    fontSize: 14,
    flex: '0 0 auto',
  },
  productInfo: { flex: 1, minWidth: 0 },
  productName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  productQuantity: {
    color: '#81E6D9',
    fontSize: 12,
    marginBottom: 10,
  },
  productBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  productBarFill: {
    height: '100%',
    backgroundColor: '#4FD1C5',
    borderRadius: 999,
  },
  emptyState: {
    textAlign: 'center',
    padding: '26px 0',
    color: '#A0AEC0',
  },

  comparisonChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 14,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  barLabelCol: {
    width: 120, // maior -> não “esconde” texto
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: '0 0 auto',
  },
  barLabelText: {
    color: '#D7F7F3',
    fontSize: 13,
    fontWeight: 700,
  },
  barValue: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  barTrack: {
    flex: 1,
    height: 30,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
  },

  growthIndicator: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  growthText: { fontSize: 13, fontWeight: 700 },
};

export default Dashboard;
