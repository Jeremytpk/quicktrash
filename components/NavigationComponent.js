import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Circle } from '../components/WebCompatibleMap';
import { Ionicons } from '@expo/vector-icons';

const NavigationComponent = ({
  mapViewMode,
  setMapViewMode,
  toggle3DView,
  is3DEnabled,
  jobLocationPin,
  currentLocation,
  isWithinPickupRange,
  handlePinDragEnd,
  onNavigate,
  onArrived,
}) => {
  return (
    <View style={styles.navigationContainer}>
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

      {/* Navigation Button */}
      <View style={styles.navigationButtonContainer}>
        <TouchableOpacity
          style={[styles.navigationButton, isWithinPickupRange && styles.arrivedButton]}
          onPress={isWithinPickupRange ? onArrived : onNavigate}
        >
          <Text style={styles.navigationButtonText}>
            {isWithinPickupRange ? 'Arrived' : 'Navigate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  navigationButtonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  arrivedButton: {
    backgroundColor: '#34A853',
  },
  navigationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NavigationComponent;