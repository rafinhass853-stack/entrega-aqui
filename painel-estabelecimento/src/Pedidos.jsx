// Pedidos.jsx (COM HISTÓRICO EM LINHA + GRID ACEITAS/CANCELADAS + BASE/ADICIONAIS SEPARADOS) — cole e substitua o arquivo todo
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout } from './Menu';
import { db } from './firebase';
import NotificacaoPedido from './NotificacaoPedido';
import {
  collection,
  onSnapshot,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import {
  Package, Clock, MapPin, Phone, CreditCard,
  CheckCircle, XCircle, Truck, Filter, Search,
  MessageCircle, RotateCcw, Printer,
  ChevronDown, ChevronUp, Star, Shield, Bell
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

// ✅ moeda pt-BR com vírgula
const formatMoneyBR = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(v));

// ✅ helpers para separar base e adicionais (com fallbacks)
const getBaseUnit = (item) => {
  return toNumber(item?.precoBaseUnitario ?? item?.precoBase ?? item?.preco);
};

const getAdicionalUnit = (item) => {
  const direto = toNumber(item?.adicionaisTotal);
  if (direto > 0) return direto;

  // fallback: se só tiver unit final
  const base = getBaseUnit(item);
  const unitFinal = toNumber(item?.precoUnitarioFinal ?? item?.preco);
  const diff = unitFinal - base;
  return diff > 0 ? diff : 0;
};

const getUnitFinal = (item) => {
  const unitFinal = toNumber(item?.precoUnitarioFinal);
  if (unitFinal > 0) return unitFinal;

  const base = getBaseUnit(item);
  const add = getAdicionalUnit(item);
  return base + add;
};

const Pedidos = ({ user }) => {
  const isMobile = useIsMobile();

  // ✅ IDs DE TABS PRECISAM BATER COM status DO FIRESTORE
  // status do pedido: "pendente" | "preparo" | "entrega" | "entregue" | "concluido" | "cancelado"
  const [tabAtiva, setTabAtiva] = useState('pendente');

  const [pedidos, setPedidos] = useState([]);
  const [mostrarModalNovoPedido, setMostrarModalNovoPedido] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [stats, setStats] = useState({
    pendentes: 0,
    preparo: 0,
    entrega: 0,
    concluidos: 0,
    totalHoje: 0,
    valorHoje: 0
  });

  const [pedidosExpandidos, setPedidosExpandidos] = useState({});
  const [notificacoes, setNotificacoes] = useState([]);
  const [configNotificacao, setConfigNotificacao] = useState({
    som: true,
    popup: true,
    desktop: true
  });

  const audioRef = useRef(null);
  const pedidosAnterioresRef = useRef([]);
  const notificationSoundRef = useRef(null);

  const calcularTempoDecorrido = useCallback((data) => {
    if (!data) return 'Agora';
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }, []);

  const formatHora = (dataCriacao) => {
    try {
      const d = dataCriacao?.toDate ? dataCriacao.toDate() : (dataCriacao ? new Date(dataCriacao) : null);
      if (!d) return '';
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '';
    }
  };

  // 🔎 Resolve estabelecimentoId real (docId em /estabelecimentos)
  const resolverEstabelecimentoId = useCallback(async () => {
    const direct =
      user?.estabelecimentoId ||
      user?.restauranteId ||
      user?.lojaId ||
      user?.uid;

    let estabId = direct || null;

    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) return estabId;

    const tentar = async (campo) => {
      const q = query(
        collection(db, 'estabelecimentos'),
        where(campo, '==', email),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;
      return null;
    };

    const campos = ['email', 'emailUsuario', 'usuarioEmail', 'loginUsuario'];

    for (const campo of campos) {
      try {
        const found = await tentar(campo);
        if (found) {
          estabId = found;
          break;
        }
      } catch (_) {}
    }

    return estabId;
  }, [user]);

  // Carregar configurações de notificação
  useEffect(() => {
    const savedConfig = localStorage.getItem('configNotificacao');
    if (savedConfig) setConfigNotificacao(JSON.parse(savedConfig));

    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
    notificationSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ✅ Buscar pedidos
  useEffect(() => {
    if (!user) return;

    let unsub1 = null;
    let unsub2 = null;

    const iniciar = async () => {
      const estabId = await resolverEstabelecimentoId();
      if (!estabId) {
        console.warn('Pedidos.jsx: não consegui resolver o estabelecimentoId do usuário.', user);
        setPedidos([]);
        return;
      }

      const pedidosRef = collection(db, 'Pedidos');

      // ❗ sem orderBy (evita índice). Ordenamos no front.
      const qRest = query(pedidosRef, where('restauranteId', '==', estabId));
      const qEstab = query(pedidosRef, where('estabelecimentoId', '==', estabId));

      let s1 = null;
      let s2 = null;

      const mergeAndSet = (snapA, snapB) => {
        const map = new Map();
        const hojeStr = new Date().toDateString();

        const addSnap = (snap) => {
          if (!snap) return;
          snap.docs.forEach((d) => {
            const data = d.data();
            const dataPedido = data.dataCriacao?.toDate ? data.dataCriacao.toDate() : new Date();
            const ehHoje = dataPedido.toDateString() === hojeStr;

            map.set(d.id, {
              id: d.id,
              ...data,
              status: data.status || 'pendente',
              numeroPedido: data.numeroPedido || d.id.slice(-6).toUpperCase(),
              cliente: data.cliente || {},
              pagamento: data.pagamento || {},
              itens: Array.isArray(data.itens) ? data.itens : [],
              ehHoje,
              tempoDecorrido: calcularTempoDecorrido(data.dataCriacao)
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

        // Stats
        const hojeLista = lista.filter(p => p.ehHoje);
        const totalHoje = hojeLista.length;
        const valorHoje = hojeLista.reduce((sum, p) => sum + toNumber(p.pagamento?.total), 0);

        setStats({
          pendentes: lista.filter(p => p.status === 'pendente').length,
          preparo: lista.filter(p => p.status === 'preparo').length,
          entrega: lista.filter(p => p.status === 'entrega').length,
          concluidos: lista.filter(p => ['entregue', 'concluido', 'cancelado'].includes(p.status)).length,
          totalHoje,
          valorHoje
        });

        // Detectar novos pedidos
        if (pedidosAnterioresRef.current.length > 0) {
          const novos = lista.filter(p =>
            p.status === 'pendente' &&
            !pedidosAnterioresRef.current.some(old => old.id === p.id)
          );

          if (novos.length > 0) {
            const novoPedido = novos[0];
            setPedidoParaAceitar(novoPedido);
            setMostrarModalNovoPedido(true);

            if (configNotificacao.som) {
              audioRef.current?.play().catch(() => {});
            }

            if (configNotificacao.desktop && Notification.permission === "granted") {
              new Notification(`🎉 Novo Pedido #${novoPedido.numeroPedido}`, {
                body: `${novoPedido.cliente?.nomeCompleto || 'Cliente'} - ${formatMoneyBR(novoPedido.pagamento?.total)}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
                tag: `pedido-${novoPedido.id}`
              });
            }

            setNotificacoes(prev => [{
              id: novoPedido.id,
              tipo: 'novo_pedido',
              titulo: `Novo Pedido #${novoPedido.numeroPedido}`,
              mensagem: `${novoPedido.cliente?.nomeCompleto || 'Cliente'} - ${formatMoneyBR(novoPedido.pagamento?.total)}`,
              data: new Date(),
              lida: false
            }, ...prev.slice(0, 9)]);
          }
        }

        pedidosAnterioresRef.current = lista;
        setPedidos(lista);
      };

      unsub1 = onSnapshot(qRest, (s) => { s1 = s; mergeAndSet(s1, s2); }, (err) => {
        console.error('Erro onSnapshot qRest:', err);
      });
      unsub2 = onSnapshot(qEstab, (s) => { s2 = s; mergeAndSet(s1, s2); }, (err) => {
        console.error('Erro onSnapshot qEstab:', err);
      });
    };

    iniciar();

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [user, configNotificacao, calcularTempoDecorrido, resolverEstabelecimentoId]);

  const handleStatusChange = async (id, novoStatus) => {
    try {
      const pedidoRef = doc(db, "Pedidos", id);

      await updateDoc(pedidoRef, {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: user?.email || 'Sistema',
        historico: {
          [new Date().toISOString()]: `Status alterado para ${novoStatus}`
        }
      });

      if (configNotificacao.som) {
        notificationSoundRef.current?.play().catch(() => {});
      }

      setMostrarModalNovoPedido(false);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status.");
    }
  };

  const togglePedidoExpandido = (id) => {
    setPedidosExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const enviarMensagemWhatsApp = (pedido) => {
    const telefone = String(pedido?.cliente?.telefone || '').replace(/\D/g, '');
    const nomeLoja = pedido.restauranteNome || pedido.estabelecimentoNome || 'restaurante';
    const mensagem =
      `Olá ${pedido.cliente?.nomeCompleto || 'Cliente'}! Aqui é o ${nomeLoja}. ` +
      `Seu pedido #${pedido.numeroPedido} está com status: ${String(pedido.status || '').toUpperCase()}. ` +
      `Valor: ${formatMoneyBR(pedido.pagamento?.total)}.`;

    if (telefone) {
      window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    }
  };

  const filtrarPedidos = useCallback(() => {
    return pedidos.filter(p => {
      const matchTab =
        tabAtiva === 'historico'
          ? ['entregue', 'cancelado', 'concluido'].includes(p.status)
          : p.status === tabAtiva;

      const termo = busca.toLowerCase();
      const matchBusca =
        !busca ||
        p.cliente?.nomeCompleto?.toLowerCase().includes(termo) ||
        String(p.numeroPedido).toLowerCase().includes(termo) ||
        String(p.cliente?.telefone || '').includes(termo);

      const matchData =
        !filtroData ||
        (p.dataCriacao?.toDate ? p.dataCriacao.toDate().toLocaleDateString('en-CA') : '') === filtroData;

      return matchTab && matchBusca && matchData;
    });
  }, [pedidos, tabAtiva, busca, filtroData]);

  const getStatusStyle = (status) => {
    const config = {
      pendente: { color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={16} />, label: 'AGUARDANDO' },
      preparo: { color: '#3B82F6', bg: '#DBEAFE', icon: <Package size={16} />, label: 'EM PREPARO' },
      entrega: { color: '#8B5CF6', bg: '#EDE9FE', icon: <Truck size={16} />, label: 'SAIU PARA ENTREGA' },
      entregue: { color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={16} />, label: 'ENTREGUE' },
      concluido: { color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={16} />, label: 'CONCLUÍDO' },
      cancelado: { color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={16} />, label: 'CANCELADO' }
    };
    return config[status] || config.pendente;
  };

  const handleConfigNotificacao = (tipo) => {
    const novaConfig = {
      ...configNotificacao,
      [tipo]: !configNotificacao[tipo]
    };
    setConfigNotificacao(novaConfig);
    localStorage.setItem('configNotificacao', JSON.stringify(novaConfig));
  };

  const pedidosFiltrados = useMemo(() => filtrarPedidos(), [filtrarPedidos]);

  // ✅ HISTÓRICO EM GRID: ACEITAS vs CANCELADAS
  const historicoAceitas = useMemo(() => {
    if (tabAtiva !== 'historico') return [];
    return pedidosFiltrados.filter(p => ['entregue', 'concluido'].includes(p.status));
  }, [tabAtiva, pedidosFiltrados]);

  const historicoCanceladas = useMemo(() => {
    if (tabAtiva !== 'historico') return [];
    return pedidosFiltrados.filter(p => p.status === 'cancelado');
  }, [tabAtiva, pedidosFiltrados]);

  const styles = {
    // Linha do histórico
    histWrap: {
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #E2E8F0',
      overflow: 'hidden'
    },
    histHeader: {
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #E2E8F0',
      background: '#F8FAFC'
    },
    histTitle: () => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontWeight: 900,
      color: '#0F3460'
    }),
    badgeCount: {
      fontSize: '12px',
      fontWeight: 800,
      padding: '4px 10px',
      borderRadius: '999px',
      background: '#E2E8F0',
      color: '#334155'
    },
    histTableHead: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '110px 1.4fr 1fr 120px 160px 120px',
      gap: '10px',
      padding: '10px 14px',
      fontSize: '11px',
      fontWeight: 800,
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: '1px solid #F1F5F9'
    },
    histRow: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '110px 1.4fr 1fr 120px 160px 120px',
      gap: '10px',
      padding: '12px 14px',
      borderBottom: '1px solid #F1F5F9'
    },
    cellMain: { fontSize: '13px', color: '#0F3460', fontWeight: 800 },
    cellSub: { fontSize: '12px', color: '#64748B', marginTop: '2px' },
    pill: (statusObj) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 900,
      color: statusObj.color,
      background: statusObj.bg,
      width: 'fit-content'
    }),
    btnIcon: (border, color) => ({
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      border: `1px solid ${border}`,
      background: 'white',
      color,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    expandBox: {
      padding: '12px 14px',
      background: '#F8FAFC',
      borderTop: '1px solid #E2E8F0'
    }
  };

  const renderHistoricoGrid = () => {
    const renderTabela = (titulo, icon, lista) => (
      <div style={styles.histWrap}>
        <div style={styles.histHeader}>
          <div style={styles.histTitle()}>
            {icon}
            <span>{titulo}</span>
            <span style={styles.badgeCount}>{lista.length}</span>
          </div>
        </div>

        {!isMobile && (
          <div style={styles.histTableHead}>
            <div>Pedido</div>
            <div>Cliente</div>
            <div>Endereço</div>
            <div>Total</div>
            <div>Status / Data</div>
            <div>Ações</div>
          </div>
        )}

        {lista.length === 0 ? (
          <div style={{ padding: '18px 14px', color: '#64748B', fontSize: '13px' }}>
            Nenhum pedido nesta lista.
          </div>
        ) : (
          lista.map((pedido) => {
            const st = getStatusStyle(pedido.status);
            const expandido = !!pedidosExpandidos[pedido.id];

            const enderecoLinha = `${pedido.cliente?.rua || ''}, ${pedido.cliente?.numero || ''} - ${pedido.cliente?.bairro || ''}`;
            const cidadeLinha = pedido.cliente?.cidade ? `📍 ${pedido.cliente.cidade}` : '';

            return (
              <div key={pedido.id}>
                <div style={styles.histRow}>
                  {/* Pedido */}
                  <div>
                    <div style={styles.cellMain}>#{pedido.numeroPedido}</div>
                    <div style={styles.cellSub}><Clock size={12} style={{ marginRight: 6 }} />{pedido.tempoDecorrido}</div>
                  </div>

                  {/* Cliente */}
                  <div>
                    <div style={styles.cellMain}>{pedido.cliente?.nomeCompleto || 'Cliente'}</div>
                    <div style={styles.cellSub}><Phone size={12} style={{ marginRight: 6 }} />{pedido.cliente?.telefone || '-'}</div>
                  </div>

                  {/* Endereço */}
                  <div>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{enderecoLinha}</div>
                    {cidadeLinha && <div style={styles.cellSub}>{cidadeLinha}</div>}
                  </div>

                  {/* Total */}
                  <div>
                    <div style={styles.cellMain}>{formatMoneyBR(pedido.pagamento?.total)}</div>
                    <div style={styles.cellSub}>{String(pedido.pagamento?.metodo || '').toUpperCase()}</div>
                  </div>

                  {/* Status */}
                  <div>
                    <div style={styles.pill(st)}>{st.icon} {st.label}</div>
                    <div style={styles.cellSub}>{formatHora(pedido.dataCriacao)}</div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => enviarMensagemWhatsApp(pedido)}
                      style={styles.btnIcon('#25D366', '#25D366')}
                      title="WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </button>

                    <button
                      onClick={() => togglePedidoExpandido(pedido.id)}
                      style={styles.btnIcon('#E2E8F0', '#64748B')}
                      title="Ver itens"
                    >
                      {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <button
                      onClick={() => window.print()}
                      style={styles.btnIcon('#E2E8F0', '#475569')}
                      title="Imprimir"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div style={styles.expandBox}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      color: '#64748B',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Package size={14} /> ITENS DO PEDIDO
                    </div>

                    {(pedido.itens || []).map((item, i) => {
                      const base = getBaseUnit(item);
                      const add = getAdicionalUnit(item);
                      const unitFinal = getUnitFinal(item);
                      const qtd = toNumber(item?.quantidade) || 1;
                      const totalItem = toNumber(item?.precoTotal) || (unitFinal * qtd);

                      return (
                        <div key={i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 12px',
                          background: 'white',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          marginBottom: '8px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, color: '#0F3460', fontSize: '13px' }}>
                              {qtd}x {item.nome}
                            </div>

                            <div style={{ fontSize: '12px', color: '#334155', marginTop: 6 }}>
                              {formatMoneyBR(base)} lanche
                            </div>

                            {add > 0 && (
                              <div style={{ fontSize: '12px', color: '#334155', marginTop: 2 }}>
                                {formatMoneyBR(add)} adicional
                              </div>
                            )}

                            {item.adicionaisTexto && (
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2, fontStyle: 'italic' }}>
                                + {item.adicionaisTexto}
                              </div>
                            )}

                            <div style={{ fontSize: '12px', color: '#10B981', marginTop: 4, fontWeight: 800 }}>
                              Unit final: {formatMoneyBR(unitFinal)}
                            </div>
                          </div>

                          <div style={{ fontWeight: 900, color: '#0F3460', whiteSpace: 'nowrap' }}>
                            {formatMoneyBR(totalItem)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px'
      }}>
        {renderTabela('Aceitas (Entregue/Concluído)', <CheckCircle size={18} color="#10B981" />, historicoAceitas)}
        {renderTabela('Canceladas', <XCircle size={18} color="#EF4444" />, historicoCanceladas)}
      </div>
    );
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={{
        padding: isMobile ? '10px' : '20px',
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        {/* Cabeçalho */}
        <div style={{
          background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 10px 25px rgba(15, 52, 96, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={32} /> Gestão de Pedidos
              </h1>
              <p style={{ opacity: 0.9, fontSize: '14px' }}>
                Gerencie e acompanhe todos os pedidos do seu estabelecimento
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {}}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={22} />
                {notificacoes.filter(n => !n.lida).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#EF4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {notificacoes.filter(n => !n.lida).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'PENDENTES', value: stats.pendentes, color: '#F59E0B', icon: <Clock size={20} /> },
              { label: 'EM PREPARO', value: stats.preparo, color: '#3B82F6', icon: <Package size={20} /> },
              { label: 'ENTREGA', value: stats.entrega, color: '#8B5CF6', icon: <Truck size={20} /> },
              { label: 'CONCLUÍDOS', value: stats.concluidos, color: '#10B981', icon: <CheckCircle size={20} /> },
              { label: 'HOJE', value: stats.totalHoje, color: '#8B5CF6', icon: <Star size={20} /> },
              { label: 'FATURAMENTO HOJE', value: formatMoneyBR(stats.valorHoje), color: '#10B981', icon: <CreditCard size={20} /> }
            ].map((stat, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  color: stat.color
                }}>
                  {stat.icon}
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>{stat.value}</div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barra de controles */}
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={18} />
            <input
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                outline: 'none'
              }}
              placeholder="Buscar cliente, número do pedido, telefone..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Filter size={16} /> Filtros
            </button>

            <button
              onClick={() => window.print()}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> Imprimir
            </button>

            <button
              onClick={() => { setBusca(''); setFiltroData(''); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={16} /> Limpar
            </button>
          </div>

          {mostrarFiltros && (
            <div style={{
              width: '100%',
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              marginTop: '12px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '4px' }}>
                    Data específica
                  </label>
                  <input
                    type="date"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '14px'
                    }}
                    onChange={e => setFiltroData(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '4px' }}>
                    Configurar notificações
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={configNotificacao.som}
                        onChange={() => handleConfigNotificacao('som')}
                      />
                      Som
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={configNotificacao.popup}
                        onChange={() => handleConfigNotificacao('popup')}
                      />
                      Popup
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          padding: '4px',
          background: '#F1F5F9',
          borderRadius: '12px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'pendente', label: 'PENDENTES', count: stats.pendentes },
            { id: 'preparo', label: 'EM PREPARO', count: stats.preparo },
            { id: 'entrega', label: 'ENTREGA', count: stats.entrega },
            { id: 'historico', label: 'HISTÓRICO', count: stats.concluidos }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '800',
                cursor: 'pointer',
                background: tabAtiva === tab.id ? '#0F3460' : 'transparent',
                color: tabAtiva === tab.id ? 'white' : '#64748B',
                whiteSpace: 'nowrap',
                fontSize: '13px',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: tabAtiva === tab.id ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
                  color: tabAtiva === tab.id ? 'white' : '#475569',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {pedidosFiltrados.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #E2E8F0'
          }}>
            <Package size={48} color="#CBD5E0" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#0F3460', marginBottom: '8px' }}>Nenhum pedido encontrado</h3>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>
              {tabAtiva === 'pendente'
                ? 'Não há pedidos pendentes no momento.'
                : tabAtiva === 'historico'
                ? 'Não há histórico de pedidos.'
                : 'Não há pedidos nesta categoria.'}
            </p>
            <button
              onClick={() => { setBusca(''); setFiltroData(''); }}
              style={{
                padding: '12px 24px',
                background: '#0F3460',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {/* ✅ Se for histórico */}
            {tabAtiva === 'historico' ? (
              renderHistoricoGrid()
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))',
                gap: '20px'
              }}>
                {pedidosFiltrados.map(pedido => {
                  const status = getStatusStyle(pedido.status);
                  const estaExpandido = pedidosExpandidos[pedido.id];

                  return (
                    <div key={pedido.id} style={{
                      background: 'white',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                    }}>
                      {/* Cabeçalho */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #F1F5F9'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: '900',
                            color: '#0F3460',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            #{pedido.numeroPedido}
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              letterSpacing: '0.5px',
                              color: status.color,
                              background: status.bg
                            }}>
                              {status.icon} {status.label}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '8px',
                            fontSize: '13px',
                            color: '#64748B'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={14} /> {pedido.tempoDecorrido}
                            </span>
                            {pedido.ehHoje && (
                              <span style={{
                                background: '#10B981',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: 'bold'
                              }}>
                                HOJE
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => enviarMensagemWhatsApp(pedido)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #25D366',
                              background: 'white',
                              color: '#25D366',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Enviar mensagem via WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </button>

                          <button
                            onClick={() => togglePedidoExpandido(pedido.id)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              background: 'white',
                              color: '#64748B',
                              cursor: 'pointer'
                            }}
                            title="Expandir (itens)"
                          >
                            {estaExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Cliente */}
                      <div style={{
                        background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px'
                          }}>
                            {pedido.cliente?.nomeCompleto?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F3460' }}>
                              {pedido.cliente?.nomeCompleto || 'Cliente não identificado'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <Phone size={12} /> {pedido.cliente?.telefone || 'Sem telefone'}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={12} /> ENDEREÇO DE ENTREGA
                          </div>

                          <div style={{ fontSize: '14px', color: '#475569' }}>
                            {pedido.cliente?.rua}, {pedido.cliente?.numero} - {pedido.cliente?.bairro}
                            <div style={{
                              fontSize: '13px',
                              color: '#64748B',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <MapPin size={12} /> {pedido.cliente?.cidade}
                            </div>

                            {pedido.cliente?.complemento && (
                              <div style={{ fontSize: '13px', color: '#D97706', background: '#FFFBEB', padding: '6px', borderRadius: '6px', marginTop: '6px' }}>
                                <strong>Observação:</strong> {pedido.cliente.complemento}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Itens expandido */}
                      {estaExpandido && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={12} /> DETALHES DO PEDIDO
                          </div>

                          {pedido.itens?.map((item, i) => {
                            const base = getBaseUnit(item);
                            const add = getAdicionalUnit(item);
                            const unitFinal = getUnitFinal(item);
                            const qtd = toNumber(item?.quantidade) || 1;
                            const totalItem = toNumber(item?.precoTotal) || (unitFinal * qtd);

                            return (
                              <div key={i} style={{ borderBottom: '1px dashed #E2E8F0', paddingBottom: '12px', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F3460' }}>
                                      {qtd}x {item.nome}
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#334155', marginTop: 6 }}>
                                      {formatMoneyBR(base)} lanche
                                    </div>

                                    {add > 0 && (
                                      <div style={{ fontSize: '12px', color: '#334155', marginTop: 2 }}>
                                        {formatMoneyBR(add)} adicional
                                      </div>
                                    )}

                                    {item.adicionaisTexto && (
                                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                                        + {item.adicionaisTexto}
                                      </div>
                                    )}

                                    <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 800 }}>
                                      Unit final: {formatMoneyBR(unitFinal)}
                                    </div>
                                  </div>

                                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F3460', whiteSpace: 'nowrap' }}>
                                    {formatMoneyBR(totalItem)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Resumo */}
                      <div style={{
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)',
                        border: '1px solid #A7F3D0',
                        padding: '16px',
                        borderRadius: '12px',
                        marginTop: 'auto'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#065F46' }}>RESUMO DO PEDIDO</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CreditCard size={14} color="#065F46" />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#065F46' }}>
                              {String(pedido.pagamento?.metodo || '').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                          <span>Subtotal</span>
                          <span>{formatMoneyBR(pedido.pagamento?.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                          <span>Taxa de Entrega</span>
                          <span>{formatMoneyBR(pedido.pagamento?.taxaEntrega)}</span>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '18px',
                          fontWeight: '900',
                          color: '#065F46',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '2px solid #A7F3D0'
                        }}>
                          <span>TOTAL</span>
                          <span>{formatMoneyBR(pedido.pagamento?.total)}</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        {pedido.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(pedido.id, 'cancelado')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                flex: 1,
                                minWidth: '120px'
                              }}
                            >
                              <XCircle size={16} /> Recusar
                            </button>
                            <button
                              onClick={() => handleStatusChange(pedido.id, 'preparo')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: 'white',
                                flex: 2,
                                minWidth: '180px'
                              }}
                            >
                              <CheckCircle size={16} /> Aceitar Pedido
                            </button>
                          </>
                        )}

                        {pedido.status === 'preparo' && (
                          <button
                            onClick={() => handleStatusChange(pedido.id, 'entrega')}
                            style={{
                              padding: '12px 20px',
                              borderRadius: '10px',
                              border: 'none',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '14px',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                              color: 'white',
                              width: '100%'
                            }}
                          >
                            <Truck size={16} /> Saiu para Entrega
                          </button>
                        )}

                        {pedido.status === 'entrega' && (
                          <button
                            onClick={() => handleStatusChange(pedido.id, 'entregue')}
                            style={{
                              padding: '12px 20px',
                              borderRadius: '10px',
                              border: 'none',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '14px',
                              background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                              color: 'white',
                              width: '100%'
                            }}
                          >
                            <CheckCircle size={16} /> Marcar como Entregue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Modal */}
        <NotificacaoPedido
          isOpen={mostrarModalNovoPedido}
          pedido={pedidoParaAceitar}
          onAceitar={() => handleStatusChange(pedidoParaAceitar?.id, 'preparo')}
          onRecusar={() => handleStatusChange(pedidoParaAceitar?.id, 'cancelado')}
          calcularTempo={calcularTempoDecorrido}
        />

        {/* Rodapé */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          fontSize: '12px',
          color: '#64748B',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Shield size={14} />
            <strong>Sistema de Gestão ENTREGAQUI</strong>
          </div>
          <p>
            Total de {pedidos.length} pedidos processados • Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Pedidos;
