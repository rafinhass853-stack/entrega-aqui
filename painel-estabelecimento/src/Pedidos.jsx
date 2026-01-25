import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import NotificacaoPedido from './NotificacaoPedido';
import { 
  collection, onSnapshot, query, orderBy, doc, 
  updateDoc, serverTimestamp, where 
} from 'firebase/firestore';
import { 
  Package, Clock, MapPin, Phone, CreditCard, AlertCircle,
  CheckCircle, XCircle, Truck, User, Filter, Search,
  Download, Printer, Eye, EyeOff
} from 'lucide-react';

// Hook responsivo
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };

    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet };
};

const Pedidos = ({ user }) => {
  const { isMobile, isTablet } = useIsMobile();
  const [pedidos, setPedidos] = useState([]);
  const [tabAtiva, setTabAtiva] = useState('pendentes');
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [stats, setStats] = useState({
    pendentes: 0,
    preparo: 0,
    entrega: 0,
    concluidos: 0
  });
  
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
        return { 
          id: doc.id, 
          ...data, 
          status: data.status || 'pendente',
          numeroPedido: data.numeroPedido || parseInt(doc.id.slice(-6), 16) || Math.floor(Math.random() * 1000000)
        };
      });

      // Atualizar estatísticas
      const newStats = {
        pendentes: listaPedidos.filter(p => p.status === 'pendente').length,
        preparo: listaPedidos.filter(p => p.status === 'preparo').length,
        entrega: listaPedidos.filter(p => p.status === 'entrega').length,
        concluidos: listaPedidos.filter(p => p.status === 'entregue' || p.status === 'concluido').length
      };
      setStats(newStats);

      // Notificar novos pedidos
      if (pedidosAnterioresRef.current.length > 0) {
        const novosPedidos = listaPedidos.filter(newP => 
          newP.status === 'pendente' && 
          !pedidosAnterioresRef.current.some(oldP => oldP.id === newP.id)
        );
        if (novosPedidos.length > 0) {
          setPedidoParaAceitar(novosPedidos[0]);
          setMostrarModalNovoPedido(true);
          audioRef.current?.play().catch(() => {});
          
          // Notificação do navegador
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Novo Pedido Recebido!", {
              body: `Pedido #${novosPedidos[0].numeroPedido} - ${novosPedidos[0].cliente?.nomeCompleto}`,
              icon: "/icon.png"
            });
          }
        }
      }
      pedidosAnterioresRef.current = listaPedidos;
      setPedidos(listaPedidos);
    });
    return () => unsubscribe();
  }, [user]);

  // Solicitar permissão para notificações
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, "Pedidos", id), { 
        status: novoStatus, 
        atualizadoEm: serverTimestamp(),
        atualizadoPor: user?.email || 'Sistema'
      });
      setMostrarModalNovoPedido(false);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao processar alteração.");
    }
  };

  const calcularTempo = (data) => {
    if (!data) return 'Agora';
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 60000);
    if (diff < 1) return 'Agora';
    if (diff < 60) return `${diff} min`;
    const horas = Math.floor(diff / 60);
    const minutos = diff % 60;
    return `${horas}h ${minutos}min`;
  };

  const formatarData = (data) => {
    if (!data) return '--/--/-- --:--';
    const d = data.toDate ? data.toDate() : new Date(data);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filtrarPedidos = () => {
    let filtrados = [...pedidos];

    // Filtro por aba
    if (tabAtiva === 'pendentes') {
      filtrados = filtrados.filter(p => p.status === 'pendente');
    } else if (tabAtiva === 'preparo') {
      filtrados = filtrados.filter(p => p.status === 'preparo');
    } else if (tabAtiva === 'entrega') {
      filtrados = filtrados.filter(p => p.status === 'entrega');
    } else if (tabAtiva === 'historico') {
      filtrados = filtrados.filter(p => p.status === 'entregue' || p.status === 'cancelado' || p.status === 'concluido');
    }

    // Filtro por busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(p => 
        (p.cliente?.nomeCompleto?.toLowerCase().includes(termo)) ||
        (p.numeroPedido?.toString().includes(termo)) ||
        (p.cliente?.telefone?.includes(termo))
      );
    }

    // Filtro por data
    if (filtroData) {
      const dataSelecionada = new Date(filtroData);
      filtrados = filtrados.filter(p => {
        const dataPedido = p.dataCriacao?.toDate ? p.dataCriacao.toDate() : new Date(p.dataCriacao);
        return dataPedido.toDateString() === dataSelecionada.toDateString();
      });
    }

    return filtrados;
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: '#F59E0B',
      preparo: '#3B82F6',
      entrega: '#8B5CF6',
      entregue: '#10B981',
      concluido: '#10B981',
      cancelado: '#EF4444'
    };
    return colors[status] || '#94A3B8';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pendente: <Clock size={16} />,
      preparo: <Package size={16} />,
      entrega: <Truck size={16} />,
      entregue: <CheckCircle size={16} />,
      concluido: <CheckCircle size={16} />,
      cancelado: <XCircle size={16} />
    };
    return icons[status] || <Clock size={16} />;
  };

  const calcularTotalPedido = (pedido) => {
    const pagamento = pedido.pagamento || {};
    const subtotal = pagamento.subtotal || 0;
    const taxaEntrega = pagamento.taxaEntrega || 0;
    const total = pagamento.total || (subtotal + taxaEntrega);
    return isNaN(total) ? 0 : total;
  };

  const styles = {
    container: { 
      padding: isMobile ? '15px' : '20px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: '#F8FAFC',
      minHeight: '100vh'
    },
    header: { 
      marginBottom: isMobile ? '20px' : '30px',
      backgroundColor: 'white',
      padding: isMobile ? '15px' : '20px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      border: '1px solid #E2E8F0'
    },
    title: { 
      color: '#0F3460', 
      fontSize: isMobile ? '22px' : '28px', 
      margin: 0, 
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    subTitle: { 
      color: '#64748B', 
      margin: '5px 0 0 0',
      fontSize: isMobile ? '14px' : '16px'
    },
    
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '10px' : '15px',
      marginBottom: '25px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: isMobile ? '15px' : '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      border: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    },
    statNumber: {
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '800',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: isMobile ? '12px' : '14px',
      color: '#64748B',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    
    filtrosContainer: {
      backgroundColor: 'white',
      padding: isMobile ? '12px' : '16px',
      borderRadius: '12px',
      marginBottom: '20px',
      border: '1px solid #E2E8F0',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      alignItems: 'center'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: isMobile ? '200px' : '300px'
    },
    searchInput: {
      width: '100%',
      padding: '12px 40px 12px 16px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      fontSize: '14px',
      backgroundColor: '#F8FAFC',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94A3B8'
    },
    filtroButton: {
      padding: '12px 16px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#F8FAFC',
      color: '#64748B',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: '#F1F5F9',
        borderColor: '#10B981'
      }
    },
    dataInput: {
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      fontSize: '14px',
      backgroundColor: '#F8FAFC',
      minWidth: '150px'
    },
    
    tabsContainer: { 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '25px', 
      overflowX: 'auto', 
      paddingBottom: '10px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none' }
    },
    tabButton: { 
      padding: isMobile ? '12px 16px' : '14px 20px', 
      borderRadius: '10px', 
      border: '1px solid #E2E8F0', 
      background: 'white', 
      color: '#64748B', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      whiteSpace: 'nowrap', 
      transition: '0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: isMobile ? '13px' : '14px',
      '&:hover': {
        borderColor: '#10B981',
        color: '#10B981'
      }
    },
    tabActive: { 
      background: '#10B981', 
      color: 'white',
      borderColor: '#10B981'
    },
    
    grid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(400px, 1fr))', 
      gap: isMobile ? '15px' : '20px' 
    },
    card: { 
      background: 'white', 
      borderRadius: '16px', 
      border: '1px solid #E2E8F0', 
      padding: isMobile ? '16px' : '20px', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }
    },
    cardHeader: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginBottom: '15px', 
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '10px'
    },
    pedidoId: { 
      color: '#0F3460', 
      fontWeight: 'bold', 
      fontSize: isMobile ? '15px' : '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statusBadge: { 
      fontSize: '11px', 
      fontWeight: 'bold', 
      background: (status) => `${getStatusColor(status)}15`,
      color: getStatusColor,
      padding: '6px 12px', 
      borderRadius: '20px', 
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    clienteNome: { 
      color: '#0F3460', 
      margin: '0 0 10px 0', 
      fontSize: isMobile ? '18px' : '20px', 
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    endereco: { 
      color: '#64748B', 
      fontSize: '14px', 
      margin: 0, 
      lineHeight: '1.5',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px'
    },
    infoBox: {
      backgroundColor: '#F8FAFC',
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '15px',
      border: '1px solid #E2E8F0'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '14px'
    },
    infoLabel: {
      color: '#64748B',
      fontWeight: '500'
    },
    infoValue: {
      color: '#0F3460',
      fontWeight: '600'
    },
    divisor: { 
      height: '1px', 
      background: '#E2E8F0', 
      margin: '15px 0' 
    },
    infoTempo: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      fontSize: '13px', 
      color: '#64748B', 
      fontWeight: '500',
      marginBottom: '15px'
    },
    itemRow: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginBottom: '10px',
      alignItems: 'flex-start'
    },
    itemNome: { 
      color: '#0F3460', 
      fontSize: '14px', 
      fontWeight: '600',
      flex: 1
    },
    itemPreco: { 
      color: '#10B981', 
      fontSize: '14px', 
      fontWeight: '600',
      whiteSpace: 'nowrap',
      marginLeft: '10px'
    },
    saboresBox: { 
      color: '#8B5CF6', 
      fontSize: '12px', 
      fontStyle: 'italic', 
      marginBottom: '10px', 
      paddingLeft: '15px',
      backgroundColor: '#FAF5FF',
      padding: '6px 10px',
      borderRadius: '6px',
      borderLeft: '3px solid #8B5CF6'
    },
    obsGeral: { 
      background: '#FFF7ED', 
      borderLeft: '4px solid #F59E0B', 
      padding: '12px', 
      color: '#92400E', 
      fontSize: '13px', 
      marginBottom: '15px', 
      borderRadius: '0 6px 6px 0' 
    },
    totalBox: { 
      background: '#F0FDF4', 
      padding: '16px', 
      borderRadius: '12px', 
      marginTop: 'auto',
      border: '1px solid #D1FAE5'
    },
    totalRowMain: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      color: '#065F46', 
      fontSize: isMobile ? '18px' : '20px', 
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    metodoPagamento: { 
      color: '#0F3460', 
      fontSize: '13px', 
      fontWeight: 'bold', 
      background: '#F1F5F9', 
      padding: '6px 12px', 
      borderRadius: '20px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    },
    trocoDestaque: { 
      color: '#92400E', 
      background: '#FEF3C7', 
      fontSize: '13px', 
      fontWeight: '900', 
      padding: '6px 12px', 
      borderRadius: '20px', 
      marginTop: '10px', 
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    },
    cardFooter: { 
      marginTop: '20px', 
      display: 'flex', 
      gap: '10px',
      flexWrap: 'wrap'
    },
    btnRecusar: { 
      flex: 1, 
      padding: '14px', 
      borderRadius: '10px', 
      border: 'none', 
      background: '#FEE2E2', 
      color: '#DC2626', 
      fontWeight: 'bold', 
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      transition: 'all 0.2s',
      '&:hover': {
        background: '#FECACA'
      }
    },
    btnAceitar: { 
      flex: 2, 
      padding: '14px', 
      borderRadius: '10px', 
      border: 'none', 
      background: '#D1FAE5', 
      color: '#065F46', 
      fontWeight: 'bold', 
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      transition: 'all 0.2s',
      '&:hover': {
        background: '#A7F3D0'
      }
    },
    btnAcaoLarga: { 
      width: '100%', 
      padding: '14px', 
      borderRadius: '10px', 
      border: 'none', 
      color: 'white', 
      fontWeight: 'bold', 
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: 'white',
      borderRadius: '16px',
      border: '1px dashed #E2E8F0',
      marginTop: '20px'
    },
    emptyIcon: {
      margin: '0 auto 20px',
      padding: '20px',
      backgroundColor: '#F1F5F9',
      borderRadius: '50%',
      width: '80px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyTitle: {
      color: '#0F3460',
      fontSize: '20px',
      marginBottom: '10px'
    },
    emptyText: {
      color: '#64748B',
      marginBottom: '30px',
      fontSize: '16px'
    }
  };

  const pedidosFiltrados = filtrarPedidos();

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            <Package size={isMobile ? 24 : 28} />
            Gestão de Pedidos
          </h1>
          <p style={styles.subTitle}>Monitoramento em tempo real dos pedidos recebidos</p>
        </header>

        {/* Estatísticas */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#F59E0B'}}>{stats.pendentes}</div>
            <div style={styles.statLabel}>Pendentes</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#3B82F6'}}>{stats.preparo}</div>
            <div style={styles.statLabel}>Em Preparo</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#8B5CF6'}}>{stats.entrega}</div>
            <div style={styles.statLabel}>Saiu para Entrega</div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statNumber, color: '#10B981'}}>{stats.concluidos}</div>
            <div style={styles.statLabel}>Concluídos</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filtrosContainer}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar por cliente, telefone ou número do pedido..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={styles.searchInput}
            />
            <Search size={18} style={styles.searchIcon} />
          </div>
          
          <button 
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={styles.filtroButton}
          >
            <Filter size={16} />
            {isMobile ? 'Filtros' : 'Mais Filtros'}
          </button>
          
          {mostrarFiltros && (
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              style={styles.dataInput}
            />
          )}
          
          <button 
            onClick={() => {
              setBusca('');
              setFiltroData('');
            }}
            style={{...styles.filtroButton, color: '#EF4444', borderColor: '#FEE2E2'}}
          >
            <XCircle size={16} />
            Limpar Filtros
          </button>
        </div>

        {/* Abas */}
        <nav style={styles.tabsContainer}>
          {[
            { id: 'pendentes', label: 'Pendentes', count: stats.pendentes },
            { id: 'preparo', label: 'Em Preparo', count: stats.preparo },
            { id: 'entrega', label: 'Em Entrega', count: stats.entrega },
            { id: 'historico', label: 'Histórico', count: stats.concluidos }
          ].map(t => (
            <button 
              key={t.id} 
              style={{
                ...styles.tabButton, 
                ...(tabAtiva === t.id ? styles.tabActive : {})
              }} 
              onClick={() => setTabAtiva(t.id)}
            >
              {getStatusIcon(t.id === 'historico' ? 'entregue' : t.id)}
              {t.label} ({t.count})
            </button>
          ))}
        </nav>

        {/* Lista de Pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <Package size={40} color="#CBD5E1" />
            </div>
            <h3 style={styles.emptyTitle}>
              {tabAtiva === 'pendentes' ? 'Nenhum pedido pendente' : 
               tabAtiva === 'preparo' ? 'Nenhum pedido em preparo' :
               tabAtiva === 'entrega' ? 'Nenhum pedido em entrega' :
               'Nenhum pedido no histórico'}
            </h3>
            <p style={styles.emptyText}>
              {tabAtiva === 'pendentes' ? 
                'Novos pedidos aparecerão aqui automaticamente.' :
                'Quando você atualizar o status dos pedidos, eles aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {pedidosFiltrados.map(p => {
              const cliente = p.cliente || {};
              const pagamento = p.pagamento || {};
              const statusColor = getStatusColor(p.status);

              return (
                <div key={p.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.pedidoId}>
                      <Package size={16} />
                      Nº {p.numeroPedido?.toString().padStart(6, '0') || p.id.slice(-6).toUpperCase()}
                    </div>
                    <div style={{...styles.statusBadge, backgroundColor: `${statusColor}15`, color: statusColor}}>
                      {getStatusIcon(p.status)}
                      {p.status.toUpperCase()}
                    </div>
                  </div>

                  <div style={styles.infoBox}>
                    <div style={styles.clienteNome}>
                      <User size={18} />
                      {cliente.nomeCompleto || "Cliente"}
                    </div>
                    
                    <div style={styles.endereco}>
                      <MapPin size={16} />
                      <div>
                        <div>{cliente.rua}, {cliente.numero} - {cliente.bairro}</div>
                        {cliente.complemento && (
                          <div style={{color: '#F59E0B', fontSize: '13px', marginTop: '2px'}}>
                            Obs: {cliente.complemento}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B'}}>
                        <Phone size={14} />
                        <span style={{fontSize: '14px'}}>{cliente.telefone || "Sem telefone"}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B'}}>
                        <Clock size={14} />
                        <span style={{fontSize: '14px'}}>{calcularTempo(p.dataCriacao)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.divisor} />

                  <div style={{flex: 1, marginBottom: '15px'}}>
                    <div style={{marginBottom: '10px', fontSize: '13px', color: '#64748B', fontWeight: '600'}}>
                      Itens do Pedido:
                    </div>
                    {p.itens?.map((item, i) => (
                      <div key={i}>
                        <div style={styles.itemRow}>
                          <span style={styles.itemNome}>
                            {item.quantidade}x {item.nome}
                          </span>
                          <span style={styles.itemPreco}>
                            R$ {((parseFloat(item.preco) || 0) * item.quantidade).toFixed(2)}
                          </span>
                        </div>
                        {item.sabores?.length > 0 && (
                          <div style={styles.saboresBox}>
                            + {item.sabores.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}

                    {p.observacoes && (
                      <div style={styles.obsGeral}>
                        <strong>Observações:</strong> {p.observacoes}
                      </div>
                    )}
                  </div>

                  <div style={styles.totalBox}>
                    <div style={styles.totalRowMain}>
                      <span>TOTAL</span>
                      <span>R$ {calcularTotalPedido(p).toFixed(2)}</span>
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center'}}>
                      <div style={styles.metodoPagamento}>
                        <CreditCard size={12} />
                        {pagamento.metodo?.toUpperCase() || 'NÃO DEFINIDO'}
                      </div>
                      {pagamento.metodo === 'dinheiro' && pagamento.troco && (
                        <div style={styles.trocoDestaque}>
                          <AlertCircle size={12} />
                          TROCO PARA R$ {parseFloat(pagamento.troco).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    {p.status === 'pendente' && (
                      <>
                        <button 
                          style={styles.btnRecusar} 
                          onClick={() => handleStatusChange(p.id, 'cancelado')}
                        >
                          <XCircle size={16} />
                          Recusar
                        </button>
                        <button 
                          style={styles.btnAceitar} 
                          onClick={() => handleStatusChange(p.id, 'preparo')}
                        >
                          <CheckCircle size={16} />
                          Aceitar Pedido
                        </button>
                      </>
                    )}
                    {p.status === 'preparo' && (
                      <button 
                        style={{...styles.btnAcaoLarga, background: '#3B82F6'}} 
                        onClick={() => handleStatusChange(p.id, 'entrega')}
                      >
                        <Truck size={16} />
                        Marcar como "Saiu para Entrega"
                      </button>
                    )}
                    {p.status === 'entrega' && (
                      <button 
                        style={{...styles.btnAcaoLarga, background: '#10B981'}} 
                        onClick={() => handleStatusChange(p.id, 'entregue')}
                      >
                        <CheckCircle size={16} />
                        Marcar como Entregue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <NotificacaoPedido 
          isOpen={mostrarModalNovoPedido} 
          pedido={pedidoParaAceitar} 
          onAceitar={() => handleStatusChange(pedidoParaAceitar?.id, 'preparo')} 
          onRecusar={() => handleStatusChange(pedidoParaAceitar?.id, 'cancelado')} 
          calcularTempo={calcularTempo} 
        />
      </div>
    </Layout>
  );
};

export default Pedidos;