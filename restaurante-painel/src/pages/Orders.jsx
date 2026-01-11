import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrdersService from '../services/ordersService';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import OrderStats from '../components/orders/OrderStats';
import { 
  FaShoppingCart, 
  FaFilter, 
  FaPlus, 
  FaBell, 
  FaSync,
  FaClock,
  FaUtensils,
  FaMotorcycle,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import '../styles/Orders.css';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const restaurantId = "restaurante_do_ze";
  const ordersService = new OrdersService(restaurantId);

  const filters = [
    { id: 'all', label: 'Todos', icon: <FaShoppingCart /> },
    { id: 'pending', label: 'Aguardando', icon: <FaClock />, color: '#f6ad55' },
    { id: 'preparing', label: 'Em Preparo', icon: <FaUtensils />, color: '#4299e1' },
    { id: 'out_for_delivery', label: 'Em Entrega', icon: <FaMotorcycle />, color: '#9f7aea' },
    { id: 'delivered', label: 'Entregues', icon: <FaCheckCircle />, color: '#48bb78' },
    { id: 'cancelled', label: 'Cancelados', icon: <FaTimesCircle />, color: '#f56565' }
  ];

  useEffect(() => {
    loadOrders();
    loadStats();
    
    // Escutar novos pedidos em tempo real
    const unsubscribe = ordersService.subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders);
      filterOrders(activeFilter, updatedOrders);
      
      // Contar novos pedidos (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
      const newOrders = updatedOrders.filter(order => 
        order.status === 'pending' && 
        new Date(order.createdAt) > fiveMinutesAgo
      );
      setNewOrdersCount(newOrders.length);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterOrders(activeFilter, orders);
  }, [activeFilter, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await ordersService.getOrders();
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const statsData = await ordersService.getOrderStats(today, new Date());
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const filterOrders = (filterId, ordersList = orders) => {
    if (filterId === 'all') {
      setFilteredOrders(ordersList);
    } else {
      const filtered = ordersList.filter(order => order.status === filterId);
      setFilteredOrders(filtered);
    }
    setActiveFilter(filterId);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await ordersService.updateOrderStatus(orderId, newStatus);
      // O Firestore em tempo real vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleRefresh = () => {
    loadOrders();
    loadStats();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="orders-container">
      {/* Header */}
      <header className="orders-header">
        <div className="header-left">
          <h1 className="page-title">
            <FaShoppingCart />
            Gestão de Pedidos
          </h1>
          <p className="page-subtitle">Gerencie todos os pedidos do seu restaurante</p>
        </div>
        
        <div className="header-right">
          {newOrdersCount > 0 && (
            <div className="new-orders-badge">
              <FaBell />
              <span>{newOrdersCount} novo(s)</span>
            </div>
          )}
          
          <button className="refresh-button" onClick={handleRefresh}>
            <FaSync />
            Atualizar
          </button>
        </div>
      </header>

      {/* Estatísticas */}
      {stats && <OrderStats stats={stats} />}

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-header">
          <FaFilter />
          <h3>Filtrar por Status</h3>
        </div>
        
        <div className="filters-grid">
          {filters.map(filter => (
            <button
              key={filter.id}
              className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => filterOrders(filter.id)}
              style={filter.color ? { '--filter-color': filter.color } : {}}
            >
              {filter.icon}
              <span>{filter.label}</span>
              {filter.id !== 'all' && (
                <span className="filter-count">
                  {orders.filter(o => o.status === filter.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Pedidos */}
      <main className="orders-main">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <FaShoppingCart className="empty-icon" />
            <h3>Nenhum pedido encontrado</h3>
            <p>
              {activeFilter === 'all' 
                ? 'Ainda não há pedidos no sistema.'
                : `Não há pedidos com status "${filters.find(f => f.id === activeFilter)?.label}".`}
            </p>
            <button className="cta-button" onClick={() => filterOrders('all')}>
              Ver todos os pedidos
            </button>
          </div>
        ) : (
          <>
            <div className="orders-summary">
              <span className="summary-text">
                Mostrando {filteredOrders.length} de {orders.length} pedidos
              </span>
              <span className="summary-total">
                Total: {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total, 0))}
              </span>
            </div>
            
            <div className="orders-grid">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowDetailsModal(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Botão Flutuante */}
      <button 
        className="floating-action-button"
        onClick={() => navigate('/novo-pedido')}
        title="Novo Pedido Manual"
      >
        <FaPlus />
      </button>
    </div>
  );
};

export default Orders;