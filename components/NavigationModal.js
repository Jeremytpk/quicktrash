import React from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, Circle } from '../components/WebCompatibleMap';
import { Ionicons } from '@expo/vector-icons';

const NavigationModal = ({
  visible,
  closeNavigation,
  openExternalNavigation,
  mapViewMode,
  setMapViewMode,
  toggle3DView,
  is3DEnabled,
  jobLocationPin,
  currentLocation,
  isWithinPickupRange,
  handlePinDragEnd,
  navigationJob,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.navigationModalContainer}>
        {/* Navigation Header */}
        <View style={styles.navigationHeader}>
          <TouchableOpacity onPress={closeNavigation} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.navigationTitle}>Navigate to Job</Text>
          <TouchableOpacity onPress={openExternalNavigation} style={styles.externalNavButton}>
            <Ionicons name="open-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Map View Controls */}
        <View style={styles.mapControlsSection}>
          <View style={styles.mapViewToggle}>
            <TouchableOpacity
              style={[styles.mapViewButton, mapViewMode === 'standard' && styles.mapViewButtonActive]}
              onPress={() => setMapViewMode('standard')}
            >
              <Text
                style={[styles.mapViewButtonText, mapViewMode === 'standard' && styles.mapViewButtonTextActive]}
              >
                2D
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapViewButton, mapViewMode === 'satellite' && styles.mapViewButtonActive]}
              onPress={() => setMapViewMode('satellite')}
            >
              <Text
                style={[styles.mapViewButtonText, mapViewMode === 'satellite' && styles.mapViewButtonTextActive]}
              >
                Satellite
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.threeDToggle, is3DEnabled && styles.threeDToggleActive]}
            onPress={toggle3DView}
          >
            <Ionicons
              name={is3DEnabled ? 'cube' : 'square-outline'}
              size={16}
              color={is3DEnabled ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[styles.threeDToggleText, is3DEnabled && styles.threeDToggleTextActive]}
            >
              3D
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        {jobLocationPin && (
          <View style={styles.navigationMapContainer}>
            <MapView
              style={styles.navigationMap}
              initialRegion={{
                latitude: jobLocationPin.latitude,
                longitude: jobLocationPin.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
              mapType={mapViewMode}
              showsCompass
              showsScale={false}
              showsPointsOfInterest={false}
              showsBuildings={is3DEnabled}
              showsTraffic={false}
              pitchEnabled={is3DEnabled}
              rotateEnabled={is3DEnabled}
              zoomEnabled
              scrollEnabled
            >
              {/* Pickup range circle (100 feet radius) */}
              <Circle
                center={jobLocationPin}
                radius={30.48} // 100 feet in meters
                fillColor="rgba(52, 168, 83, 0.15)"
                strokeColor="#34A853"
                strokeWidth={2}
              />

              {/* Contractor's current location */}
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Your Location"
                  description="Current position"
                >
                  <View style={styles.contractorMarker}>
                    <View
                      style={[styles.contractorMarkerInner, isWithinPickupRange && styles.contractorMarkerActive]}
                    >
                      <Ionicons name="car" size={16} color="#FFFFFF" />
                    </View>
                    {isWithinPickupRange && <View style={styles.contractorMarkerPulse} />}
                  </View>
                </Marker>
              )}

              {/* Job pickup location (draggable) */}
              <Marker
                coordinate={jobLocationPin}
                title="Pickup Location"
                description="Job pickup point"
                draggable
                onDragEnd={(e) => handlePinDragEnd(e.nativeEvent.coordinate)}
              >
                <View style={styles.jobMarker}>
                  <View style={styles.jobMarkerInner}>
                    <Ionicons name="location" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.jobMarkerStem} />
                </View>
              </Marker>
            </MapView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  navigationModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  externalNavButton: {
    padding: 8,
  },
  mapControlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mapViewToggle: {
    flexDirection: 'row',
  },
  mapViewButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
  },
  mapViewButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  mapViewButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  mapViewButtonTextActive: {
    color: '#FFFFFF',
  },
  threeDToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
  },
  threeDToggleActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  threeDToggleText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  threeDToggleTextActive: {
    color: '#FFFFFF',
  },
  navigationMapContainer: {
    flex: 1,
  },
  navigationMap: {
    ...StyleSheet.absoluteFillObject,
  },
  contractorMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorMarkerActive: {
    backgroundColor: '#34A853',
  },
  contractorMarkerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 168, 83, 0.3)',
  },
  jobMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobMarkerStem: {
    width: 4,
    height: 8,
    backgroundColor: '#EF4444',
    marginTop: -4,
  },
});

export default NavigationModal;