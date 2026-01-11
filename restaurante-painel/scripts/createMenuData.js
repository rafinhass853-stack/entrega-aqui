const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, Timestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB4JpvdR9d0JuBv3cc1DoLeCkftl1Us57k",
  authDomain: "entregaqui-54665.firebaseapp.com",
  projectId: "entregaqui-54665",
  storageBucket: "entregaqui-54665.firebasestorage.app",
  messagingSenderId: "783720911494",
  appId: "1:783720911494:web:3370db582e835089dab707",
  measurementId: "G-8J5Q01B0E4"
};

async function createMenuData() {
  console.log("🍽️ Criando dados do cardápio...");
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const restaurantId = "restaurante_do_ze";

  // 1. Criar categorias
  console.log("📂 Criando categorias...");
  
  const categories = [
    {
      id: "bebidas",
      name: "Bebidas",
      description: "Refrigerantes, sucos, águas e bebidas",
      icon: "🥤",
      order: 1,
      active: true,
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "lanches",
      name: "Lanches",
      description: "Hambúrgueres, sanduíches e wraps",
      icon: "🍔",
      order: 2,
      active: true,
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "pizzas",
      name: "Pizzas",
      description: "Pizzas tradicionais e especiais",
      icon: "🍕",
      order: 3,
      active: true,
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "porcoes",
      name: "Porções",
      description: "Porções para compartilhar",
      icon: "🍟",
      order: 4,
      active: true,
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "sobremesas",
      name: "Sobremesas",
      description: "Doces e sobremesas",
      icon: "🍰",
      order: 5,
      active: true,
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    }
  ];

  for (const category of categories) {
    try {
      const categoryRef = collection(db, "restaurants", restaurantId, "categories");
      await addDoc(categoryRef, category);
      console.log(`✅ Categoria criada: ${category.name}`);
    } catch (error) {
      console.log(`⚠️ Categoria ${category.name} já existe`);
    }
  }

  // 2. Criar produtos
  console.log("\n🍔 Criando produtos...");
  
  const products = [
    // Bebidas
    {
      id: "coca_cola_2l",
      name: "Coca-Cola 2L",
      description: "Refrigerante Coca-Cola 2 litros",
      price: 12.90,
      cost: 6.50,
      categoryId: "bebidas",
      imageUrl: "",
      preparationTime: 5,
      active: true,
      available: true,
      featured: true,
      ingredients: [],
      options: [],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "guarana_antarctica_2l",
      name: "Guaraná Antarctica 2L",
      description: "Refrigerante Guaraná Antarctica 2 litros",
      price: 10.90,
      cost: 5.50,
      categoryId: "bebidas",
      imageUrl: "",
      preparationTime: 5,
      active: true,
      available: true,
      ingredients: [],
      options: [],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },
    {
      id: "suco_laranja_natural",
      name: "Suco de Laranja Natural",
      description: "Suco de laranja natural 500ml",
      price: 8.90,
      cost: 3.00,
      categoryId: "bebidas",
      imageUrl: "",
      preparationTime: 5,
      active: true,
      available: true,
      ingredients: ["Laranja fresca", "Açúcar", "Gelo"],
      options: [
        {
          name: "Tamanho",
          type: "single",
          required: true,
          items: [
            { id: "300ml", name: "300ml", price: 0 },
            { id: "500ml", name: "500ml", price: 2.00 },
            { id: "1l", name: "1 Litro", price: 4.00 }
          ]
        }
      ],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },

    // Lanches
    {
      id: "hamburguer_artesanal",
      name: "Hambúrguer Artesanal",
      description: "Pão brioche, hambúrguer 180g, queijo cheddar, bacon, alface e tomate",
      price: 29.90,
      cost: 12.00,
      categoryId: "lanches",
      imageUrl: "",
      preparationTime: 15,
      active: true,
      available: true,
      featured: true,
      ingredients: ["Pão brioche", "Hambúrguer 180g", "Queijo cheddar", "Bacon", "Alface", "Tomate", "Molho especial"],
      options: [
        {
          name: "Adicionais",
          type: "multiple",
          min: 0,
          max: 3,
          items: [
            { id: "queijo_extra", name: "Queijo extra", price: 3.00 },
            { id: "bacon_extra", name: "Bacon extra", price: 4.00 },
            { id: "ovo", name: "Ovo", price: 2.50 },
            { id: "cheddar_bacon", name: "Cheddar com Bacon", price: 5.00 }
          ]
        },
        {
          name: "Molho",
          type: "single",
          required: false,
          items: [
            { id: "barbecue", name: "Barbecue", price: 1.50 },
            { id: "cheddar", name: "Cheddar", price: 2.00 },
            { id: "mostarda_mel", name: "Mostarda e Mel", price: 1.50 }
          ]
        }
      ],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },

    // Pizzas
    {
      id: "pizza_marguerita",
      name: "Pizza Marguerita",
      description: "Molho de tomate, mussarela, tomate fresco e manjericão",
      price: 45.90,
      cost: 18.00,
      categoryId: "pizzas",
      imageUrl: "",
      preparationTime: 25,
      active: true,
      available: true,
      featured: true,
      ingredients: ["Molho de tomate", "Mussarela", "Tomate fresco", "Manjericão", "Azeite"],
      options: [
        {
          name: "Tamanho",
          type: "single",
          required: true,
          items: [
            { id: "pequena", name: "Pequena (25cm)", price: 0 },
            { id: "media", name: "Média (30cm)", price: 10.00 },
            { id: "grande", name: "Grande (35cm)", price: 20.00 },
            { id: "familia", name: "Família (40cm)", price: 30.00 }
          ]
        },
        {
          name: "Borda",
          type: "single",
          required: false,
          items: [
            { id: "tradicional", name: "Tradicional", price: 0 },
            { id: "cheddar", name: "Borda de Cheddar", price: 8.00 },
            { id: "catupiry", name: "Borda de Catupiry", price: 10.00 }
          ]
        }
      ],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },

    // Porções
    {
      id: "batata_frita",
      name: "Batata Frita",
      description: "Porção de batata frita crocante",
      price: 18.90,
      cost: 6.00,
      categoryId: "porcoes",
      imageUrl: "",
      preparationTime: 10,
      active: true,
      available: true,
      ingredients: ["Batata", "Sal", "Temperos especiais"],
      options: [
        {
          name: "Tamanho",
          type: "single",
          required: true,
          items: [
            { id: "pequena", name: "Pequena", price: 0 },
            { id: "media", name: "Média", price: 5.00 },
            { id: "grande", name: "Grande", price: 10.00 }
          ]
        },
        {
          name: "Molho extra",
          type: "multiple",
          min: 0,
          max: 2,
          items: [
            { id: "ketchup", name: "Ketchup", price: 1.00 },
            { id: "mostarda", name: "Mostarda", price: 1.00 },
            { id: "cheddar", name: "Cheddar", price: 3.00 }
          ]
        }
      ],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    },

    // Sobremesas
    {
      id: "brownie_chocolate",
      name: "Brownie de Chocolate",
      description: "Brownie de chocolate com nozes e sorvete",
      price: 15.90,
      cost: 5.00,
      categoryId: "sobremesas",
      imageUrl: "",
      preparationTime: 5,
      active: true,
      available: true,
      ingredients: ["Chocolate", "Nozes", "Sorvete de creme"],
      options: [
        {
          name: "Complemento",
          type: "single",
          required: false,
          items: [
            { id: "sorvete", name: "Com sorvete", price: 3.00 },
            { id: "chantilly", name: "Com chantilly", price: 2.00 },
            { id: "calda", name: "Com calda de chocolate", price: 2.00 }
          ]
        }
      ],
      restaurantId: restaurantId,
      createdAt: Timestamp.now()
    }
  ];

  for (const product of products) {
    try {
      const productsRef = collection(db, "restaurants", restaurantId, "products");
      await addDoc(productsRef, product);
      console.log(`✅ Produto criado: ${product.name}`);
    } catch (error) {
      console.log(`⚠️ Produto ${product.name} já existe ou erro:`, error.message);
    }
  }

  console.log("\n🎉 Cardápio criado com sucesso!");
  console.log("📊 Resumo:");
  console.log(`   - ${categories.length} categorias`);
  console.log(`   - ${products.length} produtos`);
  console.log("\n🍽️ Acesse o painel para gerenciar o cardápio!");
}

createMenuData().catch(console.error);