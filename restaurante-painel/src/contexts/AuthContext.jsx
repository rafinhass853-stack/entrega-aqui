import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar dados do restaurante
        try {
          const restaurantQuery = await getDoc(doc(db, "restaurants", "restaurante_do_ze"));
          if (restaurantQuery.exists()) {
            setRestaurantData({ id: restaurantQuery.id, ...restaurantQuery.data() });
          }
        } catch (error) {
          console.error("Erro ao buscar restaurante:", error);
        }
      } else {
        setRestaurantData(null);
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Buscar dados do restaurante
      const restaurantQuery = await getDoc(doc(db, "restaurants", "restaurante_do_ze"));
      if (!restaurantQuery.exists()) {
        return { 
          success: false, 
          error: "Restaurante não encontrado" 
        };
      }
      
      const restaurantData = { id: restaurantQuery.id, ...restaurantQuery.data() };
      setRestaurantData(restaurantData);
      
      return { 
        success: true, 
        user: userCredential.user,
        restaurant: restaurantData
      };
    } catch (error) {
      let errorMessage = "Erro ao fazer login";
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = "Email ou senha incorretos";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas. Tente novamente mais tarde";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Erro de conexão. Verifique sua internet";
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setRestaurantData(null);
    return signOut(auth);
  };

  const value = {
    user,
    restaurantData,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};