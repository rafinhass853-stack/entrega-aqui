import React from 'react';

const NotificacaoPedido = ({ isOpen, pedido, onAceitar, onRecusar, calcularTempo }) => {
  if (!isOpen || !pedido) return null;

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
              <span style={styles.clienteNome}>{pedido.cliente?.nome || 'Cliente'}</span>
              <span style={styles.clienteTelefone}>📞 {pedido.cliente?.telefone || 'Sem telefone'}</span>
            </div>
            <div style={styles.pedidoNumeroModal}>
              PEDIDO #{pedido.id.slice(-6).toUpperCase()}
            </div>
          </div>

          <div style={styles.enderecoModal}>
            <span style={styles.enderecoIcon}>📍</span>
            <div>
              <div style={styles.enderecoTexto}>
                {pedido.cliente?.endereco?.rua || 'Rua'}, {pedido.cliente?.endereco?.numero || 'N/A'}
              </div>
              <div style={styles.enderecoBairro}>
                {pedido.cliente?.endereco?.bairro || 'Bairro'}
              </div>
            </div>
          </div>

          <div style={styles.itensModal}>
            <h4 style={styles.tituloItens}>ITENS DO PEDIDO:</h4>
            <div style={styles.listaItens}>
              {pedido.itens?.map((item, idx) => (
                <div key={idx} style={styles.itemModal}>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemQuantidade}>{item.quantidade}x</span>
                    <span style={styles.itemNome}>{item.nome}</span>
                  </div>
                  <span style={styles.itemPreco}>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.observacoesModal}>
            <strong>Observações:</strong>
            <p style={styles.observacaoTexto}>
              {pedido.observacoes || 'Nenhuma observação adicional'}
            </p>
          </div>

          <div style={styles.totalModal}>
            <span>TOTAL DO PEDIDO:</span>
            <span style={styles.valorTotalModal}>R$ {pedido.total?.toFixed(2) || '0,00'}</span>
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
            ⏰ Recebido há {calcularTempo(pedido.dataCriacao)}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalNovoPedido: { backgroundColor: '#00171A', width: '90%', maxWidth: '500px', borderRadius: '15px', border: '2px solid #4FD1C5', overflow: 'hidden' },
  modalHeaderNovoPedido: { background: 'linear-gradient(90deg, #4FD1C5 0%, #38B2AC 100%)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tituloNovoPedido: { display: 'flex', alignItems: 'center', gap: '15px' },
  emojiNovoPedido: { fontSize: '30px' },
  tituloModal: { color: '#00171A', margin: 0, fontSize: '20px', fontWeight: 'bold' },
  badgeNovoPedido: { backgroundColor: '#00171A', color: '#4FD1C5', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  pedidoDetalhesModal: { padding: '20px' },
  infoClienteModal: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  clienteNome: { color: '#fff', fontSize: '18px', fontWeight: 'bold', display: 'block' },
  clienteTelefone: { color: '#81E6D9', fontSize: '14px' },
  pedidoNumeroModal: { backgroundColor: 'rgba(79, 209, 197, 0.1)', color: '#4FD1C5', padding: '5px 10px', borderRadius: '8px', fontSize: '12px' },
  enderecoModal: { display: 'flex', gap: '10px', marginBottom: '20px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px' },
  enderecoIcon: { color: '#4FD1C5' },
  enderecoTexto: { color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  enderecoBairro: { color: '#CBD5E0', fontSize: '12px' },
  itensModal: { marginBottom: '20px' },
  tituloItens: { color: '#81E6D9', fontSize: '14px', marginBottom: '10px' },
  listaItens: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px', maxHeight: '150px', overflowY: 'auto' },
  itemModal: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  itemInfo: { display: 'flex', gap: '10px' },
  itemQuantidade: { color: '#F6E05E', fontWeight: 'bold' },
  itemNome: { color: '#fff' },
  itemPreco: { color: '#4FD1C5' },
  observacoesModal: { padding: '10px', backgroundColor: 'rgba(245, 101, 101, 0.1)', borderRadius: '10px', marginBottom: '20px' },
  observacaoTexto: { color: '#fff', fontSize: '13px' },
  totalModal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'rgba(79, 209, 197, 0.1)', borderRadius: '10px', marginBottom: '20px' },
  valorTotalModal: { color: '#4FD1C5', fontSize: '22px', fontWeight: 'bold' },
  acoesModal: { display: 'flex', gap: '10px' },
  btnAceitarModal: { flex: 2, backgroundColor: '#48BB78', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnRecusarModal: { flex: 1, backgroundColor: '#F56565', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  tempoEstimado: { textAlign: 'center', color: '#718096', fontSize: '12px', marginTop: '15px' }
};

export default NotificacaoPedido;