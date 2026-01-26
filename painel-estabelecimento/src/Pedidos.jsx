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
  CheckCircle, XCircle, Truck, User, Filter, Search, Info,
  MessageCircle, RotateCcw, Eye, Download, Printer,
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

const Pedidos = ({ user }) => {
  const isMobile = useIsMobile();
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

  // Carregar configurações de notificação
  useEffect(() => {
    const savedConfig = localStorage.getItem('configNotificacao');
    if (savedConfig) {
      setConfigNotificacao(JSON.parse(savedConfig));
    }
    
    // Carregar sons
    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3');
    notificationSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
    
    // Solicitar permissão para notificações
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Buscar pedidos
  useEffect(() => {
    if (!user) return;

    const estabId = user?.estabelecimentoId || user?.restauranteId || user?.lojaId || user?.uid;
    if (!estabId) return;

    const pedidosRef = collection(db, 'Pedidos');
    const qRest = query(pedidosRef, where('restauranteId', '==', estabId), orderBy('dataCriacao', 'desc'));
    const qEstab = query(pedidosRef, where('estabelecimentoId', '==', estabId), orderBy('dataCriacao', 'desc'));

    const mergeAndSet = (snapA, snapB) => {
      const map = new Map();
      const hoje = new Date().toDateString();
      
      const addSnap = (snap) => {
        if (!snap) return;
        snap.docs.forEach((d) => {
          const data = d.data();
          const dataPedido = data.dataCriacao?.toDate ? data.dataCriacao.toDate() : new Date();
          const ehHoje = dataPedido.toDateString() === hoje;
          
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
        const db = b.dataCriacao?.toDate ? b.dataCriacao.toDate() : new Date(b.dataCriacao || 0);
        return db - da;
      });

      // Calcular estatísticas
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
          
          // Notificação sonora
          if (configNotificacao.som) {
            audioRef.current?.play().catch(() => {});
          }
          
          // Notificação desktop
          if (configNotificacao.desktop && Notification.permission === "granted") {
            new Notification(`🎉 Novo Pedido #${novoPedido.numeroPedido}`, {
              body: `${novoPedido.cliente?.nomeCompleto} - R$ ${toNumber(novoPedido.pagamento?.total).toFixed(2)}`,
              icon: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
              tag: `pedido-${novoPedido.id}`
            });
          }
          
          // Adicionar à lista de notificações
          setNotificacoes(prev => [{
            id: novoPedido.id,
            tipo: 'novo_pedido',
            titulo: `Novo Pedido #${novoPedido.numeroPedido}`,
            mensagem: `${novoPedido.cliente?.nomeCompleto} - R$ ${toNumber(novoPedido.pagamento?.total).toFixed(2)}`,
            data: new Date(),
            lida: false
          }, ...prev.slice(0, 9)]);
        }
      }
      
      pedidosAnterioresRef.current = lista;
      setPedidos(lista);
    };

    let s1 = null, s2 = null;
    const unsub1 = onSnapshot(qRest, (s) => { s1 = s; mergeAndSet(s1, s2); });
    const unsub2 = onSnapshot(qEstab, (s) => { s2 = s; mergeAndSet(s1, s2); });
    return () => { unsub1(); unsub2(); };
  }, [user, configNotificacao]);

  const calcularTempoDecorrido = (data) => {
    if (!data) return 'Agora';
    const d = data.toDate ? data.toDate() : new Date(data);
    const diff = Math.floor((new Date() - d) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

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
      
      // Tocar som de confirmação
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
    const telefone = pedido.cliente?.telefone?.replace(/\D/g, '');
    const mensagem = `Olá ${pedido.cliente?.nomeCompleto}! Aqui é o ${pedido.restauranteNome || 'restaurante'}. Seu pedido #${pedido.numeroPedido} está com status: ${pedido.status.toUpperCase()}. Valor: R$ ${toNumber(pedido.pagamento?.total).toFixed(2)}.`;
    
    if (telefone) {
      window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    }
  };

  const filtrarPedidos = () => {
    return pedidos.filter(p => {
      const matchTab = tabAtiva === 'historico' 
        ? ['entregue', 'cancelado', 'concluido'].includes(p.status) 
        : p.status === tabAtiva;
      
      const termo = busca.toLowerCase();
      const matchBusca = !busca || 
        p.cliente?.nomeCompleto?.toLowerCase().includes(termo) || 
        String(p.numeroPedido).toLowerCase().includes(termo) || 
        p.cliente?.telefone?.includes(termo);
      
      const matchData = !filtroData || 
        (p.dataCriacao?.toDate ? p.dataCriacao.toDate().toLocaleDateString('en-CA') : '') === filtroData;
      
      return matchTab && matchBusca && matchData;
    });
  };

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

  const marcarNotificacaoComoLida = (id) => {
    setNotificacoes(prev => 
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    );
  };

  const limparNotificacoes = () => {
    setNotificacoes([]);
  };

  const handleConfigNotificacao = (tipo) => {
    const novaConfig = {
      ...configNotificacao,
      [tipo]: !configNotificacao[tipo]
    };
    setConfigNotificacao(novaConfig);
    localStorage.setItem('configNotificacao', JSON.stringify(novaConfig));
  };

  return (
    <Layout isMobile={isMobile}>
      <div style={{ 
        padding: isMobile ? '10px' : '20px', 
        backgroundColor: '#F8FAFC', 
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        {/* Cabeçalho Aprimorado */}
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
            
            {/* Notificações */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => {/* Abrir painel de notificações */}}
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

          {/* Stats Row Aprimorada */}
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
              { label: 'FATURAMENTO HOJE', value: `R$ ${stats.valorHoje.toFixed(2)}`, color: '#10B981', icon: <CreditCard size={20} /> }
            ].map((stat, index) => (
              <div key={index} style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }
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

        {/* Barra de Controles */}
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
                outline: 'none',
                transition: 'border-color 0.2s'
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

        {/* Tabs Aprimoradas */}
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
            { id: 'pendentes', label: 'PENDENTES', count: stats.pendentes },
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
                gap: '8px',
                transition: 'all 0.2s ease'
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

        {/* Grid de Pedidos Aprimorado */}
        {filtrarPedidos().length === 0 ? (
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
              {tabAtiva === 'pendentes' 
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', 
            gap: '20px' 
          }}>
            {filtrarPedidos().map(pedido => {
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
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  {/* Cabeçalho do Pedido */}
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
                      >
                        {estaExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Informações do Cliente */}
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
                        {pedido.cliente?.complemento && (
                          <div style={{ fontSize: '13px', color: '#D97706', background: '#FFFBEB', padding: '6px', borderRadius: '6px', marginTop: '6px' }}>
                            <strong>Observação:</strong> {pedido.cliente.complemento}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {estaExpandido && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={12} /> DETALHES DO PEDIDO
                      </div>
                      
                      {pedido.itens?.map((item, i) => (
                        <div key={i} style={{ 
                          borderBottom: '1px dashed #E2E8F0', 
                          paddingBottom: '12px', 
                          marginBottom: '12px',
                          '&:last-child': {
                            borderBottom: 'none'
                          }
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F3460' }}>
                                {item.quantidade}x {item.nome}
                              </div>
                              {item.adicionaisTexto && (
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                                  + {item.adicionaisTexto}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '2px' }}>
                                Unit: R$ {toNumber(item.precoUnitarioFinal || item.preco).toFixed(2)}
                              </div>
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F3460' }}>
                              R$ {toNumber(item.precoTotal || (toNumber(item.precoUnitarioFinal) * item.quantidade)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumo Financeiro */}
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
                          {pedido.pagamento?.metodo?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                      <span>Subtotal</span>
                      <span>R$ {toNumber(pedido.pagamento?.subtotal).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                      <span>Taxa de Entrega</span>
                      <span>R$ {toNumber(pedido.pagamento?.taxaEntrega).toFixed(2)}</span>
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
                      <span>R$ {toNumber(pedido.pagamento?.total).toFixed(2)}</span>
                    </div>
                    
                    {pedido.pagamento?.metodo === 'dinheiro' && pedido.pagamento?.troco && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: '#FEF3C7', 
                        borderRadius: '6px',
                        border: '1px solid #F59E0B',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} color="#92400E" />
                        <span style={{ color: '#92400E', fontWeight: '700' }}>
                          TROCO PARA: R$ {toNumber(pedido.pagamento.troco).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações do Pedido */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginTop: '16px',
                    flexWrap: 'wrap'
                  }}>
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
                            transition: 'all 0.2s ease',
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
                            transition: 'all 0.2s ease',
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
                          transition: 'all 0.2s ease',
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
                          transition: 'all 0.2s ease',
                          fontSize: '14px',
                          background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                          color: 'white',
                          width: '100%'
                        }}
                      >
                        <CheckCircle size={16} /> Marcar como Entregue
                      </button>
                    )}
                    
                    {['entregue', 'concluido', 'cancelado'].includes(pedido.status) && (
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        width: '100%',
                        justifyContent: 'space-between'
                      }}>
                        <button 
                          onClick={() => enviarMensagemWhatsApp(pedido)}
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
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            background: '#25D366',
                            color: 'white',
                            flex: 1
                          }}
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </button>
                        <button 
                          onClick={() => window.print()}
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
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            background: '#F1F5F9',
                            color: '#475569',
                            flex: 1
                          }}
                        >
                          <Printer size={16} /> Imprimir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Notificação de Novo Pedido */}
        <NotificacaoPedido 
          isOpen={mostrarModalNovoPedido} 
          pedido={pedidoParaAceitar}
          onAceitar={() => handleStatusChange(pedidoParaAceitar?.id, 'preparo')}
          onRecusar={() => handleStatusChange(pedidoParaAceitar?.id, 'cancelado')}
          calcularTempo={calcularTempoDecorrido}
        />

        {/* Rodapé Informativo */}
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