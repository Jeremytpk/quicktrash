import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logo from '../components/Logo';

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to main app after 2.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('RoleSelection');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#34A853" />
      
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.logoBackground}>
          <Logo variant="splash" />
        </View>
        <View style={styles.logoGlow} />
      </Animated.View>

      <Animated.View 
        style={[styles.textContainer, { opacity: fadeAnim }]}
      >
        <Text style={styles.appName}>QuickTrash</Text>
        <Text style={styles.tagline}>On-demand trash pickup when you need it</Text>
      </Animated.View>

      <Animated.View 
        style={[styles.loadingContainer, { opacity: fadeAnim }]}
      >
        <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by QuickTrash Solutions</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
    zIndex: 1,
  },
  logoText: {
    color: '#34A853',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default SplashScreen;
