import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const About = () => {
  const handleContactPress = (type) => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:support@quicktrash.com');
        break;
      case 'phone':
        Linking.openURL('tel:+15551234567');
        break;
      case 'website':
        Linking.openURL('https://quicktrash.com');
        break;
      case 'social':
        Linking.openURL('https://twitter.com/quicktrash');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="About QuickTrash" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Logo and Info */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoText}>QT</Text>
            </View>
            <View style={styles.logoGlow} />
          </View>
          <Text style={styles.appName}>QuickTrash</Text>
          <Text style={styles.version}>Version 1.0.0 (Build 100)</Text>
          <Text style={styles.tagline}>On-demand trash pickup when you need it</Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            QuickTrash is revolutionizing waste management by connecting customers who need 
            immediate trash removal with a network of vetted, independent contractors. We're 
            making waste disposal convenient, reliable, and environmentally responsible.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Request pickup through the app</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Get matched with a nearby contractor</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Track pickup and pay securely</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureList}>
            <View style={styles.feature}>
              <Ionicons name="flash" size={20} color="#34A853" />
              <Text style={styles.featureText}>On-demand pickup service</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="location" size={20} color="#34A853" />
              <Text style={styles.featureText}>Real-time tracking</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={20} color="#34A853" />
              <Text style={styles.featureText}>Vetted contractors</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="card" size={20} color="#34A853" />
              <Text style={styles.featureText}>Secure payments</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="leaf" size={20} color="#34A853" />
              <Text style={styles.featureText}>Eco-friendly disposal</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="chatbubble" size={20} color="#34A853" />
              <Text style={styles.featureText}>In-app communication</Text>
            </View>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <Text style={styles.paragraph}>
            QuickTrash Solutions LLC was founded in 2024 with the vision of making waste 
            management more efficient and accessible. Based in Atlanta, Georgia, we serve 
            customers throughout the state with plans for nationwide expansion.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('email')}
          >
            <Ionicons name="mail" size={20} color="#6B7280" />
            <Text style={styles.contactText}>support@quicktrash.com</Text>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('phone')}
          >
            <Ionicons name="call" size={20} color="#6B7280" />
            <Text style={styles.contactText}>(555) 123-4567</Text>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('website')}
          >
            <Ionicons name="globe" size={20} color="#6B7280" />
            <Text style={styles.contactText}>www.quicktrash.com</Text>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('social')}
          >
            <Ionicons name="logo-twitter" size={20} color="#6B7280" />
            <Text style={styles.contactText}>@quicktrash</Text>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Text style={styles.legalText}>
            © 2025 QuickTrash Solutions LLC. All rights reserved.{'\n'}
            QuickTrash is a registered trademark of QuickTrash Solutions LLC.
          </Text>
        </View>

        {/* Technical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Information</Text>
          <View style={styles.techInfo}>
            <Text style={styles.techItem}>Platform: React Native + Expo</Text>
            <Text style={styles.techItem}>Backend: Firebase</Text>
            <Text style={styles.techItem}>Maps: Google Maps API</Text>
            <Text style={styles.techItem}>Payments: Stripe</Text>
            <Text style={styles.techItem}>Last Updated: January 15, 2025</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing QuickTrash!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#34A853',
    opacity: 0.3,
    zIndex: 1,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'justify',
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  featureList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    marginLeft: 12,
  },
  legalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  techInfo: {
    gap: 8,
  },
  techItem: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 16,
    color: '#34A853',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default About;
