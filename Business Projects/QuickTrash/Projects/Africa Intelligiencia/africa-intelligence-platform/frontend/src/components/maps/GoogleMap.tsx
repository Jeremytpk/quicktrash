'use client';

import { useCallback, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: -1.2921, // Nairobi, Kenya (center of Africa tech scene)
  lng: 36.8219
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

interface TechHub {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  companies: string[];
  funding_2023: string;
}

interface GoogleMapComponentProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    type: 'user' | 'tech-hub' | 'news-source';
    data?: any;
  }>;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  showTechHubs?: boolean;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

export function GoogleMapComponent({
  center = defaultCenter,
  zoom = 6,
  markers = [],
  onMapClick,
  showTechHubs = true,
  userLocation,
  className = ''
}: GoogleMapComponentProps) {
  const mapRef = useRef<google.maps.Map>();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Tech hubs data
  const techHubs: TechHub[] = [
    {
      name: 'Lagos Tech Hub',
      city: 'Lagos',
      country: 'Nigeria',
      lat: 6.5244,
      lng: 3.3792,
      description: 'Leading fintech and startup ecosystem in West Africa',
      companies: ['Paystack', 'Flutterwave', 'Andela'],
      funding_2023: '$1.2B'
    },
    {
      name: 'Silicon Savannah',
      city: 'Nairobi',
      country: 'Kenya',
      lat: -1.2921,
      lng: 36.8219,
      description: 'East Africa\'s innovation hub with strong mobile money ecosystem',
      companies: ['M-Pesa', 'iHub', 'Ushahidi'],
      funding_2023: '$800M'
    },
    {
      name: 'Cape Town Tech',
      city: 'Cape Town',
      country: 'South Africa',
      lat: -33.9249,
      lng: 18.4241,
      description: 'Gateway to African markets with strong VC presence',
      companies: ['Naspers', 'GetSmarter', 'Aerobotics'],
      funding_2023: '$600M'
    },
    {
      name: 'Cairo Innovation',
      city: 'Cairo',
      country: 'Egypt',
      lat: 30.0444,
      lng: 31.2357,
      description: 'Growing fintech and e-commerce hub in North Africa',
      companies: ['Fawry', 'Swvl', 'Vezeeta'],
      funding_2023: '$400M'
    },
    {
      name: 'Kinshasa Innovation',
      city: 'Kinshasa',
      country: 'DRC',
      lat: -4.4419,
      lng: 15.2663,
      description: 'Emerging tech ecosystem with focus on mining and fintech',
      companies: ['Flexpay', 'Uhuru', 'Kopo Kopo'],
      funding_2023: '$50M'
    }
  ];

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsLoaded(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = undefined;
  }, []);

  const handleMarkerClick = (marker: any) => {
    setSelectedMarker(marker);
  };

  // Combine custom markers with tech hubs
  const allMarkers = [
    ...markers,
    ...(showTechHubs ? techHubs.map(hub => ({
      id: `tech-hub-${hub.city}`,
      position: { lat: hub.lat, lng: hub.lng },
      title: hub.name,
      type: 'tech-hub' as const,
      data: hub
    })) : []),
    ...(userLocation ? [{
      id: 'user-location',
      position: userLocation,
      title: 'Your Location',
      type: 'user' as const,
      data: null
    }] : [])
  ];

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'user':
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="8" fill="#3B82F6" stroke="white" stroke-width="3"/>
              <circle cx="16" cy="16" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        };
      case 'tech-hub':
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#10B981"/>
              <path d="M2 17l10 5 10-5" stroke="#10B981" stroke-width="2" fill="none"/>
              <path d="M2 12l10 5 10-5" stroke="#10B981" stroke-width="2" fill="none"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        };
      default:
        return undefined;
    }
  };

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={mapContainerStyle}>
        <div className="text-center text-gray-500">
          <MapPinIcon className="h-12 w-12 mx-auto mb-2" />
          <p>Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        libraries={['places']}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={mapOptions}
        >
          {/* Markers */}
          {allMarkers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              title={marker.title}
              icon={getMarkerIcon(marker.type)}
              onClick={() => handleMarkerClick(marker)}
            />
          ))}

          {/* Info Window */}
          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {selectedMarker.title}
                </h3>
                
                {selectedMarker.type === 'tech-hub' && selectedMarker.data && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {selectedMarker.data.description}
                    </p>
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">
                        📍 {selectedMarker.data.city}, {selectedMarker.data.country}
                      </div>
                      <div className="text-green-600 font-medium">
                        💰 {selectedMarker.data.funding_2023} funding (2023)
                      </div>
                      <div className="text-gray-600">
                        🏢 {selectedMarker.data.companies.slice(0, 3).join(', ')}
                        {selectedMarker.data.companies.length > 3 && '...'}
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedMarker.type === 'user' && (
                  <div className="text-sm text-gray-600">
                    This is your current location
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
