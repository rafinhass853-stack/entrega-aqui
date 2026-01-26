import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle, CreditCard, DollarSign, QrCode, MapPin, Loader2,
  MessageCircle, Utensils, Truck
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

// Helpers (mesma regra do carrinho)
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
    (g?.itens || []).forEach(op => total += toNumber(op?.preco));
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
      return `${op?.nome}${p > 0 ? ` (R$ ${p.toFixed(2)})` : ''}`;
    });
    if (itens.length) linhas.push(`${nomeGrupo}: ${itens.join(', ')}`);
  });

  return linhas.join(' | ');
};

const EnviarPedido = ({ estabelecimento, carrinho, dadosCliente, onVoltar, onSucesso }) => {
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

          // preços detalhados (nunca mais diverge)
          precoBaseUnitario: base,
          adicionaisTotal,
          precoUnitarioFinal: unit,
          precoTotal: unit * qtd,

          // adicionais completos
          escolhas: Array.isArray(item.escolhas) ? item.escolhas : [],
          adicionaisTexto: formatAdicionaisTexto(item),

          // compat
          sabores: item.sabores || []
        };
      });

      // ✅ ID único do estabelecimento (padrão do sistema)
      const estabId =
        estabelecimento?.id ||
        estabelecimento?.restauranteId ||
        estabelecimento?.uid ||
        estabelecimento?.lojaId ||
        'loja_01';

      const estabNome = estabelecimento?.cliente || estabelecimento?.nome || 'Restaurante';

      const dadosDoPedido = {
        numeroPedido: numero,

        // ✅ NOVO PADRÃO (painel vai usar)
        estabelecimentoId: estabId,
        estabelecimentoNome: estabNome,

        // ✅ COMPAT (pedidos antigos usavam isso)
        restauranteId: estabId,
        restauranteNome: estabNome,

        itens: itensFormatados,

        cliente: {
          nomeCompleto: dadosCliente.nomeCompleto,
          telefone: String(dadosCliente.telefone),
          rua: dadosCliente.rua,
          numero: dadosCliente.numero,
          bairro: dadosCliente.bairro,
          cidade: dadosCliente.cidade || 'Não informada',
          complemento: dadosCliente.complemento || '',
          referencia: dadosCliente.referencia || ''
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
        dataCriacao: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "Pedidos"), dadosDoPedido);
      setIdDocPedido(docRef.id);
      setPedidoEnviado(true);

      if (typeof onSucesso === 'function') onSucesso();

      // WhatsApp do estabelecimento
      const msg =
        `*Novo Pedido: #${numero}*\n` +
        `*Cliente:* ${dadosCliente.nomeCompleto}\n` +
        `*Total:* R$ ${calcularTotal().toFixed(2)}`;

      const tel = normalizeWhatsApp(estabelecimento?.whatsapp);
      if (tel) {
        window.open(
          `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
          '_blank'
        );
      }

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert('Erro ao processar pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: {
      backgroundColor: '#0F3460', padding: '20px', display: 'flex', alignItems: 'center',
      gap: '15px', color: 'white', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px'
    },
    content: { padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' },
    section: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#0F3460', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    metodoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
    btnMetodo: (ativo) => ({
      padding: '12px 5px', borderRadius: '12px',
      border: ativo ? '2px solid #10B981' : '2px solid #F1F5F9',
      backgroundColor: ativo ? '#F0FDF4' : 'white',
      cursor: 'pointer', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '5px'
    }),
    input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '10px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '10px', boxSizing: 'border-box', minHeight: '90px', resize: 'vertical' },
    resumoLinha: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
    btnFinal: {
      width: '100%', padding: '18px', backgroundColor: '#10B981', color: 'white',
      border: 'none', borderRadius: '15px', fontWeight: '800', fontSize: '16px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '10px', marginTop: '20px'
    },
    statusStep: (ativo) => ({
      display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0',
      borderBottom: '1px solid #F1F5F9', opacity: ativo ? 1 : 0.4
    }),
    iconCircle: (ativo) => ({
      width: '40px', height: '40px', borderRadius: '50%',
      backgroundColor: ativo ? '#10B981' : '#E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
    }),
  };

  if (pedidoEnviado) {
    const status = pedidoRealTime?.status || 'pendente';
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Acompanhar Pedido</h2>
        </header>

        <div style={styles.content}>
          <div style={{ ...styles.section, textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              Pedido #{pedidoRealTime?.numeroPedido || '...'}
            </div>
            <h2 style={{ color: '#0F3460', margin: '10px 0' }}>
              {status === 'pendente' && 'Aguardando Restaurante...'}
              {status === 'preparo' && 'O restaurante aceitou seu pedido!'}
              {status === 'entrega' && 'Seu pedido saiu para entrega!'}
              {status === 'concluido' && 'Pedido Entregue! Aproveite!'}
              {status === 'recusado' && 'Desculpe, o pedido foi recusado.'}
              {status === 'cancelado' && 'Pedido cancelado.'}
            </h2>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Atualiza automaticamente
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.statusStep(true)}>
              <div style={styles.iconCircle(true)}><MessageCircle size={20} /></div>
              <div>
                <div style={{ fontWeight: '700' }}>Pedido Enviado</div>
                <div style={{ fontSize: '12px' }}>Aguardando confirmação</div>
              </div>
              <CheckCircle size={20} color="#10B981" style={{ marginLeft: 'auto' }} />
            </div>

            <div style={styles.statusStep(['preparo', 'entrega', 'concluido'].includes(status))}>
              <div style={styles.iconCircle(['preparo', 'entrega', 'concluido'].includes(status))}><Utensils size={20} /></div>
              <div>
                <div style={{ fontWeight: '700' }}>Em Preparo</div>
                <div style={{ fontSize: '12px' }}>O restaurante está produzindo</div>
              </div>
            </div>

            <div style={styles.statusStep(['entrega', 'concluido'].includes(status))}>
              <div style={styles.iconCircle(['entrega', 'concluido'].includes(status))}><Truck size={20} /></div>
              <div>
                <div style={{ fontWeight: '700' }}>Saiu para Entrega</div>
                <div style={{ fontSize: '12px' }}>O entregador está a caminho</div>
              </div>
            </div>

            <div style={{ paddingTop: '12px', fontSize: '13px', color: '#475569' }}>
              <div><b>Restaurante:</b> {pedidoRealTime?.restauranteNome || pedidoRealTime?.estabelecimentoNome || '-'}</div>
              <div><b>Pagamento:</b> {pedidoRealTime?.pagamento?.metodo || metodoPagamento}</div>
              <div><b>Total:</b> R$ {toNumber(pedidoRealTime?.pagamento?.total ?? calcularTotal()).toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            style={{ ...styles.btnFinal, backgroundColor: '#0F3460' }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const subtotal = calcularSubtotal();
  const taxa = toNumber(estabelecimento?.taxaEntrega);
  const total = calcularTotal();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{ cursor: 'pointer' }} />
        <h2 style={{ margin: 0, fontSize: '18px' }}>Finalizar Pedido</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <MapPin size={18} color="#10B981" /> Entrega em
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            {dadosCliente?.rua}, {dadosCliente?.numero} - {dadosCliente?.bairro}<br />
            {dadosCliente?.cidade || 'Não informada'} {dadosCliente?.complemento && `(${dadosCliente.complemento})`}
          </p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <CreditCard size={18} color="#10B981" /> Forma de Pagamento
          </div>

          <div style={styles.metodoGrid}>
            {['dinheiro', 'cartao', 'pix'].map((tipo) => (
              <button
                key={tipo}
                onClick={() => setMetodoPagamento(tipo)}
                style={styles.btnMetodo(metodoPagamento === tipo)}
                type="button"
              >
                {tipo === 'dinheiro' && <DollarSign size={20} />}
                {tipo === 'cartao' && <CreditCard size={20} />}
                {tipo === 'pix' && <QrCode size={20} />}
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  {tipo}
                </span>
              </button>
            ))}
          </div>

          {metodoPagamento === 'dinheiro' && (
            <input
              type="number"
              placeholder="Troco para quanto?"
              style={styles.input}
              value={troco}
              onChange={(e) => setTroco(e.target.value)}
            />
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Resumo</div>

          {(Array.isArray(carrinho) ? carrinho : []).map((item, idx) => {
            const key = item?.idUnico || item?.id || `${item?.nome || 'item'}_${idx}`;
            const qtd = toNumber(item?.quantidade) || 1;
            const unit = calcItemUnitarioFinal(item);
            const adicionaisTexto = formatAdicionaisTexto(item);

            return (
              <div key={key} style={{ padding: '10px 0', borderBottom: '1px dashed #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: '#0F3460', fontSize: '14px' }}>{qtd}x {item?.nome}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Unit: R$ {unit.toFixed(2)}
                    </div>
                    {!!adicionaisTexto && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748B' }}>{adicionaisTexto}</div>
                    )}
                  </div>
                  <div style={{ fontWeight: '800', color: '#0F3460', fontSize: '14px' }}>
                    R$ {(unit * qtd).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Subtotal</span>
              <b>R$ {subtotal.toFixed(2)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Taxa de entrega</span>
              <b>R$ {taxa.toFixed(2)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '8px' }}>
              <span>Total</span>
              <b style={{ color: '#10B981' }}>R$ {total.toFixed(2)}</b>
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F3460', marginBottom: '12px' }}>
                Observações
              </div>
              <textarea
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '90px', resize: 'vertical' }}
                placeholder="Ex: sem cebola, ponto da carne, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <button
              onClick={handleEnviarPedido}
              style={{ ...styles.btnFinal, opacity: enviando ? 0.75 : 1 }}
              disabled={enviando || (Array.isArray(carrinho) ? carrinho.length === 0 : true)}
              type="button"
            >
              {enviando ? (
                <>
                  <Loader2 size={20} className="spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Confirmar Pedido
                </>
              )}
            </button>

            <div style={{ marginTop: '10px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
              Ao confirmar, o pedido será enviado para o restaurante.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default EnviarPedido;
