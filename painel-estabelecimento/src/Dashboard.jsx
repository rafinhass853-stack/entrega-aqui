import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Dashboard = ({ user, isMobile }) => {
  const [metrics, setMetrics] = useState({
    faturamentoHoje: 0,
    pedidosHoje: 0,
    produtosAtivos: 0,
    ticketMedio: 0,
    statusLoja: 'Aberta',
    topProdutos: [],
    vendasHoje: 0,
    vendasOntem: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Buscar pedidos do dia
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
      const q = query(pedidosRef, where('dataPedido', '>=', hoje));
      
      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => doc.data());
      
      // Calcular métricas
      const faturamentoHoje = pedidos.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
      const pedidosHoje = pedidos.length;
      const ticketMedio = pedidosHoje > 0 ? faturamentoHoje / pedidosHoje : 0;

      // Buscar produtos ativos
      const produtosRef = collection(db, 'estabelecimentos', user.uid, 'cardapio');
      const produtosSnapshot = await getDocs(produtosRef);
      const produtosAtivos = produtosSnapshot.docs.filter(doc => doc.data().ativo !== false).length;

      // Top produtos (simulação)
      const topProdutos = [
        { nome: 'Pizza Calabresa', vendas: 45 },
        { nome: 'Hambúrguer Artesanal', vendas: 38 },
        { nome: 'Coca-Cola 2L', vendas: 32 },
        { nome: 'Batata Frita', vendas: 28 },
        { nome: 'Sorvete', vendas: 25 },
      ];

      setMetrics({
        faturamentoHoje,
        pedidosHoje,
        produtosAtivos,
        ticketMedio,
        statusLoja: 'Aberta',
        topProdutos,
        vendasHoje: faturamentoHoje,
        vendasOntem: faturamentoHoje * 0.88, // Simulação
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const MetricCard = ({ title, value, trend, icon, color = '#4FD1C5' }) => (
    <div style={styles.metricCard}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ marginRight: '10px', fontSize: '20px' }}>{icon}</span>
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
      <div style={{ ...styles.cardValue, color }}>{value}</div>
      {trend && (
        <div style={styles.cardTrend}>
          <span style={{ color: trend.includes('↑') ? '#48BB78' : '#F56565' }}>{trend}</span> vs anterior
        </div>
      )}
    </div>
  );

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <div style={styles.headerSection}>
          <div>
            <h1 style={styles.pageTitle}>Dashboard - Visão Geral</h1>
            <p style={styles.pageSubtitle}>
              Bem-vindo, <strong style={{ color: '#4FD1C5' }}>{user?.email}</strong>
            </p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.statusBadge}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#48BB78',
                marginRight: '8px'
              }}></div>
              Loja {metrics.statusLoja}
            </div>
            <div style={styles.dateBadge}>
              📅 {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </div>
          </div>
        </div>

        <div style={styles.cardsGrid}>
          <MetricCard 
            title="Faturamento Hoje" 
            value={`R$ ${metrics.faturamentoHoje.toFixed(2)}`} 
            trend="↑ 12%" 
            icon="💰" 
          />
          <MetricCard 
            title="Pedidos Hoje" 
            value={metrics.pedidosHoje} 
            trend="↑ 15%" 
            icon="🛍️" 
          />
          <MetricCard 
            title="Produtos Ativos" 
            value={metrics.produtosAtivos} 
            trend="+8 novos" 
            icon="🍔" 
          />
          <MetricCard 
            title="Ticket Médio" 
            value={`R$ ${metrics.ticketMedio.toFixed(2)}`} 
            trend="↑ 8%" 
            icon="📊" 
          />
        </div>

        <div style={styles.chartsGrid}>
          {/* Gráfico de Vendas */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>📈 Vendas - Hoje vs Ontem</h3>
            <div style={styles.chartContainer}>
              <div style={styles.barChart}>
                <div style={styles.barLabel}>Hoje</div>
                <div style={styles.barWrapper}>
                  <div style={{
                    width: `${(metrics.vendasHoje / (metrics.vendasHoje + metrics.vendasOntem)) * 100}%`,
                    backgroundColor: '#4FD1C5',
                    height: '30px',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={styles.barValue}>R$ {metrics.vendasHoje.toFixed(2)}</div>
              </div>
              <div style={styles.barChart}>
                <div style={styles.barLabel}>Ontem</div>
                <div style={styles.barWrapper}>
                  <div style={{
                    width: `${(metrics.vendasOntem / (metrics.vendasHoje + metrics.vendasOntem)) * 100}%`,
                    backgroundColor: '#718096',
                    height: '30px',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={styles.barValue}>R$ {metrics.vendasOntem.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Ranking de Produtos */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>🏆 Top 5 Produtos</h3>
            <div style={styles.rankingList}>
              {metrics.topProdutos.map((produto, index) => (
                <div key={index} style={styles.rankingItem}>
                  <div style={styles.rankingPosition}>{index + 1}</div>
                  <div style={styles.rankingInfo}>
                    <div style={styles.rankingName}>{produto.nome}</div>
                    <div style={styles.rankingSales}>{produto.vendas} vendas</div>
                  </div>
                  <div style={styles.rankingBar}>
                    <div style={{
                      width: `${(produto.vendas / metrics.topProdutos[0].vendas) * 100}%`,
                      backgroundColor: index === 0 ? '#F6E05E' : 
                                       index === 1 ? '#CBD5E0' : 
                                       index === 2 ? '#A0AEC0' : '#718096',
                      height: '6px',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status do Sistema */}
        <div style={styles.systemStatus}>
          <h3 style={styles.chartTitle}>🔧 Status do Sistema</h3>
          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <div style={styles.statusIcon}>✅</div>
              <div style={styles.statusText}>Firebase Conectado</div>
            </div>
            <div style={styles.statusItem}>
              <div style={styles.statusIcon}>✅</div>
              <div style={styles.statusText}>Impressora Online</div>
            </div>
            <div style={styles.statusItem}>
              <div style={styles.statusIcon}>✅</div>
              <div style={styles.statusText}>Sistema Online</div>
            </div>
            <div style={styles.statusItem}>
              <div style={styles.statusIcon}>🔄</div>
              <div style={styles.statusText}>Entregadores: 3 online</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  headerSection: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '30px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)' 
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  pageTitle: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  pageSubtitle: { color: '#81E6D9', opacity: 0.8 },
  dateBadge: { 
    backgroundColor: 'rgba(79, 209, 197, 0.08)', 
    color: '#81E6D9', 
    padding: '8px 16px', 
    borderRadius: '20px', 
    border: '1px solid rgba(79, 209, 197, 0.15)',
    fontSize: '14px'
  },
  statusBadge: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    color: '#48BB78',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center'
  },
  cardsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
    gap: '20px',
    marginBottom: '30px'
  },
  metricCard: { 
    background: 'rgba(0, 35, 40, 0.6)', 
    padding: '22px', 
    borderRadius: '12px', 
    border: '1px solid rgba(79, 209, 197, 0.12)',
    transition: 'all 0.3s ease'
  },
  cardTitle: { color: '#81E6D9', fontSize: '14px', margin: 0 },
  cardValue: { fontSize: '28px', fontWeight: '700', margin: '10px 0' },
  cardTrend: { fontSize: '13px', color: '#A0AEC0' },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  chartCard: {
    background: 'rgba(0, 35, 40, 0.6)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(79, 209, 197, 0.12)'
  },
  chartTitle: {
    color: '#4FD1C5',
    fontSize: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  barChart: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 100px',
    gap: '15px',
    alignItems: 'center'
  },
  barLabel: {
    color: '#A0AEC0',
    fontSize: '14px'
  },
  barWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  barValue: {
    color: '#81E6D9',
    fontSize: '14px',
    textAlign: 'right'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  rankingItem: {
    display: 'grid',
    gridTemplateColumns: '30px 1fr 100px',
    gap: '12px',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px'
  },
  rankingPosition: {
    width: '30px',
    height: '30px',
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold'
  },
  rankingInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  rankingName: {
    color: '#81E6D9',
    fontSize: '14px'
  },
  rankingSales: {
    color: '#A0AEC0',
    fontSize: '12px'
  },
  rankingBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  systemStatus: {
    background: 'rgba(0, 35, 40, 0.6)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(79, 209, 197, 0.12)'
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px'
  },
  statusIcon: {
    fontSize: '20px'
  },
  statusText: {
    color: '#81E6D9',
    fontSize: '14px'
  }
};

export default Dashboard;