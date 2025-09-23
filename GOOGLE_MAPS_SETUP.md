# Google Maps Integration Setup

## Overview
This document outlines the Google Maps API integration for the QuickTrash app.

## API Key Configuration
The Google Maps API key has been configured in the following locations:

### 1. App Configuration (`app.json`)
- **Android**: `android.config.googleMaps.apiKey`
- **iOS**: `ios.config.googleMapsApiKey`

### 2. Maps Configuration (`config/mapsConfig.js`)
- Centralized configuration for map settings
- Default region (Atlanta, GA)
- Marker colors and styling
- Map customization options

## Features Enabled

### ✅ **Map Components**
- **ContractorDashboard**: Interactive map showing available jobs and contractor location
- **EmployeeDashboard**: Live job tracking map with contractor and job markers

### ✅ **Map Features**
- Google Maps provider with custom styling
- User location tracking
- Custom markers for different job types
- Route polylines for navigation
- Real-time location updates

### ✅ **Location Services**
- High-accuracy GPS positioning
- Address geocoding (coordinates to addresses)
- Distance calculations between points
- Background location tracking for contractors
- Navigation integration with native maps apps

## API Key Details
- **Key**: `AIzaSyBZ1Dsh7_p2AlwvakoKXPUAKwI3QtjulSg`
- **Services**: Maps JavaScript API, Geocoding API, Places API
- **Platforms**: iOS, Android

## Usage in Components

### ContractorDashboard
```javascript
import MapView, { Marker, Polyline } from 'react-native-maps';
import MAPS_CONFIG from '../config/mapsConfig';

<MapView
  provider="google"
  region={MAPS_CONFIG.DEFAULT_REGION}
  customMapStyle={MAPS_CONFIG.MAP_STYLE}
  mapType="standard"
>
  <Marker
    pinColor={MAPS_CONFIG.MARKERS.CONTRACTOR.color}
    // ... other props
  />
</MapView>
```

### EmployeeDashboard
```javascript
import MapView, { Marker } from 'react-native-maps';
import MAPS_CONFIG from '../config/mapsConfig';

<MapView
  provider="google"
  initialRegion={MAPS_CONFIG.DEFAULT_REGION}
  customMapStyle={MAPS_CONFIG.MAP_STYLE}
  mapType="standard"
>
  <Marker
    pinColor={MAPS_CONFIG.MARKERS.JOB.color}
    // ... other props
  />
</MapView>
```

## Testing
To test the Google Maps integration:

1. **Build the app**: `expo run:android` or `expo run:ios`
2. **Check map loading**: Maps should load with Google Maps styling
3. **Test location services**: Enable location permissions
4. **Verify markers**: Job and contractor markers should appear
5. **Test navigation**: Tap markers to see job details

## Troubleshooting

### Common Issues
1. **Maps not loading**: Check API key configuration
2. **Location not working**: Verify location permissions
3. **Markers not showing**: Check coordinate data
4. **Navigation not working**: Ensure native maps apps are installed

### Debug Steps
1. Check console logs for API errors
2. Verify API key is active in Google Cloud Console
3. Ensure required APIs are enabled (Maps, Geocoding, Places)
4. Check device location services are enabled

## Security Notes
- API key is configured for production use
- Consider implementing API key restrictions in Google Cloud Console
- Monitor API usage to prevent unexpected charges
- Use environment variables for different environments (dev/staging/prod)

## Next Steps
- Implement map clustering for better performance with many markers
- Add custom map styles for branding
- Implement offline map caching
- Add map search functionality
- Integrate with Google Places API for address autocomplete
