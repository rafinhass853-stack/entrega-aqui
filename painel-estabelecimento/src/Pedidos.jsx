import React, { useState, useEffect } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';

const Pedidos = ({ user, isMobile }) => {
  const [pedidos, setPedidos] = useState([]);
  const [tabAtiva, setTabAtiva] = useState('pendentes');
  const [entregadoresDisponiveis, setEntregadoresDisponiveis] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [mostrarModalEntregador, setMostrarModalEntregador] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Buscar pedidos em tempo real
    const pedidosRef = collection(db, 'estabelecimentos', user.uid, 'pedidos');
    const q = query(pedidosRef, orderBy('dataPedido', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPedidos(listaPedidos);
    });

    // Buscar entregadores disponíveis
    fetchEntregadoresDisponiveis();

    return () => unsubscribe();
  }, [user]);

  const fetchEntregadoresDisponiveis = async () => {
    if (!user) return;

    try {
      const entregadoresRef = collection(db, 'estabelecimentos', user.uid, 'entregadores');
      const q = query(entregadoresRef, where('status', '==', 'disponivel'));
      
      const snapshot = await getDocs(q);
      const listaEntregadores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEntregadoresDisponiveis(listaEntregadores);
    } catch (error) {
      console.error('Erro ao buscar entregadores:', error);
    }
  };

  const filtrarPedidos = (status) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (status === 'historico') {
      return pedidos.filter(p => 
        p.status === 'entregue' || 
        p.status === 'cancelado' ||
        (p.dataPedido?.toDate && p.dataPedido.toDate() < hoje)
      );
    }

    return pedidos.filter(p => p.status === status);
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      pendente: { cor: '#F56565', label: 'Pendente', icon: '⏳' },
      preparo: { cor: '#ED8936', label: 'Em Preparo', icon: '👨‍🍳' },
      entrega: { cor: '#4299E1', label: 'Para Entrega', icon: '🚚' },
      rota: { cor: '#805AD5', label: 'Em Rota', icon: '🏍️' },
      entregue: { cor: '#48BB78', label: 'Entregue', icon: '✅' },
      cancelado: { cor: '#718096', label: 'Cancelado', icon: '❌' }
    };
    
    return statusConfig[status] || statusConfig.pendente;
  };

  const handleStatusChange = async (pedidoId, novoStatus) => {
    try {
      const pedidoRef = doc(db, 'estabelecimentos', user.uid, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, {
        status: novoStatus,
        atualizadoEm: serverTimestamp()
      });

      if (novoStatus === 'entrega') {
        setPedidoSelecionado(pedidoId);
        setMostrarModalEntregador(true);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleAtribuirEntregador = async (entregadorId) => {
    if (!pedidoSelecionado) return;

    try {
      // Atualizar pedido
      const pedidoRef = doc(db, 'estabelecimentos', user.uid, 'pedidos', pedidoSelecionado);
      await updateDoc(pedidoRef, {
        status: 'rota',
        entregadorId: entregadorId,
        horarioSaida: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      // Atualizar entregador
      const entregadorRef = doc(db, 'estabelecimentos', user.uid, 'entregadores', entregadorId);
      await updateDoc(entregadorRef, {
        status: 'entrega',
        ultimoPedido: pedidoSelecionado,
        ultimaAtualizacao: serverTimestamp()
      });

      setMostrarModalEntregador(false);
      setPedidoSelecionado(null);
      fetchEntregadoresDisponiveis();
    } catch (error) {
      console.error('Erro ao atribuir entregador:', error);
    }
  };

  const calcularTempo = (dataPedido) => {
    if (!dataPedido) return '--:--';
    
    const data = dataPedido.toDate ? dataPedido.toDate() : new Date(dataPedido);
    const diffMs = new Date() - data;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    } else {
      const horas = Math.floor(diffMins / 60);
      const minutos = diffMins % 60;
      return `${horas}h ${minutos}min`;
    }
  };

  const tabs = [
    { id: 'pendentes', label: '⏳ Pendentes', count: filtrarPedidos('pendente').length },
    { id: 'preparo', label: '👨‍🍳 Em Preparo', count: filtrarPedidos('preparo').length },
    { id: 'entrega', label: '🚚 Para Entrega', count: filtrarPedidos('entrega').length },
    { id: 'historico', label: '📋 Histórico do Dia', count: filtrarPedidos('historico').length },
  ];

  const pedidosFiltrados = filtrarPedidos(tabAtiva);

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>🛍️ Gestão de Pedidos</h1>
            <p style={styles.subtitle}>Acompanhe e gerencie os pedidos em tempo real</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.btnNovoPedido}>
              <span style={{ marginRight: '8px' }}>📝</span>
              Novo Pedido Manual
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabButton,
                ...(tabAtiva === tab.id ? styles.tabButtonActive : {})
              }}
              onClick={() => setTabAtiva(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={styles.tabBadge}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de Pedidos */}
        <div style={styles.pedidosGrid}>
          {pedidosFiltrados.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>Nenhum pedido encontrado</h3>
              <p style={styles.emptyText}>
                {tabAtiva === 'pendentes' ? 'Não há pedidos pendentes no momento.' :
                 tabAtiva === 'historico' ? 'Nenhum pedido no histórico de hoje.' :
                 'Todos os pedidos foram processados.'}
              </p>
            </div>
          ) : (
            pedidosFiltrados.map(pedido => {
              const statusInfo = getStatusInfo(pedido.status);
              
              return (
                <div key={pedido.id} style={styles.pedidoCard}>
                  <div style={styles.pedidoHeader}>
                    <div style={styles.pedidoInfo}>
                      <span style={styles.pedidoNumero}>#{pedido.numero || pedido.id.slice(-6)}</span>
                      <span style={styles.pedidoCliente}>{pedido.cliente || 'Cliente'}</span>
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: `${statusInfo.cor}15`,
                      borderColor: statusInfo.cor,
                      color: statusInfo.cor
                    }}>
                      <span style={{ marginRight: '6px' }}>{statusInfo.icon}</span>
                      {statusInfo.label}
                    </div>
                  </div>

                  <div style={styles.pedidoBody}>
                    <div style={styles.pedidoItens}>
                      <strong style={{ color: '#81E6D9' }}>Itens:</strong>
                      {pedido.itens?.slice(0, 2).map((item, idx) => (
                        <div key={idx} style={styles.itemRow}>
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                      {pedido.itens?.length > 2 && (
                        <div style={styles.moreItems}>+{pedido.itens.length - 2} itens</div>
                      )}
                    </div>

                    <div style={styles.pedidoDetalhes}>
                      <div style={styles.detalheItem}>
                        <span>📞</span>
                        <span>{pedido.telefone || '(00) 0000-0000'}</span>
                      </div>
                      <div style={styles.detalheItem}>
                        <span>📍</span>
                        <span>{pedido.endereco || 'Endereço não informado'}</span>
                      </div>
                      <div style={styles.detalheItem}>
                        <span>⏰</span>
                        <span>Tempo: {calcularTempo(pedido.dataPedido)}</span>
                      </div>
                      {pedido.entregador && (
                        <div style={styles.detalheItem}>
                          <span>🏍️</span>
                          <span>Entregador: {pedido.entregador}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={styles.pedidoFooter}>
                    <div style={styles.pedidoTotal}>
                      <strong>Total:</strong>
                      <span style={styles.totalValor}>R$ {pedido.total?.toFixed(2) || '0,00'}</span>
                    </div>
                    
                    <div style={styles.pedidoAcoes}>
                      {pedido.status === 'pendente' && (
                        <button 
                          style={styles.btnAceitar}
                          onClick={() => handleStatusChange(pedido.id, 'preparo')}
                        >
                          ✅ Aceitar Pedido
                        </button>
                      )}
                      
                      {pedido.status === 'preparo' && (
                        <button 
                          style={styles.btnPronto}
                          onClick={() => handleStatusChange(pedido.id, 'entrega')}
                        >
                          👨‍🍳 Marcar como Pronto
                        </button>
                      )}
                      
                      {pedido.status === 'entrega' && (
                        <button 
                          style={styles.btnAtribuir}
                          onClick={() => {
                            setPedidoSelecionado(pedido.id);
                            setMostrarModalEntregador(true);
                          }}
                        >
                          🏍️ Atribuir Entregador
                        </button>
                      )}
                      
                      {pedido.status === 'rota' && (
                        <button 
                          style={styles.btnEntregue}
                          onClick={() => handleStatusChange(pedido.id, 'entregue')}
                        >
                          ✅ Marcar como Entregue
                        </button>
                      )}
                      
                      <button style={styles.btnDetalhes}>📋 Detalhes</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Seleção de Entregador */}
        {mostrarModalEntregador && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>🏍️ Selecione um Entregador</h3>
                <button 
                  style={styles.modalClose}
                  onClick={() => {
                    setMostrarModalEntregador(false);
                    setPedidoSelecionado(null);
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={styles.entregadoresList}>
                {entregadoresDisponiveis.length === 0 ? (
                  <div style={styles.emptyEntregadores}>
                    <span>😕</span>
                    <p>Nenhum entregador disponível no momento</p>
                  </div>
                ) : (
                  entregadoresDisponiveis.map(entregador => (
                    <button
                      key={entregador.id}
                      style={styles.entregadorCard}
                      onClick={() => handleAtribuirEntregador(entregador.id)}
                    >
                      <div style={styles.entregadorAvatar}>
                        {entregador.nome?.charAt(0) || 'E'}
                      </div>
                      <div style={styles.entregadorInfo}>
                        <strong style={{ color: '#4FD1C5' }}>{entregador.nome}</strong>
                        <div style={{ fontSize: '12px', color: '#A0AEC0' }}>
                          📞 {entregador.telefone}
                        </div>
                        <div style={{ fontSize: '12px', color: '#A0AEC0' }}>
                          🏍️ {entregador.veiculo} - {entregador.placa}
                        </div>
                      </div>
                      <div style={styles.entregadorStatus}>
                        <div style={{
                          ...styles.statusDot,
                          backgroundColor: '#48BB78'
                        }}></div>
                        Disponível
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '30px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)' 
  },
  title: { color: '#4FD1C5', fontSize: '26px', marginBottom: '8px' },
  subtitle: { color: '#81E6D9', opacity: 0.8 },
  headerActions: { display: 'flex', gap: '12px' },
  btnNovoPedido: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  tabButton: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    color: '#A0AEC0',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  tabButtonActive: {
    backgroundColor: '#4FD1C5',
    color: '#00171A',
    borderColor: '#4FD1C5'
  },
  tabBadge: {
    backgroundColor: '#F56565',
    color: 'white',
    fontSize: '12px',
    borderRadius: '10px',
    padding: '2px 8px',
    marginLeft: '4px'
  },
  pedidosGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  pedidoCard: {
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  pedidoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  pedidoInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  pedidoNumero: {
    color: '#F6E05E',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  pedidoCliente: {
    color: '#81E6D9',
    fontSize: '14px'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid'
  },
  pedidoBody: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)'
  },
  pedidoItens: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  moreItems: {
    color: '#718096',
    fontSize: '12px',
    fontStyle: 'italic'
  },
  pedidoDetalhes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  detalheItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#A0AEC0',
    fontSize: '14px'
  },
  pedidoFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pedidoTotal: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#81E6D9',
    fontSize: '16px'
  },
  totalValor: {
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '20px'
  },
  pedidoAcoes: {
    display: 'flex',
    gap: '8px'
  },
  btnAceitar: {
    backgroundColor: '#48BB78',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnPronto: {
    backgroundColor: '#ED8936',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnAtribuir: {
    backgroundColor: '#4299E1',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnEntregue: {
    backgroundColor: '#48BB78',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnDetalhes: {
    backgroundColor: 'transparent',
    color: '#81E6D9',
    border: '1px solid rgba(79, 209, 197, 0.3)',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#A0AEC0'
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '20px',
    marginBottom: '10px',
    color: '#81E6D9'
  },
  emptyText: {
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 10, 15, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)'
  },
  modalContent: {
    backgroundColor: '#00171A',
    borderRadius: '12px',
    border: '1px solid rgba(79, 209, 197, 0.2)',
    width: '500px',
    maxWidth: '90%',
    maxHeight: '80%',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(79, 209, 197, 0.08)'
  },
  modalTitle: {
    color: '#4FD1C5',
    fontSize: '18px',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#A0AEC0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  entregadoresList: {
    padding: '20px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  entregadorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'rgba(0, 35, 40, 0.6)',
    border: '1px solid rgba(79, 209, 197, 0.12)',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '10px',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.2s ease'
  },
  entregadorAvatar: {
    width: '50px',
    height: '50px',
    backgroundColor: 'rgba(79, 209, 197, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4FD1C5',
    fontWeight: 'bold',
    fontSize: '20px'
  },
  entregadorInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  entregadorStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#48BB78',
    fontSize: '14px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  emptyEntregadores: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#A0AEC0'
  }
};

export default Pedidos;