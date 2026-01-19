import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, CreditCard, DollarSign, QrCode, Clock, MapPin, User, Phone, Smartphone } from 'lucide-react';

const EnviarPedido = ({ 
  estabelecimento, 
  carrinho, 
  dadosCliente, 
  onVoltar,
  onEnviarPedido 
}) => {
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [numeroPedido, setNumeroPedido] = useState(null);

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.preco) || 0;
      return total + (preco * item.quantidade);
    }, 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const taxaEntrega = parseFloat(estabelecimento?.taxaEntrega) || 0;
    return subtotal + taxaEntrega;
  };

  const gerarNumeroPedido = () => {
    return Math.floor(100000 + Math.random() * 900000);
  };

  const handleEnviarPedido = async () => {
    setEnviando(true);
    
    try {
      // Simular envio do pedido
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const numero = gerarNumeroPedido();
      setNumeroPedido(numero);
      setPedidoEnviado(true);
      
      // Chamar callback do pai com os dados do pedido
      const pedido = {
        numero,
        estabelecimento: estabelecimento.cliente,
        itens: carrinho,
        dadosCliente,
        metodoPagamento,
        observacoes,
        total: calcularTotal(),
        data: new Date().toISOString(),
        status: 'pendente'
      };
      
      onEnviarPedido(pedido);
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      alert('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const formatarTelefone = (telefone) => {
    return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const styles = {
    container: {
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      backgroundColor: '#0F3460',
      padding: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottomLeftRadius: '24px',
      borderBottomRightRadius: '24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer'
    },
    headerTitle: {
      color: 'white',
      margin: 0,
      fontSize: '20px',
      fontWeight: '700'
    },
    content: {
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto'
    },
    successContainer: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    successIcon: {
      color: '#10B981',
      marginBottom: '20px'
    },
    successTitle: {
      fontSize: '28px',
      fontWeight: '900',
      color: '#0F3460',
      margin: '0 0 10px 0'
    },
    successNumber: {
      fontSize: '32px',
      fontWeight: '900',
      color: '#10B981',
      margin: '0 0 20px 0'
    },
    successText: {
      fontSize: '16px',
      color: '#64748B',
      margin: '0 0 30px 0',
      lineHeight: 1.6
    },
    successButton: {
      backgroundColor: '#0F3460',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '15px 30px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
    },
    section: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0F3460',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    infoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #F1F5F9'
    },
    infoLabel: {
      fontSize: '14px',
      color: '#64748B',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0F3460'
    },
    itemList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    itemRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    itemName: {
      fontSize: '14px',
      color: '#0F3460'
    },
    itemQuantidade: {
      fontSize: '14px',
      color: '#64748B'
    },
    itemPreco: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#10B981'
    },
    metodoPagamentoContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginTop: '15px'
    },
    metodoButton: {
      padding: '15px',
      borderRadius: '12px',
      border: '2px solid #E2E8F0',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    metodoSelecionado: {
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)'
    },
    metodoIcon: {
      color: '#64748B'
    },
    metodoSelecionadoIcon: {
      color: '#10B981'
    },
    metodoLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0F3460'
    },
    textarea: {
      width: '100%',
      padding: '15px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      fontSize: '14px',
      color: '#0F3460',
      backgroundColor: '#F8FAFC',
      minHeight: '100px',
      marginTop: '15px',
      resize: 'vertical'
    },
    resumoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0'
    },
    resumoTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: '2px solid #E2E8F0'
    },
    resumoLabel: {
      fontSize: '14px',
      color: '#64748B'
    },
    resumoValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0F3460'
    },
    resumoTotalValue: {
      fontSize: '24px',
      fontWeight: '800',
      color: '#10B981'
    },
    enviarButton: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '18px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      width: '100%',
      marginTop: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      transition: 'background 0.3s ease'
    },
    enviarButtonDisabled: {
      backgroundColor: '#94A3B8',
      cursor: 'not-allowed'
    }
  };

  if (pedidoEnviado) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <h2 style={styles.headerTitle}>Pedido Confirmado</h2>
          </div>
        </header>
        <div style={styles.successContainer}>
          <CheckCircle size={80} style={styles.successIcon} />
          <h1 style={styles.successTitle}>Pedido Realizado!</h1>
          <p style={styles.successNumber}>#{numeroPedido}</p>
          <p style={styles.successText}>
            Seu pedido foi recebido pelo estabelecimento e está sendo preparado.<br />
            Você receberá atualizações sobre o status do seu pedido.
          </p>
          <button onClick={() => window.location.reload()} style={styles.successButton}>
            Fazer Novo Pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={onVoltar} style={styles.backButton}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={styles.headerTitle}>Confirmar Pedido</h2>
        </div>
      </header>

      <div style={styles.content}>
        {/* Resumo do Estabelecimento */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <MapPin size={20} />
            {estabelecimento.cliente}
          </h3>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              <Clock size={16} />
              Tempo estimado
            </span>
            <span style={styles.infoValue}>
              {estabelecimento.tempoEntrega || 25}-{estabelecimento.tempoEntrega + 10 || 35} min
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Endereço do estabelecimento</span>
            <span style={styles.infoValue}>
              {estabelecimento.endereco?.bairro || 'Vila Santana'}, {estabelecimento.endereco?.cidade || 'Araraquara'}
            </span>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <User size={20} />
            Dados para entrega
          </h3>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Nome</span>
            <span style={styles.infoValue}>{dadosCliente.nomeCompleto}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Endereço</span>
            <span style={styles.infoValue}>
              {dadosCliente.rua}, {dadosCliente.numero}
              {dadosCliente.complemento && ` - ${dadosCliente.complemento}`}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Bairro / Cidade</span>
            <span style={styles.infoValue}>
              {dadosCliente.bairro} - {dadosCliente.cidade}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              {dadosCliente.isWhatsapp ? <Smartphone size={16} /> : <Phone size={16} />}
              Telefone
            </span>
            <span style={styles.infoValue}>{formatarTelefone(dadosCliente.telefone)}</span>
          </div>
        </div>

        {/* Itens do Pedido */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Itens do pedido</h3>
          <div style={styles.itemList}>
            {carrinho.map(item => (
              <div key={item.id} style={styles.itemRow}>
                <div>
                  <span style={styles.itemName}>{item.nome}</span>
                  <span style={styles.itemQuantidade}> × {item.quantidade}</span>
                </div>
                <span style={styles.itemPreco}>
                  R$ {(parseFloat(item.preco) * item.quantidade).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Método de Pagamento */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <CreditCard size={20} />
            Método de pagamento
          </h3>
          <div style={styles.metodoPagamentoContainer}>
            <button
              onClick={() => setMetodoPagamento('dinheiro')}
              style={{
                ...styles.metodoButton,
                ...(metodoPagamento === 'dinheiro' ? styles.metodoSelecionado : {})
              }}
            >
              <DollarSign size={24} style={metodoPagamento === 'dinheiro' ? styles.metodoSelecionadoIcon : styles.metodoIcon} />
              <span style={styles.metodoLabel}>Dinheiro</span>
            </button>
            <button
              onClick={() => setMetodoPagamento('cartao')}
              style={{
                ...styles.metodoButton,
                ...(metodoPagamento === 'cartao' ? styles.metodoSelecionado : {})
              }}
            >
              <CreditCard size={24} style={metodoPagamento === 'cartao' ? styles.metodoSelecionadoIcon : styles.metodoIcon} />
              <span style={styles.metodoLabel}>Cartão</span>
            </button>
            <button
              onClick={() => setMetodoPagamento('pix')}
              style={{
                ...styles.metodoButton,
                ...(metodoPagamento === 'pix' ? styles.metodoSelecionado : {})
              }}
            >
              <QrCode size={24} style={metodoPagamento === 'pix' ? styles.metodoSelecionadoIcon : styles.metodoIcon} />
              <span style={styles.metodoLabel}>PIX</span>
            </button>
          </div>
        </div>

        {/* Observações */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Observações do pedido</h3>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Alguma observação sobre o pedido? (opcional)"
            style={styles.textarea}
          />
        </div>

        {/* Resumo do Valor */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Resumo do valor</h3>
          <div style={styles.resumoRow}>
            <span style={styles.resumoLabel}>Subtotal</span>
            <span style={styles.resumoValue}>R$ {calcularSubtotal().toFixed(2)}</span>
          </div>
          <div style={styles.resumoRow}>
            <span style={styles.resumoLabel}>Taxa de entrega</span>
            <span style={styles.resumoValue}>
              {estabelecimento.taxaEntrega > 0 ? `R$ ${Number(estabelecimento.taxaEntrega).toFixed(2)}` : 'Grátis'}
            </span>
          </div>
          <div style={styles.resumoTotal}>
            <span style={styles.resumoLabel}>Total</span>
            <span style={styles.resumoTotalValue}>R$ {calcularTotal().toFixed(2)}</span>
          </div>
        </div>

        {/* Botão de Enviar */}
        <button
          onClick={handleEnviarPedido}
          disabled={enviando}
          style={{
            ...styles.enviarButton,
            ...(enviando ? styles.enviarButtonDisabled : {})
          }}
        >
          {enviando ? 'Enviando...' : 'Confirmar e Enviar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default EnviarPedido;