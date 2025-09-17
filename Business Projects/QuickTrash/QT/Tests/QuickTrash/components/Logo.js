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

  // Use the QuickTrash logo - responsive and platform-aware
  const logoSource = require('../assets/logo/qt_logo_short.png');

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
