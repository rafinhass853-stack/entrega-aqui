import React from 'react';
import { 
  FaChartBar, 
  FaBoxOpen, 
  FaToggleOn, 
  FaToggleOff, 
  FaStar,
  FaTag
} from 'react-icons/fa';
import '../../styles/Menu.css';

const MenuStats = ({ stats }) => {
  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>
          <FaChartBar />
          Estatísticas do Cardápio
        </h2>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalCategories || 0}</div>
          <div className="stat-label">
            <FaTag />
            Categorias
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.totalProducts || 0}</div>
          <div className="stat-label">
            <FaBoxOpen />
            Produtos Totais
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.availableProducts || 0}</div>
          <div className="stat-label">
            <FaToggleOn />
            Disponíveis
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.unavailableProducts || 0}</div>
          <div className="stat-label">
            <FaToggleOff />
            Indisponíveis
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.featuredProducts || 0}</div>
          <div className="stat-label">
            <FaStar />
            Em Destaque
          </div>
        </div>
      </div>

      {/* Distribuição por Categoria */}
      {stats?.categories && stats.categories.length > 0 && (
        <div className="categories-stats">
          <h3>Produtos por Categoria</h3>
          {stats.categories.map((cat, index) => (
            <div key={index} className="category-item">
              <span className="category-name">{cat.name}</span>
              <span className="category-count">{cat.productCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuStats;