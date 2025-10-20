import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SharedHeader from '../components/SharedHeader';

const TermsConditions = () => {
  return (
    <View style={styles.container}>
      <SharedHeader title="Terms & Conditions" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.documentContainer}>
          <Text style={styles.lastUpdated}>Last updated: January 15, 2025</Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By downloading, installing, or using the QuickTrash mobile application, you agree to be 
            bound by these Terms and Conditions. If you do not agree with any part of these terms, 
            you may not use our service.
          </Text>

          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            QuickTrash is an on-demand waste management platform that connects customers needing 
            trash pickup services with independent contractors. We provide the technology platform 
            but do not directly provide waste collection services.
          </Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You must create an account to use our services. You are responsible for maintaining 
            the confidentiality of your account credentials and for all activities that occur under 
            your account. You must provide accurate and complete information when creating your account.
          </Text>

          <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Customers:</Text> Must provide accurate information about waste 
            type and volume, ensure trash is accessible, and pay for completed services.{'\n\n'}
            <Text style={styles.bold}>Contractors:</Text> Must have proper licensing and insurance, 
            provide reliable service, and dispose of waste at approved facilities.{'\n\n'}
            <Text style={styles.bold}>All Users:</Text> Must comply with local laws and regulations, 
            treat others with respect, and not use the service for illegal activities.
          </Text>

          <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
          <Text style={styles.paragraph}>
            You may not use QuickTrash to dispose of hazardous materials, illegal substances, 
            medical waste, or any materials prohibited by local regulations. You may not use the 
            service to harass, threaten, or harm others.
          </Text>

          <Text style={styles.sectionTitle}>6. Payment Terms</Text>
          <Text style={styles.paragraph}>
            Customers agree to pay the quoted price for completed services. Payments are processed 
            through our secure payment system. We reserve the right to change our pricing with 
            reasonable notice.
          </Text>

          <Text style={styles.sectionTitle}>7. Cancellation Policy</Text>
          <Text style={styles.paragraph}>
            Customers may cancel pickup requests up to 1 hour before the scheduled time without 
            penalty. Cancellations made less than 1 hour before pickup may incur a cancellation fee. 
            Contractors may cancel accepted jobs with reasonable notice.
          </Text>

          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            QuickTrash serves as a platform connecting users and is not liable for the actions of 
            customers or contractors. Our liability is limited to the amount paid for the specific 
            service in question. We are not responsible for property damage or personal injury.
          </Text>

          <Text style={styles.sectionTitle}>9. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold QuickTrash harmless from any claims, damages, or expenses 
            arising from your use of the service, your violation of these terms, or your violation 
            of any law or regulation.
          </Text>

          <Text style={styles.sectionTitle}>10. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The QuickTrash app and all content, features, and functionality are owned by QuickTrash 
            and are protected by intellectual property laws. You may not copy, modify, or distribute 
            our content without permission.
          </Text>

          <Text style={styles.sectionTitle}>11. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy, which explains how 
            we collect, use, and protect your information when you use our service.
          </Text>

          <Text style={styles.sectionTitle}>12. Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Any disputes arising from the use of QuickTrash will be resolved through binding 
            arbitration in accordance with the rules of the American Arbitration Association. 
            You waive the right to participate in class action lawsuits.
          </Text>

          <Text style={styles.sectionTitle}>13. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for violation of these terms or 
            for any other reason. You may delete your account at any time through the app settings.
          </Text>

          <Text style={styles.sectionTitle}>14. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these terms at any time. We will notify users of 
            significant changes through the app or email. Continued use of the service after 
            changes constitute acceptance of the new terms.
          </Text>

          <Text style={styles.sectionTitle}>15. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms are governed by the laws of the State of Georgia, United States, without 
            regard to conflict of law principles.
          </Text>

          <Text style={styles.sectionTitle}>16. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms and Conditions, please contact us:
          </Text>
          <Text style={styles.contactInfo}>
            Email: legal@quicktrash.com{'\n'}
            Phone: (555) 123-4567{'\n'}
            Address: 123 Legal St, Atlanta, GA 30309
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using QuickTrash, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
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
  bold: {
    fontWeight: '600',
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

export default TermsConditions;
