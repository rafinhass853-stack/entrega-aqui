const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, doc, setDoc, Timestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB4JpvdR9d0JuBv3cc1DoLeCkftl1Us57k",
  authDomain: "entregaqui-54665.firebaseapp.com",
  projectId: "entregaqui-54665",
  storageBucket: "entregaqui-54665.firebasestorage.app",
  messagingSenderId: "783720911494",
  appId: "1:783720911494:web:3370db582e835089dab707",
  measurementId: "G-8J5Q01B0E4"
};

async function createRealMenuStructure() {
  console.log("🍽️ Criando estrutura REAL do cardápio...");
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const restaurantId = "restaurante_do_ze";
  const restaurantRef = doc(db, "restaurants", restaurantId);

  // 1. Configurações do Cardápio
  console.log("⚙️ Criando configurações do cardápio...");
  
  const menuSettings = {
    currency: "BRL",
    currencySymbol: "R$",
    taxRate: 0, // % de taxa
    serviceFee: 0, // % taxa de serviço
    minOrderValue: 15.00,
    deliveryFee: 5.00,
    preparationTime: {
      min: 15,
      max: 45,
      average: 25
    },
    businessHours: {
      monday: { open: "10:00", close: "22:00", closed: false },
      tuesday: { open: "10:00", close: "22:00", closed: false },
      wednesday: { open: "10:00", close: "22:00", closed: false },
      thursday: { open: "10:00", close: "22:00", closed: false },
      friday: { open: "10:00", close: "23:00", closed: false },
      saturday: { open: "11:00", close: "23:00", closed: false },
      sunday: { open: "11:00", close: "21:00", closed: false }
    },
    tags: ["vegetariano", "vegano", "sem glúten", "sem lactose", "picante", "saudável"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const settingsRef = doc(restaurantRef, "menu_settings", "config");
  await setDoc(settingsRef, menuSettings);
  console.log("✅ Configurações do cardápio criadas!");

  // 2. Criar categorias REAIS (sem produtos placeholder)
  console.log("📂 Criando categorias vazias para produção...");
  
  const realCategories = [
    {
      id: "entradas",
      name: "Entradas",
      description: "Aperitivos e pratos para começar",
      icon: "🍽️",
      order: 1,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#FF6B6B",
      createdAt: Timestamp.now()
    },
    {
      id: "principais",
      name: "Pratos Principais",
      description: "Pratos principais do restaurante",
      icon: "🍛",
      order: 2,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#4ECDC4",
      createdAt: Timestamp.now()
    },
    {
      id: "lanches",
      name: "Lanches",
      description: "Hambúrgueres e sanduíches",
      icon: "🍔",
      order: 3,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#FFD166",
      createdAt: Timestamp.now()
    },
    {
      id: "pizzas",
      name: "Pizzas",
      description: "Pizzas artesanais",
      icon: "🍕",
      order: 4,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#06D6A0",
      createdAt: Timestamp.now()
    },
    {
      id: "bebidas",
      name: "Bebidas",
      description: "Refrigerantes, sucos e drinks",
      icon: "🥤",
      order: 5,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#118AB2",
      createdAt: Timestamp.now()
    },
    {
      id: "sobremesas",
      name: "Sobremesas",
      description: "Doces e sobremesas",
      icon: "🍰",
      order: 6,
      active: true,
      showInMenu: true,
      imageUrl: "",
      color: "#9D4EDD",
      createdAt: Timestamp.now()
    }
  ];

  const categoriesRef = collection(restaurantRef, "categories");
  for (const category of realCategories) {
    try {
      await addDoc(categoriesRef, category);
      console.log(`✅ Categoria criada: ${category.name}`);
    } catch (error) {
      console.log(`ℹ️ Categoria ${category.name} já existe`);
    }
  }

  // 3. Template de produto VAZIO para o restaurante adicionar
  console.log("\n📄 Criando template de produto...");
  
  const productTemplate = {
    name: "",
    description: "",
    detailedDescription: "",
    categoryId: "",
    price: 0,
    cost: 0,
    comparePrice: 0, // Preço original para promoções
    isOnSale: false,
    salePrice: 0,
    saleEndsAt: null,
    sku: "", // Código interno
    barcode: "", // Código de barras
    weight: 0, // em gramas
    volume: 0, // em ml
    servingSize: "", // "1 porção", "500g", etc
    calories: 0,
    preparationTime: 15, // minutos
    isAvailable: true,
    isFeatured: false,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isSpicy: false,
    spiceLevel: 0, // 0-5
    allergens: [], // ["gluten", "lactose", "nuts", ...]
    ingredients: [],
    tags: [],
    images: [], // URLs das imagens
    mainImage: "", // URL da imagem principal
    options: [
      {
        id: "tamanho",
        name: "Tamanho",
        type: "single", // single, multiple
        required: true,
        min: 1,
        max: 1,
        items: [
          {
            id: "pequeno",
            name: "Pequeno",
            description: "",
            price: 0,
            isAvailable: true
          },
          {
            id: "medio",
            name: "Médio",
            description: "",
            price: 0,
            isAvailable: true
          },
          {
            id: "grande",
            name: "Grande",
            description: "",
            price: 5.00,
            isAvailable: true
          }
        ]
      },
      {
        id: "adicionais",
        name: "Adicionais",
        type: "multiple",
        required: false,
        min: 0,
        max: 5,
        items: []
      }
    ],
    stock: {
      type: "unlimited", // unlimited, limited, out_of_stock
      quantity: 0,
      lowStockThreshold: 10,
      trackStock: false
    },
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0,
      reviewCount: 0
    },
    seo: {
      title: "",
      description: "",
      keywords: []
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "admin",
    lastUpdatedBy: "admin"
  };

  const templateRef = doc(restaurantRef, "product_templates", "default");
  await setDoc(templateRef, productTemplate);
  console.log("✅ Template de produto criado!");

  console.log("\n🎉 ESTRUTURA REAL CRIADA COM SUCESSO!");
  console.log("\n📋 Próximo passo:");
  console.log("1. O restaurante adicionará produtos REAIS através do painel");
  console.log("2. Cada produto terá:");
  console.log("   • Fotos reais (upload)");
  console.log("   • Descrição detalhada");
  console.log("   • Preços reais");
  console.log("   • Ingredientes reais");
  console.log("   • Opções personalizadas");
  console.log("   • Informações nutricionais");
  console.log("\n🚀 Sistema pronto para produção!");
}

createRealMenuStructure().catch(console.error);