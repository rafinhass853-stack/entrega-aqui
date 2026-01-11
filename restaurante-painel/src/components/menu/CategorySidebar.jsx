import React from 'react';
import { FaList, FaPlus } from 'react-icons/fa';
import '../../styles/Menu.css';

const CategorySidebar = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  products 
}) => {
  
  const getProductCount = (categoryId) => {
    if (categoryId === 'all') return products.length;
    return products.filter(p => p.categoryId === categoryId).length;
  };

  return (
    <aside className="categories-sidebar">
      <div className="categories-header">
        <FaList />
        <span>Categorias</span>
      </div>
      
      <div className="category-list">
        {/* Todas as categorias */}
        <button
          className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          <div className="category-info">
            <span className="category-icon">📋</span>
            <span className="category-name">Todos os Produtos</span>
          </div>
          <span className="category-count">{getProductCount('all')}</span>
        </button>

        {/* Lista de categorias */}
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="category-info">
              <span className="category-icon">{category.icon || '📦'}</span>
              <span className="category-name">{category.name}</span>
            </div>
            <span className="category-count">{getProductCount(category.id)}</span>
          </button>
        ))}

        {/* Nova Categoria */}
        <button 
          className="category-button new-category"
          onClick={() => console.log('Adicionar nova categoria')}
        >
          <div className="category-info">
            <FaPlus />
            <span className="category-name">Nova Categoria</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default CategorySidebar;