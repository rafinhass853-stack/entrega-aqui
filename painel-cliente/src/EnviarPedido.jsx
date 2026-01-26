import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle, CreditCard, DollarSign, QrCode, MapPin, Loader2,
  MessageCircle, Utensils, Truck, Shield, Package, Clock, AlertCircle, User, Home
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const normalizeWhatsApp = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const calcAdicionais = (item) => {
  const grupos = Array.isArray(item?.escolhas) ? item.escolhas : [];
  let total = 0;
  grupos.forEach(g => {
    (g?.itens || []).forEach(op => total += toNumber(op?.preco) * (op?.qtd || 1));
  });
  return total;
};

const calcItemUnitarioFinal = (item) => {
  const base = toNumber(item?.precoBaseUnitario ?? item?.preco);
  return base + calcAdicionais(item);
};

const formatAdicionaisTexto = (item) => {
  const grupos = Array.isArray(item?.escolhas) ? item.escolhas : [];
  const linhas = [];

  grupos.forEach(g => {
    const nomeGrupo = g?.grupoNome || 'Adicionais';
    const itens = (g?.itens || []).map(op => {
      const p = toNumber(op?.preco);
      const qtd = op?.qtd || 1;
      return `${qtd > 1 ? qtd + 'x ' : ''}${op?.nome}${p > 0 ? ` (R$ ${p.toFixed(2)}${qtd > 1 ? ` c/u` : ''})` : ''}`;
    });
    if (itens.length) linhas.push(`${nomeGrupo}: ${itens.join(', ')}`);
  });

  return linhas.join(' | ');
};

