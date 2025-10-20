import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Logo = ({ 
  size = 60, // 'small', 'medium', 'large', 'xlarge', or number
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
        return (isTablet ? 157.5 : 136.5) * scaleFactor;
      case 'header':
        return (isTablet ? 52.5 : 44.1) * scaleFactor;
      case 'menu':
        return (isTablet ? 73.5 : 63) * scaleFactor;
      default:
        switch (size) {
          case 'small':
            return (isTablet ? 31.5 : 27.3) * scaleFactor;
          case 'medium':
            return (isTablet ? 52.5 : 44.1) * scaleFactor;
          case 'large':
            return (isTablet ? 84 : 73.5) * scaleFactor;
          case 'xlarge':
            return (isTablet ? 105 : 94.5) * scaleFactor;
          default:
            return (isTablet ? 52.5 : 44.1) * scaleFactor;
        }
    }
  };

  const getTextSize = () => {
    const logoSize = getLogoSize();
    return Math.max(logoSize * 0.25, 10);
  };

  const logoSize = getLogoSize();
  const logoHeight = logoSize + 20; // Increase height by 20px
  const textSize = getTextSize();

  // Use the QuickTrash logo - responsive and platform-aware
  const logoSource = require('../assets/logo/qtLogoTxt.png');

  return (
    <View style={[styles.container, { height: logoHeight }, style]}>
      <Image
        source={logoSource}
        style={[
          styles.logoImage,
          { 
            width: logoSize, 
            height: logoHeight,
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
    backgroundColor: 'transparent',
    //shadowColor: '#000',
   //shadowOffset: { width: 1, height: 2 },
    //shadowOpacity: 0.2,
    //shadowRadius: 4,
    //elevation: 6,
  },
  brandText: {
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default Logo;
