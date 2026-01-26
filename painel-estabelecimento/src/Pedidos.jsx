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
  CheckCircle, XCircle, Truck, User, Filter, Search, Info
} from 'lucide-react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  return isMobile;
};

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const Pedidos = ({ user }) => {
  const isMobile = useIsMobile();
  const [pedidos, setPedidos] = useState([]);
  const [tabAtiva, setTabAtiva] = useState('pendentes');
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [stats, setStats] = useState({ pendentes: 0, preparo: 0, entrega: 0, concluidos: 0 });

  const audioRef = useRef(null);
  const pedidosAnterioresRef = useRef([]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const estabId = user?.estabelecimentoId || user?.restauranteId || user?.lojaId || user?.uid;
    if (!estabId) return;

    const pedidosRef = collection(db, 'Pedidos');
    const qRest = query(pedidosRef, where('restauranteId', '==', estabId), orderBy('dataCriacao', 'desc'));
    const qEstab = query(pedidosRef, where('estabelecimentoId', '==', estabId), orderBy('dataCriacao', 'desc'));

    const mergeAndSet = (snapA, snapB) => {
      const map = new Map();
      const addSnap = (snap) => {
        if (!snap) return;
        snap.docs.forEach((d) => {
          const data = d.data();
          map.set(d.id, {
            id: d.id,
            ...data,
            status: data.status || 'pendente',
            numeroPedido: data.numeroPedido || d.id.slice(-6).toUpperCase(),
            cliente: data.cliente || {},
            pagamento: data.pagamento || {},
            itens: Array.isArray(data.itens) ? data.itens : []
          });
        });
      };

      addSnap(snapA);
      addSnap(snapB);

      const lista = Array.from(map.values()).sort((a, b) => {
        const da = a.dataCriacao?.toDate ? a.dataCriacao.toDate() : new Date(a.dataCriacao || 0);
        const dbb = b.dataCriacao?.toDate ? b.dataCriacao.toDate() : new Date(b.dataCriacao || 0);
        return dbb - da;
      });

      setStats({
        pendentes: lista.filter(p => p.status === 'pendente').length,
        preparo: lista.filter(p => p.status === 'preparo').length,
        entrega: lista.filter(p => p.status === 'entrega').length,
        concluidos: lista.filter(p => ['entregue', 'concluido', 'cancelado'].includes(p.status)).length
      });

      if (pedidosAnterioresRef.current.length > 0) {
        const novos = lista.filter(p => p.status === 'pendente' && !pedidosAnterioresRef.current.some(old => old.id === p.id));
        if (novos.length > 0) {
          setPedidoParaAceitar(novos[0]);
          setMostrarModalNovoPedido(true);
          audioRef.current?.play().catch(() => {});
        }
      }
      pedidosAnterioresRef.current = lista;
      setPedidos(lista);
    };

    let s1 = null, s2 = null;
    const unsub1 = onSnapshot(qRest, (s) => { s1 = s; mergeAndSet(s1, s2); });
    const unsub2 = onSnapshot(qEstab, (s) => { s2 = s; mergeAndSet(s1, s2); });
    return () => { unsub1(); unsub2(); };
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
      alert("Erro ao atualizar status.");
    }
  };

  const calcularTempo = (data) => {
    if (!data) return 'Agora';
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 60000);
    if (diff < 1) return 'Agora';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  };

  const filtrarPedidos = () => {
    return pedidos.filter(p => {
      const matchTab = tabAtiva === 'historico' ? ['entregue', 'cancelado', 'concluido'].includes(p.status) : p.status === tabAtiva;
      const termo = busca.toLowerCase();
      const matchBusca = !busca || p.cliente?.nomeCompleto?.toLowerCase().includes(termo) || String(p.numeroPedido).toLowerCase().includes(termo) || p.cliente?.telefone?.includes(termo);
      const matchData = !filtroData || (p.dataCriacao?.toDate ? p.dataCriacao.toDate().toLocaleDateString('en-CA') : '') === filtroData;
      return matchTab && matchBusca && matchData;
    });
  };

  const getStatusStyle = (status) => {
    const config = {
      pendente: { color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={16} /> },
      preparo: { color: '#3B82F6', bg: '#DBEAFE', icon: <Package size={16} /> },
      entrega: { color: '#8B5CF6', bg: '#EDE9FE', icon: <Truck size={16} /> },
      entregue: { color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={16} /> },
      concluido: { color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={16} /> },
      cancelado: { color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={16} /> }
    };
    return config[status] || config.pendente;
  };

  const styles = {
    container: { padding: isMobile ? '10px' : '20px', backgroundColor: '#F8FAFC', minHeight: '100vh' },
    card: { background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    infoBox: { background: '#F1F5F9', padding: '12px', borderRadius: '8px', marginBottom: '12px' },
    itemRow: { borderBottom: '1px dashed #E2E8F0', paddingBottom: '8px', marginBottom: '8px' },
    badge: { fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' },
    totalArea: { background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', marginTop: 'auto' }
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={styles.container}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F3460', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} /> Gestão de Pedidos
          </h1>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {Object.entries({ Pendentes: stats.pendentes, Preparo: stats.preparo, Entrega: stats.entrega, Concluídos: stats.concluidos }).map(([label, val]) => (
            <div key={label} style={{ background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '20px', fontWeight: '800' }}>{val}</div>
              <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={18} />
            <input 
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #E2E8F0' }} 
              placeholder="Buscar cliente, número..." value={busca} onChange={e => setBusca(e.target.value)} 
            />
          </div>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ padding: '10px', borderRadius: '8px', background: 'white', border: '1px solid #E2E8F0' }}><Filter size={18} /></button>
          {mostrarFiltros && <input type="date" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }} onChange={e => setFiltroData(e.target.value)} />}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
          {['pendentes', 'preparo', 'entrega', 'historico'].map(t => (
            <button 
              key={t} onClick={() => setTabAtiva(t)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: tabAtiva === t ? '#0F3460' : '#E2E8F0', color: tabAtiva === t ? 'white' : '#64748B', whiteSpace: 'nowrap' }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Grid de Pedidos */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
          {filtrarPedidos().map(p => {
            const status = getStatusStyle(p.status);
            return (
              <div key={p.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '800', color: '#0F3460' }}>#{p.numeroPedido}</div>
                  <div style={{ ...styles.badge, color: status.color, background: status.bg }}>
                    {status.icon} {p.status.toUpperCase()}
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>RESTAURANTE: {p.restauranteNome || p.estabelecimentoNome || 'GERAL'}</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16}/> {p.cliente?.nomeCompleto}</div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }}/> 
                    {p.cliente?.rua}, {p.cliente?.numero} - {p.cliente?.bairro}
                  </div>
                  {p.cliente?.complemento && (
                    <div style={{ fontSize: '12px', color: '#D97706', background: '#FFFBEB', padding: '4px', borderRadius: '4px', marginTop: '5px' }}>
                      <strong>Obs:</strong> {p.cliente.complemento}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '12px', color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14}/> {p.cliente?.telefone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {calcularTempo(p.dataCriacao)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', marginBottom: '8px' }}>ITENS DO PEDIDO</div>
                  {p.itens?.map((item, i) => (
                    <div key={i} style={styles.itemRow}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px' }}>
                        <span>{item.quantidade}x {item.nome}</span>
                        <span>R$ {toNumber(item.precoTotal || (toNumber(item.precoUnitarioFinal) * item.quantidade)).toFixed(2)}</span>
                      </div>
                      {item.adicionaisTexto && (
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontStyle: 'italic' }}>
                          + {item.adicionaisTexto}
                        </div>
                      )}
                      {item.observacao && (
                        <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '2px' }}>
                          <strong>Nota:</strong> {item.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={styles.totalArea}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                    <span>Subtotal</span>
                    <span>R$ {toNumber(p.pagamento?.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                    <span>Taxa de Entrega</span>
                    <span>R$ {toNumber(p.pagamento?.taxaEntrega).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', color: '#065F46', marginTop: '5px' }}>
                    <span>TOTAL</span>
                    <span>R$ {toNumber(p.pagamento?.total).toFixed(2)}</span>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px' }}>
                      <CreditCard size={12} style={{ display: 'inline', marginRight: '4px' }}/> {p.pagamento?.metodo?.toUpperCase()}
                    </span>
                    {p.pagamento?.metodo === 'dinheiro' && p.pagamento?.troco && (
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: '4px' }}>
                        <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }}/> TROCO PARA R$ {toNumber(p.pagamento.troco).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                  {p.status === 'pendente' && (
                    <>
                      <button onClick={() => handleStatusChange(p.id, 'cancelado')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 'bold', cursor: 'pointer' }}>Recusar</button>
                      <button onClick={() => handleStatusChange(p.id, 'preparo')} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 'bold', cursor: 'pointer' }}>Aceitar Pedido</button>
                    </>
                  )}
                  {p.status === 'preparo' && (
                    <button onClick={() => handleStatusChange(p.id, 'entrega')} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <Truck size={18} /> Saiu para Entrega
                    </button>
                  )}
                  {p.status === 'entrega' && (
                    <button onClick={() => handleStatusChange(p.id, 'entregue')} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <CheckCircle size={18} /> Marcar como Entregue
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
          onAceitar={() => handleStatusChange(pedidoParaAceitar?.id, 'preparo')}
          onRecusar={() => handleStatusChange(pedidoParaAceitar?.id, 'cancelado')}
          calcularTempo={calcularTempo}
        />
      </div>
    </Layout>
  );
};

export default Pedidos;