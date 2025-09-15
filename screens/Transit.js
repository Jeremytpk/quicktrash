import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { auth } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const Transit = ({ navigation }) => {
  const { setUserRole } = useUser();

  useEffect(() => {
    const checkUserRoleAndRedirect = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const { isCustomer, isContractor, isEmployee } = userData;

            // Set the role in the global context based on the flags
            if (isEmployee) {
              setUserRole('employee');
              navigation.replace('EmployeeDashboard');
            } else if (isContractor) {
              setUserRole('contractor');
              navigation.replace('ContractorDashboard');
            } else if (isCustomer) {
              setUserRole('customer');
              navigation.replace('CustomerDashboard');
            } else {
              // Default to customer dashboard if no role is explicitly set
              setUserRole('customer');
              navigation.replace('CustomerDashboard');
            }

          } else {
            console.error("User document not found in Firestore!");
            navigation.replace('Login');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          navigation.replace('Login');
        }
      } else {
        navigation.replace('Login');
      }
    };

    checkUserRoleAndRedirect();
  }, [navigation, setUserRole]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#34A853" />
      <Text style={styles.text}>Checking credentials...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
});

export default Transit;