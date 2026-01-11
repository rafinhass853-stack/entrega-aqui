import React from 'react';
import { 
  FaEdit, 
  FaToggleOn, 
  FaToggleOff, 
  FaStar, 
  FaClock,
  FaTag,
  FaBox,
  FaImage,
  FaLeaf,
  FaSeedling,
  FaBreadSlice,
  FaCheese,
  FaPepperHot,
  FaFire,
  FaWeightHanging
} from 'react-icons/fa';
import '../../styles/Menu.css';

const ProductCard = ({ product, onEdit, onToggleAvailability, onToggleFeatured }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCurrentPrice = () => {
    if (product.isOnSale && product.salePrice > 0) {
      return product.salePrice;
    }
    return product.price;
  };

  const hasImage = () => {
    return product.mainImage || (product.images && product.images.length > 0);
  };

  const getMainImage = () => {
    if (product.mainImage) return product.mainImage;
    if (product.images && product.images.length > 0) return product.images[0];
    return null;
  };

  return (
    <div className={`product-card ${!product.isAvailable ? 'unavailable' : ''}`}>
      {/* Imagem do Produto */}
      {hasImage() ? (
        <div className="product-image">
          <img 
            src={getMainImage()} 
            alt={product.name}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=Sem+Imagem';
            }}
          />
          {product.isOnSale && (
            <span className="sale-badge">PROMOÇÃO</span>
          )}
          {product.isFeatured && (
            <span className="featured-badge">
              <FaStar />
              DESTAQUE
            </span>
          )}
        </div>
      ) : (
        <div className="product-image-placeholder">
          <FaImage className="placeholder-icon" />
          <span>Sem foto</span>
        </div>
      )}

      {/* Conteúdo do Card */}
      <div className="product-content">
        {/* Header */}
        <div className="product-header">
          <div className="product-title">
            <h3>{product.name}</h3>
            <div className="product-category">
              <FaTag />
              <span>{product.categoryId}</span>
            </div>
          </div>
          
          <div className="product-pricing">
            {product.isOnSale && product.salePrice > 0 ? (
              <>
                <span className="original-price">{formatCurrency(product.price)}</span>
                <span className="current-price">{formatCurrency(product.salePrice)}</span>
              </>
            ) : (
              <span className="current-price">{formatCurrency(getCurrentPrice())}</span>
            )}
            {product.cost > 0 && (
              <span className="cost-label">Custo: {formatCurrency(product.cost)}</span>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="product-description">
          <p>{product.description || 'Sem descrição'}</p>
        </div>

        {/* Informações */}
        <div className="product-info">
          <div className="info-item">
            <FaClock />
            <span>{product.preparationTime || 15} min</span>
          </div>
          
          <div className="info-item">
            <FaBox />
            <span className={`status-badge ${product.isAvailable ? 'available' : 'unavailable'}`}>
              {product.isAvailable ? 'Disponível' : 'Indisponível'}
            </span>
          </div>

          {product.calories > 0 && (
            <div className="info-item">
              <FaFire />
              <span>{product.calories} kcal</span>
            </div>
          )}

          {product.weight > 0 && (
            <div className="info-item">
              <FaWeightHanging />
              <span>{product.weight}g</span>
            </div>
          )}
        </div>

        {/* Tags Nutricionais */}
        {(product.isVegetarian || product.isVegan || product.isGlutenFree || product.isLactoseFree || product.isSpicy) && (
          <div className="nutrition-tags">
            {product.isVegetarian && (
              <span className="nutrition-tag vegetarian">
                <FaLeaf /> Vegetariano
              </span>
            )}
            {product.isVegan && (
              <span className="nutrition-tag vegan">
                <FaSeedling /> Vegano
              </span>
            )}
            {product.isGlutenFree && (
              <span className="nutrition-tag gluten-free">
                <FaBreadSlice /> Sem Glúten
              </span>
            )}
            {product.isLactoseFree && (
              <span className="nutrition-tag lactose-free">
                <FaCheese /> Sem Lactose
              </span>
            )}
            {product.isSpicy && (
              <span className="nutrition-tag spicy">
                <FaPepperHot /> Picante
                {product.spiceLevel > 0 && ` (${product.spiceLevel}/5)`}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="product-tags">
            {product.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="tag-more">+{product.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="product-actions">
          <button 
            className="action-button edit-button"
            onClick={() => onEdit(product)}
          >
            <FaEdit />
            Editar
          </button>

          <button 
            className={`action-button ${product.isAvailable ? 'disable-button' : 'enable-button'}`}
            onClick={() => onToggleAvailability(product.id, !product.isAvailable)}
          >
            {product.isAvailable ? <FaToggleOff /> : <FaToggleOn />}
            {product.isAvailable ? 'Desativar' : 'Ativar'}
          </button>

          <button 
            className={`action-button ${product.isFeatured ? 'unfeature-button' : 'feature-button'}`}
            onClick={() => onToggleFeatured(product.id, !product.isFeatured)}
          >
            <FaStar />
            {product.isFeatured ? 'Remover' : 'Destacar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;