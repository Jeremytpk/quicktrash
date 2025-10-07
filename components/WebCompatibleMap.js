import { Platform } from 'react-native';

// Web-compatible maps component
let MapView, Marker;

if (Platform.OS === 'web') {
  // For web, we'll use a placeholder or Google Maps JavaScript API
  MapView = ({ children, style, ...props }) => {
    return (
      <div style={{
        ...style,
        backgroundColor: '#e1e5e9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>
          Map View (Web Version)
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>
          Location services available on mobile app
        </div>
        {children}
      </div>
    );
  };
  
  Marker = ({ children, ...props }) => {
    return <div>{children}</div>;
  };
} else {
  // For mobile, use react-native-maps
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export { MapView, Marker };
export default MapView;
