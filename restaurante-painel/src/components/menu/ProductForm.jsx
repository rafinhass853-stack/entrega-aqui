import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MenuService from '../../services/menuService';
import { 
  FaSave, 
  FaTimes, 
  FaUpload, 
  FaImage, 
  FaTag, 
  FaBox,
  FaDollarSign,
  FaClock,
  FaWeight,
  FaFire,
  FaLeaf,
  FaSeedling,
  FaBreadSlice,
  FaCheese,
  FaPepperHot,
  FaListAlt,
  FaPlus,
  FaMinus,
  FaTrash
} from 'react-icons/fa';
import '../../styles/MenuForm.css';

const ProductForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const restaurantId = "restaurante_do_ze";
  const menuService = new MenuService(restaurantId);

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailedDescription: '',
    categoryId: '',
    price: 0,
    cost: 0,
    comparePrice: 0,
    isOnSale: false,
    salePrice: 0,
    saleEndsAt: '',
    sku: '',
    weight: 0,
    volume: 0,
    servingSize: '',
    calories: 0,
    preparationTime: 15,
    isAvailable: true,
    isFeatured: false,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isSpicy: false,
    spiceLevel: 0,
    allergens: [],
    ingredients: [''],
    tags: [],
    options: []
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // Carregar dados
  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadProduct();
    }
  }, [isEdit, id]);

  const loadCategories = async () => {
    try {
      const cats = await menuService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const product = await menuService.getProductById(id);
      if (product) {
        setFormData({
          name: product.name || '',
          description: product.description || '',
          detailedDescription: product.detailedDescription || '',
          categoryId: product.categoryId || '',
          price: product.price || 0,
          cost: product.cost || 0,
          comparePrice: product.comparePrice || 0,
          isOnSale: product.isOnSale || false,
          salePrice: product.salePrice || 0,
          saleEndsAt: product.saleEndsAt?.toISOString().split('T')[0] || '',
          sku: product.sku || '',
          weight: product.weight || 0,
          volume: product.volume || 0,
          servingSize: product.servingSize || '',
          calories: product.calories || 0,
          preparationTime: product.preparationTime || 15,
          isAvailable: product.isAvailable ?? true,
          isFeatured: product.isFeatured || false,
          isVegetarian: product.isVegetarian || false,
          isVegan: product.isVegan || false,
          isGlutenFree: product.isGlutenFree || false,
          isLactoseFree: product.isLactoseFree || false,
          isSpicy: product.isSpicy || false,
          spiceLevel: product.spiceLevel || 0,
          allergens: product.allergens || [],
          ingredients: product.ingredients?.length > 0 ? product.ingredients : [''],
          tags: product.tags || [],
          options: product.options || []
        });

        if (product.images && product.images.length > 0) {
          setImagePreviews(product.images);
          setMainImageIndex(0);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manipulação de inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleIngredientsChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, ''] }));
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  // Manipulação de imagens
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Criar previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
    setImages(prev => [...prev, ...files]);
    
    e.target.value = ''; // Reset input
  };

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
    
    if (mainImageIndex >= index && mainImageIndex > 0) {
      setMainImageIndex(prev => prev - 1);
    }
  };

  const setAsMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Manipulação de tags
  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Validação
  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('O nome do produto é obrigatório');
      return false;
    }
    
    if (!formData.categoryId) {
      alert('Selecione uma categoria');
      return false;
    }
    
    if (formData.price <= 0) {
      alert('O preço deve ser maior que zero');
      return false;
    }
    
    if (formData.isOnSale && formData.salePrice <= 0) {
      alert('Preço promocional inválido');
      return false;
    }
    
    return true;
  };

  // Salvar produto
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      // Filtrar ingredientes vazios
      const filteredIngredients = formData.ingredients.filter(ing => ing.trim() !== '');
      
      const productData = {
        ...formData,
        ingredients: filteredIngredients,
        saleEndsAt: formData.isOnSale && formData.saleEndsAt ? 
          new Date(formData.saleEndsAt) : null
      };

      if (isEdit) {
        await menuService.updateProduct(id, productData, images);
        alert('Produto atualizado com sucesso!');
      } else {
        await menuService.createProduct(productData, images);
        alert('Produto criado com sucesso!');
      }
      
      navigate('/cardapio');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando produto...</p>
      </div>
    );
  }

  return (
    <div className="product-form-container">
      <div className="form-header">
        <h1>
          {isEdit ? '✏️ Editar Produto' : '➕ Novo Produto'}
        </h1>
        <button 
          className="back-button"
          onClick={() => navigate('/cardapio')}
        >
          <FaTimes /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        {/* Seção 1: Informações Básicas */}
        <div className="form-section">
          <h2 className="section-title">
            <FaTag />
            Informações Básicas
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Nome do Produto *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Hambúrguer Artesanal"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoria *</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descrição Curta</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Breve descrição do produto"
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label>Descrição Detalhada</label>
              <textarea
                name="detailedDescription"
                value={formData.detailedDescription}
                onChange={handleInputChange}
                placeholder="Descrição completa do produto, ingredientes principais, modo de preparo..."
                rows="5"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Preços */}
        <div className="form-section">
          <h2 className="section-title">
            <FaDollarSign />
            Preços
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Preço de Venda (R$) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Custo (R$)</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isOnSale"
                  checked={formData.isOnSale}
                  onChange={handleInputChange}
                />
                Em Promoção
              </label>
            </div>

            {formData.isOnSale && (
              <>
                <div className="form-group">
                  <label>Preço Promocional (R$)</label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Promoção até</label>
                  <input
                    type="date"
                    name="saleEndsAt"
                    value={formData.saleEndsAt}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Seção 3: Imagens */}
        <div className="form-section">
          <h2 className="section-title">
            <FaImage />
            Imagens do Produto
          </h2>
          
          <div className="images-section">
            <div className="images-upload">
              <label className="upload-area">
                <FaUpload className="upload-icon" />
                <span>Clique para adicionar fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden-input"
                />
                <p className="upload-hint">
                  Formatos: JPG, PNG, WEBP (Max: 5MB cada)
                </p>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="images-preview">
                <h4>Pré-visualização ({imagePreviews.length})</h4>
                <div className="preview-grid">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="preview-item">
                      <img src={preview} alt={`Produto ${index + 1}`} />
                      <div className="preview-actions">
                        <button
                          type="button"
                          className={`main-button ${mainImageIndex === index ? 'active' : ''}`}
                          onClick={() => setAsMainImage(index)}
                        >
                          {mainImageIndex === index ? 'Principal' : 'Tornar Principal'}
                        </button>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => removeImage(index)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seção 4: Informações Nutricionais */}
        <div className="form-section">
          <h2 className="section-title">
            <FaFire />
            Informações Nutricionais
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Calorias (kcal)</label>
              <input
                type="number"
                name="calories"
                value={formData.calories}
                onChange={handleInputChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Peso (g)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Volume (ml)</label>
              <input
                type="number"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Tamanho da Porção</label>
              <input
                type="text"
                name="servingSize"
                value={formData.servingSize}
                onChange={handleInputChange}
                placeholder="Ex: 1 porção, 500g"
              />
            </div>
          </div>
        </div>

        {/* Seção 5: Características */}
        <div className="form-section">
          <h2 className="section-title">
            <FaLeaf />
            Características
          </h2>
          
          <div className="characteristics-grid">
            <div className="characteristic-item">
              <label>
                <input
                  type="checkbox"
                  name="isVegetarian"
                  checked={formData.isVegetarian}
                  onChange={handleInputChange}
                />
                <FaLeaf />
                Vegetariano
              </label>
            </div>

            <div className="characteristic-item">
              <label>
                <input
                  type="checkbox"
                  name="isVegan"
                  checked={formData.isVegan}
                  onChange={handleInputChange}
                />
                <FaSeedling />
                Vegano
              </label>
            </div>

            <div className="characteristic-item">
              <label>
                <input
                  type="checkbox"
                  name="isGlutenFree"
                  checked={formData.isGlutenFree}
                  onChange={handleInputChange}
                />
                <FaBreadSlice />
                Sem Glúten
              </label>
            </div>

            <div className="characteristic-item">
              <label>
                <input
                  type="checkbox"
                  name="isLactoseFree"
                  checked={formData.isLactoseFree}
                  onChange={handleInputChange}
                />
                <FaCheese />
                Sem Lactose
              </label>
            </div>

            <div className="characteristic-item">
              <label>
                <input
                  type="checkbox"
                  name="isSpicy"
                  checked={formData.isSpicy}
                  onChange={handleInputChange}
                />
                <FaPepperHot />
                Picante
              </label>
            </div>

            {formData.isSpicy && (
              <div className="characteristic-item full-width">
                <label>Nível de Picante (0-5)</label>
                <input
                  type="range"
                  name="spiceLevel"
                  value={formData.spiceLevel}
                  onChange={handleInputChange}
                  min="0"
                  max="5"
                  step="1"
                />
                <div className="spice-level">
                  {[0, 1, 2, 3, 4, 5].map(level => (
                    <span 
                      key={level}
                      className={formData.spiceLevel >= level ? 'active' : ''}
                    >
                      🌶️
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seção 6: Ingredientes */}
        <div className="form-section">
          <h2 className="section-title">
            <FaListAlt />
            Ingredientes
          </h2>
          
          <div className="ingredients-list">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                <input
                  type="text"
                  value={ingredient}
                  onChange={(e) => handleIngredientsChange(index, e.target.value)}
                  placeholder={`Ingrediente ${index + 1}`}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    className="remove-ingredient"
                    onClick={() => removeIngredient(index)}
                  >
                    <FaMinus />
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              className="add-ingredient"
              onClick={addIngredient}
            >
              <FaPlus /> Adicionar Ingrediente
            </button>
          </div>
        </div>

        {/* Seção 7: Tags */}
        <div className="form-section">
          <h2 className="section-title">
            <FaTag />
            Tags
          </h2>
          
          <div className="tags-section">
            <div className="tags-input">
              <input
                type="text"
                placeholder="Digite uma tag e pressione Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
            </div>
            
            {formData.tags.length > 0 && (
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="remove-tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção 8: Configurações */}
        <div className="form-section">
          <h2 className="section-title">
            <FaBox />
            Configurações
          </h2>
          
          <div className="settings-grid">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={formData.isAvailable}
                  onChange={handleInputChange}
                />
                Disponível para Venda
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleInputChange}
                />
                Destacar no Cardápio
              </label>
            </div>

            <div className="form-group">
              <label>Tempo de Preparo (minutos)</label>
              <input
                type="number"
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleInputChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Código SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="Código interno"
              />
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/cardapio')}
            disabled={saving}
          >
            <FaTimes /> Cancelar
          </button>
          
          <button
            type="submit"
            className="save-button"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="loading-spinner small"></div>
                Salvando...
              </>
            ) : (
              <>
                <FaSave />
                {isEdit ? 'Atualizar Produto' : 'Salvar Produto'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;