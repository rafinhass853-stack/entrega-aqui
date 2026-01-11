import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuService from '../services/menuService';
import ProductCard from '../components/menu/ProductCard';
import MenuStats from '../components/menu/MenuStats';
import CategorySidebar from '../components/menu/CategorySidebar';
import { 
  FaUtensils, 
  FaPlus, 
  FaFilter, 
  FaSearch,
  FaBoxOpen,
  FaStar,
  FaChartBar
} from 'react-icons/fa';
import '../styles/Menu.css';

const Menu = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const restaurantId = "restaurante_do_ze";
  const menuService = new MenuService(restaurantId);

  const filters = [
    { id: 'all', label: 'Todos', icon: <FaBoxOpen /> },
    { id: 'available', label: 'Disponíveis', icon: <FaBoxOpen /> },
    { id: 'unavailable', label: 'Indisponíveis', icon: <FaBoxOpen /> },
    { id: 'featured', label: 'Destaques', icon: <FaStar /> }
  ];

  useEffect(() => {
    loadData();
    
    // Escutar mudanças em tempo real
    const unsubscribeCategories = menuService.subscribeToCategories(setCategories);
    const unsubscribeProducts = menuService.subscribeToProducts(setProducts);

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, activeFilter, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods, menuStats] = await Promise.all([
        menuService.getCategories(),
        menuService.getProducts(),
        menuService.getMenuStats()
      ]);
      
      setCategories(cats);
      setProducts(prods);
      setFilteredProducts(prods);
      setStats(menuStats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtrar por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    // Filtrar por disponibilidade
    if (activeFilter === 'available') {
      filtered = filtered.filter(product => product.available);
    } else if (activeFilter === 'unavailable') {
      filtered = filtered.filter(product => !product.available);
    } else if (activeFilter === 'featured') {
      filtered = filtered.filter(product => product.featured);
    }

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        (product.ingredients && product.ingredients.some(ing => ing.toLowerCase().includes(term)))
      );
    }

    setFilteredProducts(filtered);
  };

  const handleToggleAvailability = async (productId, available) => {
    try {
      await menuService.toggleProductAvailability(productId, available);
      // O Firestore em tempo real vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao alterar disponibilidade:', error);
      alert('Erro ao alterar disponibilidade do produto');
    }
  };

  const handleToggleFeatured = async (productId, featured) => {
    try {
      await menuService.toggleProductFeatured(productId, featured);
    } catch (error) {
      console.error('Erro ao alterar destaque:', error);
      alert('Erro ao alterar destaque do produto');
    }
  };

  const handleEditProduct = (product) => {
    navigate(`/cardapio/editar/${product.id}`);
  };

  const handleAddProduct = () => {
    navigate('/cardapio/novo');
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="menu-container">
      {/* Header */}
      <header className="menu-header">
        <div className="header-left">
          <h1 className="page-title">
            <FaUtensils />
            Cardápio Digital
          </h1>
          <p className="page-subtitle">Gerencie seus produtos e categorias</p>
        </div>
        
        <div className="header-right">
          <button className="add-button" onClick={handleAddProduct}>
            <FaPlus />
            Novo Produto
          </button>
        </div>
      </header>

      {/* Estatísticas */}
      {stats && <MenuStats stats={stats} />}

      {/* Barra de Busca e Filtros */}
      <div className="controls-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar produtos por nome, descrição ou ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <div className="filters-group">
            <FaFilter />
            <span>Filtrar por:</span>
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="menu-content">
        {/* Sidebar de Categorias */}
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          products={products}
        />

        {/* Lista de Produtos */}
        <main className="products-main">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando cardápio...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <FaBoxOpen className="empty-icon" />
              <h3>Nenhum produto encontrado</h3>
              <p>
                {searchTerm 
                  ? `Nenhum produto corresponde à busca "${searchTerm}"`
                  : selectedCategory !== 'all'
                  ? `Nenhum produto na categoria selecionada`
                  : 'Ainda não há produtos cadastrados.'}
              </p>
              <button className="cta-button" onClick={handleAddProduct}>
                <FaPlus />
                Cadastrar Primeiro Produto
              </button>
            </div>
          ) : (
            <>
              <div className="products-summary">
                <span className="summary-text">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </span>
                <span className="summary-total">
                  Valor total: {formatCurrency(filteredProducts.reduce((sum, p) => sum + p.price, 0))}
                </span>
              </div>
              
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onToggleAvailability={handleToggleAvailability}
                    onToggleFeatured={handleToggleFeatured}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Botão Flutuante */}
      <button 
        className="floating-action-button"
        onClick={handleAddProduct}
        title="Novo Produto"
      >
        <FaPlus />
      </button>
    </div>
  );
};

export default Menu;