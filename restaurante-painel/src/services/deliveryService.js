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
  deleteDoc,
  onSnapshot,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

class DeliveryService {
  constructor(restaurantId) {
    this.restaurantId = restaurantId;
    this.restaurantRef = doc(db, 'restaurants', restaurantId);
    this.deliveryPersonsRef = collection(this.restaurantRef, 'delivery_persons');
    this.deliveriesRef = collection(this.restaurantRef, 'deliveries');
    this.ordersRef = collection(db, 'orders');
  }

  // ========== CONFIGURAÇÕES ==========
  
  async getDeliverySettings() {
    try {
      const settingsRef = doc(this.restaurantRef, 'delivery_settings', 'config');
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
        deliveryRadius: 10,
        deliveryFee: 5.00,
        freeDeliveryThreshold: 50.00,
        estimatedDeliveryTime: {
          min: 25,
          max: 60,
          average: 35
        }
      };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
  }

  async updateDeliverySettings(settings) {
    try {
      const settingsRef = doc(this.restaurantRef, 'delivery_settings', 'config');
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

  // ========== ENTREGADORES ==========

  async getDeliveryPersons(filters = {}) {
    try {
      let q = query(this.deliveryPersonsRef, orderBy('createdAt', 'desc'));

      if (filters.status) {
        q = query(q, where('status.current', '==', filters.status));
      }

      if (filters.isActive !== undefined) {
        q = query(q, where('status.isActive', '==', filters.isActive));
      }

      const querySnapshot = await getDocs(q);
      const deliveryPersons = [];

      querySnapshot.forEach((doc) => {
        deliveryPersons.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          status: {
            ...doc.data().status,
            lastOnline: doc.data().status?.lastOnline?.toDate()
          }
        });
      });

      return deliveryPersons;
    } catch (error) {
      console.error('Erro ao buscar entregadores:', error);
      throw error;
    }
  }

