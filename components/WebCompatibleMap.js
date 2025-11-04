import React from 'react';
import { Platform, View, Text } from 'react-native';

// Web-compatible maps component
let MapView, Marker, Circle;

if (Platform.OS === 'web') {
  // For web, use React Native components instead of DOM elements
  MapView = ({ children, style, ...props }) => {
    const Component = ({ children, style, ...props }) => (
      <View style={[{
        backgroundColor: '#e1e5e9',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        flex: 1
      }, style]}>
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>
          Map View (Web Version)
        </Text>
        <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
          Location services available on mobile app
        </Text>
        {children}
      </View>
    );
    
    Component.Circle = ({ children, ...props }) => <View>{children}</View>;
    
    return <Component style={style} {...props}>{children}</Component>;
  };
  
  // Add Circle as a property of MapView for web
  MapView.Circle = ({ children, ...props }) => <View>{children}</View>;
  
  Marker = ({ children, ...props }) => {
    return <View>{children}</View>;
  };
  
  Circle = ({ children, ...props }) => <View>{children}</View>;
} else {
  // For mobile, use react-native-maps
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
    
    // Ensure Circle is attached to MapView
    if (MapView && !MapView.Circle) {
      MapView.Circle = Circle;
    }
  } catch (error) {
    console.warn('react-native-maps not available, using fallback');
    // Fallback components
    MapView = ({ children, style, ...props }) => (
      <View style={[{ backgroundColor: '#e1e5e9', minHeight: 200 }, style]}>
        <Text>Map not available</Text>
        {children}
      </View>
    );
    MapView.Circle = ({ children }) => <View>{children}</View>;
    Marker = ({ children }) => <View>{children}</View>;
    Circle = ({ children }) => <View>{children}</View>;
  }
}

export { Marker, Circle };
export default MapView;
