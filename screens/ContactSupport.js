import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const ContactSupport = () => {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const supportTopics = [
    { id: 'general', title: 'General Question', icon: 'help-circle-outline' },
    { id: 'billing', title: 'Billing Issue', icon: 'card-outline' },
    { id: 'technical', title: 'Technical Problem', icon: 'bug-outline' },
    { id: 'service', title: 'Service Issue', icon: 'alert-circle-outline' },
    { id: 'feedback', title: 'Feedback', icon: 'chatbubble-outline' },
  ];

  const handleSubmit = () => {
    if (!selectedTopic || !message) {
      Alert.alert('Error', 'Please select a topic and enter your message.');
      return;
    }
    Alert.alert('Success', 'Your message has been sent! We\'ll get back to you within 24 hours.');
    setSelectedTopic('');
    setMessage('');
    setEmail('');
  };

  return (
    <View style={styles.container}>
      <SharedHeader title="Contact Support" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="call" size={24} color="#34A853" />
              <Text style={styles.quickActionTitle}>Call Us</Text>
              <Text style={styles.quickActionSubtitle}>(555) 123-4567</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="chatbubble" size={24} color="#3B82F6" />
              <Text style={styles.quickActionTitle}>Live Chat</Text>
              <Text style={styles.quickActionSubtitle}>Available 24/7</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>What can we help you with?</Text>
            <View style={styles.topicGrid}>
              {supportTopics.map(topic => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicChip,
                    selectedTopic === topic.id && styles.selectedTopicChip
                  ]}
                  onPress={() => setSelectedTopic(topic.id)}
                >
                  <Ionicons 
                    name={topic.icon} 
                    size={20} 
                    color={selectedTopic === topic.id ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.topicText,
                    selectedTopic === topic.id && styles.selectedTopicText
                  ]}>
                    {topic.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Email (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Describe your issue</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              placeholder="Please describe your issue or question in detail..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Link */}
        <View style={styles.section}>
          <View style={styles.faqCard}>
            <Ionicons name="help-circle" size={32} color="#6B7280" />
            <View style={styles.faqContent}>
              <Text style={styles.faqTitle}>Check our FAQ</Text>
              <Text style={styles.faqText}>
                You might find the answer to your question in our FAQ section.
              </Text>
            </View>
            <TouchableOpacity style={styles.faqButton}>
              <Text style={styles.faqButtonText}>View FAQ</Text>
            </TouchableOpacity>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 16,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  selectedTopicChip: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedTopicText: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  faqContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  faqText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  faqButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  faqButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});

export default ContactSupport;
