// EnviarPedido.jsx (ATUALIZADO) — cole e substitua o arquivo todo
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, CheckCircle, CreditCard, DollarSign, MapPin, Loader2,
  Shield, Package, AlertCircle, Home
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, getDoc } from 'firebase/firestore';

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(v));

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

// ✅ detalha adicionais (linhas) com valor (e multiplicando pela quantidade do item)
const getAdicionaisLinhas = (item, qtdItem) => {
  const grupos = Array.isArray(item?.escolhas) ? item.escolhas : [];
  const linhas = [];

  grupos.forEach((g) => {
    (g?.itens || []).forEach((op) => {
      const nome = String(op?.nome || 'Adicional');
      const qtdOp = toNumber(op?.qtd || 1);
      const preco = toNumber(op?.preco);
      const totalUnit = preco * qtdOp;           // por 1 lanche
      const totalFinal = totalUnit * qtdItem;    // pelo total de lanches

      if (totalFinal > 0) {
        linhas.push({
          nome,
          qtdOp,
          preco,
          totalFinal,
          totalUnit
        });
      }
    });
  });

  return linhas;
};

const formatAdicionaisTexto = (item) => {
  const grupos = Array.isArray(item?.escolhas) ? item.escolhas : [];
  const linhas = [];

  grupos.forEach(g => {
    const nomeGrupo = g?.grupoNome || 'Adicionais';
    const itens = (g?.itens || []).map(op => {
      const p = toNumber(op?.preco);
      const qtd = op?.qtd || 1;
      return `${qtd > 1 ? qtd + 'x ' : ''}${op?.nome}${p > 0 ? ` (${formatBRL(p)}${qtd > 1 ? ` c/u` : ''})` : ''}`;
    });
    if (itens.length) linhas.push(`${nomeGrupo}: ${itens.join(', ')}`);
  });

  return linhas.join(' | ');
};

// Mapeia ícones por grupo
const grupoUI = {
  dinheiro_pix: { tituloFallback: '💰 Dinheiro e Pix', icon: <DollarSign size={24} /> },
  credito: { tituloFallback: '💳 Cartão de Crédito', icon: <CreditCard size={24} /> },
  debito: { tituloFallback: '💳 Cartão de Débito', icon: <CreditCard size={24} /> },
  vr: { tituloFallback: '🟢 Vale Refeição (VR)', icon: <CreditCard size={24} /> },
  va: { tituloFallback: '🔵 Vale Alimentação (VA)', icon: <CreditCard size={24} /> }
};

