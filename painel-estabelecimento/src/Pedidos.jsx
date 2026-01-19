import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import NotificacaoPedido from './NotificacaoPedido';
import { 
  collection, onSnapshot, query, orderBy, doc, 
  updateDoc, serverTimestamp, where, getDocs 
} from 'firebase/firestore';

const Pedidos = ({ user, isMobile }) => {
  const [pedidos, setPedidos] = useState([]);
  const [tabAtiva, setTabAtiva] = useState('pendentes');
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
  
  const audioRef = useRef(null);
  const pedidosAnterioresRef = useRef([]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
  }, []);

  useEffect(() => {
    if (!user) return;
    const pedidosRef = collection(db, 'Pedidos');
    const q = query(pedidosRef, orderBy('dataCriacao', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, status: data.status || 'pendente' };
      });

      if (pedidosAnterioresRef.current.length > 0) {
        const novosPedidos = listaPedidos.filter(newP => 
          newP.status === 'pendente' && 
          !pedidosAnterioresRef.current.some(oldP => oldP.id === newP.id)
        );
        novosPedidos.forEach(p => {
          setPedidoParaAceitar(p);
          setMostrarModalNovoPedido(true);
          audioRef.current?.play().catch(() => {});
        });
      }
      pedidosAnterioresRef.current = listaPedidos;
      setPedidos(listaPedidos);
    });
    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (id, novoStatus) => {
    await updateDoc(doc(db, 'Pedidos', id), { status: novoStatus, atualizadoEm: serverTimestamp() });
    setMostrarModalNovoPedido(false);
  };

  const filtrarPedidos = (statusAlvo) => {
    if (statusAlvo === 'historico') return pedidos.filter(p => p.status === 'entregue' || p.status === 'cancelado');
    const mapeado = statusAlvo === 'pendentes' ? 'pendente' : statusAlvo;
    return pedidos.filter(p => p.status === mapeado);
  };

  const calcularTempo = (data) => {
    if (!data) return 'Agora';
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 60000);
    return diff < 60 ? `${diff} min` : `${Math.floor(diff/60)}h ${diff%60}min`;
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🛍️ Gestão de Pedidos</h1>
          <p style={{color: '#81E6D9', margin: 0}}>Painel em tempo real</p>
        </header>

        <div style={styles.tabsContainer}>
          {['pendentes', 'preparo', 'entrega', 'historico'].map(t => (
            <button key={t} style={{...styles.tabButton, ...(tabAtiva === t ? styles.tabActive : {})}} onClick={() => setTabAtiva(t)}>
              {t.toUpperCase()} ({filtrarPedidos(t).length})
            </button>
          ))}
        </div>

        <div style={styles.grid}>
          {filtrarPedidos(tabAtiva).map(p => {
            const horaPedido = p.dataCriacao?.toDate 
              ? p.dataCriacao.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
              : '--:--';

            return (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.pedidoId}>Nº {p.numeroPedido || p.id.slice(-6).toUpperCase()}</span>
                  <span style={{...styles.statusBadge, color: p.status === 'pendente' ? '#F56565' : '#4FD1C5'}}>
                    ● {p.status.toUpperCase()}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <h3 style={styles.clienteNome}>{p.cliente?.nome || p.nome}</h3>
                  <p style={styles.endereco}>
                    📍 {p.cliente?.endereco?.rua}, {p.cliente?.endereco?.numero}<br/>
                    {p.cliente?.endereco?.bairro} - {p.cliente?.endereco?.complemento}<br/>
                    <strong>{p.cliente?.endereco?.cidade || 'Cidade não informada'}</strong><br/>
                    <small>📞 {p.cliente?.telefone || p.telefone}</small>
                  </p>

                  <div style={styles.divisor} />
                  
                  <div style={styles.infoTempo}>
                    <span>🕒 Pedido às: <strong>{horaPedido}</strong></span>
                    <span>⏱️ Espera: <strong>{calcularTempo(p.dataCriacao)}</strong></span>
                  </div>

                  <div style={styles.divisor} />

                  <div style={styles.itensLista}>
                    {p.itens?.map((item, i) => (
                      <div key={i} style={styles.itemRow}>
                        <span>{item.quantidade}x {item.nome}</span>
                        <span>R$ {parseFloat(item.precoUnitario || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={styles.totalBox}>
                    <div style={styles.totalRow}>
                      <span>Taxa de Entrega</span>
                      <span>R$ {parseFloat(p.pagamento?.taxaEntrega || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.totalRowMain}>
                      <span>TOTAL</span>
                      <span>R$ {parseFloat(p.pagamento?.total || p.total || 0).toFixed(2)}</span>
                    </div>
                    <div style={{marginTop: '5px'}}>
                        <small style={{color: '#81E6D9', textTransform: 'uppercase'}}>
                          💳 {p.pagamento?.metodo || 'Não informado'}
                        </small>
                    </div>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  {p.status === 'pendente' && (
                    <button style={styles.btnAceitar} onClick={() => handleStatusChange(p.id, 'preparo')}>
                      ACEITAR PEDIDO
                    </button>
                  )}
                  {p.status === 'preparo' && (
                    <button style={styles.btnPronto} onClick={() => handleStatusChange(p.id, 'entrega')}>
                      MARCAR COMO PRONTO
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <NotificacaoPedido 
          isOpen={mostrarModalNovoPedido} 
          pedido={pedidoParaAceitar} 
          onAceitar={() => handleStatusChange(pedidoParaAceitar.id, 'preparo')} 
          onRecusar={() => setMostrarModalNovoPedido(false)} 
          calcularTempo={calcularTempo} 
        />
      </div>
    </Layout>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '30px' },
  title: { color: '#4FD1C5', fontSize: '28px', margin: 0 },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px' },
  tabButton: { padding: '12px 20px', borderRadius: '8px', border: '1px solid #4FD1C5', background: 'transparent', color: '#4FD1C5', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tabActive: { background: '#4FD1C5', color: '#00171A' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  card: { background: '#002328', borderRadius: '15px', border: '1px solid rgba(79, 209, 197, 0.2)', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' },
  pedidoId: { color: '#F6E05E', fontWeight: 'bold', fontSize: '16px' },
  statusBadge: { fontSize: '11px', fontWeight: 'bold', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '12px' },
  clienteNome: { color: '#fff', margin: '0 0 5px 0', fontSize: '18px' },
  endereco: { color: '#A0AEC0', fontSize: '13px', margin: 0, lineHeight: '1.5' },
  divisor: { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' },
  infoTempo: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#81E6D9', background: 'rgba(79, 209, 197, 0.05)', padding: '8px', borderRadius: '6px' },
  itensLista: { marginBottom: '15px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', color: '#CBD5E0', fontSize: '14px', marginBottom: '5px' },
  totalBox: { background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', color: '#A0AEC0', fontSize: '12px', marginBottom: '4px' },
  totalRowMain: { display: 'flex', justifyContent: 'space-between', color: '#4FD1C5', fontSize: '20px', fontWeight: 'bold' },
  btnAceitar: { width: '100%', padding: '15px', borderRadius: '8px', border: 'none', background: '#48BB78', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', transition: '0.2s' },
  btnPronto: { width: '100%', padding: '15px', borderRadius: '8px', border: 'none', background: '#4299E1', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  cardFooter: { marginTop: '15px' },
  tempo: { textAlign: 'center', color: '#718096', fontSize: '11px', marginTop: '10px' }
};

export default Pedidos;