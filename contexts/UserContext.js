import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { View, ActivityIndicator, StyleSheet } from 'react-native'; // Import necessary components for loading state

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore to determine role
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(firebaseUser);
            // Derive role if missing using legacy flags
            let derivedRole = userData.role;
            if (!derivedRole) {
              if (userData.isContractor) derivedRole = 'contractor';
              else if (userData.isEmployee) derivedRole = 'employee';
              else if (userData.isCustomer) derivedRole = 'customer';
            }
            console.log('UserContext - User data:', userData);
            console.log('UserContext - Derived role:', derivedRole);
            setUserRole(derivedRole || null);
            setUserLocation(userData.currentLocation || null);
          } else {
            // User document doesn't exist, might be first login
            setUser(firebaseUser);
            setUserRole(null);
            setUserLocation(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser);
          setUserRole(null);
          setUserLocation(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserLocation(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const getHomeDashboard = () => {
    switch (userRole) {
      case 'customer':
        return 'CustomerDashboard';
      case 'contractor':
        return 'ContractorDashboard';
      case 'driver':
        return 'DashboardDriver';
      case 'employee':
        return 'EmployeeDashboard';
      default:
        return 'RoleSelection';
    }
  };

  const value = {
    user,
    userRole,
    userLocation,
    loading,
    getHomeDashboard,
    setUserRole,
    setUserLocation,
  };

  return (
    <UserContext.Provider value={value}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34A853" />
        </View>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserContext;