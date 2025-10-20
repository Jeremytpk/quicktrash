import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you are using Expo for icons

const DashboardDriver = () => {
  // Mock data for the current pickup
  const pickupDetails = {
    clientName: 'Sarah Johnson',
    address: '123 Oak St, Anytown, USA',
    payment: '$15.50',
    distance: '2.4 miles',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section with a welcome message and logo */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome, Driver!</Text>
        <Ionicons name="notifications" size={24} color="#004D99" />
      </View>

      {/* Map view section */}
      <View style={styles.mapContainer}>
        {/* A placeholder map image */}
        <Image
          source={{ uri: 'https://placehold.co/700x500/F5F5F5/004D99?text=QuickTrash+Map' }}
          style={styles.mapImage}
          resizeMode="cover"
        />
      </View>

      {/* Information card about the client and pickup details */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Current Pickup</Text>
        <View style={styles.detailRow}>
          <Ionicons name="person-circle-outline" size={20} color="#34A853" />
          <Text style={styles.detailText}>Client: {pickupDetails.clientName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color="#34A853" />
          <Text style={styles.detailText}>Address: {pickupDetails.address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={20} color="#34A853" />
          <Text style={styles.detailText}>Payment: {pickupDetails.payment}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="navigate-circle-outline" size={20} color="#34A853" />
          <Text style={styles.detailText}>Distance: {pickupDetails.distance}</Text>
        </View>
        
        <TouchableOpacity style={styles.pickupButton}>
          <Text style={styles.pickupButtonText}>Accept Pickup</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Blue background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#004D99', // Dark Blue
  },
  mapContainer: {
    flex: 1, // Takes up the majority of the screen
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#555',
  },
  pickupButton: {
    backgroundColor: '#34A853', // Green from the logo
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  pickupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DashboardDriver;
