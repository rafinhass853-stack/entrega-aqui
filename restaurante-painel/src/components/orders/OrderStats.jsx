import React from 'react';
import { FaChartLine, FaMoneyBillWave, FaShoppingCart, FaClock, FaCheckCircle, FaUtensils, FaMotorcycle } from 'react-icons/fa';
import '../../styles/Orders.css';

const OrderStats = ({ stats }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>
          <FaChartLine />
          Estatísticas do Dia
        </h2>
        <span className="stats-date">{formatDate()}</span>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalOrders || 0}</div>
          <div className="stat-label">
            <FaShoppingCart />
            Total de Pedidos
          </div>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-value">{formatCurrency(stats?.totalRevenue || 0)}</div>
          <div className="stat-label">
            <FaMoneyBillWave />
            Receita Total
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(stats?.averageOrderValue || 0)}</div>
          <div className="stat-label">
            <FaChartLine />
            Ticket Médio
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {stats?.statusCount?.delivered || 0}/{stats?.totalOrders || 0}
          </div>
          <div className="stat-label">
            <FaCheckCircle />
            Entregues
          </div>
        </div>
      </div>
      
      <div className="status-breakdown">
        <h3>Distribuição por Status</h3>
        <div className="status-grid">
          <div className="status-item pending">
            <FaClock />
            <span className="status-count">{stats?.statusCount?.pending || 0}</span>
            <span className="status-label">Aguardando</span>
          </div>
          <div className="status-item preparing">
            <FaUtensils />
            <span className="status-count">{stats?.statusCount?.preparing || 0}</span>
            <span className="status-label">Em Preparo</span>
          </div>
          <div className="status-item out_for_delivery">
            <FaMotorcycle />
            <span className="status-count">{stats?.statusCount?.out_for_delivery || 0}</span>
            <span className="status-label">Em Entrega</span>
          </div>
          <div className="status-item delivered">
            <FaCheckCircle />
            <span className="status-count">{stats?.statusCount?.delivered || 0}</span>
            <span className="status-label">Entregues</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStats;