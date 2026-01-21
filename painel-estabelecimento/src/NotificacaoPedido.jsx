import React from 'react';

const NotificacaoPedido = ({ isOpen, pedido, onAceitar, onRecusar, calcularTempo }) => {
  if (!isOpen || !pedido) return null;

  // Extração segura dos dados baseada no Firebase
  const { cliente, pagamento, itens, numeroPedido, dataCriacao, observacoes } = pedido;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalNovoPedido}>
        <div style={styles.modalHeaderNovoPedido}>
          <div style={styles.tituloNovoPedido}>
            <span style={styles.emojiNovoPedido}>🎉</span>
            <h2 style={styles.tituloModal}>NOVO PEDIDO RECEBIDO!</h2>
          </div>
          <div style={styles.badgeNovoPedido}>AGORA</div>
        </div>

        <div style={styles.pedidoDetalhesModal}>
          <div style={styles.infoClienteModal}>
            <div style={styles.clienteInfo}>
              <span style={styles.clienteNome}>{cliente?.nomeCompleto || 'Cliente'}</span>
              <span style={styles.clienteTelefone}>📞 {cliente?.telefone || 'Sem telefone'}</span>
            </div>
            <div style={styles.pedidoNumeroModal}>
              PEDIDO #{numeroPedido || '------'}
            </div>
          </div>

          <div style={styles.enderecoModal}>
            <span style={styles.enderecoIcon}>📍</span>
            <div>
              <div style={styles.enderecoTexto}>
                {cliente?.rua || 'Rua não informada'}, {cliente?.numero || 'S/N'}
              </div>
              <div style={styles.enderecoBairro}>
                {cliente?.bairro} - {cliente?.cidade}
              </div>
              {cliente?.complemento && (
                <div style={styles.enderecoComplemento}>
                  <strong>Obs:</strong> {cliente.complemento}
                </div>
              )}
            </div>
          </div>

          <div style={styles.itensModal}>
            <h4 style={styles.tituloItens}>ITENS DO PEDIDO:</h4>
            <div style={styles.listaItens}>
              {itens?.map((item, idx) => (
                <div key={idx} style={styles.itemModal}>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemQuantidade}>{item.quantidade}x</span>
                    <span style={styles.itemNome}>{item.nome}</span>
                  </div>
                  <span style={styles.itemPreco}>
                    R$ {(item.preco * item.quantidade).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Observações */}
          <div style={styles.observacoesModal}>
            <strong>Observações do Pedido:</strong>
            <p style={styles.observacaoTexto}>
              {observacoes || 'Nenhuma observação adicional'}
            </p>
          </div>

          {/* Detalhes de Pagamento e Troco */}
          <div style={styles.totalModal}>
            <div style={styles.pagamentoInfo}>
              <span style={styles.metodoPagamento}>
                FORMA: {pagamento?.metodo?.toUpperCase()}
              </span>
              {pagamento?.metodo === 'dinheiro' && pagamento?.troco && (
                <span style={styles.trocoAlerta}>
                  TROCO PARA: R$ {parseFloat(pagamento.troco).toFixed(2)}
                </span>
              )}
              <span style={styles.labelTotal}>TOTAL DO PEDIDO:</span>
            </div>
            <span style={styles.valorTotalModal}>
              R$ {pagamento?.total?.toFixed(2) || '0,00'}
            </span>
          </div>

          <div style={styles.acoesModal}>
            <button style={styles.btnRecusarModal} onClick={() => onRecusar(pedido.id)}>
              RECUSAR
            </button>
            <button style={styles.btnAceitarModal} onClick={() => onAceitar(pedido.id)}>
              ACEITAR PEDIDO
            </button>
          </div>

          <div style={styles.tempoEstimado}>
            ⏰ Recebido há {calcularTempo(dataCriacao)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos atualizados para suportar as novas informações
const styles = {
  // ... (manter estilos anteriores)
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' },
  modalNovoPedido: { backgroundColor: '#00171A', width: '100%', maxWidth: '480px', borderRadius: '15px', border: '2px solid #4FD1C5', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  modalHeaderNovoPedido: { background: 'linear-gradient(90deg, #4FD1C5 0%, #38B2AC 100%)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tituloNovoPedido: { display: 'flex', alignItems: 'center', gap: '10px' },
  emojiNovoPedido: { fontSize: '24px' },
  tituloModal: { color: '#00171A', margin: 0, fontSize: '18px', fontWeight: 'bold' },
  badgeNovoPedido: { backgroundColor: '#00171A', color: '#4FD1C5', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  pedidoDetalhesModal: { padding: '20px' },
  infoClienteModal: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'flex-start' },
  clienteNome: { color: '#fff', fontSize: '18px', fontWeight: 'bold', display: 'block' },
  clienteTelefone: { color: '#81E6D9', fontSize: '14px', marginTop: '4px', display: 'block' },
  pedidoNumeroModal: { backgroundColor: 'rgba(79, 209, 197, 0.1)', color: '#4FD1C5', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
  enderecoModal: { display: 'flex', gap: '12px', marginBottom: '15px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px' },
  enderecoIcon: { color: '#4FD1C5', fontSize: '18px' },
  enderecoTexto: { color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  enderecoBairro: { color: '#CBD5E0', fontSize: '12px' },
  enderecoComplemento: { color: '#81E6D9', fontSize: '12px', marginTop: '4px' },
  itensModal: { marginBottom: '15px' },
  tituloItens: { color: '#81E6D9', fontSize: '13px', marginBottom: '8px', letterSpacing: '1px' },
  listaItens: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px', maxHeight: '180px', overflowY: 'auto' },
  itemModal: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  itemInfo: { display: 'flex', gap: '10px', alignItems: 'center' },
  itemQuantidade: { color: '#F6E05E', fontWeight: 'bold', fontSize: '14px' },
  itemNome: { color: '#fff', fontSize: '14px' },
  itemPreco: { color: '#4FD1C5', fontSize: '14px', fontWeight: '500' },
  observacoesModal: { padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', marginBottom: '15px', borderLeft: '4px solid #F6E05E' },
  observacaoTexto: { color: '#fff', fontSize: '13px', margin: '5px 0 0 0', fontStyle: 'italic' },
  totalModal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'rgba(79, 209, 197, 0.1)', borderRadius: '10px', marginBottom: '20px' },
  pagamentoInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  metodoPagamento: { fontSize: '11px', color: '#81E6D9', fontWeight: 'bold' },
  trocoAlerta: { fontSize: '12px', color: '#F6E05E', fontWeight: 'bold' },
  labelTotal: { color: '#fff', fontSize: '14px', fontWeight: '500', marginTop: '4px' },
  valorTotalModal: { color: '#4FD1C5', fontSize: '24px', fontWeight: 'bold' },
  acoesModal: { display: 'flex', gap: '10px' },
  btnAceitarModal: { flex: 2, backgroundColor: '#48BB78', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  btnRecusarModal: { flex: 1, backgroundColor: '#F56565', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  tempoEstimado: { textAlign: 'center', color: '#718096', fontSize: '12px', marginTop: '15px' }
};

export default NotificacaoPedido;