const EnviarPedido = ({ estabelecimento, carrinho, dadosCliente, onVoltar, onSucesso }) => {
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [troco, setTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [idDocPedido, setIdDocPedido] = useState(null);
  const [pedidoRealTime, setPedidoRealTime] = useState(null);
  const [etapa, setEtapa] = useState('pagamento'); // 'pagamento', 'confirmacao', 'sucesso'

  useEffect(() => {
    if (!idDocPedido) return;
    const unsub = onSnapshot(doc(db, "Pedidos", idDocPedido), (docSnap) => {
      if (docSnap.exists()) setPedidoRealTime(docSnap.data());
    });
    return () => unsub();
  }, [idDocPedido]);

  const calcularSubtotal = () =>
    (Array.isArray(carrinho) ? carrinho : []).reduce((total, item) => {
      const qtd = toNumber(item?.quantidade) || 1;
      return total + (calcItemUnitarioFinal(item) * qtd);
    }, 0);

  const calcularTotal = () => calcularSubtotal() + toNumber(estabelecimento?.taxaEntrega);

  const handleEnviarPedido = async () => {
    setEnviando(true);
    const numero = Math.floor(100000 + Math.random() * 900000);

    try {
      const itensFormatados = (Array.isArray(carrinho) ? carrinho : []).map(item => {
        const base = toNumber(item?.precoBaseUnitario ?? item?.preco);
        const adicionaisTotal = calcAdicionais(item);
        const unit = base + adicionaisTotal;
        const qtd = toNumber(item?.quantidade) || 1;

        return {
          id: item.id || item.idUnico,
          nome: item.nome,
          quantidade: qtd,
          precoBaseUnitario: base,
          adicionaisTotal,
          precoUnitarioFinal: unit,
          precoTotal: unit * qtd,
          escolhas: Array.isArray(item.escolhas) ? item.escolhas : [],
          adicionaisTexto: formatAdicionaisTexto(item),
          foto: item.foto || null
        };
      });

      const estabId = estabelecimento?.id || estabelecimento?.restauranteId || estabelecimento?.uid || 'loja_01';
      const estabNome = estabelecimento?.cliente || estabelecimento?.nome || 'Restaurante';

      const dadosDoPedido = {
        numeroPedido: numero,
        estabelecimentoId: estabId,
        estabelecimentoNome: estabNome,
        restauranteId: estabId,
        restauranteNome: estabNome,
        itens: itensFormatados,
        cliente: {
          nomeCompleto: dadosCliente.nomeCompleto,
          telefone: String(dadosCliente.telefone).replace(/\D/g, ''),
          rua: dadosCliente.rua,
          numero: dadosCliente.numero,
          bairro: dadosCliente.bairro,
          cidade: dadosCliente.cidade || 'Araraquara',
          complemento: dadosCliente.complemento || '',
          referencia: dadosCliente.referencia || '',
          cep: dadosCliente.cep || ''
        },
        pagamento: {
          metodo: metodoPagamento,
          troco: metodoPagamento === 'dinheiro' ? (troco || "") : "",
          subtotal: calcularSubtotal(),
          taxaEntrega: toNumber(estabelecimento?.taxaEntrega),
          total: calcularTotal()
        },
        observacoes: observacoes || "",
        status: 'pendente',
        dataCriacao: serverTimestamp(),
        tempoEstimado: estabelecimento?.tempoEntrega || 30,
        taxaEntrega: toNumber(estabelecimento?.taxaEntrega)
      };

      const docRef = await addDoc(collection(db, "Pedidos"), dadosDoPedido);
      setIdDocPedido(docRef.id);
      setPedidoEnviado(true);
      setEtapa('sucesso');

      if (typeof onSucesso === 'function') onSucesso();

      // WhatsApp do estabelecimento
      const msg = 
`*🎉 NOVO PEDIDO #${numero}*

*Cliente:* ${dadosCliente.nomeCompleto}
*Telefone:* ${dadosCliente.telefone}
*Total:* R$ ${calcularTotal().toFixed(2)}
*Pagamento:* ${metodoPagamento === 'dinheiro' ? 'Dinheiro' : metodoPagamento === 'pix' ? 'PIX' : 'Cartão'}${metodoPagamento === 'dinheiro' && troco ? ` (Troco para: R$ ${toNumber(troco).toFixed(2)})` : ''}

*📦 ITENS:*
${itensFormatados.map(item => `• ${item.quantidade}x ${item.nome} - R$ ${item.precoTotal.toFixed(2)}`).join('\n')}

*📍 ENDEREÇO:*
${dadosCliente.rua}, ${dadosCliente.numero}
${dadosCliente.bairro}, ${dadosCliente.cidade}
${dadosCliente.complemento ? `Complemento: ${dadosCliente.complemento}` : ''}
${dadosCliente.referencia ? `Referência: ${dadosCliente.referencia}` : ''}

${observacoes ? `*📝 OBSERVAÇÕES:*\n${observacoes}` : ''}`;

      const tel = normalizeWhatsApp(estabelecimento?.whatsapp);
      if (tel) {
        setTimeout(() => {
          window.open(
            `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
            '_blank'
          );
        }, 1500);
      }

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert('Erro ao processar pedido. Por favor, tente novamente.');
      setEnviando(false);
    }
  };

  const styles = {
    container: { 
      backgroundColor: '#F8FAFC', 
      minHeight: '100vh', 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
    },
    header: {
      backgroundColor: '#0F3460', 
      padding: '20px', 
      display: 'flex', 
      alignItems: 'center',
      gap: '15px', 
      color: 'white', 
      borderBottomLeftRadius: '24px', 
      borderBottomRightRadius: '24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(15, 52, 96, 0.15)'
    },
    content: { 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto', 
      paddingBottom: '40px' 
    },
    section: { 
      backgroundColor: 'white', 
      padding: '24px', 
      borderRadius: '24px', 
      marginBottom: '20px', 
      boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
      border: '1px solid #E2E8F0'
    },
    sectionTitle: { 
      fontSize: '16px', 
      fontWeight: '900', 
      color: '#0F3460', 
      marginBottom: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px' 
    },
    metodoGrid: { 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr 1fr', 
      gap: '12px',
      marginBottom: '20px'
    },
    btnMetodo: (ativo) => ({
      padding: '16px 8px', 
      borderRadius: '16px',
      border: ativo ? '3px solid #10B981' : '2px solid #F1F5F9',
      backgroundColor: ativo ? '#F0FDF4' : 'white',
      cursor: 'pointer', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      gap: '8px',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: '#10B981',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }),
    metodoIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    input: { 
      width: '100%', 
      padding: '16px', 
      borderRadius: '14px', 
      border: '2px solid #E2E8F0', 
      marginTop: '10px', 
      boxSizing: 'border-box',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        borderColor: '#10B981',
        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
      }
    },
    textarea: { 
      width: '100%', 
      padding: '16px', 
      borderRadius: '14px', 
      border: '2px solid #E2E8F0', 
      marginTop: '10px', 
      boxSizing: 'border-box', 
      minHeight: '120px', 
      resize: 'vertical',
      fontSize: '15px',
      fontFamily: 'inherit',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      '&:focus': {
        borderColor: '#10B981',
        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
      }
    },
    resumoLinha: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginBottom: '12px', 
      fontSize: '15px',
      color: '#4A5568'
    },
    resumoTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '20px',
      fontWeight: '900',
      color: '#0F3460',
      paddingTop: '16px',
      borderTop: '2px solid #E2E8F0',
      marginTop: '16px'
    },
    btnFinal: {
      width: '100%', 
      padding: '20px', 
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
      color: 'white',
      border: 'none', 
      borderRadius: '16px', 
      fontWeight: '900', 
      fontSize: '18px',
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '12px', 
      marginTop: '20px',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
      '&:hover:not(:disabled)': {
        transform: 'translateY(-3px)',
        boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)'
      },
      '&:disabled': {
        background: '#CBD5E0',
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none'
      }
    },
    statusStep: (ativo) => ({
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px', 
      padding: '20px 0',
      borderBottom: '1px solid #F1F5F9', 
      opacity: ativo ? 1 : 0.4
    }),
    iconCircle: (ativo) => ({
      width: '48px', 
      height: '48px', 
      borderRadius: '50%',
      background: ativo ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#E2E8F0',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'white',
      flexShrink: 0
    }),
    infoBox: {
      padding: '20px',
      background: 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)',
      borderRadius: '16px',
      border: '2px solid #A7F3D0',
      marginBottom: '20px'
    },
    clienteCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '20px'
    },
    clienteAvatar: {
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '24px',
      flexShrink: 0
    },
    enderecoCard: {
      padding: '20px',
      background: '#F8FAFC',
      borderRadius: '16px',
      border: '2px solid #E2E8F0',
      marginBottom: '20px'
    }
  };

  if (pedidoEnviado && etapa === 'sucesso') {
    const status = pedidoRealTime?.status || 'pendente';
    const statusConfig = {
      pendente: { 
        title: 'Aguardando Restaurante...', 
        message: 'Seu pedido foi enviado e está aguardando confirmação.',
        color: '#F59E0B',
        icon: '⏳'
      },
      preparo: { 
        title: 'O restaurante aceitou seu pedido!', 
        message: 'Sua comida está sendo preparada com carinho.',
        color: '#3B82F6',
        icon: '👨‍🍳'
      },
      entrega: { 
        title: 'Seu pedido saiu para entrega!', 
        message: 'O entregador está a caminho com sua refeição.',
        color: '#8B5CF6',
        icon: '🚚'
      },
      entregue: { 
        title: 'Pedido Entregue! Aproveite!', 
        message: 'Seu pedido foi entregue com sucesso. Bom apetite!',
        color: '#10B981',
        icon: '✅'
      },
      cancelado: { 
        title: 'Pedido cancelado', 
        message: 'Seu pedido foi cancelado. Entre em contato para mais informações.',
        color: '#EF4444',
        icon: '❌'
      }
    };
    
    const currentStatus = statusConfig[status] || statusConfig.pendente;

    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <ArrowLeft onClick={() => window.location.href = '/'} style={{cursor: 'pointer'}} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', flex: 1 }}>Acompanhar Pedido</h2>
        </header>

        <div style={styles.content}>
          <div style={{ 
            ...styles.section, 
            textAlign: 'center',
            border: `3px solid ${currentStatus.color}40`
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold'
            }}>
              {currentStatus.icon}
            </div>
            
            <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>
              Pedido #{pedidoRealTime?.numeroPedido || '...'}
            </div>
            <h2 style={{ color: currentStatus.color, margin: '10px 0 12px', fontSize: '24px', fontWeight: '900' }}>
              {currentStatus.title}
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '24px' }}>
              {currentStatus.message}
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: `${currentStatus.color}20`,
              color: currentStatus.color,
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '800'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentStatus.color,
                animation: 'pulse 1.5s infinite'
              }}></div>
              Atualiza automaticamente
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.statusStep(true)}>
              <div style={styles.iconCircle(true)}>
                <MessageCircle size={24} />
              </div>
              <div style={{flex: 1}}>
                <div style={{ fontWeight: '900', fontSize: '16px' }}>Pedido Enviado</div>
                <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                  {new Date().toLocaleString('pt-BR')}
                </div>
              </div>
              <CheckCircle size={24} color="#10B981" />
            </div>

            <div style={styles.statusStep(['preparo', 'entrega', 'entregue'].includes(status))}>
              <div style={styles.iconCircle(['preparo', 'entrega', 'entregue'].includes(status))}>
                <Utensils size={24} />
              </div>
              <div style={{flex: 1}}>
                <div style={{ fontWeight: '900', fontSize: '16px' }}>Em Preparo</div>
                <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                  O restaurante está produzindo
                </div>
              </div>
              {['preparo', 'entrega', 'entregue'].includes(status) && (
                <CheckCircle size={24} color="#10B981" />
              )}
            </div>

            <div style={styles.statusStep(['entrega', 'entregue'].includes(status))}>
              <div style={styles.iconCircle(['entrega', 'entregue'].includes(status))}>
                <Truck size={24} />
              </div>
              <div style={{flex: 1}}>
                <div style={{ fontWeight: '900', fontSize: '16px' }}>Saiu para Entrega</div>
                <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                  O entregador está a caminho
                </div>
              </div>
              {['entrega', 'entregue'].includes(status) && (
                <CheckCircle size={24} color="#10B981" />
              )}
            </div>

            <div style={{ marginTop: '20px', padding: '20px', background: '#F8FAFC', borderRadius: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A5568', marginBottom: '12px' }}>
                Detalhes do Pedido
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
                <div><b>Restaurante:</b> {pedidoRealTime?.restauranteNome || pedidoRealTime?.estabelecimentoNome || '-'}</div>
                <div><b>Pagamento:</b> {pedidoRealTime?.pagamento?.metodo?.toUpperCase() || metodoPagamento}</div>
                <div><b>Total:</b> R$ {toNumber(pedidoRealTime?.pagamento?.total ?? calcularTotal()).toFixed(2)}</div>
                <div><b>Tempo estimado:</b> {pedidoRealTime?.tempoEstimado || 30} minutos</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            style={{ 
              ...styles.btnFinal, 
              background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)',
              marginTop: '10px'
            }}
          >
            <Home size={20} />
            Voltar ao Início
          </button>
          
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            background: '#F0FDF4', 
            borderRadius: '16px',
            border: '1px solid #A7F3D0',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <Shield size={20} color="#059669" />
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#065F46' }}>
                Pedido protegido pelo ENTREGAQUI
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#047857' }}>
              Sua compra está segura. Em caso de problemas, entre em contato com nosso suporte.
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  const subtotal = calcularSubtotal();
  const taxa = toNumber(estabelecimento?.taxaEntrega);
  const total = calcularTotal();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{cursor: 'pointer'}} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', flex: 1 }}>Finalizar Pedido</h2>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          {etapa === 'pagamento' ? '1/2' : '2/2'}
        </div>
      </header>

      <div style={styles.content}>
        {/* Informações do Cliente */}
        <div style={styles.section}>
          <div style={styles.clienteCard}>
            <div style={styles.clienteAvatar}>
              {dadosCliente?.nomeCompleto?.[0]?.toUpperCase() || 'C'}
            </div>
            <div style={{flex: 1}}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F3460' }}>
                {dadosCliente?.nomeCompleto}
              </div>
              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                📱 {dadosCliente?.telefone}
              </div>
            </div>
            <div style={{
              padding: '8px 16px',
              background: '#F0FDF4',
              color: '#065F46',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              Cliente
            </div>
          </div>

          <div style={styles.enderecoCard}>
            <div style={styles.sectionTitle}>
              <MapPin size={20} color="#10B981" /> Entrega em
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F3460', marginBottom: '8px' }}>
              {dadosCliente?.rua}, {dadosCliente?.numero}
            </div>
            <div style={{ fontSize: '15px', color: '#4A5568', lineHeight: '1.5' }}>
              {dadosCliente?.bairro}, {dadosCliente?.cidade || 'Araraquara'}
              {dadosCliente?.complemento && (
                <div style={{ marginTop: '8px', padding: '10px', background: '#FFFBEB', borderRadius: '10px' }}>
                  <strong>Complemento:</strong> {dadosCliente.complemento}
                </div>
              )}
              {dadosCliente?.referencia && (
                <div style={{ marginTop: '8px', padding: '10px', background: '#F0FDF4', borderRadius: '10px' }}>
                  <strong>Referência:</strong> {dadosCliente.referencia}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <CreditCard size={20} color="#10B981" /> Forma de Pagamento
          </div>

          <div style={styles.metodoGrid}>
            {[
              { tipo: 'pix', label: 'PIX', icon: <QrCode size={24} />, desc: 'Instantâneo' },
              { tipo: 'dinheiro', label: 'Dinheiro', icon: <DollarSign size={24} />, desc: 'Troco' },
              { tipo: 'cartao', label: 'Cartão', icon: <CreditCard size={24} />, desc: 'Crédito/Débito' }
            ].map((tipo) => (
              <button
                key={tipo.tipo}
                onClick={() => setMetodoPagamento(tipo.tipo)}
                style={styles.btnMetodo(metodoPagamento === tipo.tipo)}
                type="button"
              >
                <div style={styles.metodoIcon}>
                  {tipo.icon}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}>
                    {tipo.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                    {tipo.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {metodoPagamento === 'dinheiro' && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A5568', marginBottom: '8px' }}>
                Precisa de troco?
              </div>
              <input
                type="number"
                placeholder="Troco para quanto? Ex: 50,00"
                style={styles.input}
                value={troco}
                onChange={(e) => setTroco(e.target.value)}
                step="0.01"
                min="0"
              />
              {troco && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '12px', 
                  background: '#FEF3C7', 
                  borderRadius: '12px',
                  border: '1px solid #F59E0B',
                  fontSize: '14px',
                  color: '#92400E'
                }}>
                  <strong>Troco calculado:</strong> R$ {(toNumber(troco) - total).toFixed(2)}
                </div>
              )}
            </div>
          )}
          
          {metodoPagamento === 'pix' && (
            <div style={styles.infoBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <QrCode size={24} color="#059669" />
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#065F46' }}>
                  Pagamento via PIX
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#047857', lineHeight: '1.5' }}>
                Após confirmar o pedido, você receberá o QR Code para pagamento. O pedido só será confirmado após o pagamento.
              </div>
            </div>
          )}
        </div>

        {/* Resumo do Pedido */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <Package size={20} color="#10B981" /> Resumo do Pedido
          </div>

          {(Array.isArray(carrinho) ? carrinho : []).map((item, idx) => {
            const key = item?.idUnico || item?.id || `${item?.nome || 'item'}_${idx}`;
            const qtd = toNumber(item?.quantidade) || 1;
            const unit = calcItemUnitarioFinal(item);
            const adicionaisTexto = formatAdicionaisTexto(item);

            return (
              <div key={key} style={{ padding: '16px 0', borderBottom: '1px dashed #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <div style={{ fontWeight: '900', color: '#0F3460', fontSize: '16px', marginBottom: '6px' }}>
                      {qtd}x {item?.nome}
                    </div>
                    <div style={{ fontSize: '13px', color: '#10B981', marginBottom: '4px' }}>
                      Unitário: R$ {unit.toFixed(2)}
                    </div>
                    {!!adicionaisTexto && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748B', fontStyle: 'italic', lineHeight: '1.4' }}>
                        + {adicionaisTexto}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: '900', color: '#0F3460', fontSize: '16px' }}>
                    R$ {(unit * qtd).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #E2E8F0' }}>
            <div style={styles.resumoLinha}>
              <span>Subtotal ({carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'})</span>
              <b>R$ {subtotal.toFixed(2)}</b>
            </div>
            <div style={styles.resumoLinha}>
              <span>Taxa de entrega</span>
              <b style={{color: taxa === 0 ? '#10B981' : '#4A5568'}}>
                {taxa > 0 ? `R$ ${taxa.toFixed(2)}` : 'Grátis'}
              </b>
            </div>
            
            {taxa > 0 && subtotal < 30 && (
              <div style={{
                ...styles.resumoLinha,
                color: '#059669',
                fontSize: '14px',
                fontStyle: 'italic',
                background: '#F0FDF4',
                padding: '10px',
                borderRadius: '10px',
                marginTop: '10px'
              }}>
                <AlertCircle size={16} style={{marginRight: '8px'}} />
                Adicione mais R$ {(30 - subtotal).toFixed(2)} e ganhe frete grátis!
              </div>
            )}

            <div style={styles.resumoTotal}>
              <span>TOTAL</span>
              <b style={{ color: '#10B981', fontSize: '24px' }}>R$ {total.toFixed(2)}</b>
            </div>
          </div>

          {/* Observações */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#0F3460', marginBottom: '12px' }}>
              Observações para o restaurante
            </div>
            <textarea
              style={styles.textarea}
              placeholder="Ex: sem cebola, ponto da carne, entrega na portaria, instruções especiais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <button
            onClick={handleEnviarPedido}
            style={{ ...styles.btnFinal, opacity: enviando ? 0.8 : 1 }}
            disabled={enviando || (Array.isArray(carrinho) ? carrinho.length === 0 : true)}
            type="button"
          >
            {enviando ? (
              <>
                <Loader2 size={20} style={{animation: 'spin 1s linear infinite'}} />
                Enviando Pedido...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Confirmar Pedido • R$ {total.toFixed(2)}
              </>
            )}
          </button>

          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            background: '#F8FAFC', 
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
              <Shield size={20} color="#10B981" />
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F3460' }}>
                Compra 100% Segura
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
              Seu pagamento e dados estão protegidos. Em caso de problemas, oferecemos suporte completo.
            </div>
          </div>

          <div style={{ 
            marginTop: '15px', 
            fontSize: '12px', 
            color: '#94A3B8', 
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Ao confirmar, o pedido será enviado para {estabelecimento?.cliente || 'o restaurante'} e você será redirecionado para acompanhar o status.
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default EnviarPedido;