import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedHeader from '../components/SharedHeader';
import { useUser } from '../contexts/UserContext';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const Profile = () => {
  const { user, userRole } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState({});
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    businessType: '',
    vehicleType: '',
    vehicleModel: '',
    licensePlate: '',
    department: '',
    jobTitle: '',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData({
            displayName: data.displayName || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            businessType: data.businessType || '',
            vehicleType: data.vehicleType || '',
            vehicleModel: data.vehicleModel || '',
            licensePlate: data.licensePlate || '',
            department: data.department || '',
            jobTitle: data.jobTitle || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: formData.displayName,
      });

      // Update Firestore document
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: serverTimestamp(),
      });

      setUserData(formData);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: userData.displayName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || '',
      businessType: userData.businessType || '',
      vehicleType: userData.vehicleType || '',
      vehicleModel: userData.vehicleModel || '',
      licensePlate: userData.licensePlate || '',
      department: userData.department || '',
      jobTitle: userData.jobTitle || '',
    });
    setEditing(false);
  };

  const renderField = (label, value, field, placeholder, keyboardType = 'default') => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={field === 'email' ? 'none' : 'words'}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Not specified'}</Text>
      )}
    </View>
  );

  const renderRoleSpecificFields = () => {
    switch (userRole) {
      case 'customer':
        return (
          <>
            {renderField('Business Type', formData.businessType, 'businessType', 'e.g., Restaurant, Office')}
            {renderField('Address', formData.address, 'address', 'Your address')}
          </>
        );
      case 'contractor':
        return (
          <>
            {renderField('Vehicle Type', formData.vehicleType, 'vehicleType', 'e.g., Pickup Truck, Cargo Van')}
            {renderField('Vehicle Model', formData.vehicleModel, 'vehicleModel', 'e.g., 2020 Ford F-150')}
            {renderField('License Plate', formData.licensePlate, 'licensePlate', 'e.g., ABC-123')}
          </>
        );
      case 'employee':
        return (
          <>
            {renderField('Department', formData.department, 'department', 'e.g., Operations, Support')}
            {renderField('Job Title', formData.jobTitle, 'jobTitle', 'e.g., Operations Manager')}
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SharedHeader title="Profile" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34A853" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SharedHeader 
        title="Profile" 
        showBackButton 
        rightComponent={
          !editing ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="pencil" size={20} color="#34A853" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBackground}>
              <Text style={styles.avatarText}>
                {(formData.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            {editing && (
              <TouchableOpacity style={styles.changePhotoButton}>
                <Ionicons name="camera" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.displayName}>{formData.displayName || 'User'}</Text>
          <View style={styles.roleContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {renderField('Full Name', formData.displayName, 'displayName', 'Enter your full name')}
          {renderField('Email', formData.email, 'email', 'Enter your email', 'email-address')}
          {renderField('Phone', formData.phone, 'phone', 'Enter your phone number', 'phone-pad')}

          {/* Role-specific fields */}
          {renderRoleSpecificFields() && (
            <>
              <Text style={styles.sectionTitle}>
                {userRole === 'customer' ? 'Business Details' : 
                 userRole === 'contractor' ? 'Vehicle Information' : 
                 'Work Information'}
              </Text>
              {renderRoleSpecificFields()}
            </>
          )}

          {/* Action Buttons */}
          {editing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Account Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#6B7280" />
              <Text style={styles.statValue}>
                {userData.createdAt ? 
                  new Date(userData.createdAt.toDate()).getFullYear() : 
                  'N/A'
                }
              </Text>
              <Text style={styles.statLabel}>Member Since</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#34A853" />
              <Text style={styles.statValue}>Verified</Text>
              <Text style={styles.statLabel}>Account Status</Text>
            </View>
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
    paddingTop: Platform.OS === 'android' ? 25 : 20,
    paddingBottom: Platform.OS === 'android' ? 45 : 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34A853',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  roleContainer: {
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveButton: {
    backgroundColor: '#34A853',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default Profile;
