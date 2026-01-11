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

async function createSampleOrders() {
  console.log("📦 Criando pedidos de exemplo...");
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Dados do restaurante
  const restaurantId = "restaurante_do_ze";

  // Pedidos de exemplo
  const sampleOrders = [
    {
      restaurantId: restaurantId,
      orderNumber: 1001,
      customer: {
        name: "Maria Silva",
        phone: "(11) 98888-7777",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        complement: "Apto 42",
        neighborhood: "Bela Vista"
      },
      items: [
        { name: "Hambúrguer Artesanal", quantity: 2, price: 29.90, total: 59.80 },
        { name: "Coca-Cola 2L", quantity: 1, price: 12.90, total: 12.90 },
        { name: "Batata Frita Grande", quantity: 1, price: 28.90, total: 28.90 }
      ],
      subtotal: 101.60,
      deliveryFee: 5.00,
      total: 106.60,
      paymentMethod: "credit_card",
      status: "pending", // pending, preparing, out_for_delivery, delivered, cancelled
      notes: "Sem cebola no hambúrguer",
      createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 60000)), // 30 minutos atrás
      updatedAt: Timestamp.now()
    },
    {
      restaurantId: restaurantId,
      orderNumber: 1002,
      customer: {
        name: "João Santos",
        phone: "(11) 97777-6666",
        address: "Rua Augusta, 500",
        complement: "",
        neighborhood: "Consolação"
      },
      items: [
        { name: "Pizza Marguerita Grande", quantity: 1, price: 65.90, total: 65.90 },
        { name: "Coca-Cola 2L", quantity: 1, price: 12.90, total: 12.90 }
      ],
      subtotal: 78.80,
      deliveryFee: 5.00,
      total: 83.80,
      paymentMethod: "pix",
      status: "preparing",
      notes: "Borda de catupiry",
      createdAt: Timestamp.fromDate(new Date(Date.now() - 45 * 60000)), // 45 minutos atrás
      updatedAt: Timestamp.now()
    },
    {
      restaurantId: restaurantId,
      orderNumber: 1003,
      customer: {
        name: "Ana Costa",
        phone: "(11) 96666-5555",
        address: "Rua Oscar Freire, 800",
        complement: "Loja 3",
        neighborhood: "Jardins"
      },
      items: [
        { name: "Hambúrguer Artesanal", quantity: 1, price: 29.90, total: 29.90 },
        { name: "Batata Frita Média", quantity: 1, price: 23.90, total: 23.90 },
        { name: "Suco de Laranja", quantity: 2, price: 8.90, total: 17.80 }
      ],
      subtotal: 71.60,
      deliveryFee: 5.00,
      total: 76.60,
      paymentMethod: "cash",
      status: "out_for_delivery",
      notes: "Entregar após às 19h",
      createdAt: Timestamp.fromDate(new Date(Date.now() - 60 * 60000)), // 1 hora atrás
      updatedAt: Timestamp.now()
    },
    {
      restaurantId: restaurantId,
      orderNumber: 1004,
      customer: {
        name: "Carlos Oliveira",
        phone: "(11) 95555-4444",
        address: "Alameda Santos, 200",
        complement: "",
        neighborhood: "Cerqueira César"
      },
      items: [
        { name: "Pizza Calabresa Família", quantity: 1, price: 79.90, total: 79.90 },
        { name: "Guaraná Antarctica 2L", quantity: 1, price: 10.90, total: 10.90 },
        { name: "Molho de Pimenta", quantity: 2, price: 1.50, total: 3.00 }
      ],
      subtotal: 93.80,
      deliveryFee: 5.00,
      total: 98.80,
      paymentMethod: "debit_card",
      status: "delivered",
      notes: "",
      createdAt: Timestamp.fromDate(new Date(Date.now() - 120 * 60000)), // 2 horas atrás
      deliveredAt: Timestamp.fromDate(new Date(Date.now() - 90 * 60000)), // 1.5 horas atrás
      updatedAt: Timestamp.now()
    },
    {
      restaurantId: restaurantId,
      orderNumber: 1005,
      customer: {
        name: "Fernanda Lima",
        phone: "(11) 94444-3333",
        address: "Rua Haddock Lobo, 400",
        complement: "Apto 12B",
        neighborhood: "Cerqueira César"
      },
      items: [
        { name: "Hambúrguer Duplo", quantity: 1, price: 34.90, total: 34.90 },
        { name: "Batata Frita Pequena", quantity: 1, price: 18.90, total: 18.90 },
        { name: "Coca-Cola 350ml", quantity: 1, price: 6.90, total: 6.90 }
      ],
      subtotal: 60.70,
      deliveryFee: 5.00,
      total: 65.70,
      paymentMethod: "credit_card",
      status: "pending",
      notes: "Adicionar bacon extra",
      createdAt: Timestamp.fromDate(new Date()), // Agora
      updatedAt: Timestamp.now()
    }
  ];

  try {
    for (const orderData of sampleOrders) {
      const ordersRef = collection(db, "orders");
      const docRef = await addDoc(ordersRef, orderData);
      console.log(`✅ Pedido ${orderData.orderNumber} criado com ID: ${docRef.id}`);
    }
    
    console.log("\n🎉 Pedidos de exemplo criados com sucesso!");
    console.log("\n📊 Status dos pedidos:");
    console.log("   1. Aguardando preparo (2 pedidos)");
    console.log("   2. Em preparo (1 pedido)");
    console.log("   3. Saiu para entrega (1 pedido)");
    console.log("   4. Entregue (1 pedido)");
    
  } catch (error) {
    console.error("❌ Erro ao criar pedidos:", error);
  }
}

createSampleOrders();