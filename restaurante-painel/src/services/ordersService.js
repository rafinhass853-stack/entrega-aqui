import { db } from '../firebase';
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
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';

class OrdersService {
  constructor(restaurantId) {
    this.restaurantId = restaurantId;
    this.ordersRef = collection(db, 'orders');
  }

  // Buscar todos os pedidos do restaurante
  async getOrders(filters = {}) {
    try {
      let q = query(
        this.ordersRef,
        where('restaurantId', '==', this.restaurantId)
      );

      // Aplicar filtros
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.date) {
        const startDate = new Date(filters.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.date);
        endDate.setHours(23, 59, 59, 999);
        
        q = query(
          q,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        );
      }

      // Ordenar por data (mais recentes primeiro)
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const orders = [];

      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          deliveredAt: doc.data().deliveredAt?.toDate()
        });
      });

      return orders;
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      throw error;
    }
  }

  // Buscar pedido por ID
  async getOrderById(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      
      if (orderDoc.exists()) {
        return {
          id: orderDoc.id,
          ...orderDoc.data(),
          createdAt: orderDoc.data().createdAt?.toDate(),
          updatedAt: orderDoc.data().updatedAt?.toDate(),
          deliveredAt: orderDoc.data().deliveredAt?.toDate()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      throw error;
    }
  }

  // Atualizar status do pedido
  async updateOrderStatus(orderId, status) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData = {
        status: status,
        updatedAt: Timestamp.now()
      };

      if (status === 'delivered') {
        updateData.deliveredAt = Timestamp.now();
      }

      await updateDoc(orderRef, updateData);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      throw error;
    }
  }

  // Escutar mudanças em tempo real
  subscribeToOrders(callback) {
    const q = query(
      this.ordersRef,
      where('restaurantId', '==', this.restaurantId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(orders);
    });
  }

  // Estatísticas
  async getOrderStats(startDate, endDate) {
    try {
      const q = query(
        this.ordersRef,
        where('restaurantId', '==', this.restaurantId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      let totalRevenue = 0;
      let totalOrders = 0;
      const statusCount = {
        pending: 0,
        preparing: 0,
        out_for_delivery: 0,
        delivered: 0,
        cancelled: 0
      };

      querySnapshot.forEach((doc) => {
        const order = doc.data();
        totalRevenue += order.total || 0;
        totalOrders++;
        statusCount[order.status]++;
      });

      return {
        totalRevenue,
        totalOrders,
        statusCount,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // Gerar número do próximo pedido
  async getNextOrderNumber() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        this.ordersRef,
        where('restaurantId', '==', this.restaurantId),
        where('createdAt', '>=', Timestamp.fromDate(today)),
        where('createdAt', '<', Timestamp.fromDate(tomorrow))
      );

      const querySnapshot = await getDocs(q);
      const orderCount = querySnapshot.size;
      
      // Formato: YYYYMMDD-XXX (ex: 20240111-001)
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const sequence = (orderCount + 1).toString().padStart(3, '0');
      
      return parseInt(`${dateStr}${sequence}`);
    } catch (error) {
      console.error('Erro ao gerar número do pedido:', error);
      throw error;
    }
  }
}

export default OrdersService;