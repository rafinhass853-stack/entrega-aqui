import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const Dashboard = ({ user, isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  
  const [metrics, setMetrics] = useState({
    faturamentoPeriodo: 0,
    pedidosPeriodo: 0,
    produtosAtivos: 0,
    topProdutos: [],
    vendasPeriodo: 0,
    vendasAnterior: 0,
  });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, dataFiltro]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Pegar todos os pedidos da coleção raiz (sem filtros de query que falham)
      const pedidosRef = collection(db, 'Pedidos');
      const snap = await getDocs(pedidosRef);
      
      console.log("Total bruto no banco:", snap.size);

      // 2. Definir as janelas de tempo para o filtro JS
      const [ano, mes, dia] = dataFiltro.split('-').map(Number);
      const inicioDia = new Date(ano, mes - 1, dia, 0, 0, 0).getTime();
      const fimDia = new Date(ano, mes - 1, dia, 23, 59, 59, 999).getTime();

      const ontem = new Date(ano, mes - 1, dia);
      ontem.setDate(ontem.getDate() - 1);
      const inicioOntem = new Date(ontem.setHours(0,0,0,0)).getTime();
      const fimOntem = new Date(ontem.setHours(23,59,59,999)).getTime();

      // 3. Função para converter qualquer formato de dataCriacao para Milissegundos
      const parseData = (campo) => {
        if (!campo) return 0;
        if (campo.seconds) return campo.seconds * 1000; // Se for Timestamp
        if (typeof campo === 'string') return new Date(campo).getTime(); // Se for String
        if (campo instanceof Date) return campo.getTime(); // Se for Date objeto
        return 0;
      };

      // 4. Filtragem Manual (JS Side) - Resolve o problema do tipo de dado
      const todosPedidos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const pedidosDia = todosPedidos.filter(p => {
        const time = parseData(p.dataCriacao);
        return time >= inicioDia && time <= fimDia;
      });

      const pedidosOntem = todosPedidos.filter(p => {
        const time = parseData(p.dataCriacao);
        return time >= inicioOntem && time <= fimOntem;
      });

      // 5. Produtos Ativos (Sua lógica que já funciona)
      const snapProdutos = await getDocs(collection(db, 'estabelecimentos', user.uid, 'cardapio'));
      const totalProdutosAtivos = snapProdutos.docs.filter(d => d.data().ativo !== false).length;

      // 6. Cálculos das Métricas
      const faturamentoPeriodo = pedidosDia.reduce((sum, p) => sum + (Number(p.pagamento?.total) || 0), 0);
      const faturadoAnterior = pedidosOntem.reduce((sum, p) => sum + (Number(p.pagamento?.total) || 0), 0);
      
      // Top 5 Produtos
      const contagem = {};
      pedidosDia.forEach(p => {
        p.itens?.forEach(item => {
          contagem[item.nome] = (contagem[item.nome] || 0) + (Number(item.quantidade) || 1);
        });
      });

      const top5 = Object.entries(contagem)
        .map(([nome, vendas]) => ({ nome, vendas }))
        .sort((a, b) => b.vendas - a.vendas)
        .slice(0, 5);

      setMetrics({
        faturamentoPeriodo,
        pedidosPeriodo: pedidosDia.length,
        produtosAtivos: totalProdutosAtivos,
        topProdutos: top5.length > 0 ? top5 : [{ nome: 'Sem vendas', vendas: 0 }],
        vendasPeriodo: faturamentoPeriodo,
        vendasAnterior: faturadoAnterior,
      });

    } catch (error) {
      console.error("Erro Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularTendencia = (atual, anterior) => {
    if (anterior === 0) return atual > 0 ? '↑ 100%' : '0%';
    const diff = ((atual - anterior) / anterior) * 100;
    return `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(0)}%`;
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <div style={styles.headerSection}>
          <div>
            <h1 style={styles.pageTitle}>Dashboard - Visão Geral</h1>
            <p style={styles.pageSubtitle}>Filtrando pedidos de: <strong>{new Date(dataFiltro + 'T12:00:00').toLocaleDateString()}</strong></p>
          </div>
          <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} style={styles.dateInput} />
        </div>

        {loading ? <div style={{textAlign: 'center', padding: '50px', color: '#4FD1C5'}}>Processando dados...</div> : (
          <>
            <div style={styles.cardsGrid}>
              <MetricCard title="Faturamento" value={`R$ ${metrics.faturamentoPeriodo.toFixed(2)}`} trend={calcularTendencia(metrics.vendasPeriodo, metrics.vendasAnterior)} icon="💰" />
              <MetricCard title="Pedidos" value={metrics.pedidosPeriodo} trend={calcularTendencia(metrics.pedidosPeriodo, 0)} icon="🛍️" />
              <MetricCard title="Produtos Ativos" value={metrics.produtosAtivos} icon="🍔" />
            </div>

            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>📈 Comparativo Hoje vs Ontem</h3>
                <BarItem label="Selecionado" value={metrics.vendasPeriodo} total={metrics.vendasPeriodo + metrics.vendasAnterior} color="#4FD1C5" />
                <BarItem label="Anterior" value={metrics.vendasAnterior} total={metrics.vendasPeriodo + metrics.vendasAnterior} color="#718096" />
              </div>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>🏆 Top 5 Vendidos</h3>
                {metrics.topProdutos.map((p, i) => (
                  <RankingItem key={i} index={i} produto={p} maxVendas={metrics.topProdutos[0].vendas} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

// Componentes internos curtos
const MetricCard = ({ title, value, trend, icon }) => (
  <div style={styles.metricCard}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span>{icon}</span><span style={styles.cardTitle}>{title}</span></div>
    <div style={styles.cardValue}>{value}</div>
    {trend && <div style={styles.cardTrend}>{trend} vs anterior</div>}
  </div>
);

const BarItem = ({ label, value, total, color }) => (
  <div style={styles.barChart}>
    <span style={styles.barLabel}>{label}</span>
    <div style={styles.barWrapper}><div style={{ width: `${total > 0 ? (value / total) * 100 : 0}%`, backgroundColor: color, height: '100%', borderRadius: '4px' }} /></div>
    <span style={styles.barValue}>R${value.toFixed(2)}</span>
  </div>
);

const RankingItem = ({ index, produto, maxVendas }) => (
  <div style={styles.rankingItem}>
    <span style={styles.rankingPosition}>{index + 1}</span>
    <div style={{ flex: 1 }}>
      <div style={styles.rankingName}>{produto.nome}</div>
      <div style={styles.rankingBar}><div style={{ width: `${maxVendas > 0 ? (produto.vendas / maxVendas) * 100 : 0}%`, backgroundColor: '#4FD1C5', height: '100%' }} /></div>
    </div>
    <span style={styles.rankingSales}>{produto.vendas} un</span>
  </div>
);

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  headerSection: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' },
  dateInput: { backgroundColor: '#002328', border: '1px solid #4FD1C5', color: '#4FD1C5', padding: '10px', borderRadius: '8px' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
  metricCard: { background: 'rgba(0,35,40,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(79,209,197,0.1)' },
  cardTitle: { color: '#81E6D9', fontSize: '14px' },
  cardValue: { fontSize: '24px', fontWeight: 'bold', color: '#4FD1C5', margin: '10px 0' },
  cardTrend: { fontSize: '12px', color: '#A0AEC0' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  chartCard: { background: 'rgba(0,35,40,0.6)', padding: '20px', borderRadius: '12px' },
  chartTitle: { color: '#4FD1C5', marginBottom: '20px', fontSize: '16px' },
  barChart: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  barLabel: { width: '80px', fontSize: '12px', color: '#A0AEC0' },
  barWrapper: { flex: 1, height: '20px', backgroundColor: '#001a1d', borderRadius: '4px' },
  barValue: { width: '80px', fontSize: '12px', color: '#4FD1C5', textAlign: 'right' },
  rankingItem: { display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' },
  rankingPosition: { width: '25px', color: '#4FD1C5', fontWeight: 'bold' },
  rankingName: { fontSize: '13px', color: '#FFF' },
  rankingBar: { height: '4px', backgroundColor: '#001a1d', marginTop: '4px' },
  rankingSales: { fontSize: '12px', color: '#A0AEC0' },
  pageTitle: { color: '#4FD1C5', fontSize: '22px' },
  pageSubtitle: { color: '#A0AEC0', fontSize: '14px' }
};

export default Dashboard;