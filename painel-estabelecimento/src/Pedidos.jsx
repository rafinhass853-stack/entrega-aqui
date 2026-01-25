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
  CheckCircle, XCircle, Truck, User, Filter, Search
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

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const Pedidos = ({ user }) => {
  const { isMobile, isTablet } = useIsMobile();

  const [pedidos, setPedidos] = useState([]);
  const [tabAtiva, setTabAtiva] = useState('pendentes');
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
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

  // Solicitar permissão para notificações
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const pedidosRef = collection(db, 'Pedidos');

    // ✅ pega o ID do estabelecimento do usuário (ajuste se seu user tiver outro campo)
    const estabId =
      user?.estabelecimentoId ||
      user?.restauranteId ||
      user?.lojaId ||
      user?.uid ||
      null;

    // ✅ fallback: se não tiver ID, mostra geral (não recomendado)
    if (!estabId) {
      const qAll = query(pedidosRef, orderBy('dataCriacao', 'desc'));
      const unsubAll = onSnapshot(qAll, (snapshot) => {
        const lista = snapshot.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            ...data,
            status: data.status || 'pendente',
            numeroPedido: data.numeroPedido || parseInt(d.id.slice(-6), 16) || Math.floor(Math.random() * 1000000),
            cliente: data.cliente || {},
            pagamento: data.pagamento || {},
            itens: Array.isArray(data.itens) ? data.itens : []
          };
        });
        setPedidos(lista);
      });
      return () => unsubAll();
    }

    // ✅ Query 1: pedidos antigos
    const qRest = query(
      pedidosRef,
      where('restauranteId', '==', estabId),
      orderBy('dataCriacao', 'desc')
    );

    // ✅ Query 2: pedidos novos
    const qEstab = query(
      pedidosRef,
      where('estabelecimentoId', '==', estabId),
      orderBy('dataCriacao', 'desc')
    );

    const mergeAndSet = (snapA, snapB) => {
      const map = new Map();

      const addSnap = (snap) => {
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          map.set(d.id, {
            id: d.id,
            ...data,
            status: data.status || 'pendente',
            numeroPedido: data.numeroPedido || parseInt(d.id.slice(-6), 16) || Math.floor(Math.random() * 1000000),
            cliente: data.cliente || {},
            pagamento: data.pagamento || {},
            itens: Array.isArray(data.itens) ? data.itens : []
          });
        });
      };

      addSnap(snapA);
      addSnap(snapB);

      const listaPedidos = Array.from(map.values()).sort((a, b) => {
        const da = a.dataCriacao?.toDate ? a.dataCriacao.toDate() : new Date(a.dataCriacao || 0);
        const dbb = b.dataCriacao?.toDate ? b.dataCriacao.toDate() : new Date(b.dataCriacao || 0);
        return dbb - da;
      });

      // stats
      setStats({
        pendentes: listaPedidos.filter(p => p.status === 'pendente').length,
        preparo: listaPedidos.filter(p => p.status === 'preparo').length,
        entrega: listaPedidos.filter(p => p.status === 'entrega').length,
        concluidos: listaPedidos.filter(p => ['entregue', 'concluido', 'cancelado'].includes(p.status)).length
      });

      // notificar novos pedidos
      if (pedidosAnterioresRef.current.length > 0) {
        const novosPedidos = listaPedidos.filter(newP =>
          newP.status === 'pendente' &&
          !pedidosAnterioresRef.current.some(oldP => oldP.id === newP.id)
        );

        if (novosPedidos.length > 0) {
          setPedidoParaAceitar(novosPedidos[0]);
          setMostrarModalNovoPedido(true);
          audioRef.current?.play().catch(() => {});

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Novo Pedido Recebido!", {
              body: `Pedido #${novosPedidos[0].numeroPedido} - ${novosPedidos[0].cliente?.nomeCompleto || 'Cliente'}`,
              icon: "/icon.png"
            });
          }
        }
      }

      pedidosAnterioresRef.current = listaPedidos;
      setPedidos(listaPedidos);
    };

    let lastRest = null;
    let lastEstab = null;

    const unsubRest = onSnapshot(qRest, (snap) => {
      lastRest = snap;
      if (lastEstab) mergeAndSet(lastRest, lastEstab);
    });

    const unsubEstab = onSnapshot(qEstab, (snap) => {
      lastEstab = snap;
      if (lastRest) mergeAndSet(lastRest, lastEstab);
    });

    return () => {
      unsubRest();
      unsubEstab();
    };
  }, [user]);

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

  const filtrarPedidos = () => {
    let filtrados = [...pedidos];

    if (tabAtiva === 'pendentes') filtrados = filtrados.filter(p => p.status === 'pendente');
    else if (tabAtiva === 'preparo') filtrados = filtrados.filter(p => p.status === 'preparo');
    else if (tabAtiva === 'entrega') filtrados = filtrados.filter(p => p.status === 'entrega');
    else if (tabAtiva === 'historico') filtrados = filtrados.filter(p => ['entregue', 'cancelado', 'concluido'].includes(p.status));

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.cliente?.nomeCompleto?.toLowerCase().includes(termo)) ||
        (String(p.numeroPedido || '').includes(termo)) ||
        (p.cliente?.telefone?.includes(termo)) ||
        (String(p.restauranteNome || p.estabelecimentoNome || '').toLowerCase().includes(termo))
      );
    }

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
    const pg = pedido.pagamento || {};
    const subtotal = toNumber(pg.subtotal);
    const taxa = toNumber(pg.taxaEntrega);
    const total = toNumber(pg.total) || (subtotal + taxa);
    return total;
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
      justifyContent: 'center'
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
      textTransform: 'uppercase'
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
      fontSize: '14px'
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
      paddingBottom: '10px'
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
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: isMobile ? '13px' : '14px'
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
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
    infoBox: {
      backgroundColor: '#F8FAFC',
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '15px',
      border: '1px solid #E2E8F0'
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
    divisor: { height: '1px', background: '#E2E8F0', margin: '15px 0' },
    itemRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' },
    itemNome: { color: '#0F3460', fontSize: '14px', fontWeight: '600', flex: 1 },
    itemPreco: { color: '#10B981', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '10px' },
    totalBox: { background: '#F0FDF4', padding: '16px', borderRadius: '12px', marginTop: 'auto', border: '1px solid #D1FAE5' },
    totalRowMain: { display: 'flex', justifyContent: 'space-between', color: '#065F46', fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', marginBottom: '10px' },
    metodoPagamento: { color: '#0F3460', fontSize: '13px', fontWeight: 'bold', background: '#F1F5F9', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    trocoDestaque: { color: '#92400E', background: '#FEF3C7', fontSize: '13px', fontWeight: '900', padding: '6px 12px', borderRadius: '20px', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    cardFooter: { marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
    btnRecusar: { flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' },
    btnAceitar: { flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' },
    btnAcaoLarga: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #E2E8F0', marginTop: '20px' }
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
            <div style={{ ...styles.statNumber, color: '#F59E0B' }}>{stats.pendentes}</div>
            <div style={styles.statLabel}>Pendentes</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#3B82F6' }}>{stats.preparo}</div>
            <div style={styles.statLabel}>Em Preparo</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#8B5CF6' }}>{stats.entrega}</div>
            <div style={styles.statLabel}>Em Entrega</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: '#10B981' }}>{stats.concluidos}</div>
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
            onClick={() => { setBusca(''); setFiltroData(''); }}
            style={{ ...styles.filtroButton, color: '#EF4444', borderColor: '#FEE2E2' }}
          >
            <XCircle size={16} />
            Limpar
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
              style={{ ...styles.tabButton, ...(tabAtiva === t.id ? styles.tabActive : {}) }}
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
            <h3 style={{ color: '#0F3460' }}>Nenhum pedido aqui</h3>
            <p style={{ color: '#64748B' }}>Quando chegar um pedido, aparece automaticamente.</p>
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
                      Nº {String(p.numeroPedido || '').padStart(6, '0')}
                    </div>

                    <div style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {getStatusIcon(p.status)}
                      {String(p.status || '').toUpperCase()}
                    </div>
                  </div>

                  <div style={styles.infoBox}>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 800, marginBottom: 6 }}>
                      Restaurante: {p.restauranteNome || p.estabelecimentoNome || '—'}
                    </div>

                    <div style={styles.clienteNome}>
                      <User size={18} />
                      {cliente.nomeCompleto || "Cliente"}
                    </div>

                    <div style={styles.endereco}>
                      <MapPin size={16} />
                      <div>
                        <div>{cliente.rua || '-'}, {cliente.numero || '-'} - {cliente.bairro || '-'}</div>
                        {cliente.complemento && (
                          <div style={{ color: '#F59E0B', fontSize: '13px', marginTop: '2px' }}>
                            Obs: {cliente.complemento}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                        <Phone size={14} />
                        <span style={{ fontSize: '14px' }}>{cliente.telefone || "Sem telefone"}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                        <Clock size={14} />
                        <span style={{ fontSize: '14px' }}>{calcularTempo(p.dataCriacao)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.divisor} />

                  <div style={{ flex: 1, marginBottom: '15px' }}>
                    <div style={{ marginBottom: '10px', fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                      Itens do Pedido:
                    </div>

                    {p.itens?.map((item, i) => (
                      <div key={i}>
                        <div style={styles.itemRow}>
                          <span style={styles.itemNome}>
                            {(item.quantidade || 1)}x {item.nome}
                          </span>
                          <span style={styles.itemPreco}>
                            R$ {toNumber(item.precoTotal ?? (toNumber(item.precoUnitarioFinal) * toNumber(item.quantidade || 1))).toFixed(2)}
                          </span>
                        </div>

                        {!!item.adicionaisTexto && (
                          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                            {item.adicionaisTexto}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={styles.totalBox}>
                    <div style={styles.totalRowMain}>
                      <span>TOTAL</span>
                      <span>R$ {calcularTotalPedido(p).toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <div style={styles.metodoPagamento}>
                        <CreditCard size={12} />
                        {pagamento.metodo?.toUpperCase() || 'NÃO DEFINIDO'}
                      </div>

                      {pagamento.metodo === 'dinheiro' && pagamento.troco && (
                        <div style={styles.trocoDestaque}>
                          <AlertCircle size={12} />
                          TROCO PARA R$ {toNumber(pagamento.troco).toFixed(2)}
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
                          Aceitar
                        </button>
                      </>
                    )}

                    {p.status === 'preparo' && (
                      <button
                        style={{ ...styles.btnAcaoLarga, background: '#3B82F6' }}
                        onClick={() => handleStatusChange(p.id, 'entrega')}
                      >
                        <Truck size={16} />
                        Saiu para Entrega
                      </button>
                    )}

                    {p.status === 'entrega' && (
                      <button
                        style={{ ...styles.btnAcaoLarga, background: '#10B981' }}
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
