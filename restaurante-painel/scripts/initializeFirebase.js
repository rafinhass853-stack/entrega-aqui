// scripts/initializeFirebase.js
const { initializeApp } = require("firebase/app");
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} = require("firebase/auth");
const { 
  getFirestore, 
  doc, 
  setDoc 
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB4JpvdR9d0JuBv3cc1DoLeCkftl1Us57k",
  authDomain: "entregaqui-54665.firebaseapp.com",
  projectId: "entregaqui-54665",
  storageBucket: "entregaqui-54665.firebasestorage.app",
  messagingSenderId: "783720911494",
  appId: "1:783720911494:web:3370db582e835089dab707",
  measurementId: "G-8J5Q01B0E4"
};

async function initializeDatabase() {
  try {
    console.log("🚀 Inicializando banco de dados do Entregaqui...");
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Criar usuário admin
    console.log("📝 Criando usuário do restaurante...");
    
    const email = "jose@restaurantedoze.com";
    const password = "123456";
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuário criado:", userCredential.user.email);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log("ℹ️ Usuário já existe, tentando login...");
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log("✅ Login realizado:", userCredential.user.email);
        } catch (loginError) {
          console.log("⚠️ Não foi possível fazer login. Crie manualmente:");
          console.log("   Email:", email);
          console.log("   Senha:", password);
          console.log("   No Firebase Console > Authentication > Adicionar usuário");
        }
      } else if (error.code === 'auth/operation-not-allowed') {
        console.error("❌ ERRO: Authentication não está ativado!");
        console.log("\n⚠️ SOLUÇÃO:");
        console.log("1. Acesse: https://console.firebase.google.com/");
        console.log("2. Vá em 'Authentication' no menu esquerdo");
        console.log("3. Clique na aba 'Método de login'");
        console.log("4. Ative 'E-mail/senha'");
        console.log("5. Clique em 'Salvar'");
        console.log("6. Execute este script novamente");
        return;
      } else {
        console.error("❌ Erro ao criar usuário:", error.code, error.message);
      }
    }

    // 2. Criar restaurante
    console.log("\n🏪 Criando dados do restaurante...");
    
    const restaurantData = {
      name: "Restaurante do Zé",
      email: email,
      phone: "+5511999999999",
      address: "Rua das Flores, 123 - São Paulo, SP",
      cnpj: "12.345.678/0001-99",
      logoUrl: "",
      status: "active",
      createdAt: new Date().toISOString(),
      settings: {
        deliveryFee: 5.00,
        minOrderValue: 15.00,
        deliveryRadius: 5,
        estimatedDeliveryTime: 45,
        openingHours: {
          monday: { open: "10:00", close: "22:00" },
          tuesday: { open: "10:00", close: "22:00" },
          wednesday: { open: "10:00", close: "22:00" },
          thursday: { open: "10:00", close: "22:00" },
          friday: { open: "10:00", close: "23:00" },
          saturday: { open: "11:00", close: "23:00" },
          sunday: { open: "11:00", close: "21:00" }
        },
        paymentMethods: ["credit_card", "debit_card", "cash", "pix"]
      }
    };

    try {
      const restaurantRef = doc(db, "restaurants", "restaurante_do_ze");
      await setDoc(restaurantRef, restaurantData);
      console.log("✅ Restaurante criado!");
    } catch (error) {
      console.error("❌ Erro ao criar restaurante:", error.message);
    }

    console.log("\n🎉 Banco de dados inicializado!");
    console.log("\n📋 Próximos passos:");
    console.log("1. Acesse o Firebase Console");
    console.log("2. Vá em Authentication > Método de login");
    console.log("3. Certifique-se que 'E-mail/senha' está ativado");
    console.log("4. Crie manualmente o usuário se necessário:");
    console.log("   Email: jose@restaurantedoze.com");
    console.log("   Senha: 123456");
    console.log("\n🚀 Acesse o painel: http://localhost:5173");

  } catch (error) {
    console.error("\n❌ ERRO GRAVE:", error.code || error.name);
    console.error("Mensagem:", error.message);
    
    if (error.code === 'permission-denied') {
      console.error("\n⚠️ Configure as regras do Firestore:");
      console.error("1. Vá em Firestore Database > Regras");
      console.error("2. Cole estas regras temporárias:");
      console.error(`
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
      `);
      console.error("3. Clique em Publicar");
    }
  }
}

// Executar
initializeDatabase();