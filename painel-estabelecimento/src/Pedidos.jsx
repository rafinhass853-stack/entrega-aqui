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

    // AJUSTE: A coleção correta é 'Pedidos' (na raiz) conforme seu banco de dados
    const pedidosRef = collection(db, 'Pedidos');
    
    // AJUSTE: O campo de data no seu banco chama-se 'dataCriacao'
    const q = query(pedidosRef, orderBy('dataCriacao', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Garante que o filtro funcione mesmo se o status vier vazio
          status: data.status || 'pendente' 
        };
      });
      setPedidos(listaPedidos);
    });

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
    if (status === 'historico') {
      return pedidos.filter(p => 
        p.status === 'entregue' || 
        p.status === 'cancelado'
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
      // AJUSTE: Referência para a coleção 'Pedidos'
      const pedidoRef = doc(db, 'Pedidos', pedidoId);
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
      const pedidoRef = doc(db, 'Pedidos', pedidoSelecionado);
      await updateDoc(pedidoRef, {
        status: 'rota',
        entregadorId: entregadorId,
        horarioSaida: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

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

  const calcularTempo = (dataCriacao) => {
    if (!dataCriacao) return '-- min';
    const data = dataCriacao.toDate ? dataCriacao.toDate() : new Date(dataCriacao);
    const diffMs = new Date() - data;
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 60 ? `${diffMins} min` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}min`;
  };

  const tabs = [
    { id: 'pendentes', label: '⏳ Pendentes', count: filtrarPedidos('pendente').length },
    { id: 'preparo', label: '👨‍🍳 Em Preparo', count: filtrarPedidos('preparo').length },
    { id: 'entrega', label: '🚚 Para Entrega', count: filtrarPedidos('entrega').length },
    { id: 'historico', label: '📋 Histórico', count: filtrarPedidos('historico').length },
  ];

  const pedidosFiltrados = filtrarPedidos(tabAtiva);

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>🛍️ Gestão de Pedidos</h1>
            <p style={styles.subtitle}>Acompanhe seus pedidos em tempo real</p>
          </div>
        </header>

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
              {tab.count > 0 && <span style={styles.tabBadge}>{tab.count}</span>}
            </button>
          ))}
        </div>

        <div style={styles.pedidosGrid}>
          {pedidosFiltrados.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>Nenhum pedido</h3>
            </div>
          ) : (
            pedidosFiltrados.map(pedido => {
              const statusInfo = getStatusInfo(pedido.status);
              
              // AJUSTE: Acessando dados do objeto 'cliente' do seu banco
              const nomeCliente = pedido.cliente?.nome || 'Cliente';
              const foneCliente = pedido.cliente?.telefone || 'Sem telefone';
              const end = pedido.cliente?.endereco;
              const enderecoStr = end ? `${end.rua}, ${end.numero} - ${end.bairro}` : 'Endereço não informado';

              return (
                <div key={pedido.id} style={styles.pedidoCard}>
                  <div style={styles.pedidoHeader}>
                    <div style={styles.pedidoInfo}>
                      <span style={styles.pedidoNumero}>#{pedido.id.slice(-6).toUpperCase()}</span>
                      <span style={styles.pedidoCliente}>{nomeCliente}</span>
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
                      {pedido.itens?.map((item, idx) => (
                        <div key={idx} style={styles.itemRow}>
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={styles.pedidoDetalhes}>
                      <div style={styles.detalheItem}><span>📞</span>{foneCliente}</div>
                      <div style={styles.detalheItem}><span>📍</span>{enderecoStr}</div>
                      <div style={styles.detalheItem}><span>⏰</span>{calcularTempo(pedido.dataCriacao)}</div>
                    </div>
                  </div>

                  <div style={styles.pedidoFooter}>
                    <div style={styles.pedidoTotal}>
                      <strong>Total:</strong>
                      <span style={styles.totalValor}>R$ {pedido.total?.toFixed(2) || '0,00'}</span>
                    </div>
                    
                    <div style={styles.pedidoAcoes}>
                      {pedido.status === 'pendente' && (
                        <button style={styles.btnAceitar} onClick={() => handleStatusChange(pedido.id, 'preparo')}>Aceitar</button>
                      )}
                      {pedido.status === 'preparo' && (
                        <button style={styles.btnPronto} onClick={() => handleStatusChange(pedido.id, 'entrega')}>Pronto</button>
                      )}
                      {pedido.status === 'entrega' && (
                        <button style={styles.btnAtribuir} onClick={() => { setPedidoSelecionado(pedido.id); setMostrarModalEntregador(true); }}>Motoboy</button>
                      )}
                      {pedido.status === 'rota' && (
                        <button style={styles.btnEntregue} onClick={() => handleStatusChange(pedido.id, 'entregue')}>Concluído</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {mostrarModalEntregador && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Moto Boys Disponíveis</h3>
                <button style={styles.modalClose} onClick={() => setMostrarModalEntregador(false)}>✕</button>
              </div>
              <div style={styles.entregadoresList}>
                {entregadoresDisponiveis.length === 0 ? (
                  <p style={{textAlign: 'center', padding: '20px'}}>Nenhum motoboy online</p>
                ) : (
                  entregadoresDisponiveis.map(ent => (
                    <button key={ent.id} style={styles.entregadorCard} onClick={() => handleAtribuirEntregador(ent.id)}>
                      <div style={styles.entregadorAvatar}>{ent.nome?.charAt(0)}</div>
                      <div style={styles.entregadorInfo}>
                        <strong style={{color: '#4FD1C5'}}>{ent.nome}</strong>
                        <div style={{fontSize: '12px'}}>{ent.veiculo} - {ent.placa}</div>
                      </div>
                      <div style={styles.entregadorStatus}>Disponível</div>
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
  container: { maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(79, 209, 197, 0.1)', paddingBottom: '20px' },
  title: { color: '#4FD1C5', fontSize: '24px' },
  subtitle: { color: '#81E6D9', opacity: 0.7 },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' },
  tabButton: { backgroundColor: 'rgba(0, 35, 40, 0.6)', border: '1px solid rgba(79, 209, 197, 0.2)', color: '#A0AEC0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  tabButtonActive: { backgroundColor: '#4FD1C5', color: '#00171A', borderColor: '#4FD1C5' },
  tabBadge: { backgroundColor: '#F56565', color: 'white', fontSize: '11px', borderRadius: '10px', padding: '2px 8px' },
  pedidosGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  pedidoCard: { backgroundColor: 'rgba(0, 35, 40, 0.5)', border: '1px solid rgba(79, 209, 197, 0.15)', borderRadius: '12px', padding: '20px' },
  pedidoHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  pedidoNumero: { color: '#F6E05E', fontWeight: 'bold', fontSize: '14px' },
  pedidoCliente: { color: '#fff', fontSize: '18px', display: 'block', marginTop: '4px' },
  statusBadge: { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', border: '1px solid' },
  pedidoBody: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  pedidoItens: { display: 'flex', flexDirection: 'column', gap: '5px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', color: '#A0AEC0', fontSize: '14px' },
  pedidoDetalhes: { display: 'flex', flexDirection: 'column', gap: '8px', color: '#CBD5E0', fontSize: '14px' },
  detalheItem: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  pedidoFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalValor: { color: '#4FD1C5', fontSize: '22px', fontWeight: 'bold' },
  pedidoAcoes: { display: 'flex', gap: '10px' },
  btnAceitar: { backgroundColor: '#48BB78', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' },
  btnPronto: { backgroundColor: '#ED8936', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' },
  btnAtribuir: { backgroundColor: '#4299E1', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' },
  btnEntregue: { backgroundColor: '#48BB78', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#00171A', width: '400px', borderRadius: '12px', padding: '20px', border: '1px solid #4FD1C5' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  entregadorCard: { width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(79,209,197,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#fff' },
  entregadorAvatar: { width: '40px', height: '40px', backgroundColor: '#4FD1C5', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' },
  entregadorInfo: { flex: 1, textAlign: 'left' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#718096' },
  emptyIcon: { fontSize: '48px', marginBottom: '10px' }
};

export default Pedidos;