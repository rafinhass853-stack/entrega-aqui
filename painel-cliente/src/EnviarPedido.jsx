import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, CreditCard, DollarSign, QrCode, MapPin, Loader2, MessageCircle, Utensils, Truck } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

const EnviarPedido = ({ estabelecimento, carrinho, dadosCliente, onVoltar }) => {
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [troco, setTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [idDocPedido, setIdDocPedido] = useState(null);
  const [pedidoRealTime, setPedidoRealTime] = useState(null);

  useEffect(() => {
    if (!idDocPedido) return;
    const unsub = onSnapshot(doc(db, "Pedidos", idDocPedido), (docSnap) => {
      if (docSnap.exists()) setPedidoRealTime(docSnap.data());
    });
    return () => unsub();
  }, [idDocPedido]);

  const calcularSubtotal = () => carrinho.reduce((total, item) => total + (parseFloat(item.preco) * item.quantidade), 0);
  const calcularTotal = () => calcularSubtotal() + (parseFloat(estabelecimento?.taxaEntrega) || 0);

  const handleEnviarPedido = async () => {
    setEnviando(true);
    const numero = Math.floor(100000 + Math.random() * 900000);
    
    try {
      const dadosDoPedido = {
        numeroPedido: numero,
        restauranteId: estabelecimento.id || 'loja_01',
        restauranteNome: estabelecimento.cliente || 'Restaurante',
        itens: carrinho.map(item => ({
          id: item.id || item.idUnico,
          nome: item.nome,
          preco: parseFloat(item.preco),
          quantidade: item.quantidade,
          sabores: item.sabores || []
        })),
        cliente: {
          nomeCompleto: dadosCliente.nomeCompleto,
          telefone: dadosCliente.telefone,
          rua: dadosCliente.rua,
          numero: dadosCliente.numero,
          bairro: dadosCliente.bairro,
          cidade: dadosCliente.cidade || 'Não informada',
          complemento: dadosCliente.complemento || '',
          referencia: dadosCliente.referencia || ''
        },
        pagamento: {
          metodo: metodoPagamento,
          troco: metodoPagamento === 'dinheiro' ? (troco || "") : "", // Salva como string conforme imagem do Firebase
          subtotal: calcularSubtotal(),
          taxaEntrega: parseFloat(estabelecimento?.taxaEntrega) || 0,
          total: calcularTotal()
        },
        observacoes: observacoes || "",
        status: 'pendente', // Status inicial para aparecer na aba PENDENTES do painel
        dataCriacao: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "Pedidos"), dadosDoPedido);
      setIdDocPedido(docRef.id);
      setPedidoEnviado(true);

      // Link do WhatsApp
      const msg = `*Novo Pedido: #${numero}*\n*Cliente:* ${dadosCliente.nomeCompleto}\n*Total:* R$ ${calcularTotal().toFixed(2)}`;
      const tel = estabelecimento.whatsapp || '5516999999999';
      window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert('Erro ao processar pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#0F3460', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    content: { padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' },
    section: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#0F3460', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    metodoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
    btnMetodo: (ativo) => ({
      padding: '12px 5px', borderRadius: '12px', border: ativo ? '2px solid #10B981' : '2px solid #F1F5F9',
      backgroundColor: ativo ? '#F0FDF4' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
    }),
    input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '10px', boxSizing: 'border-box' },
    resumoLinha: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
    btnFinal: { width: '100%', padding: '18px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px' },
    statusStep: (ativo) => ({ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #F1F5F9', opacity: ativo ? 1 : 0.4 }),
    iconCircle: (ativo) => ({ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: ativo ? '#10B981' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' })
  };

  if (pedidoEnviado) {
    const status = pedidoRealTime?.status || 'pendente';
    return (
      <div style={styles.container}>
        <header style={styles.header}><h2 style={{margin: 0, fontSize: '18px'}}>Acompanhar Pedido</h2></header>
        <div style={styles.content}>
          <div style={{...styles.section, textAlign: 'center'}}>
            <div style={{fontSize: '14px', color: '#64748B'}}>Pedido #{pedidoRealTime?.numeroPedido}</div>
            <h2 style={{color: '#0F3460', margin: '10px 0'}}>
              {status === 'pendente' && 'Aguardando Restaurante...'}
              {status === 'preparo' && 'O restaurante aceitou seu pedido!'}
              {status === 'entrega' && 'Seu pedido saiu para entrega!'}
              {status === 'concluido' && 'Pedido Entregue! Aproveite!'}
              {status === 'recusado' && 'Desculpe, o pedido foi recusado.'}
            </h2>
          </div>

          <div style={styles.section}>
            <div style={styles.statusStep(true)}>
                <div style={styles.iconCircle(true)}><MessageCircle size={20}/></div>
                <div><div style={{fontWeight: '700'}}>Pedido Enviado</div><div style={{fontSize: '12px'}}>Aguardando confirmação</div></div>
                <CheckCircle size={20} color="#10B981" style={{marginLeft: 'auto'}}/>
            </div>
            <div style={styles.statusStep(['preparo', 'entrega', 'concluido'].includes(status))}>
                <div style={styles.iconCircle(['preparo', 'entrega', 'concluido'].includes(status))}><Utensils size={20}/></div>
                <div><div style={{fontWeight: '700'}}>Em Preparo</div><div style={{fontSize: '12px'}}>O restaurante está produzindo</div></div>
            </div>
            <div style={styles.statusStep(['entrega', 'concluido'].includes(status))}>
                <div style={styles.iconCircle(['entrega', 'concluido'].includes(status))}><Truck size={20}/></div>
                <div><div style={{fontWeight: '700'}}>Saiu para Entrega</div><div style={{fontSize: '12px'}}>O entregador está a caminho</div></div>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} style={{...styles.btnFinal, backgroundColor: '#0F3460'}}>Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{cursor: 'pointer'}} />
        <h2 style={{margin: 0, fontSize: '18px'}}>Finalizar Pedido</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.section}>
          <div style={styles.sectionTitle}><MapPin size={18} color="#10B981"/> Entrega em</div>
          <p style={{margin: 0, fontSize: '14px', color: '#475569'}}>
            {dadosCliente.rua}, {dadosCliente.numero} - {dadosCliente.bairro}<br/>
            {dadosCliente.cidade} {dadosCliente.complemento && `(${dadosCliente.complemento})`}
          </p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}><CreditCard size={18} color="#10B981"/> Forma de Pagamento</div>
          <div style={styles.metodoGrid}>
            {['dinheiro', 'cartao', 'pix'].map((tipo) => (
              <button key={tipo} onClick={() => setMetodoPagamento(tipo)} style={styles.btnMetodo(metodoPagamento === tipo)}>
                {tipo === 'dinheiro' && <DollarSign size={20}/>}
                {tipo === 'cartao' && <CreditCard size={20}/>}
                {tipo === 'pix' && <QrCode size={20}/>}
                <span style={{fontSize: '11px', fontWeight: '700', textTransform: 'uppercase'}}>{tipo}</span>
              </button>
            ))}
          </div>
          {metodoPagamento === 'dinheiro' && (
            <input type="number" placeholder="Troco para quanto?" style={styles.input} value={troco} onChange={(e) => setTroco(e.target.value)} />
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Resumo</div>
          {carrinho.map(item => (
            <div key={item.idUnico} style={styles.resumoLinha}>
              <span>{item.quantidade}x {item.nome}</span>
              <span>R$ {(parseFloat(item.preco) * item.quantidade).toFixed(2)}</span>
            </div>
          ))}
          <div style={{...styles.resumoLinha, fontWeight: '800', borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px'}}>
            <span>Total com entrega</span><span>R$ {calcularTotal().toFixed(2)}</span>
          </div>
        </div>

        <button onClick={handleEnviarPedido} disabled={enviando} style={styles.btnFinal}>
          {enviando ? <Loader2 className="animate-spin" /> : <><MessageCircle size={22}/> Confirmar e Enviar</>}
        </button>
      </div>
    </div>
  );
};

export default EnviarPedido;