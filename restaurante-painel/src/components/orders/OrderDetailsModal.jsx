import React from 'react';
import { 
  FaTimes, 
  FaUser, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaCreditCard,
  FaClock,
  FaUtensils,
  FaMotorcycle,
  FaCheckCircle,
  FaPrint,
  FaWhatsapp
} from 'react-icons/fa';
import '../../styles/Orders.css';

const OrderDetailsModal = ({ order, onClose, onStatusUpdate }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { 
          icon: <FaClock />, 
          text: 'Aguardando Preparo', 
          color: '#f6ad55',
          nextStatus: 'preparing',
          nextText: 'Iniciar Preparo'
        };
      case 'preparing':
        return { 
          icon: <FaUtensils />, 
          text: 'Em Preparo', 
          color: '#4299e1',
          nextStatus: 'out_for_delivery',
          nextText: 'Saiu para Entrega'
        };
      case 'out_for_delivery':
        return { 
          icon: <FaMotorcycle />, 
          text: 'Saiu para Entrega', 
          color: '#9f7aea',
          nextStatus: 'delivered',
          nextText: 'Marcar como Entregue'
        };
      case 'delivered':
        return { 
          icon: <FaCheckCircle />, 
          text: 'Entregue', 
          color: '#48bb78'
        };
      case 'cancelled':
        return { 
          icon: <FaTimes />, 
          text: 'Cancelado', 
          color: '#f56565'
        };
      default:
        return { 
          icon: <FaClock />, 
          text: status, 
          color: '#a0aec0'
        };
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'credit_card': return <FaCreditCard />;
      case 'debit_card': return <FaCreditCard />;
      case 'cash': return <FaMoneyBillWave />;
      case 'pix': return <FaMoneyBillWave />; // Usar FaMoneyBillWave para PIX
      default: return <FaCreditCard />;
    }
  };

  const getPaymentText = (method) => {
    switch (method) {
      case 'credit_card': return 'Cartão de Crédito';
      case 'debit_card': return 'Cartão de Débito';
      case 'cash': return 'Dinheiro';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (date) => {
    if (!date) return 'Não informado';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePreparationTime = () => {
    if (!order.createdAt) return 'Não calculado';
    
    const created = new Date(order.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutos`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const phone = order.customer?.phone?.replace(/\D/g, '');
    const message = `Olá ${order.customer?.name}, seu pedido #${order.orderNumber} está ${getStatusInfo(order.status).text.toLowerCase()}.`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header do Modal */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>Pedido #{order.orderNumber}</h2>
            <div className="order-status-badge" style={{ backgroundColor: statusInfo.color }}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          {/* Informações do Cliente */}
          <div className="detail-section">
            <h3 className="section-title">
              <FaUser />
              Informações do Cliente
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Nome:</span>
                <span className="detail-value">{order.customer?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Telefone:</span>
                <span className="detail-value">{order.customer?.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Endereço:</span>
                <span className="detail-value">{order.customer?.address}</span>
              </div>
              {order.customer?.complement && (
                <div className="detail-item">
                  <span className="detail-label">Complemento:</span>
                  <span className="detail-value">{order.customer.complement}</span>
                </div>
              )}
              {order.customer?.neighborhood && (
                <div className="detail-item">
                  <span className="detail-label">Bairro:</span>
                  <span className="detail-value">{order.customer.neighborhood}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="detail-section">
            <h3 className="section-title">Itens do Pedido</h3>
            <div className="items-table">
              <div className="table-header">
                <div className="table-cell">Item</div>
                <div className="table-cell">Quantidade</div>
                <div className="table-cell">Preço Unit.</div>
                <div className="table-cell">Total</div>
              </div>
              {order.items?.map((item, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell item-name">{item.name}</div>
                  <div className="table-cell">{item.quantity}x</div>
                  <div className="table-cell">{formatCurrency(item.price)}</div>
                  <div className="table-cell">{formatCurrency(item.total)}</div>
                </div>
              ))}
              <div className="table-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>Taxa de Entrega:</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Pagamento */}
          <div className="detail-section">
            <h3 className="section-title">
              {getPaymentIcon(order.paymentMethod)}
              Informações de Pagamento
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Método:</span>
                <span className="detail-value">{getPaymentText(order.paymentMethod)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valor Total:</span>
                <span className="detail-value">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Informações do Pedido */}
          <div className="detail-section">
            <h3 className="section-title">Informações do Pedido</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Data/Hora:</span>
                <span className="detail-value">{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tempo de Preparo:</span>
                <span className="detail-value">{calculatePreparationTime()}</span>
              </div>
              {order.deliveredAt && (
                <div className="detail-item">
                  <span className="detail-label">Entregue em:</span>
                  <span className="detail-value">{formatDateTime(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {order.notes && (
            <div className="detail-section">
              <h3 className="section-title">Observações</h3>
              <div className="notes-box">
                <p>{order.notes}</p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="actions-section">
            <div className="action-buttons">
              <button className="action-button whatsapp-button" onClick={handleWhatsApp}>
                <FaWhatsapp />
                WhatsApp
              </button>
              <button className="action-button print-button" onClick={handlePrint}>
                <FaPrint />
                Imprimir
              </button>
              
              {statusInfo.nextStatus && (
                <button 
                  className="action-button update-button"
                  onClick={() => {
                    onStatusUpdate(order.id, statusInfo.nextStatus);
                    onClose();
                  }}
                  style={{ backgroundColor: statusInfo.color }}
                >
                  {statusInfo.nextText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;