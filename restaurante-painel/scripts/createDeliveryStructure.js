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

async function createDeliveryStructure() {
  console.log("🚚 Criando estrutura REAL do sistema de entregas...");
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const restaurantId = "restaurante_do_ze";
  const restaurantRef = doc(db, "restaurants", restaurantId);

  // 1. Configurações de Entregas
  console.log("⚙️ Criando configurações de entregas...");
  
  const deliverySettings = {
    deliveryRadius: 10, // km
    deliveryFee: 5.00,
    freeDeliveryThreshold: 50.00,
    estimatedDeliveryTime: {
      min: 25,
      max: 60,
      average: 35
    },
    workingHours: {
      start: "10:00",
      end: "23:00"
    },
    vehicleTypes: [
      { id: "motorcycle", name: "Moto", icon: "🏍️", speed: "rápido", capacity: "média" },
      { id: "bicycle", name: "Bicicleta", icon: "🚲", speed: "média", capacity: "baixa" },
      { id: "car", name: "Carro", icon: "🚗", speed: "rápido", capacity: "alta" },
      { id: "walking", name: "A pé", icon: "🚶", speed: "lenta", capacity: "baixa" }
    ],
    deliveryStatuses: [
      { id: "available", name: "Disponível", color: "#48BB78", icon: "✅" },
      { id: "assigned", name: "Atribuído", color: "#4299E1", icon: "📋" },
      { id: "picked_up", name: "Retirado", color: "#9F7AEA", icon: "📦" },
      { id: "on_the_way", name: "A caminho", color: "#ED8936", icon: "🛵" },
      { id: "arrived", name: "Chegou", color: "#667EEA", icon: "📍" },
      { id: "delivered", name: "Entregue", color: "#38B2AC", icon: "🎉" },
      { id: "cancelled", name: "Cancelado", color: "#F56565", icon: "❌" },
      { id: "returned", name: "Devolvido", color: "#A0AEC0", icon: "↩️" }
    ],
    paymentMethods: [
      { id: "cash", name: "Dinheiro", icon: "💵", requiresChange: true },
      { id: "credit_card", name: "Cartão de Crédito", icon: "💳", requiresChange: false },
      { id: "debit_card", name: "Cartão de Débito", icon: "💳", requiresChange: false },
      { id: "pix", name: "PIX", icon: "📱", requiresChange: false },
      { id: "app", name: "App", icon: "📲", requiresChange: false }
    ],
    performanceMetrics: {
      ratingThreshold: 4.0,
      deliveryTimeThreshold: 45, // minutos
      cancellationRateThreshold: 0.1 // 10%
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const settingsRef = doc(restaurantRef, "delivery_settings", "config");
  await setDoc(settingsRef, deliverySettings);
  console.log("✅ Configurações de entregas criadas!");

  // 2. Criar entregadores REAIS (vazios para o restaurante preencher)
  console.log("👤 Criando template de entregadores...");
  
  const deliveryPersonTemplate = {
    personalInfo: {
      fullName: "",
      cpf: "",
      rg: "",
      birthDate: "",
      phone: "",
      emergencyContact: "",
      email: "",
      address: ""
    },
    vehicleInfo: {
      type: "motorcycle",
      brand: "",
      model: "",
      year: "",
      color: "",
      plate: "",
      licenseNumber: "",
      licenseExpiry: ""
    },
    documents: {
      cnhPhoto: "",
      vehiclePhoto: "",
      cnhBackPhoto: "",
      criminalRecord: "",
      addressProof: ""
    },
    workInfo: {
      hireDate: "",
      shift: "full_time", // full_time, part_time, flexible
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      preferredZones: [],
      maxDistance: 15, // km
      hourlyRate: 0,
      commissionRate: 0.15, // 15%
      paymentMethod: "weekly" // weekly, biweekly, monthly
    },
    status: {
      current: "offline", // offline, available, busy, on_break
      lastOnline: null,
      isActive: true,
      suspensionReason: "",
      suspensionEnd: null
    },
    location: {
      latitude: -23.5505, // São Paulo
      longitude: -46.6333,
      lastUpdate: null,
      accuracy: 0,
      address: ""
    },
    performance: {
      totalDeliveries: 0,
      completedDeliveries: 0,
      cancelledDeliveries: 0,
      averageRating: 0,
      totalRatings: 0,
      totalEarnings: 0,
      averageDeliveryTime: 0,
      onTimeRate: 0,
      cancellationRate: 0
    },
    ratings: [],
    earnings: {
      currentBalance: 0,
      pendingBalance: 0,
      totalWithdrawn: 0,
      lastWithdrawal: null,
      nextPaymentDate: null
    },
    settings: {
      notifications: {
        newOrders: true,
        orderUpdates: true,
        earnings: true,
        announcements: true
      },
      privacy: {
        shareLocation: true,
        showName: true,
        showPhoto: true
      }
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "admin"
  };

  const templateRef = doc(restaurantRef, "delivery_templates", "delivery_person");
  await setDoc(templateRef, deliveryPersonTemplate);
  console.log("✅ Template de entregador criado!");

  // 3. Criar estrutura de entregas
  console.log("📦 Criando estrutura de entregas...");
  
  const deliveryTemplate = {
    orderInfo: {
      orderId: "",
      orderNumber: 0,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      customerNotes: "",
      orderItems: [],
      orderTotal: 0,
      deliveryFee: 0,
      totalAmount: 0,
      paymentMethod: "",
      requiresChange: false,
      changeAmount: 0
    },
    deliveryInfo: {
      deliveryPersonId: "",
      deliveryPersonName: "",
      deliveryPersonPhone: "",
      assignedAt: null,
      pickedUpAt: null,
      onTheWayAt: null,
      arrivedAt: null,
      deliveredAt: null,
      estimatedDeliveryTime: null,
      actualDeliveryTime: null,
      deliveryStatus: "pending",
      deliveryNotes: "",
      deliveryProof: [] // fotos, assinatura
    },
    routeInfo: {
      pickupLocation: {
        latitude: -23.5505,
        longitude: -46.6333,
        address: "Restaurante do Zé"
      },
      deliveryLocation: {
        latitude: 0,
        longitude: 0,
        address: ""
      },
      distance: 0, // km
      estimatedTime: 0, // minutos
      actualRoute: [],
      trafficConditions: "normal",
      weatherConditions: "clear"
    },
    financialInfo: {
      deliveryFee: 0,
      commission: 0,
      tip: 0,
      totalEarnings: 0,
      paymentStatus: "pending", // pending, paid, processing, failed
      paidAt: null,
      paymentMethod: "cash"
    },
    customerFeedback: {
      rating: 0,
      comment: "",
      timestamp: null
    },
    issues: {
      hasIssues: false,
      issueType: "", // late, wrong_address, customer_not_found, etc.
      issueDescription: "",
      resolved: false,
      resolution: ""
    },
    tracking: {
      locations: [], // histórico de localização
      statusHistory: [], // histórico de status
      lastUpdated: null
    },
    metadata: {
      priority: "normal", // low, normal, high, urgent
      flags: [],
      tags: [],
      internalNotes: ""
    },
    restaurantId: restaurantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "system"
  };

  const deliveryTemplateRef = doc(restaurantRef, "delivery_templates", "delivery");
  await setDoc(deliveryTemplateRef, deliveryTemplate);
  console.log("✅ Template de entrega criado!");

  console.log("\n🎉 ESTRUTURA REAL DE ENTREGAS CRIADA COM SUCESSO!");
  console.log("\n📋 Próximo passo:");
  console.log("1. Cadastrar entregadores reais");
  console.log("2. Atribuir pedidos a entregadores");
  console.log("3. Acompanhar entregas em tempo real");
  console.log("4. Gerenciar pagamentos e comissões");
  console.log("\n🚀 Sistema pronto para produção!");
}

createDeliveryStructure().catch(console.error);