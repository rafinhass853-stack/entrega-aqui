import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy
} from 'firebase/firestore';

const Faturamento = ({ user, isMobile }) => {
  const [periodo, setPeriodo] = useState('hoje');
  const [loading, setLoading] = useState(true);
  const [dadosFaturamento, setDadosFaturamento] = useState({
    faturamentoBruto: 0,
    taxasEntrega: 0,
    comissoesPlataformas: 0,
    faturamentoLiquido: 0,
    formasPagamento: { pix: 0, cartao: 0, dinheiro: 0 },
    transacoes: []
  });

  useEffect(() => {
    if (user) {
      fetchFaturamentoData();
    }
  }, [user, periodo]);

  const fetchFaturamentoData = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      let dataInicio = new Date();
      let dataFim = new Date();

      // Configuração dos filtros de data
      switch (periodo) {
        case 'hoje':
          dataInicio.setHours(0, 0, 0, 0);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'ontem':
          dataInicio.setDate(hoje.getDate() - 1);
          dataInicio.setHours(0, 0, 0, 0);
          dataFim.setDate(hoje.getDate() - 1);
          dataFim.setHours(23, 59, 59, 999);
          break;
        case 'semana':
          dataInicio.setDate(hoje.getDate() - 7);
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
      }

      const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
      
      // Consulta Real no Firebase
      // Nota: Pode ser necessário criar um índice no Firebase para dataPedido + status
      const q = query(
        pedidosRef,
        where('dataPedido', '>=', dataInicio),
        where('dataPedido', '<=', dataFim),
        where('status', '==', 'entregue'),
        orderBy('dataPedido', 'desc')
      );

      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Inicia contadores
      let bruto = 0;
      let entregas = 0;
      let metodos = { pix: 0, cartao: 0, dinheiro: 0 };

      pedidos.forEach(pedido => {
        const valorTotal = pedido.pagamento?.total || 0;
        const valorTaxa = pedido.pagamento?.taxaEntrega || 0;
        const metodo = (pedido.pagamento?.metodo || 'dinheiro').toLowerCase();

        bruto += valorTotal;
        entregas += valorTaxa;

        // Mapeia os métodos de pagamento para as chaves do objeto
        if (metodo.includes('pix')) metodos.pix += valorTotal;
        else if (metodo.includes('cartao') || metodo.includes('cartão')) metodos.cartao += valorTotal;
        else metodos.dinheiro += valorTotal;
      });

      const comissoes = bruto * 0.12; // Exemplo: 12% de comissão fixa

      setDadosFaturamento({
        faturamentoBruto: bruto,
        taxasEntrega: entregas,
        comissoesPlataformas: comissoes,
        faturamentoLiquido: bruto - comissoes,
        formasPagamento: metodos,
        transacoes: pedidos.map(p => ({
          id: p.id,
          data: p.dataPedido?.toDate() || new Date(),
          valor: p.pagamento?.total || 0,
          formaPagamento: p.pagamento?.metodo || 'cartão',
          status: p.status,
          pedidoNumero: p.numeroPedido || p.id.slice(-6)
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar faturamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Faturamento</h1>
            <p style={styles.subtitle}>Acompanhe seu fluxo de caixa real</p>
          </div>
          <div style={styles.filtros}>
            {['hoje', 'ontem', 'semana', 'mes'].map(p => (
              <button
                key={p}
                style={{
                  ...styles.filtroBtn,
                  ...(periodo === p ? styles.filtroBtnAtivo : {})
                }}
                onClick={() => setPeriodo(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div style={{color: '#4FD1C5', textAlign: 'center', padding: '50px'}}>Calculando faturamento...</div>
        ) : (
          <>
            <div style={styles.metricasGrid}>
              <MetricaCard title="Faturamento Bruto" valor={formatarMoeda(dadosFaturamento.faturamentoBruto)} icone="💰" desc="Total das vendas" />
              <MetricaCard title="Taxas de Entrega" valor={formatarMoeda(dadosFaturamento.taxasEntrega)} icone="🚚" desc="Total fretes" />
              <MetricaCard title="Comissões" valor={formatarMoeda(dadosFaturamento.comissoesPlataformas)} icone="📱" desc="Estimativa taxas" />
              <MetricaCard title="Faturamento Líquido" valor={formatarMoeda(dadosFaturamento.faturamentoLiquido)} icone="💎" desc="Lucro bruto aproximado" destaque />
            </div>

            <div style={styles.chartSection}>
              <h2 style={styles.sectionTitle}>💳 Formas de Pagamento</h2>
              <div style={styles.chartContainer}>
                <ProgressBar label="PIX" valor={dadosFaturamento.formasPagamento.pix} total={dadosFaturamento.faturamentoBruto} cor="#48BB78" icone="🏦" />
                <ProgressBar label="Cartão" valor={dadosFaturamento.formasPagamento.cartao} total={dadosFaturamento.faturamentoBruto} cor="#4299E1" icone="💳" />
                <ProgressBar label="Dinheiro" valor={dadosFaturamento.formasPagamento.dinheiro} total={dadosFaturamento.faturamentoBruto} cor="#F6E05E" icone="💵" />
              </div>
            </div>

            <div style={styles.transacoesSection}>
              <h2 style={styles.sectionTitle}>📋 Histórico do Período</h2>
              <div style={styles.transacoesTable}>
                <div style={styles.tableHeader}>
                  <div>Hora</div><div>Pedido</div><div>Valor</div><div>Pagamento</div><div>Status</div>
                </div>
                {dadosFaturamento.transacoes.map(t => (
                  <div key={t.id} style={styles.tableRow}>
                    <div>{t.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div>#{t.pedidoNumero}</div>
                    <div style={{fontWeight: 'bold', color: '#4FD1C5'}}>{formatarMoeda(t.valor)}</div>
                    <div>{t.formaPagamento}</div>
                    <div style={{color: '#48BB78'}}>✓ Concluído</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

// Sub-componentes para organizar o código
const MetricaCard = ({ title, valor, icone, desc, destaque }) => (
  <div style={{...styles.metricaCard, ...(destaque ? {backgroundColor: 'rgba(72, 187, 120, 0.1)', borderColor: '#48BB78'} : {})}}>
    <div style={styles.metricaHeader}>
      <span>{icone}</span>
      <h3 style={styles.metricaTitulo}>{title}</h3>
    </div>
    <div style={{...styles.metricaValor, ...(destaque ? {color: '#48BB78'} : {})}}>{valor}</div>
    <div style={styles.metricaDesc}>{desc}</div>
  </div>
);

const ProgressBar = ({ label, valor, total, cor, icone }) => {
  const porcentagem = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div style={styles.pieItem}>
      <div style={styles.pieLabel}>
        <span>{icone} {label}</span>
        <span style={styles.piePercent}>{porcentagem.toFixed(1)}%</span>
      </div>
      <div style={styles.pieBar}>
        <div style={{ width: `${porcentagem}%`, backgroundColor: cor, height: '8px', borderRadius: '4px', transition: 'width 0.5s' }}></div>
      </div>
      <div style={styles.pieValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}</div>
    </div>
  );
};

// Estilos mantidos conforme sua base (com correções de flexibilidade)
const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  title: { color: '#4FD1C5', fontSize: '26px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  filtros: { display: 'flex', gap: '8px' },
  filtroBtn: { background: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', color: '#A0AEC0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  filtroBtnAtivo: { backgroundColor: '#4FD1C5', color: '#00171A' },
  metricasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' },
  metricaCard: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '20px' },
  metricaHeader: { display: 'flex', gap: '10px', marginBottom: '15px' },
  metricaTitulo: { color: '#81E6D9', fontSize: '14px' },
  metricaValor: { color: '#4FD1C5', fontSize: '24px', fontWeight: 'bold' },
  metricaDesc: { color: '#A0AEC0', fontSize: '12px' },
  chartSection: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '25px', marginBottom: '40px' },
  sectionTitle: { color: '#4FD1C5', fontSize: '18px', marginBottom: '20px' },
  chartContainer: { display: 'flex', flexDirection: 'column', gap: '20px' },
  pieItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  pieLabel: { display: 'flex', justifyContent: 'space-between', color: '#81E6D9' },
  piePercent: { color: '#4FD1C5', fontWeight: 'bold' },
  pieBar: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', height: '8px' },
  pieValue: { color: '#A0AEC0', fontSize: '12px', textAlign: 'right' },
  transacoesSection: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.12)', borderRadius: '12px', padding: '20px' },
  transacoesTable: { overflowX: 'auto' },
  tableHeader: { display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 0', borderBottom: '2px solid rgba(79, 209, 197, 0.2)', color: '#4FD1C5', fontWeight: 'bold', minWidth: '600px' },
  tableRow: { display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '15px 0', borderBottom: '1px solid rgba(79, 209, 197, 0.08)', color: '#A0AEC0', minWidth: '600px' }
};

export default Faturamento;