  async getDeliveryPersonById(deliveryPersonId) {
    try {
      const deliveryPersonDoc = await getDoc(doc(this.deliveryPersonsRef, deliveryPersonId));
      
      if (deliveryPersonDoc.exists()) {
        return {
          id: deliveryPersonDoc.id,
          ...deliveryPersonDoc.data(),
          createdAt: deliveryPersonDoc.data().createdAt?.toDate(),
          updatedAt: deliveryPersonDoc.data().updatedAt?.toDate()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar entregador:', error);
      throw error;
    }
  }

  async createDeliveryPerson(deliveryPersonData) {
    try {
      const deliveryPersonWithMeta = {
        ...deliveryPersonData,
        status: {
          current: 'offline',
          lastOnline: null,
          isActive: true,
          ...deliveryPersonData.status
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
          cancellationRate: 0,
          ...deliveryPersonData.performance
        },
        earnings: {
          currentBalance: 0,
          pendingBalance: 0,
          totalWithdrawn: 0,
          ...deliveryPersonData.earnings
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'admin'
      };

      const docRef = await addDoc(this.deliveryPersonsRef, deliveryPersonWithMeta);
      return { id: docRef.id, ...deliveryPersonWithMeta };
    } catch (error) {
      console.error('Erro ao criar entregador:', error);
      throw error;
    }
  }

  async updateDeliveryPerson(deliveryPersonId, updateData) {
    try {
      const deliveryPersonRef = doc(this.deliveryPersonsRef, deliveryPersonId);
      await updateDoc(deliveryPersonRef, {
        ...updateData,
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar entregador:', error);
      throw error;
    }
  }

  async updateDeliveryPersonStatus(deliveryPersonId, status) {
    try {
      await this.updateDeliveryPerson(deliveryPersonId, {
        'status.current': status,
        'status.lastOnline': status === 'offline' ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  }

  async updateDeliveryPersonLocation(deliveryPersonId, location) {
    try {
      await this.updateDeliveryPerson(deliveryPersonId, {
        'location': {
          ...location,
          lastUpdate: Timestamp.now()
        },
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      throw error;
    }
  }

  // ========== ENTREGAS ==========

  async getDeliveries(filters = {}) {
    try {
      let q = query(this.deliveriesRef, orderBy('createdAt', 'desc'));

      if (filters.status) {
        q = query(q, where('deliveryInfo.deliveryStatus', '==', filters.status));
      }

      if (filters.deliveryPersonId) {
        q = query(q, where('deliveryInfo.deliveryPersonId', '==', filters.deliveryPersonId));
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

      const querySnapshot = await getDocs(q);
      const deliveries = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        deliveries.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          deliveryInfo: {
            ...data.deliveryInfo,
            assignedAt: data.deliveryInfo?.assignedAt?.toDate(),
            pickedUpAt: data.deliveryInfo?.pickedUpAt?.toDate(),
            onTheWayAt: data.deliveryInfo?.onTheWayAt?.toDate(),
            arrivedAt: data.deliveryInfo?.arrivedAt?.toDate(),
            deliveredAt: data.deliveryInfo?.deliveredAt?.toDate()
          },
          financialInfo: {
            ...data.financialInfo,
            paidAt: data.financialInfo?.paidAt?.toDate()
          }
        });
      });

      return deliveries;
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
      throw error;
    }
  }

  async createDeliveryFromOrder(orderId, deliveryPersonId = null) {
    try {
      // Buscar pedido
      const orderDoc = await getDoc(doc(this.ordersRef, orderId));
      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const order = orderDoc.data();
      
      // Criar entrega
      const deliveryData = {
        orderInfo: {
          orderId: orderId,
          orderNumber: order.orderNumber || 0,
          customerName: order.customer?.name || '',
          customerPhone: order.customer?.phone || '',
          customerAddress: order.customer?.address || '',
          customerNotes: order.notes || '',
          orderItems: order.items || [],
          orderTotal: order.total || 0,
          deliveryFee: order.deliveryFee || 0,
          totalAmount: order.total || 0,
          paymentMethod: order.paymentMethod || '',
          requiresChange: false,
          changeAmount: 0
        },
        deliveryInfo: {
          deliveryPersonId: deliveryPersonId,
          deliveryPersonName: '',
          deliveryPersonPhone: '',
          assignedAt: deliveryPersonId ? Timestamp.now() : null,
          deliveryStatus: deliveryPersonId ? 'assigned' : 'pending',
          deliveryNotes: ''
        },
        routeInfo: {
          pickupLocation: {
            latitude: -23.5505, // Coordenadas do restaurante
            longitude: -46.6333,
            address: 'Restaurante do Zé'
          },
          deliveryLocation: {
            latitude: 0,
            longitude: 0,
            address: order.customer?.address || ''
          },
          distance: 0,
          estimatedTime: 30
        },
        financialInfo: {
          deliveryFee: order.deliveryFee || 0,
          commission: 0,
          tip: 0,
          totalEarnings: 0,
          paymentStatus: 'pending'
        },
        restaurantId: this.restaurantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'system'
      };

      // Se houver entregador, buscar informações
      if (deliveryPersonId) {
        const deliveryPerson = await this.getDeliveryPersonById(deliveryPersonId);
        if (deliveryPerson) {
          deliveryData.deliveryInfo.deliveryPersonName = deliveryPerson.personalInfo?.fullName || '';
          deliveryData.deliveryInfo.deliveryPersonPhone = deliveryPerson.personalInfo?.phone || '';
          
          // Calcular comissão (15% do valor da entrega)
          const commissionRate = deliveryPerson.workInfo?.commissionRate || 0.15;
          deliveryData.financialInfo.commission = (order.deliveryFee || 0) * commissionRate;
          deliveryData.financialInfo.totalEarnings = deliveryData.financialInfo.commission;
        }
      }

      const docRef = await addDoc(this.deliveriesRef, deliveryData);
      
      // Atualizar status do pedido
      await updateDoc(doc(this.ordersRef, orderId), {
        status: deliveryPersonId ? 'out_for_delivery' : 'preparing',
        updatedAt: Timestamp.now()
      });

      return { id: docRef.id, ...deliveryData };
    } catch (error) {
      console.error('Erro ao criar entrega:', error);
      throw error;
    }
  }

  async assignDelivery(deliveryId, deliveryPersonId) {
    try {
      const delivery = await this.getDeliveryById(deliveryId);
      const deliveryPerson = await this.getDeliveryPersonById(deliveryPersonId);

      if (!delivery || !deliveryPerson) {
        throw new Error('Entrega ou entregador não encontrado');
      }

      const batch = writeBatch(db);

      // Atualizar entrega
      const deliveryRef = doc(this.deliveriesRef, deliveryId);
      batch.update(deliveryRef, {
        'deliveryInfo.deliveryPersonId': deliveryPersonId,
        'deliveryInfo.deliveryPersonName': deliveryPerson.personalInfo?.fullName || '',
        'deliveryInfo.deliveryPersonPhone': deliveryPerson.personalInfo?.phone || '',
        'deliveryInfo.assignedAt': Timestamp.now(),
        'deliveryInfo.deliveryStatus': 'assigned',
        'updatedAt': Timestamp.now()
      });

      // Atualizar pedido
      const orderRef = doc(this.ordersRef, delivery.orderInfo.orderId);
      batch.update(orderRef, {
        status: 'out_for_delivery',
        updatedAt: Timestamp.now()
      });

      // Atualizar entregador
      const deliveryPersonRef = doc(this.deliveryPersonsRef, deliveryPersonId);
      batch.update(deliveryPersonRef, {
        'status.current': 'busy',
        'updatedAt': Timestamp.now()
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Erro ao atribuir entrega:', error);
      throw error;
    }
  }

  async updateDeliveryStatus(deliveryId, status, additionalData = {}) {
    try {
      const deliveryRef = doc(this.deliveriesRef, deliveryId);
      const updates = {
        'deliveryInfo.deliveryStatus': status,
        'updatedAt': Timestamp.now()
      };

      // Adicionar timestamps específicos
      const timestampFields = {
        'picked_up': 'pickedUpAt',
        'on_the_way': 'onTheWayAt',
        'arrived': 'arrivedAt',
        'delivered': 'deliveredAt'
      };

      if (timestampFields[status]) {
        updates[`deliveryInfo.${timestampFields[status]}`] = Timestamp.now();
      }

      // Se entregue, calcular tempo real
      if (status === 'delivered') {
        const delivery = await this.getDeliveryById(deliveryId);
        if (delivery.deliveryInfo.assignedAt) {
          const assignedTime = delivery.deliveryInfo.assignedAt.getTime();
          const deliveredTime = new Date().getTime();
          const actualTime = Math.round((deliveredTime - assignedTime) / (1000 * 60)); // minutos
          
          updates['deliveryInfo.actualDeliveryTime'] = actualTime;
          
          // Atualizar performance do entregador
          await this.updateDeliveryPersonPerformance(
            delivery.deliveryInfo.deliveryPersonId,
            actualTime
          );
        }
      }

      await updateDoc(deliveryRef, {
        ...updates,
        ...additionalData
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  }

  async updateDeliveryPersonPerformance(deliveryPersonId, deliveryTime) {
    try {
      const deliveryPerson = await this.getDeliveryPersonById(deliveryPersonId);
      if (!deliveryPerson) return;

      const currentPerformance = deliveryPerson.performance;
      const totalDeliveries = currentPerformance.totalDeliveries + 1;
      const completedDeliveries = currentPerformance.completedDeliveries + 1;
      
      // Calcular nova média de tempo
      const totalTime = (currentPerformance.averageDeliveryTime * currentPerformance.completedDeliveries) + deliveryTime;
      const averageDeliveryTime = totalTime / completedDeliveries;

      // Calcular taxa de pontualidade (considerando 45 minutos como limite)
      const onTime = deliveryTime <= 45 ? 1 : 0;
      const onTimeRate = ((currentPerformance.onTimeRate * currentPerformance.completedDeliveries) + onTime) / completedDeliveries;

      await this.updateDeliveryPerson(deliveryPersonId, {
        'performance.totalDeliveries': totalDeliveries,
        'performance.completedDeliveries': completedDeliveries,
        'performance.averageDeliveryTime': averageDeliveryTime,
        'performance.onTimeRate': onTimeRate,
        'status.current': 'available',
        'updatedAt': Timestamp.now()
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar performance:', error);
      throw error;
    }
  }

  // ========== ESTATÍSTICAS ==========

  async getDeliveryStats(startDate, endDate) {
    try {
      const [deliveries, deliveryPersons] = await Promise.all([
        this.getDeliveries(),
        this.getDeliveryPersons()
      ]);

      const filteredDeliveries = deliveries.filter(delivery => {
        const deliveryDate = delivery.createdAt;
        return deliveryDate >= startDate && deliveryDate <= endDate;
      });

      const stats = {
        totalDeliveries: filteredDeliveries.length,
        completedDeliveries: filteredDeliveries.filter(d => d.deliveryInfo.deliveryStatus === 'delivered').length,
        pendingDeliveries: filteredDeliveries.filter(d => d.deliveryInfo.deliveryStatus === 'pending').length,
        inProgressDeliveries: filteredDeliveries.filter(d => 
          ['assigned', 'picked_up', 'on_the_way', 'arrived'].includes(d.deliveryInfo.deliveryStatus)
        ).length,
        cancelledDeliveries: filteredDeliveries.filter(d => d.deliveryInfo.deliveryStatus === 'cancelled').length,
        totalDeliveryPersons: deliveryPersons.length,
        availableDeliveryPersons: deliveryPersons.filter(dp => dp.status.current === 'available').length,
        busyDeliveryPersons: deliveryPersons.filter(dp => dp.status.current === 'busy').length,
        totalEarnings: filteredDeliveries.reduce((sum, d) => sum + (d.financialInfo?.totalEarnings || 0), 0),
        totalTips: filteredDeliveries.reduce((sum, d) => sum + (d.financialInfo?.tip || 0), 0),
        averageDeliveryTime: 0,
        onTimeRate: 0
      };

      // Calcular estatísticas de tempo
      const completed = filteredDeliveries.filter(d => d.deliveryInfo.deliveryStatus === 'delivered');
      if (completed.length > 0) {
        const totalTime = completed.reduce((sum, d) => sum + (d.deliveryInfo.actualDeliveryTime || 0), 0);
        stats.averageDeliveryTime = totalTime / completed.length;
        stats.onTimeRate = completed.filter(d => (d.deliveryInfo.actualDeliveryTime || 0) <= 45).length / completed.length;
      }

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // ========== LISTENERS ==========

  subscribeToDeliveries(callback, filters = {}) {
    let q = query(this.deliveriesRef, orderBy('createdAt', 'desc'));

    if (filters.status) {
      q = query(q, where('deliveryInfo.deliveryStatus', '==', filters.status));
    }

    return onSnapshot(q, (snapshot) => {
      const deliveries = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        deliveries.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        });
      });
      callback(deliveries);
    });
  }

  subscribeToDeliveryPersons(callback, filters = {}) {
    let q = query(this.deliveryPersonsRef);

    if (filters.isActive !== undefined) {
      q = query(q, where('status.isActive', '==', filters.isActive));
    }

    return onSnapshot(q, (snapshot) => {
      const deliveryPersons = [];
      snapshot.forEach((doc) => {
        deliveryPersons.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      callback(deliveryPersons);
    });
  }
}

export default DeliveryService;