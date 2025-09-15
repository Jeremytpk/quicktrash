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
            const userRole = userData.role;

            // Set the user role in the global context
            setUserRole(userRole);

            // Navigate to the appropriate dashboard based on the user's role
            switch (userRole) {
              case 'customer':
                navigation.replace('CustomerDashboard');
                break;
              case 'contractor':
                navigation.replace('ContractorDashboard');
                break;
              case 'employee':
                navigation.replace('EmployeeDashboard');
                break;
              default:
                navigation.replace('CustomerDashboard');
            }
          } else {
            // Document doesn't exist, maybe redirect to a signup or error screen
            console.error("User document not found in Firestore!");
            navigation.replace('Login');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          navigation.replace('Login');
        }
      } else {
        // User is not authenticated, redirect to login
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