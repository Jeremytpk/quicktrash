import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Logo = ({ 
  size = 'medium', // 'small', 'medium', 'large', 'xlarge', or number
  showText = false, 
  variant = 'default', // 'default', 'header', 'splash', 'menu'
  style = {},
  imageStyle = {},
  textStyle = {}
}) => {
  // Calculate responsive size based on screen dimensions and platform
  const getLogoSize = () => {
    const baseSize = Math.min(screenWidth, screenHeight);
    const isTablet = baseSize > 768;
    const scaleFactor = Platform.OS === 'ios' ? 1 : 0.95; // Slightly smaller on Android
    
    if (typeof size === 'number') {
      return size * scaleFactor;
    }
    
    switch (variant) {
      case 'splash':
        return (isTablet ? 120 : 100) * scaleFactor;
      case 'header':
        return (isTablet ? 40 : 32) * scaleFactor;
      case 'menu':
        return (isTablet ? 56 : 48) * scaleFactor;
      default:
        switch (size) {
          case 'small':
            return (isTablet ? 24 : 20) * scaleFactor;
          case 'medium':
            return (isTablet ? 40 : 32) * scaleFactor;
          case 'large':
            return (isTablet ? 64 : 56) * scaleFactor;
          case 'xlarge':
            return (isTablet ? 80 : 72) * scaleFactor;
          default:
            return (isTablet ? 40 : 32) * scaleFactor;
        }
    }
  };

  const getTextSize = () => {
    const logoSize = getLogoSize();
    return Math.max(logoSize * 0.25, 10);
  };

  const logoSize = getLogoSize();
  const textSize = getTextSize();

  // Use the new transparent QT logo
  const logoSource = { 
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjwhLS0gRGFzaCBsaW5lcyAtLT4KPHN0eWxlPgo8IVtDREFUQVsKLnN0cm9rZS1kYXNoIHsKICBzdHJva2UtZGFzaGFycmF5OiA0IDI7CiAgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOwp9Cl1dPgo8L3N0eWxlPgoKPCEtLSBUcmFzaCBjYW4gY29udGFpbmVyIC0tPgo8cmVjdCB4PSIyNyIgeT0iMjgiIHdpZHRoPSI0NiIgaGVpZ2h0PSI1NiIgcng9IjQiIGZpbGw9IiMxNDY2QjgiIHN0cm9rZT0iIzE0NjZCOCIgc3Ryb2tlLXdpZHRoPSIyIi8+Cgo8IS0tIFRyYXNoIGNhbiBsaWQgLS0+CjxyZWN0IHg9IjIyIiB5PSIyNCIgd2lkdGg9IjU2IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSIjMTQ2NkI4Ii8+Cgo8IS0tIENoZWNrbWFyayAtLT4KPHBhdGggZD0iTTM4IDQ4TDQ0IDU0TDYyIDM2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgoKPCEtLSBNb3Rpb24gbGluZXMgLS0+CjxwYXRoIGQ9Ik0xMCA0MEgyNSIgc3Ryb2tlPSIjMTQ2NkI4IiBzdHJva2Utd2lkdGg9IjMiIGNsYXNzPSJzdHJva2UtZGFzaCIvPgo8cGF0aCBkPSJNMTAgNTBIMjIiIHN0cm9rZT0iIzE0NjZCOCIgc3Ryb2tlLXdpZHRoPSIzIiBjbGFzcz0ic3Ryb2tlLWRhc2giLz4KPHA+dGggZD0iTTEwIDYwSDE4IiBzdHJva2U9IiMxNDY2QjgiIHN0cm9rZS13aWR0aD0iMyIgY2xhc3M9InN0cm9rZS1kYXNoIi8+Cgo8IS0tIFEgTGV0dGVyIC0tPgo8Y2lyY2xlIGN4PSIxMjUiIGN5PSI1MCIgcj0iMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzE0NjZCOCIgc3Ryb2tlLXdpZHRoPSI2Ii8+CjxwYXRoIGQ9Ik0xNDAgNjVMMTUwIDc1IiBzdHJva2U9IiMxNDY2QjgiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cgo8IS0tIFQgTGV0dGVyIC0tPgo8cGF0aCBkPSJNMTY1IDI1SDE5NSIgc3Ryb2tlPSIjNjhCOTgzIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTgwIDI1Vjc1IiBzdHJva2U9IiM2OEI5ODMiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=' 
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={[
          styles.logoImage,
          { 
            width: logoSize, 
            height: logoSize,
            borderRadius: logoSize / 8, // Slightly rounded corners
          },
          imageStyle
        ]}
        resizeMode="contain"
      />
      
      {showText && (
        <Text style={[
          styles.brandText, 
          { 
            fontSize: textSize,
            marginTop: logoSize * 0.1, // Proportional spacing
          },
          textStyle
        ]}>
          QuickTrash
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  brandText: {
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default Logo;
