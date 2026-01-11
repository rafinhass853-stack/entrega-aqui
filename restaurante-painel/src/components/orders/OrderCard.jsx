import React from 'react';
import { 
  FaClock, 
  FaUtensils, 
  FaMotorcycle, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaUser, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaCreditCard,
  FaListAlt 
} from 'react-icons/fa';
import '../../styles/Orders.css';

const OrderCard = ({ order, onStatusUpdate, onViewDetails }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { 
          icon: <FaClock />, 
          text: 'Aguardando', 
          color: '#f6ad55', 
          bgColor: '#fffaf0',
          nextStatus: 'preparing'
        };
      case 'preparing':
        return { 
          icon: <FaUtensils />, 
          text: 'Em Preparo', 
          color: '#4299e1', 
          bgColor: '#ebf8ff',
          nextStatus: 'out_for_delivery'
        };
      case 'out_for_delivery':
        return { 
          icon: <FaMotorcycle />, 
          text: 'Saiu para Entrega', 
          color: '#9f7aea', 
          bgColor: '#faf5ff',
          nextStatus: 'delivered'
        };
      case 'delivered':
        return { 
          icon: <FaCheckCircle />, 
          text: 'Entregue', 
          color: '#48bb78', 
          bgColor: '#f0fff4'
        };
      case 'cancelled':
        return { 
          icon: <FaTimesCircle />, 
          text: 'Cancelado', 
          color: '#f56565', 
          bgColor: '#fff5f5'
        };
      default:
        return { 
          icon: <FaClock />, 
          text: status, 
          color: '#a0aec0', 
          bgColor: '#f7fafc'
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

  const statusInfo = getStatusInfo(order.status);
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="order-card">
      {/* Header do Pedido */}
      <div className="order-header">
        <div className="order-info">
          <h3 className="order-number">Pedido #{order.orderNumber}</h3>
          <span className="order-time">
            {formatTime(order.createdAt)}
          </span>
        </div>
        
        <div 
          className="order-status"
          style={{ 
            backgroundColor: statusInfo.bgColor,
            color: statusInfo.color,
            borderColor: statusInfo.color
          }}
        >
          {statusInfo.icon}
          <span>{statusInfo.text}</span>
        </div>
      </div>

      {/* Informações do Cliente */}
      <div className="order-customer">
        <div className="customer-info">
          <div className="customer-field">
            <FaUser className="field-icon" />
            <span>{order.customer?.name}</span>
          </div>
          <div className="customer-field">
            <FaPhone className="field-icon" />
            <span>{order.customer?.phone}</span>
          </div>
          <div className="customer-field">
            <FaMapMarkerAlt className="field-icon" />
            <span>{order.customer?.address}</span>
            {order.customer?.complement && (
              <span className="complement"> - {order.customer.complement}</span>
            )}
          </div>
        </div>
      </div>

      {/* Itens do Pedido */}
      <div className="order-items">
        <div className="items-header">
          <FaListAlt />
          <span>Itens do Pedido</span>
        </div>
        <div className="items-list">
          {order.items?.slice(0, 2).map((item, index) => (
            <div key={index} className="item-row">
              <span className="item-quantity">{item.quantity}x</span>
              <span className="item-name">{item.name}</span>
              <span className="item-price">{formatCurrency(item.total)}</span>
            </div>
          ))}
          {order.items && order.items.length > 2 && (
            <div className="item-row more-items">
              <span>+{order.items.length - 2} itens</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer do Pedido */}
      <div className="order-footer">
        <div className="order-totals">
          <div className="total-row">
            <span>Total:</span>
            <span className="total-value">{formatCurrency(order.total)}</span>
          </div>
          <div className="payment-method">
            {getPaymentIcon(order.paymentMethod)}
            <span>{getPaymentText(order.paymentMethod)}</span>
          </div>
        </div>
        
        <div className="order-actions">
          <button 
            className="action-button details-button"
            onClick={() => onViewDetails(order)}
          >
            Ver Detalhes
          </button>
          
          {statusInfo.nextStatus && (
            <button 
              className="action-button update-button"
              onClick={() => onStatusUpdate(order.id, statusInfo.nextStatus)}
            >
              Atualizar Status
            </button>
          )}
        </div>
      </div>

      {/* Notas do Pedido */}
      {order.notes && (
        <div className="order-notes">
          <span className="notes-label">Observações:</span>
          <p className="notes-text">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

export default OrderCard;