import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SharedHeader from '../components/SharedHeader';

const PrivacyPolicy = () => {
  return (
    <View style={styles.container}>
      <SharedHeader title="Privacy Policy" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.documentContainer}>
          <Text style={styles.lastUpdated}>Last updated: January 15, 2025</Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, such as when you create an account, 
            make a purchase, or contact us for support. This may include your name, email address, 
            phone number, payment information, and location data.
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to provide, maintain, and improve our services, 
            process transactions, send you technical notices and support messages, and communicate 
            with you about products, services, and promotional offers.
          </Text>

          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell, rent, or share your personal information with third parties except as 
            described in this policy. We may share your information with service providers who 
            perform services on our behalf, such as payment processing and customer support.
          </Text>

          <Text style={styles.sectionTitle}>4. Location Information</Text>
          <Text style={styles.paragraph}>
            Our app collects location information to enable pickup services and match you with 
            nearby contractors. You can disable location services through your device settings, 
            though this may limit app functionality.
          </Text>

          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction. However, no method of 
            transmission over the internet is 100% secure.
          </Text>

          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as necessary to provide our services 
            and fulfill the purposes outlined in this policy, unless a longer retention period is 
            required by law.
          </Text>

          <Text style={styles.sectionTitle}>7. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to access, update, or delete your personal information. You may also 
            opt out of certain communications from us. To exercise these rights, please contact us 
            through the app or at privacy@quicktrash.com.
          </Text>

          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13. If we learn that we have collected 
            such information, we will take steps to delete it.
          </Text>

          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new policy in the app and updating the "Last updated" date.
          </Text>

          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this privacy policy, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>
            Email: privacy@quicktrash.com{'\n'}
            Phone: (555) 123-4567{'\n'}
            Address: 123 Privacy St, Atlanta, GA 30309
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using QuickTrash, you acknowledge that you have read and understood this Privacy Policy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  documentContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  contactInfo: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34A853',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrivacyPolicy;
