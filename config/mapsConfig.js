// Google Maps Configuration
export const MAPS_CONFIG = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyBZ1Dsh7_p2AlwvakoKXPUAKwI3QtjulSg',
  
  // Default map region (Atlanta, GA)
  DEFAULT_REGION: {
    latitude: 33.7490,
    longitude: -84.3880,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  
  // Map styling options
  MAP_STYLE: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ],
  
  // Marker configurations
  MARKERS: {
    CUSTOMER: {
      color: '#3B82F6',
      size: 30
    },
    CONTRACTOR: {
      color: '#34A853', 
      size: 30
    },
    JOB: {
      color: '#FF8F00',
      size: 25
    }
  }
};

export default MAPS_CONFIG;
