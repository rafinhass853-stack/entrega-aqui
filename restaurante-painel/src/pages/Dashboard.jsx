import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBuilding, 
  FaSignOutAlt, 
  FaUtensils, 
  FaShoppingCart, 
  FaClock, 
  FaDollarSign, 
  FaMotorcycle,
  FaChartBar 
} from 'react-icons/fa';
import './../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Dados do restaurante (em um sistema real viriam do banco de dados)
  const restaurantData = {
    nome: 'Restaurante do Zé',
    email: 'jose@restaurantedoze.com',
    telefone: '(11) 9999-9999',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    status: 'online',
    pedidosHoje: 24,
    emPreparo: 8,
    aguardando: 5,
    receitaMes: 15847
  };

  const handleLogout = () => {
    // Aqui iria a lógica de logout com Firebase
    navigate('/login');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-nav">
        <div className="nav-left">
          <div className="nav-brand">
            <FaMotorcycle className="nav-icon" />
            <h1>Entrega<span className="logo-accent">Aqui</span></h1>
          </div>
          <div className="empresa-info">
            <FaBuilding className="empresa-icon" />
            <span className="empresa-nome">{restaurantData.nome}</span>
            <span className={`status-badge status-${restaurantData.status}`}>
              ● {restaurantData.status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="nav-right">
          <button onClick={handleLogout} className="logout-button">
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </nav>
      
      {/* Conteúdo Principal */}
      <main className="dashboard-main">
        {/* Bem-vindo */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h2>Bem-vindo ao Painel do {restaurantData.nome}</h2>
            <p>Gerencie seu restaurante de forma simples e eficiente</p>
            <div className="empresa-detalhes">
              <div className="detalhe-item">
                <span className="detalhe-label">Email:</span>
                <span className="detalhe-valor">{restaurantData.email}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Telefone:</span>
                <span className="detalhe-valor">{restaurantData.telefone}</span>
              </div>
              <div className="detalhe-item">
                <span className="detalhe-label">Endereço:</span>
                <span className="detalhe-valor">{restaurantData.endereco}</span>
              </div>
            </div>
          </div>
          <div className="welcome-icon">
            <FaUtensils />
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="stats-section">
          <h3 className="section-title">Estatísticas do Dia</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FaShoppingCart />
              </div>
              <div className="stat-content">
                <div className="stat-number">{restaurantData.pedidosHoje}</div>
                <div className="stat-label">Pedidos Hoje</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaClock />
              </div>
              <div className="stat-content">
                <div className="stat-number">{restaurantData.emPreparo}</div>
                <div className="stat-label">Em Preparo</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaShoppingCart />
              </div>
              <div className="stat-content">
                <div className="stat-number">{restaurantData.aguardando}</div>
                <div className="stat-label">Aguardando</div>
              </div>
            </div>
            
            <div className="stat-card revenue">
              <div className="stat-icon">
                <FaDollarSign />
              </div>
              <div className="stat-content">
                <div className="stat-number">{formatCurrency(restaurantData.receitaMes)}</div>
                <div className="stat-label">Receita do Mês</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Acesso Rápido */}
        <div className="quick-actions">
          <h3 className="section-title">Acesso Rápido</h3>
          <div className="actions-grid">
            <button className="action-card" onClick={() => navigate('/pedidos')}>
              <FaShoppingCart />
              <span>Pedidos</span>
            </button>
            <button className="action-card" onClick={() => navigate('/cardapio')}>
              <FaUtensils />
              <span>Cardápio</span>
            </button>
            <button className="action-card" onClick={() => navigate('/entregas')}>
              <FaMotorcycle />
              <span>Entregas</span>
            </button>
            <button className="action-card" onClick={() => navigate('/relatorios')}>
              <FaChartBar />
              <span>Relatórios</span>
            </button>
          </div>
        </div>
        
        {/* Mensagem de Sucesso */}
        <div className="success-message">
          <div className="success-content">
            <h3>🎉 Sistema Carregado com Sucesso!</h3>
            <p>Empresa: <strong>{restaurantData.nome}</strong></p>
            <p>Email: <strong>{restaurantData.email}</strong></p>
            <p className="success-note">Use o menu acima para gerenciar seu restaurante</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;