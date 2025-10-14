import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useUser } from '../contexts/UserContext';

const Settings = ({ navigation }) => {
  const { userRole } = useUser();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    jobAlerts: true,
    marketingEmails: false,
    soundEnabled: true,
    vibrationEnabled: true,
    locationServices: true,
    biometricAuth: false,
    darkMode: false,
  });

  const handleToggleSetting = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset your password? You will receive an email with instructions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Reset Email', 
          onPress: () => {
            Alert.alert('Success', 'Password reset email has been sent to your email address.');
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Please contact support to complete account deletion.');
          }
        },
      ]
    );
  };

  const renderSettingItem = (icon, title, subtitle, hasSwitch = false, settingKey = null, onPress = null) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={hasSwitch}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {hasSwitch ? (
        <Switch
          value={settings[settingKey]}
          onValueChange={() => handleToggleSetting(settingKey)}
          trackColor={{ false: '#E5E7EB', true: '#34A853' }}
          thumbColor={settings[settingKey] ? '#FFFFFF' : '#9CA3AF'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader title="Settings" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        {renderSection('Notifications', [
          renderSettingItem(
            'notifications-outline',
            'Push Notifications',
            'Receive notifications for job updates',
            true,
            'pushNotifications'
          ),
          renderSettingItem(
            'mail-outline',
            'Email Notifications',
            'Receive email updates',
            true,
            'emailNotifications'
          ),
          renderSettingItem(
            'chatbubble-outline',
            'SMS Notifications',
            'Receive text message alerts',
            true,
            'smsNotifications'
          ),
          userRole === 'contractor' && renderSettingItem(
            'briefcase-outline',
            'Job Alerts',
            'Get notified about new job opportunities',
            true,
            'jobAlerts'
          ),
          renderSettingItem(
            'megaphone-outline',
            'Marketing Emails',
            'Receive promotional offers and updates',
            true,
            'marketingEmails'
          ),
        ].filter(Boolean))}

        {/* App Preferences */}
        {renderSection('App Preferences', [
          renderSettingItem(
            'volume-high-outline',
            'Sound',
            'Enable notification sounds',
            true,
            'soundEnabled'
          ),
          renderSettingItem(
            'phone-portrait-outline',
            'Vibration',
            'Enable vibration for notifications',
            true,
            'vibrationEnabled'
          ),
          renderSettingItem(
            'moon-outline',
            'Dark Mode',
            'Switch to dark theme',
            true,
            'darkMode'
          ),
        ])}

        {/* Privacy & Security */}
        {renderSection('Privacy & Security', [
          renderSettingItem(
            'location-outline',
            'Location Services',
            'Allow app to access your location',
            true,
            'locationServices'
          ),
          renderSettingItem(
            'finger-print-outline',
            'Biometric Authentication',
            'Use fingerprint or face ID to unlock',
            true,
            'biometricAuth'
          ),
          renderSettingItem(
            'key-outline',
            'Change Password',
            'Update your account password',
            false,
            null,
            handleResetPassword
          ),
          renderSettingItem(
            'shield-outline',
            'Privacy Policy',
            'View our privacy policy',
            false,
            null,
            () => navigation.navigate('PrivacyPolicy')
          ),
          renderSettingItem(
            'document-text-outline',
            'Terms & Conditions',
            'View terms of service',
            false,
            null,
            () => navigation.navigate('TermsConditions')
          ),
        ])}

        {/* Support */}
        {renderSection('Support', [
          renderSettingItem(
            'help-circle-outline',
            'Help & FAQ',
            'Get help and view frequently asked questions',
            false,
            null,
            () => navigation.navigate('HelpFAQ')
          ),
          renderSettingItem(
            'headset-outline',
            'Contact Support',
            'Get in touch with our support team',
            false,
            null,
            () => navigation.navigate('ContactSupport')
          ),
          renderSettingItem(
            'bug-outline',
            'Report a Bug',
            'Help us improve the app',
            false,
            null,
            () => Alert.alert('Report Bug', 'Thank you for helping us improve!')
          ),
        ])}

        {/* About */}
        {renderSection('About', [
          renderSettingItem(
            'information-circle-outline',
            'About QuickTrash',
            'Learn more about our app',
            false,
            null,
            () => navigation.navigate('About')
          ),
          renderSettingItem(
            'star-outline',
            'Rate the App',
            'Rate us on the App Store',
            false,
            null,
            () => Alert.alert('Thank You!', 'Thank you for considering rating our app!')
          ),
          renderSettingItem(
            'share-outline',
            'Share with Friends',
            'Invite friends to use QuickTrash',
            false,
            null,
            () => Alert.alert('Share', 'Share QuickTrash with your friends!')
          ),
        ])}

        {/* Account Management */}
        {renderSection('Account', [
          renderSettingItem(
            'log-out-outline',
            'Sign Out',
            'Sign out of your account',
            false,
            null,
            () => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Sign Out', 
                    style: 'destructive',
                    onPress: () => navigation.reset({
                      index: 0,
                      routes: [{ name: 'RoleSelection' }],
                    })
                  },
                ]
              );
            }
          ),
          renderSettingItem(
            'trash-outline',
            'Delete Account',
            'Permanently delete your account',
            false,
            null,
            handleDeleteAccount
          ),
        ])}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>QuickTrash v1.0.0</Text>
          <Text style={styles.buildText}>Build 100</Text>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default Settings;
