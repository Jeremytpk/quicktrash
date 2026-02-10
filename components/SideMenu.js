import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import Logo from './Logo';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import JobMonitoring from '../screens/JobMonitoring';

const { width } = Dimensions.get('window');
const menuWidth = 320;

const SideMenu = ({ visible, onClose }) => {
  // Ensure 'visible' is always a boolean
  const safeVisible = typeof visible === 'string' ? visible === 'true' : !!visible;
  const navigation = useNavigation();
  const { user, userRole, setUserRole } = useUser();
  const [userPhotoURL, setUserPhotoURL] = useState(null);
  const [displayName, setDisplayName] = useState('User');

  // Animation values for the slide and overlay fade
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUserPhotoURL(userData.photoURL || user.photoURL || null);
            setDisplayName(userData.displayName || user.displayName || 'User');
          } else {
            setUserPhotoURL(user.photoURL || null);
            setDisplayName(user.displayName || 'User');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserPhotoURL(user.photoURL || null);
          setDisplayName(user.displayName || 'User');
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  // Trigger animations when the menu's visibility changes
  useEffect(() => {
    if (visible) {
      // Animate In
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width - menuWidth, // Slide menu into view from the right
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, // Fade in the overlay
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  // Handle the closing animation
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width, // Slide menu out of view to the right
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0, // Fade out the overlay
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose()); // Call the original onClose prop after animation finishes
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      handleClose(); // Use animated close
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleNavigation = (screen) => {
    handleClose(); // Use animated close
    // A slight delay ensures the animation is smooth before navigating
    setTimeout(() => {
      navigation.navigate(screen);
    }, 150);
  };

  // --- Menu structure logic remains the same ---
  const getMenuSections = () => {
    switch (userRole) {
      case 'customer':
        return [
          {
            title: 'Main',
            items: [
              { title: 'Dashboard', icon: 'home-outline', screen: 'CustomerDashboard' },
              { title: 'Create Order', icon: 'add-circle-outline', screen: 'CreateOrder' },
              { title: 'Order History', icon: 'time-outline', screen: 'OrderHistory' },
            ]
          },
          {
            title: 'Account & Payments',
            items: [
              { title: 'Payment Methods', icon: 'card-outline', screen: 'PaymentMethods' },
              { title: 'Profile', icon: 'person-outline', screen: 'Profile' },
              { title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
            ]
          },
          {
            title: 'Settings & Support',
            items: [
              { title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
              { title: 'Help & FAQ', icon: 'help-circle-outline', screen: 'HelpFAQ' },
              { title: 'Contact Support', icon: 'headset-outline', screen: 'ContactSupport' },
            ]
          }
        ];

      case 'contractor':
        return [
          {
            title: 'Work',
            items: [
              { title: 'Dashboard', icon: 'home-outline', screen: 'ContractorDashboard' },
              { title: 'Available Jobs', icon: 'briefcase-outline', screen: 'AvailableJobs' },
              { title: 'My Jobs', icon: 'checkmark-circle-outline', screen: 'MyJobs' },
              { title: 'Earnings', icon: 'cash-outline', screen: 'Earnings' },
            ]
          },
          {
            title: 'Vehicle & Safety',
            items: [
              { title: 'Vehicle Info', icon: 'car-outline', screen: 'VehicleInfo' },
              { title: 'Safety Toolkit', icon: 'shield-checkmark-outline', screen: 'SafetyToolkit' },
            ]
          },
          {
            title: 'Account & Settings',
            items: [
              { title: 'Profile', icon: 'person-outline', screen: 'Profile' },
              { title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
              { title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
              { title: 'Help & FAQ', icon: 'help-circle-outline', screen: 'HelpFAQ' },
            ]
          }
        ];

      case 'employee':
        return [
          {
            title: 'Administration',
            items: [
              { title: 'Dashboard', icon: 'home-outline', screen: 'EmployeeDashboard' },
              { title: 'User Management', icon: 'people-outline', screen: 'UserManagement' },
              { title: 'Job Monitoring', icon: 'eye-outline', screen: 'JobMonitoring' },
              { title: 'Analytics', icon: 'analytics-outline', screen: 'Analytics' },
            ]
          },
          {
            title: 'Operations',
            items: [
              { title: 'Disputes', icon: 'alert-circle-outline', screen: 'Disputes' },
              { title: 'Admin Tools', icon: 'construct-outline', screen: 'AdminTools' },
            ]
          },
          {
            title: 'Personal',
            items: [
              { title: 'Profile', icon: 'person-outline', screen: 'Profile' },
              { title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
              { title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
              { title: 'Help & FAQ', icon: 'help-circle-outline', screen: 'HelpFAQ' },
            ]
          }
        ];

      default:
        return [
          {
            title: 'General',
            items: [
              { title: 'Profile', icon: 'person-outline', screen: 'Profile' },
              { title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' },
              { title: 'Settings', icon: 'settings-outline', screen: 'Settings' },
              { title: 'Help & FAQ', icon: 'help-circle-outline', screen: 'HelpFAQ' },
            ]
          }
        ];
    }
  };

  const menuSections = getMenuSections();

  return (
    <Modal
      visible={safeVisible}
      transparent={true}
      animationType="none" // We use our custom animations now
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Fading overlay */}
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        
        {/* Sliding menu */}
        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <View style={styles.profileImageContainer}>
                  {userPhotoURL ? (
                    <Image 
                      source={{ uri: userPhotoURL }} 
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <Logo variant="menu" />
                    </View>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {displayName}
                  </Text>
                  <Text style={styles.userRole}>
                    {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
              {menuSections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.menuSection}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.items.map((item, itemIndex) => (
                    <TouchableOpacity
                      key={itemIndex}
                      style={styles.menuItem}
                      onPress={() => handleNavigation(item.screen)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={item.icon} size={22} color="#4B5563" />
                      <Text style={styles.menuItemText}>{item.title}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              
              {/* Legal Section */}
              <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Legal</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigation('PrivacyPolicy')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-outline" size={22} color="#4B5563" />
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigation('TermsConditions')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={22} color="#4B5563" />
                  <Text style={styles.menuItemText}>Terms & Conditions</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigation('About')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#4B5563" />
                  <Text style={styles.menuItemText}>About</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
              
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Styles updated to support the new animation layout
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: menuWidth,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 8,
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#DC2626',
    marginLeft: 16,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default SideMenu;