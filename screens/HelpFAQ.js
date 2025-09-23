import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';

const HelpFAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const faqData = [
    {
      id: '1',
      category: 'General',
      question: 'How does QuickTrash work?',
      answer: 'QuickTrash connects customers who need trash pickup with independent contractors. Simply request a pickup, get matched with a nearby contractor, and track your service in real-time.',
    },
    {
      id: '2',
      category: 'Pricing',
      question: 'How much does pickup cost?',
      answer: 'Pricing depends on the type and volume of waste, distance, and time of service. You\'ll see the exact price before confirming your order, with no hidden fees.',
    },
    {
      id: '3',
      category: 'Service',
      question: 'What types of waste do you accept?',
      answer: 'We accept household trash, bulk items, yard waste, construction debris, and recyclables. We do not accept hazardous materials, medical waste, or illegal substances.',
    },
    {
      id: '4',
      category: 'Payment',
      question: 'How do I pay for services?',
      answer: 'Payment is processed securely through the app using credit cards, debit cards, or digital wallets. You\'ll be charged after the pickup is completed.',
    },
    {
      id: '5',
      category: 'Scheduling',
      question: 'Can I schedule pickups in advance?',
      answer: 'Yes! You can schedule pickups up to 7 days in advance or request immediate pickup if contractors are available in your area.',
    },
    {
      id: '6',
      category: 'Contractors',
      question: 'How do I become a contractor?',
      answer: 'To become a contractor, select "Become a Picker" during registration, provide your vehicle information, pass a background check, and complete the verification process.',
    },
    {
      id: '7',
      category: 'Safety',
      question: 'Are contractors verified?',
      answer: 'Yes, all contractors undergo background checks, provide insurance information, and are required to follow safety protocols for waste handling and disposal.',
    },
    {
      id: '8',
      category: 'Support',
      question: 'What if I have an issue with my pickup?',
      answer: 'Contact our support team through the app or email support@quicktrash.com. We\'ll investigate and resolve any issues promptly.',
    },
  ];

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(faqData.map(item => item.category))];

  const renderFAQItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.faqItem}
      onPress={() => toggleExpanded(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.questionContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        
        <View style={styles.questionRow}>
          <Text style={styles.question}>{item.question}</Text>
          <Ionicons 
            name={expandedItems[item.id] ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6B7280" 
          />
        </View>
      </View>

      {expandedItems[item.id] && (
        <View style={styles.answerContainer}>
          <Text style={styles.answer}>{item.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SharedHeader title="Help & FAQ" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="headset-outline" size={24} color="#34A853" />
              <Text style={styles.quickActionText}>Contact Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="document-text-outline" size={24} color="#3B82F6" />
              <Text style={styles.quickActionText}>Report Issue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="star-outline" size={24} color="#F59E0B" />
              <Text style={styles.quickActionText}>Rate App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="chatbubble-outline" size={24} color="#8B5CF6" />
              <Text style={styles.quickActionText}>Live Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            <TouchableOpacity 
              style={[styles.categoryChip, !searchQuery && styles.activeCategoryChip]}
              onPress={() => setSearchQuery('')}
            >
              <Text style={[styles.categoryChipText, !searchQuery && styles.activeCategoryChipText]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                style={styles.categoryChip}
                onPress={() => setSearchQuery(category)}
              >
                <Text style={styles.categoryChipText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Search Results (${filteredFAQ.length})` : 'Frequently Asked Questions'}
          </Text>
          
          {filteredFAQ.length > 0 ? (
            <View style={styles.faqContainer}>
              {filteredFAQ.map(renderFAQItem)}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsText}>
                Try adjusting your search or browse by category
              </Text>
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <View style={styles.supportCard}>
            <Ionicons name="headset" size={32} color="#34A853" />
            <View style={styles.supportContent}>
              <Text style={styles.supportTitle}>Contact Our Support Team</Text>
              <Text style={styles.supportText}>
                Can't find what you're looking for? Our support team is here to help 24/7.
              </Text>
            </View>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>Get Help</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  categoriesScroll: {
    paddingLeft: 16,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeCategoryChip: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeCategoryChipText: {
    color: '#FFFFFF',
  },
  faqContainer: {
    paddingHorizontal: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionContainer: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 16,
  },
  answer: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  supportCard: {
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
  supportContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  supportButton: {
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HelpFAQ;
