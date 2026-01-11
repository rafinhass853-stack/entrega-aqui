import { db, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll 
} from 'firebase/storage';

class MenuService {
  constructor(restaurantId) {
    this.restaurantId = restaurantId;
    this.restaurantRef = doc(db, 'restaurants', restaurantId);
    this.categoriesRef = collection(this.restaurantRef, 'categories');
    this.productsRef = collection(this.restaurantRef, 'products');
    this.storageRef = ref(storage, `restaurants/${restaurantId}/products`);
  }

  // ========== CONFIGURAÇÕES ==========
  
  async getMenuSettings() {
    try {
      const settingsRef = doc(this.restaurantRef, 'menu_settings', 'config');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        return {
          id: settingsDoc.id,
          ...settingsDoc.data(),
          createdAt: settingsDoc.data().createdAt?.toDate(),
          updatedAt: settingsDoc.data().updatedAt?.toDate()
        };
      }
      
      // Configurações padrão
      return {
        currency: 'BRL',
        currencySymbol: 'R$',
        taxRate: 0,
        serviceFee: 0,
        minOrderValue: 15.00,
        deliveryFee: 5.00
      };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
  }

  async updateMenuSettings(settings) {
    try {
      const settingsRef = doc(this.restaurantRef, 'menu_settings', 'config');
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  // ========== CATEGORIAS ==========

  async getCategories(includeInactive = false) {
    try {
      let q = query(this.categoriesRef, orderBy('order', 'asc'));
      
      if (!includeInactive) {
        q = query(q, where('active', '==', true));
      }

      const querySnapshot = await getDocs(q);
      const categories = [];

      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      return categories;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  async createCategory(categoryData) {
    try {
      // Pegar última ordem
      const categories = await this.getCategories(true);
      const lastOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order || 0)) 
        : 0;

      const categoryWithMeta = {
        ...categoryData,
        order: lastOrder + 1,
        active: true,
        showInMenu: true,
        restaurantId: this.restaurantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(this.categoriesRef, categoryWithMeta);
      return { id: docRef.id, ...categoryWithMeta };
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }
  }

  async updateCategoryOrder(categories) {
    try {
      const batch = writeBatch(db);
      
      categories.forEach((category, index) => {
        const categoryRef = doc(this.categoriesRef, category.id);
        batch.update(categoryRef, {
          order: index + 1,
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      throw error;
    }
  }

  // ========== PRODUTOS ==========

  async getProducts(filters = {}) {
    try {
      let q = query(this.productsRef, orderBy('createdAt', 'desc'));

      // Aplicar filtros
      if (filters.categoryId) {
        q = query(q, where('categoryId', '==', filters.categoryId));
      }

      if (filters.isAvailable !== undefined) {
        q = query(q, where('isAvailable', '==', filters.isAvailable));
      }

      if (filters.isFeatured) {
        q = query(q, where('isFeatured', '==', true));
      }

      if (filters.tags && filters.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }

      if (filters.search) {
        // Firestore não suporta busca por texto, faremos filtro local
        const allProducts = await this.getAllProducts();
        return allProducts.filter(product => 
          product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }

      const querySnapshot = await getDocs(q);
      const products = [];

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          saleEndsAt: doc.data().saleEndsAt?.toDate()
        });
      });

      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  async getAllProducts() {
    const querySnapshot = await getDocs(this.productsRef);
    const products = [];

    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });

    return products;
  }

  async createProduct(productData, images = []) {
    try {
      // Upload de imagens se houver
      const imageUrls = [];
      if (images.length > 0) {
        for (const image of images) {
          const url = await this.uploadProductImage(image);
          imageUrls.push(url);
        }
      }

      const productWithMeta = {
        ...productData,
        images: imageUrls,
        mainImage: imageUrls[0] || '',
        isAvailable: true,
        isFeatured: false,
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          averageRating: 0,
          reviewCount: 0
        },
        restaurantId: this.restaurantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'admin',
        lastUpdatedBy: 'admin'
      };

      const docRef = await addDoc(this.productsRef, productWithMeta);
      return { id: docRef.id, ...productWithMeta };
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  async updateProduct(productId, updateData, newImages = []) {
    try {
      const productRef = doc(this.productsRef, productId);
      
      // Se houver novas imagens, fazer upload
      if (newImages.length > 0) {
        const imageUrls = [];
        for (const image of newImages) {
          const url = await this.uploadProductImage(image, productId);
          imageUrls.push(url);
        }
        
        updateData.images = [...(updateData.images || []), ...imageUrls];
        if (!updateData.mainImage && imageUrls.length > 0) {
          updateData.mainImage = imageUrls[0];
        }
      }

      await updateDoc(productRef, {
        ...updateData,
        updatedAt: Timestamp.now(),
        lastUpdatedBy: 'admin'
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  async deleteProductImage(productId, imageUrl) {
    try {
      // Extrair nome do arquivo da URL
      const fileName = imageUrl.split('/').pop().split('?')[0];
      const imageRef = ref(storage, `restaurants/${this.restaurantId}/products/${productId}/${fileName}`);
      
      await deleteObject(imageRef);
      
      // Remover da lista de imagens do produto
      const product = await this.getProductById(productId);
      const updatedImages = product.images.filter(img => img !== imageUrl);
      
      await this.updateProduct(productId, {
        images: updatedImages,
        mainImage: updatedImages[0] || ''
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      throw error;
    }
  }

  // ========== UPLOAD DE IMAGENS ==========

  async uploadProductImage(file, productId = 'temp') {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const fileRef = ref(this.storageRef, `${productId}/${fileName}`);
      
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  async getProductImages(productId) {
    try {
      const productImagesRef = ref(this.storageRef, productId);
      const result = await listAll(productImagesRef);
      
      const urls = await Promise.all(
        result.items.map(async (itemRef) => {
          return await getDownloadURL(itemRef);
        })
      );
      
      return urls;
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      return [];
    }
  }

  // ========== ESTOQUE ==========

  async updateStock(productId, quantity, operation = 'set') {
    try {
      const product = await this.getProductById(productId);
      const currentStock = product.stock?.quantity || 0;
      
      let newQuantity = currentStock;
      switch (operation) {
        case 'set':
          newQuantity = quantity;
          break;
        case 'add':
          newQuantity = currentStock + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, currentStock - quantity);
          break;
      }

      const stockType = newQuantity <= 0 ? 'out_of_stock' : 
                       newQuantity <= (product.stock?.lowStockThreshold || 10) ? 'low_stock' : 
                       'in_stock';

      await this.updateProduct(productId, {
        stock: {
          ...product.stock,
          quantity: newQuantity,
          type: stockType,
          lastUpdated: Timestamp.now()
        }
      });

      return { newQuantity, stockType };
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw error;
    }
  }

  // ========== ESTATÍSTICAS ==========

  async getMenuAnalytics(startDate, endDate) {
    try {
      const products = await this.getAllProducts();
      const settings = await this.getMenuSettings();
      
      const analytics = {
        totalProducts: products.length,
        availableProducts: products.filter(p => p.isAvailable).length,
        featuredProducts: products.filter(p => p.isFeatured).length,
        productsByCategory: {},
        revenueByProduct: {},
        topSellingProducts: [],
        lowStockProducts: products.filter(p => 
          p.stock?.type === 'low_stock' || p.stock?.type === 'out_of_stock'
        ),
        totalValue: products.reduce((sum, p) => sum + (p.price * (p.stock?.quantity || 0)), 0)
      };

      // Agrupar por categoria
      const categories = await this.getCategories();
      categories.forEach(category => {
        analytics.productsByCategory[category.name] = 
          products.filter(p => p.categoryId === category.id).length;
      });

      // Ordenar por vendas (simulação)
      analytics.topSellingProducts = products
        .sort((a, b) => (b.stats?.totalOrders || 0) - (a.stats?.totalOrders || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          orders: p.stats?.totalOrders || 0,
          revenue: p.stats?.totalRevenue || 0
        }));

      return analytics;
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      throw error;
    }
  }

  // ========== LISTENERS ==========

  subscribeToProducts(callback, filters = {}) {
    let q = query(this.productsRef);

    if (filters.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }

    if (filters.isAvailable !== undefined) {
      q = query(q, where('isAvailable', '==', filters.isAvailable));
    }

    return onSnapshot(q, (snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(products);
    });
  }

  subscribeToCategories(callback) {
    const q = query(this.categoriesRef, 
      where('active', '==', true),
      orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const categories = [];
      snapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      callback(categories);
    });
  }
}

export default MenuService;