import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const OrderBasket = ({ 
  iconSize = 24, 
  iconColor = '#333',
  showBadge = true,
  style = {} 
}) => {
  const navigation = useNavigation();
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to user's orders (simplified query to avoid index requirements)
    const ordersRef = collection(db, 'jobs');
    const q = query(
      ordersRef,
      where('customerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      // Sort orders client-side by creation date (most recent first)
      orders.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt - a.createdAt;
      });

      setOrderCount(orders.length);
      
      // Count pending/active orders
      const activePendingOrders = orders.filter(order => 
        ['pending', 'assigned', 'in_progress'].includes(order.status)
      ).length;
      
      setPendingOrders(activePendingOrders);
    }, (error) => {
      console.error('Error fetching orders:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleBasketPress = () => {
    navigation.navigate('OrderHistory');
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleBasketPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="basket-outline" size={iconSize} color={iconColor} />
        
        {showBadge && (pendingOrders > 0 || orderCount > 0) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {pendingOrders > 0 ? pendingOrders : orderCount > 99 ? '99+' : orderCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default OrderBasket;