const EnviarPedido = ({ estabelecimento, carrinho, dadosCliente, onVoltar, onSucesso }) => {
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [troco, setTroco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [idDocPedido, setIdDocPedido] = useState(null);
  const [pedidoRealTime, setPedidoRealTime] = useState(null);
  const [etapa, setEtapa] = useState('pagamento');

  // ✅ configs do estabelecimento
  const [pagamentosConfig, setPagamentosConfig] = useState(null);
  const [bairrosEntrega, setBairrosEntrega] = useState([]);
  const [bairroSelecionado, setBairroSelecionado] = useState('');
  const [freteSelecionado, setFreteSelecionado] = useState(null);

  const estabId = useMemo(
    () => estabelecimento?.id || estabelecimento?.restauranteId || estabelecimento?.uid || null,
    [estabelecimento]
  );

  const estabNome = useMemo(
    () => estabelecimento?.cliente || estabelecimento?.nome || 'Restaurante',
    [estabelecimento]
  );

  // Realtime do pedido (status)
  useEffect(() => {
    if (!idDocPedido) return;
    const unsub = onSnapshot(doc(db, "Pedidos", idDocPedido), (docSnap) => {
      if (docSnap.exists()) setPedidoRealTime(docSnap.data());
    });
    return () => unsub();
  }, [idDocPedido]);

  // ✅ Buscar pagamentos e bairros do estabelecimento
  useEffect(() => {
    const run = async () => {
      if (!estabId) return;

      try {
        const pagRef = doc(db, 'estabelecimentos', estabId, 'configuracoes', 'pagamentos');
        const pagSnap = await getDoc(pagRef);
        if (pagSnap.exists()) setPagamentosConfig(pagSnap.data());
        else setPagamentosConfig(null);

        const entRef = doc(db, 'estabelecimentos', estabId, 'configuracao', 'entrega');
        const entSnap = await getDoc(entRef);
        const entData = entSnap.exists() ? entSnap.data() : null;
        const bairros = Array.isArray(entData?.bairros) ? entData.bairros : [];
        setBairrosEntrega(bairros);

        const bairroCliente = String(dadosCliente?.bairro || '').trim().toLowerCase();
        const encontrado =
          bairros.find(b => String(b?.chave || '').toLowerCase() === bairroCliente) ||
          bairros.find(b => String(b?.nome || '').trim().toLowerCase() === bairroCliente);

        if (encontrado?.chave) {
          setBairroSelecionado(String(encontrado.chave));
          setFreteSelecionado(toNumber(encontrado.valor));
        } else {
          setBairroSelecionado('');
          setFreteSelecionado(null);
        }
      } catch (e) {
        console.error('Erro ao buscar configs do estabelecimento:', e);
        setPagamentosConfig(null);
        setBairrosEntrega([]);
        setBairroSelecionado('');
        setFreteSelecionado(null);
      }
    };
    run();
  }, [estabId, dadosCliente?.bairro]);

  // ✅ Montar lista de pagamentos aceitos (somente ativos)
  const pagamentosAceitos = useMemo(() => {
    const cfg = pagamentosConfig?.config;
    if (!cfg || typeof cfg !== 'object') return [];

    const grupos = Object.keys(cfg);
    const lista = [];

    grupos.forEach((gKey) => {
      const grupo = cfg[gKey];
      if (!grupo) return;

      const grupoAtivo = grupo?.ativo;
      const opcoes = Array.isArray(grupo?.opcoes) ? grupo.opcoes : [];
      const titulo = grupo?.titulo || grupoUI[gKey]?.tituloFallback || gKey;

      const opcoesAtivas = opcoes.filter(o => o?.ativo);
      if (!opcoesAtivas.length) return;
      if (grupoAtivo === false) return;

      lista.push({
        grupoKey: gKey,
        titulo,
        opcoes: opcoesAtivas.map(o => ({
          id: String(o?.id || ''),
          nome: String(o?.nome || ''),
          icone: String(o?.icone || '💳'),
          comissao: toNumber(o?.comissao),
        }))
      });
    });

    if (!lista.length) {
      return [
        {
          grupoKey: 'dinheiro_pix',
          titulo: '💰 Dinheiro e Pix',
          opcoes: [
            { id: 'pix', nome: 'Pix', icone: '💎', comissao: 0 },
            { id: 'dinheiro', nome: 'Dinheiro', icone: '💵', comissao: 0 }
          ]
        }
      ];
    }

    return lista;
  }, [pagamentosConfig]);

  // ✅ Garante que o método selecionado exista
  useEffect(() => {
    const allIds = pagamentosAceitos.flatMap(g => g.opcoes.map(o => o.id));
    if (!allIds.length) return;

    if (!allIds.includes(metodoPagamento)) {
      setMetodoPagamento(allIds[0]);
      setTroco('');
    }
  }, [pagamentosAceitos]); // eslint-disable-line react-hooks/exhaustive-deps

  const metodoSelecionadoInfo = useMemo(() => {
    for (const g of pagamentosAceitos) {
      const opt = g.opcoes.find(o => o.id === metodoPagamento);
      if (opt) return { grupoKey: g.grupoKey, grupoTitulo: g.titulo, ...opt };
    }
    return { grupoKey: 'dinheiro_pix', grupoTitulo: 'Pagamento', id: metodoPagamento, nome: metodoPagamento, icone: '💳', comissao: 0 };
  }, [pagamentosAceitos, metodoPagamento]);

  const isDinheiro = metodoSelecionadoInfo?.id === 'dinheiro';

  const calcularSubtotal = () =>
    (Array.isArray(carrinho) ? carrinho : []).reduce((total, item) => {
      const qtd = toNumber(item?.quantidade) || 1;
      return total + (calcItemUnitarioFinal(item) * qtd);
    }, 0);

  const taxaEntregaAtual = useMemo(() => {
    if (freteSelecionado != null) return toNumber(freteSelecionado);
    return toNumber(estabelecimento?.taxaEntrega);
  }, [freteSelecionado, estabelecimento?.taxaEntrega]);

  const calcularTotal = () => calcularSubtotal() + taxaEntregaAtual;

  const handleSelecionarBairro = (chave) => {
    setBairroSelecionado(chave);
    const b = (bairrosEntrega || []).find(x => String(x?.chave || '') === String(chave));
    setFreteSelecionado(b ? toNumber(b.valor) : null);
  };

  const handleEnviarPedido = async () => {
    if (Array.isArray(bairrosEntrega) && bairrosEntrega.length > 0 && !bairroSelecionado) {
      alert('Selecione seu bairro para calcular o frete.');
      return;
    }

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

      const subtotal = calcularSubtotal();
      const frete = taxaEntregaAtual;
      const total = subtotal + frete;

      const bairroObj = (bairrosEntrega || []).find(b => String(b?.chave || '') === String(bairroSelecionado));
      const bairroNome = bairroObj?.nome || dadosCliente?.bairro || '';

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

        entrega: {
          modo: (bairrosEntrega?.length ? 'bairro' : 'fixo'),
          bairroSelecionado: bairroSelecionado ? { chave: bairroSelecionado, nome: bairroNome } : null,
          frete: frete
        },

        pagamento: {
          metodo: metodoSelecionadoInfo?.id || metodoPagamento,
          metodoLabel: metodoSelecionadoInfo?.nome || metodoPagamento,
          grupo: metodoSelecionadoInfo?.grupoKey || 'pagamento',
          grupoLabel: metodoSelecionadoInfo?.grupoTitulo || 'Pagamento',
          comissao: toNumber(metodoSelecionadoInfo?.comissao),
          troco: isDinheiro ? (troco || "") : "",
          subtotal: subtotal,
          taxaEntrega: frete,
          total: total
        },

        observacoes: observacoes || "",
        status: 'pendente',
        dataCriacao: serverTimestamp(),
        tempoEstimado: estabelecimento?.tempoEntrega || 30,
        taxaEntrega: frete
      };

      const docRef = await addDoc(collection(db, "Pedidos"), dadosDoPedido);
      setIdDocPedido(docRef.id);
      setPedidoEnviado(true);
      setEtapa('sucesso');

      if (typeof onSucesso === 'function') onSucesso();

      // WhatsApp (mantive)
      const linhasItens = itensFormatados.map(item => {
        const adicionaisTxt = item?.adicionaisTexto ? `\n   + ${item.adicionaisTexto}` : '';
        return `• ${item.quantidade}x ${item.nome} - ${formatBRL(item.precoTotal)}${adicionaisTxt}`;
      }).join('\n');

      const msg =
`*🎉 NOVO PEDIDO #${numero}*

*Cliente:* ${dadosCliente.nomeCompleto}
*Telefone:* ${dadosCliente.telefone}

*📍 ENDEREÇO:*
${dadosCliente.rua}, ${dadosCliente.numero}
${dadosCliente.bairro}${bairroNome ? ` (Frete por bairro: ${bairroNome})` : ''}, ${dadosCliente.cidade}
${dadosCliente.complemento ? `Complemento: ${dadosCliente.complemento}` : ''}
${dadosCliente.referencia ? `Referência: ${dadosCliente.referencia}` : ''}

*💳 PAGAMENTO:*
${metodoSelecionadoInfo?.icone || '💳'} ${metodoSelecionadoInfo?.nome || metodoPagamento} (${metodoSelecionadoInfo?.grupoTitulo || 'Pagamento'})
${isDinheiro && troco ? `Troco para: ${formatBRL(troco)}` : ''}

*🧾 RESUMO:*
Subtotal (lanches): ${formatBRL(subtotal)}
Frete: ${formatBRL(frete)}
*TOTAL:* ${formatBRL(total)}

*📦 ITENS:*
${linhasItens}

${observacoes ? `\n*📝 OBSERVAÇÕES:*\n${observacoes}` : ''}`;

      const tel = normalizeWhatsApp(estabelecimento?.whatsapp);
      if (tel) {
        setTimeout(() => {
          window.open(
            `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
            '_blank'
          );
        }, 1200);
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
    input: {
      width: '100%',
      padding: '16px',
      borderRadius: '14px',
      border: '2px solid #E2E8F0',
      marginTop: '10px',
      boxSizing: 'border-box',
      fontSize: '16px',
      outline: 'none'
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
      outline: 'none'
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
      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
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
    },
    alerta: {
      padding: '14px',
      background: '#FEF3C7',
      border: '1px solid #F59E0B',
      borderRadius: '14px',
      color: '#92400E',
      fontSize: '14px',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      marginTop: '12px'
    },
    grupoBox: {
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: '14px',
      marginBottom: '12px',
      background: '#fff'
    },
    grupoTitulo: {
      fontWeight: '900',
      color: '#0F3460',
      marginBottom: '10px',
      fontSize: '14px'
    },
    opcoesRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    },
    opcaoBtn: (ativo) => ({
      border: ativo ? '2px solid #10B981' : '1px solid #E2E8F0',
      background: ativo ? '#F0FDF4' : '#F8FAFC',
      borderRadius: '14px',
      padding: '10px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '800',
      color: '#0F3460',
      fontSize: '13px'
    }),
    select: {
      width: '100%',
      padding: '14px',
      borderRadius: '14px',
      border: '2px solid #E2E8F0',
      background: 'white',
      fontSize: '15px',
      fontWeight: '700',
      color: '#0F3460',
      outline: 'none'
    },

    // ✅ linhas de adicional (visual)
    adicionalLinha: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '13px',
      color: '#64748B',
      padding: '6px 0'
    },
    adicionalNome: { display: 'flex', alignItems: 'center', gap: '8px' },
    pill: {
      fontSize: '11px',
      fontWeight: '800',
      background: '#F1F5F9',
      color: '#0F3460',
      padding: '3px 10px',
      borderRadius: '999px'
    }
  };

  // tela de sucesso (igual)
  if (pedidoEnviado && etapa === 'sucesso') {
    const status = pedidoRealTime?.status || 'pendente';
    const statusConfig = {
      pendente: { title: 'Aguardando Restaurante...', message: 'Seu pedido foi enviado e está aguardando confirmação.', color: '#F59E0B', icon: '⏳' },
      preparo: { title: 'O restaurante aceitou seu pedido!', message: 'Sua comida está sendo preparada com carinho.', color: '#3B82F6', icon: '👨‍🍳' },
      entrega: { title: 'Seu pedido saiu para entrega!', message: 'O entregador está a caminho com sua refeição.', color: '#8B5CF6', icon: '🚚' },
      entregue: { title: 'Pedido Entregue! Aproveite!', message: 'Seu pedido foi entregue com sucesso. Bom apetite!', color: '#10B981', icon: '✅' },
      cancelado: { title: 'Pedido cancelado', message: 'Seu pedido foi cancelado. Entre em contato para mais informações.', color: '#EF4444', icon: '❌' }
    };
    const currentStatus = statusConfig[status] || statusConfig.pendente;

    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <ArrowLeft onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', flex: 1 }}>Acompanhar Pedido</h2>
        </header>

        <div style={styles.content}>
          <div style={{ ...styles.section, textAlign: 'center', border: `3px solid ${currentStatus.color}40` }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'white', fontSize: '36px', fontWeight: 'bold'
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
          </div>

          <div style={styles.section}>
            <div style={{ marginTop: '20px', padding: '20px', background: '#F8FAFC', borderRadius: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A5568', marginBottom: '12px' }}>
                Detalhes do Pedido
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
                <div><b>Restaurante:</b> {pedidoRealTime?.restauranteNome || pedidoRealTime?.estabelecimentoNome || '-'}</div>
                <div><b>Pagamento:</b> {pedidoRealTime?.pagamento?.metodoLabel || pedidoRealTime?.pagamento?.metodo || '-'}</div>
                <div><b>Frete:</b> {formatBRL(pedidoRealTime?.pagamento?.taxaEntrega)}</div>
                <div><b>Total:</b> {formatBRL(pedidoRealTime?.pagamento?.total ?? 0)}</div>
                <div><b>Tempo estimado:</b> {pedidoRealTime?.tempoEstimado || 30} minutos</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            style={{ ...styles.btnFinal, background: 'linear-gradient(135deg, #0F3460 0%, #1E40AF 100%)', marginTop: '10px' }}
          >
            <Home size={20} />
            Voltar ao Início
          </button>

          <div style={{
            marginTop: '20px', padding: '20px', background: '#F0FDF4',
            borderRadius: '16px', border: '1px solid #A7F3D0', textAlign: 'center'
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
      </div>
    );
  }

  const subtotal = calcularSubtotal();
  const taxa = taxaEntregaAtual;
  const total = calcularTotal();

  const bairroNomeSelecionado = useMemo(() => {
    const b = (bairrosEntrega || []).find(x => String(x?.chave || '') === String(bairroSelecionado));
    return b?.nome || '';
  }, [bairrosEntrega, bairroSelecionado]);

  const precisaSelecionarBairro = Array.isArray(bairrosEntrega) && bairrosEntrega.length > 0;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <ArrowLeft onClick={onVoltar} style={{ cursor: 'pointer' }} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', flex: 1 }}>Finalizar Pedido</h2>
        <div style={{
          padding: '6px 12px', background: 'rgba(255,255,255,0.15)',
          borderRadius: '20px', fontSize: '12px', fontWeight: '700'
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
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F3460' }}>
                {dadosCliente?.nomeCompleto}
              </div>
              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                📱 {dadosCliente?.telefone}
              </div>
            </div>
            <div style={{
              padding: '8px 16px', background: '#F0FDF4', color: '#065F46',
              borderRadius: '20px', fontSize: '12px', fontWeight: '800'
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
            </div>

            {precisaSelecionarBairro && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#0F3460', marginBottom: '10px' }}>
                  Selecione seu bairro para calcular o frete
                </div>
                <select
                  value={bairroSelecionado}
                  onChange={(e) => handleSelecionarBairro(e.target.value)}
                  style={styles.select}
                >
                  <option value="">— Selecione —</option>
                  {bairrosEntrega.map((b, idx) => (
                    <option key={`${b?.chave || idx}`} value={String(b?.chave || '')}>
                      {String(b?.nome || b?.chave || 'Bairro')} • {formatBRL(b?.valor)}
                    </option>
                  ))}
                </select>

                {!bairroSelecionado && (
                  <div style={styles.alerta}>
                    <AlertCircle size={18} />
                    <div>Se você não selecionar o bairro, não conseguimos calcular o frete corretamente.</div>
                  </div>
                )}

                {bairroSelecionado && (
                  <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '800', color: '#065F46' }}>
                    ✅ Frete para {bairroNomeSelecionado || bairroSelecionado}: {formatBRL(freteSelecionado)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <CreditCard size={20} color="#10B981" /> Formas de Pagamento aceitas por {estabNome}
          </div>

          {pagamentosAceitos.map((g) => (
            <div key={g.grupoKey} style={styles.grupoBox}>
              <div style={styles.grupoTitulo}>{g.titulo}</div>
              <div style={styles.opcoesRow}>
                {g.opcoes.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => { setMetodoPagamento(op.id); setTroco(''); }}
                    style={styles.opcaoBtn(metodoPagamento === op.id)}
                  >
                    <span style={{ fontSize: '16px' }}>{op.icone || '💳'}</span>
                    <span>{op.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {isDinheiro && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4A5568', marginBottom: '8px' }}>
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
                <div style={styles.alerta}>
                  <AlertCircle size={18} />
                  <div>Troco estimado: <b>{formatBRL(toNumber(troco) - total)}</b></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ RESUMO DO PEDIDO (DETALHADO COMO VOCÊ QUER) */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <Package size={20} color="#10B981" /> Resumo do Pedido
          </div>

          {(Array.isArray(carrinho) ? carrinho : []).map((item, idx) => {
            const key = item?.idUnico || item?.id || `${item?.nome || 'item'}_${idx}`;
            const qtd = toNumber(item?.quantidade) || 1;

            const baseUnit = toNumber(item?.precoBaseUnitario ?? item?.preco); // ✅ preço normal
            const baseTotal = baseUnit * qtd;

            const adicionaisLinhas = getAdicionaisLinhas(item, qtd);
            const adicionaisTotal = adicionaisLinhas.reduce((acc, a) => acc + toNumber(a.totalFinal), 0);

            const itemSubtotal = baseTotal + adicionaisTotal;

            return (
              <div key={key} style={{ padding: '16px 0', borderBottom: '1px dashed #E2E8F0' }}>
                {/* Linha principal: 1x Nome — base */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '900', color: '#0F3460', fontSize: '16px' }}>
                      {qtd}x {item?.nome}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748B' }}>
                      Preço do lanche: <b>{formatBRL(baseUnit)}</b>
                      {qtd > 1 ? <span style={{ marginLeft: 8, ...styles.pill }}>x{qtd}</span> : null}
                    </div>
                  </div>

                  <div style={{ fontWeight: '900', color: '#0F3460', fontSize: '16px', whiteSpace: 'nowrap' }}>
                    {formatBRL(baseTotal)}
                  </div>
                </div>

                {/* Adicionais */}
                {adicionaisLinhas.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Adicionais
                    </div>

                    {adicionaisLinhas.map((a, i) => (
                      <div key={i} style={styles.adicionalLinha}>
                        <div style={styles.adicionalNome}>
                          <span style={{ color: '#10B981', fontWeight: '900' }}>+</span>
                          <span>
                            {a.qtdOp > 1 ? `${a.qtdOp}x ` : ''}{a.nome}
                            {qtd > 1 ? <span style={{ marginLeft: 8, ...styles.pill }}>x{qtd}</span> : null}
                          </span>
                        </div>
                        <b style={{ color: '#0F3460' }}>{formatBRL(a.totalFinal)}</b>
                      </div>
                    ))}

                    <div style={{ ...styles.adicionalLinha, borderTop: '1px dashed #E2E8F0', marginTop: '8px', paddingTop: '10px' }}>
                      <span style={{ fontWeight: '800', color: '#4A5568' }}>Subtotal do item</span>
                      <span style={{ fontWeight: '900', color: '#0F3460' }}>{formatBRL(itemSubtotal)}</span>
                    </div>
                  </div>
                )}

                {/* Se não tiver adicionais, mostra o subtotal simples do item */}
                {adicionaisLinhas.length === 0 && (
                  <div style={{ ...styles.adicionalLinha, marginTop: '10px' }}>
                    <span style={{ fontWeight: '800', color: '#4A5568' }}>Subtotal do item</span>
                    <span style={{ fontWeight: '900', color: '#0F3460' }}>{formatBRL(itemSubtotal)}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Totais */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #E2E8F0' }}>
            <div style={styles.resumoLinha}>
              <span>Subtotal (lanches)</span>
              <b>{formatBRL(subtotal)}</b>
            </div>

            <div style={styles.resumoLinha}>
              <span>Frete {bairroNomeSelecionado ? `(${bairroNomeSelecionado})` : ''}</span>
              <b style={{ color: taxa === 0 ? '#10B981' : '#4A5568' }}>
                {taxa > 0 ? formatBRL(taxa) : 'Grátis'}
              </b>
            </div>

            <div style={styles.resumoTotal}>
              <span>TOTAL</span>
              <b style={{ color: '#10B981', fontSize: '24px' }}>{formatBRL(total)}</b>
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
            disabled={
              enviando ||
              (Array.isArray(carrinho) ? carrinho.length === 0 : true) ||
              (precisaSelecionarBairro && !bairroSelecionado)
            }
            type="button"
          >
            {enviando ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Enviando Pedido...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Confirmar Pedido • {formatBRL(total)}
              </>
            )}
          </button>

          {(precisaSelecionarBairro && !bairroSelecionado) && (
            <div style={styles.alerta}>
              <AlertCircle size={18} />
              <div><b>Antes de confirmar:</b> selecione o bairro para calcular o frete.</div>
            </div>
          )}

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
            Ao confirmar, o pedido será enviado para {estabNome} e você será redirecionado para acompanhar o status.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default EnviarPedido;
