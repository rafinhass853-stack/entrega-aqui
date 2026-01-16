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

const Relatorios = ({ user, isMobile }) => {
  const [periodo, setPeriodo] = useState('semana');
  const [dadosRelatorio, setDadosRelatorio] = useState({
    clientesFieis: [],
    bairrosFrequentes: [],
    taxaCancelamento: 0,
    vendasPorHora: [],
    produtosMaisVendidos: []
  });

  useEffect(() => {
    fetchRelatorioData();
  }, [user, periodo]);

  const fetchRelatorioData = async () => {
    if (!user) return;

    try {
      // Buscar pedidos do período
      const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
      let q;
      
      const hoje = new Date();
      let dataInicio;
      
      switch (periodo) {
        case 'hoje':
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
          break;
        case 'semana':
          dataInicio = new Date();
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        default:
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
      }

      q = query(
        pedidosRef,
        where('dataPedido', '>=', dataInicio),
        orderBy('dataPedido', 'desc')
      );

      const snapshot = await getDocs(q);
      const todosPedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular dados do relatório
      const pedidosFinalizados = todosPedidos.filter(p => p.status === 'entregue');
      const pedidosCancelados = todosPedidos.filter(p => p.status === 'cancelado');
      
      // Clientes fiéis
      const clientesMap = {};
      pedidosFinalizados.forEach(pedido => {
        if (pedido.cliente && pedido.telefone) {
          const key = `${pedido.cliente}-${pedido.telefone}`;
          if (!clientesMap[key]) {
            clientesMap[key] = {
              nome: pedido.cliente,
              telefone: pedido.telefone,
              totalPedidos: 0,
              totalGasto: 0,
              ultimoPedido: pedido.dataPedido
            };
          }
          clientesMap[key].totalPedidos++;
          clientesMap[key].totalGasto += pedido.total || 0;
        }
      });

      const clientesFieis = Object.values(clientesMap)
        .sort((a, b) => b.totalGasto - a.totalGasto)
        .slice(0, 10);

      // Bairros frequentes
      const bairrosMap = {};
      pedidosFinalizados.forEach(pedido => {
        if (pedido.bairro) {
          if (!bairrosMap[pedido.bairro]) {
            bairrosMap[pedido.bairro] = {
              nome: pedido.bairro,
              totalPedidos: 0,
              totalGasto: 0
            };
          }
          bairrosMap[pedido.bairro].totalPedidos++;
          bairrosMap[pedido.bairro].totalGasto += pedido.total || 0;
        }
      });

      const bairrosFrequentes = Object.values(bairrosMap)
        .sort((a, b) => b.totalPedidos - a.totalPedidos)
        .slice(0, 8);

      // Taxa de cancelamento
      const taxaCancelamento = todosPedidos.length > 0
        ? (pedidosCancelados.length / todosPedidos.length) * 100
        : 0;

      // Vendas por hora
      const vendasPorHora = Array.from({ length: 24 }, (_, i) => ({
        hora: `${i}:00`,
        vendas: pedidosFinalizados.filter(p => {
          const horaPedido = p.dataPedido?.toDate().getHours();
          return horaPedido === i;
        }).length
      }));

      // Produtos mais vendidos (simulação)
      const produtosMaisVendidos = [
        { nome: 'Pizza Calabresa', vendas: 45, valor: 2250 },
        { nome: 'Hambúrguer Artesanal', vendas: 38, valor: 1900 },
        { nome: 'Coca-Cola 2L', vendas: 32, valor: 640 },
        { nome: 'Batata Frita', vendas: 28, valor: 840 },
        { nome: 'Sorvete', vendas: 25, valor: 500 }
      ];

      setDadosRelatorio({
        clientesFieis,
        bairrosFrequentes,
        taxaCancelamento,
        vendasPorHora,
        produtosMaisVendidos
      });

    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
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
    { id: 'semana', label: 'Última Semana' },
    { id: 'mes', label: 'Este Mês' }
  ];

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>📈 Relatórios Analíticos</h1>
            <p style={styles.subtitle}>
              Dados estratégicos para tomada de decisão
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

        {/* Métricas Principais */}
        <div style={styles.metricasGrid}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>👥</span>
              <h3 style={styles.metricaTitulo}>Clientes Fiéis</h3>
            </div>
            <div style={styles.metricaValor}>
              {dadosRelatorio.clientesFieis.length}
            </div>
            <div style={styles.metricaDesc}>
              Clientes com mais de 3 pedidos
            </div>
          </div>

          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>📍</span>
              <h3 style={styles.metricaTitulo}>Bairros Atendidos</h3>
            </div>
            <div style={styles.metricaValor}>
              {dadosRelatorio.bairrosFrequentes.length}
            </div>
            <div style={styles.metricaDesc}>
              Áreas de maior entrega
            </div>
          </div>

          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>📉</span>
              <h3 style={styles.metricaTitulo}>Taxa de Cancelamento</h3>
            </div>
            <div style={{
              ...styles.metricaValor,
              color: dadosRelatorio.taxaCancelamento > 10 ? '#F56565' : '#48BB78'
            }}>
              {dadosRelatorio.taxaCancelamento.toFixed(1)}%
            </div>
            <div style={styles.metricaDesc}>
              Pedidos cancelados
            </div>
          </div>

          <div style={styles.metricaCard}>
            <div style={styles.metricaHeader}>
              <span style={styles.metricaIcone}>🍔</span>
              <h3 style={styles.metricaTitulo}>Produtos Vendidos</h3>
            </div>
            <div style={styles.metricaValor}>
              {dadosRelatorio.produtosMaisVendidos.reduce((sum, p) => sum + p.vendas, 0)}
            </div>
            <div style={styles.metricaDesc}>
              Total de itens vendidos
            </div>
          </div>
        </div>

        {/* Clientes Fiéis */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Clientes Fiéis</h2>
          <div style={styles.clientesGrid}>
            {dadosRelatorio.clientesFieis.length === 0 ? (
              <div style={styles.emptyState}>
                <span>👤</span>
                <p>Nenhum cliente com múltiplos pedidos no período</p>
              </div>
            ) : (
              dadosRelatorio.clientesFieis.map((cliente, index) => (
                <div key={index} style={styles.clienteCard}>
                  <div style={styles.clienteAvatar}>
                    {cliente.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.clienteInfo}>
                    <h4 style={styles.clienteNome}>{cliente.nome}</h4>
                    <div style={styles.clienteContato}>
                      📞 {cliente.telefone}
                    </div>
                    <div style={styles.clienteStats}>
                      <div style={styles.statItem}>
                        <span>📦</span>
                        <span>{cliente.totalPedidos} pedidos</span>
                      </div>
                      <div style={styles.statItem}>
                        <span>💰</span>
                        <span>{formatarMoeda(cliente.totalGasto)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.clienteRanking}>
                    <div style={styles.rankingPosicao}>#{index + 1}</div>
                    <div style={styles.rankingLabel}>Top Cliente</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mapa de Calor de Bairros */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📍 Mapa de Calor por Bairro</h2>
          <div style={styles.bairrosGrid}>
            {dadosRelatorio.bairrosFrequentes.length === 0 ? (
              <div style={styles.emptyState}>
                <span>🗺️</span>
                <p>Nenhum dado de bairro disponível</p>
              </div>
            ) : (
              dadosRelatorio.bairrosFrequentes.map((bairro, index) => {
                // Calcular intensidade baseada no total de pedidos
                const maxPedidos = Math.max(...dadosRelatorio.bairrosFrequentes.map(b => b.totalPedidos));
                const intensidade = (bairro.totalPedidos / maxPedidos) * 100;
                
                return (
                  <div key={index} style={styles.bairroCard}>
                    <div style={styles.bairroHeader}>
                      <h4 style={styles.bairroNome}>{bairro.nome}</h4>
                      <span style={styles.bairroRank}>#{index + 1}</span>
                    </div>
                    <div style={styles.bairroStats}>
                      <div style={styles.bairroStat}>
                        <span>📦</span>
                        <span>{bairro.totalPedidos} pedidos</span>
                      </div>
                      <div style={styles.bairroStat}>
                        <span>💰</span>
                        <span>{formatarMoeda(bairro.totalGasto)}</span>
                      </div>
                    </div>
                    <div style={styles.heatBar}>
                      <div 
                        style={{
                          width: `${intensidade}%`,
                          backgroundColor: intensidade > 80 ? '#F56565' :
                                         intensidade > 60 ? '#ED8936' :
                                         intensidade > 40 ? '#F6E05E' :
                                         intensidade > 20 ? '#68D391' :
                                         '#4FD1C5',
                          height: '8px',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Análise de Cancelamento */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📉 Análise de Cancelamentos</h2>
          <div style={styles.analiseGrid}>
            <div style={styles.analiseCard}>
              <h3 style={styles.analiseTitulo}>Taxa de Cancelamento</h3>
              <div style={styles.analiseGauge}>
                <div style={styles.gaugeContainer}>
                  <div style={styles.gaugeBackground}></div>
                  <div 
                    style={{
                      ...styles.gaugeFill,
                      width: `${Math.min(dadosRelatorio.taxaCancelamento, 100)}%`,
                      backgroundColor: dadosRelatorio.taxaCancelamento > 15 ? '#F56565' :
                                     dadosRelatorio.taxaCancelamento > 10 ? '#ED8936' :
                                     dadosRelatorio.taxaCancelamento > 5 ? '#F6E05E' :
                                     '#48BB78'
                    }}
                  ></div>
                </div>
                <div style={styles.gaugeValue}>
                  {dadosRelatorio.taxaCancelamento.toFixed(1)}%
                </div>
              </div>
              <div style={styles.analiseLegenda}>
                <div style={styles.legendaItem}>
                  <div style={{...styles.legendaCor, backgroundColor: '#48BB78'}}></div>
                  <span>Ótimo (≤ 5%)</span>
                </div>
                <div style={styles.legendaItem}>
                  <div style={{...styles.legendaCor, backgroundColor: '#F6E05E'}}></div>
                  <span>Aceitável (5-10%)</span>
                </div>
                <div style={styles.legendaItem}>
                  <div style={{...styles.legendaCor, backgroundColor: '#ED8936'}}></div>
                  <span>Alerta (10-15%)</span>
                </div>
                <div style={styles.legendaItem}>
                  <div style={{...styles.legendaCor, backgroundColor: '#F56565'}}></div>
                  <span>Crítico (maior que 15%)</span>
                </div>
              </div>
            </div>

            <div style={styles.analiseCard}>
              <h3 style={styles.analiseTitulo}>Horário das Vendas</h3>
              <div style={styles.vendasHorario}>
                {dadosRelatorio.vendasPorHora.slice(12, 24).map((hora, index) => (
                  <div key={index} style={styles.horaItem}>
                    <div style={styles.horaLabel}>{hora.hora}</div>
                    <div style={styles.horaBar}>
                      <div 
                        style={{
                          width: `${(hora.vendas / Math.max(...dadosRelatorio.vendasPorHora.map(h => h.vendas))) * 100}%`,
                          backgroundColor: '#4FD1C5',
                          height: '20px',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                    <div style={styles.horaVendas}>{hora.vendas} vendas</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏆 Produtos Mais Vendidos</h2>
          <div style={styles.produtosTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCol}>Posição</div>
              <div style={styles.tableCol}>Produto</div>
              <div style={styles.tableCol}>Quantidade</div>
              <div style={styles.tableCol}>Faturamento</div>
              <div style={styles.tableCol}>Participação</div>
            </div>
            
            {dadosRelatorio.produtosMaisVendidos.map((produto, index) => {
              const totalVendas = dadosRelatorio.produtosMaisVendidos.reduce((sum, p) => sum + p.vendas, 0);
              const participacao = (produto.vendas / totalVendas) * 100;
              
              return (
                <div key={index} style={styles.tableRow}>
                  <div style={styles.tableCol}>
                    <div style={styles.posicaoBadge}>
                      #{index + 1}
                    </div>
                  </div>
                  <div style={styles.tableCol}>
                    <strong>{produto.nome}</strong>
                  </div>
                  <div style={styles.tableCol}>
                    {produto.vendas} unidades
                  </div>
                  <div style={styles.tableCol}>
                    <strong>{formatarMoeda(produto.valor)}</strong>
                  </div>
                  <div style={styles.tableCol}>
                    <div style={styles.participacaoBar}>
                      <div 
                        style={{
                          width: `${participacao}%`,
                          backgroundColor: index === 0 ? '#F6E05E' :
                                         index === 1 ? '#CBD5E0' :
                                         index === 2 ? '#A0AEC0' :
                                         '#718096',
                          height: '8px',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                    <span style={styles.participacaoValor}>
                      {participacao.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botão de Exportar */}
        <div style={styles.exportarSection}>
          <button style={styles.btnExportar}>
            📥 Exportar Relatório Completo (PDF)
          </button>
          <button style={styles.btnExportarExcel}>
            📊 Exportar para Excel
          </button>
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
  section: {
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
  clientesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  clienteCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  clienteAvatar: {
    width: '60px',
    height: '60px',
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '24px'
  },
  clienteInfo: {
    flex: 1
  },
  clienteNome: {
    color: '#4FD1C5',
    fontSize: '16px',
    margin: '0 0 5px 0'
  },
  clienteContato: {
    color: '#81E6D9',
    fontSize: '14px',
    marginBottom: '10px'
  },
  clienteStats: {
    display: 'flex',
    gap: '15px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#A0AEC0',
    fontSize: '13px'
  },
  clienteRanking: {
    textAlign: 'center'
  },
  rankingPosicao: {
    color: '#F6E05E',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  rankingLabel: {
    color: '#A0AEC0',
    fontSize: '12px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px 20px',
    color: '#A0AEC0'
  },
  bairrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  bairroCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px'
  },
  bairroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  bairroNome: {
    color: '#4FD1C5',
    fontSize: '16px',
    margin: 0
  },
  bairroRank: {
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    color: '#4FD1C5',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  bairroStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '15px'
  },
  bairroStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  heatBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '8px'
  },
  analiseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px'
  },
  analiseCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '25px'
  },
  analiseTitulo: {
    color: '#4FD1C5',
    fontSize: '18px',
    marginBottom: '20px'
  },
  analiseGauge: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  gaugeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    height: '20px',
    overflow: 'hidden',
    marginBottom: '10px',
    position: 'relative'
  },
  gaugeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, #48BB78 0%, #F6E05E 50%, #F56565 100%)'
  },
  gaugeFill: {
    height: '100%',
    borderRadius: '4px',
    position: 'relative',
    zIndex: 1
  },
  gaugeValue: {
    color: '#81E6D9',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  analiseLegenda: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  legendaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#A0AEC0',
    fontSize: '12px'
  },
  legendaCor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px'
  },
  vendasHorario: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  horaItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    gap: '15px',
    alignItems: 'center'
  },
  horaLabel: {
    color: '#A0AEC0',
    fontSize: '14px'
  },
  horaBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '20px'
  },
  horaVendas: {
    color: '#81E6D9',
    fontSize: '14px',
    textAlign: 'right'
  },
  produtosTable: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '80px 2fr 1fr 1fr 1fr',
    gap: '20px',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '80px 2fr 1fr 1fr 1fr',
    gap: '20px',
    padding: '20px',
    borderTop: '1px solid rgba(79, 209, 197, 0.08)',
    color: '#A0AEC0',
    fontSize: '14px',
    alignItems: 'center'
  },
  tableCol: {
    display: 'flex',
    alignItems: 'center'
  },
  posicaoBadge: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(79, 209, 197, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  participacaoBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '8px',
    marginBottom: '5px'
  },
  participacaoValor: {
    color: '#81E6D9',
    fontSize: '12px'
  },
  exportarSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '40px 0'
  },
  btnExportar: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  btnExportarExcel: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    color: '#48BB78',
    border: '1px solid rgba(72, 187, 120, 0.2)',
    padding: '15px 30px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }
};

export default Relatorios;