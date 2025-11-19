import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import SideMenu from './SideMenu';
import Logo from './Logo';

const SharedHeader = ({ 
  title, 
  subtitle, 
  showBackButton = false, 
  showHomeButton = true,
  rightComponent = null,
  backgroundColor = '#FFFFFF',
  titleColor = '#1F2937'
}) => {
  // Ensure boolean props are not strings
  const safeShowBackButton = typeof showBackButton === 'string' ? showBackButton === 'true' : !!showBackButton;
  const safeShowHomeButton = typeof showHomeButton === 'string' ? showHomeButton === 'true' : !!showHomeButton;
  const navigation = useNavigation();
  const { getHomeDashboard } = useUser();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const handleLogoPress = () => {
    setSideMenuVisible(true);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}> 
      <View style={[styles.container, { backgroundColor }]}> 
        <View style={styles.leftSection}> 
          {safeShowBackButton && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color={titleColor} />
            </TouchableOpacity>
          )}
          
          <View style={styles.titleContainer}> 
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            {subtitle && (
              <View style={styles.subtitleContainer}> 
                {typeof subtitle === 'string' ? (
                  <Text style={[styles.subtitle, { color: titleColor, opacity: 0.7 }]}> 
                    {subtitle}
                  </Text>
                ) : (
                  subtitle
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightSection}> 
          {rightComponent}
          
          {safeShowHomeButton && (
            <TouchableOpacity 
              style={styles.logoHomeButton} 
              onPress={handleLogoPress}
              activeOpacity={0.7}
            >
              <Logo variant="header" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <SideMenu 
        visible={sideMenuVisible} 
        onClose={() => setSideMenuVisible(false)} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitleContainer: {
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoHomeButton: {
    padding: 6,
  },
  logoContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  logoBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34A853',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34A853',
    opacity: 0.3,
    zIndex: 1,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default SharedHeader;
