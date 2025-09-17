'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  authorized: boolean;
  updated_at?: string;
}

interface LocationContext {
  has_location: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  nearest_tech_hub?: string;
  distance_to_hub_km?: number;
  location_updated_at?: string;
}

export function useLocation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Get current location
  const {
    data: locationData,
    isLoading: isLocationLoading,
    error: locationError
  } = useQuery<LocationData>({
    queryKey: ['location', 'current'],
    queryFn: async () => {
      const response = await api.get('/location/current');
      return response.data;
    }
  });

  // Get location context
  const {
    data: locationContext,
    isLoading: isContextLoading
  } = useQuery<LocationContext>({
    queryKey: ['location', 'context'],
    queryFn: async () => {
      const response = await api.get('/location/context');
      return response.data;
    },
    enabled: !!locationData?.authorized
  });

  // Authorize location mutation
  const authorizationMutation = useMutation({
    mutationFn: async (authorized: boolean) => {
      const response = await api.post('/location/authorize', { authorized });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location'] });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      const response = await api.post('/location/update', { latitude, longitude });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location'] });
    }
  });

  // Get tech hubs
  const {
    data: techHubs,
    isLoading: isHubsLoading
  } = useQuery({
    queryKey: ['location', 'tech-hubs'],
    queryFn: async () => {
      const response = await api.get('/location/tech-hubs');
      return response.data;
    }
  });

  // Get African countries
  const {
    data: africanCountries,
    isLoading: isCountriesLoading
  } = useQuery({
    queryKey: ['location', 'african-countries'],
    queryFn: async () => {
      const response = await api.get('/location/african-countries');
      return response.data;
    }
  });

  // Helper functions
  const authorizeLocation = useCallback(async (authorized: boolean) => {
    setIsLoading(true);
    try {
      return await authorizationMutation.mutateAsync(authorized);
    } finally {
      setIsLoading(false);
    }
  }, [authorizationMutation]);

  const updateLocation = useCallback(async (latitude: number, longitude: number) => {
    setIsLoading(true);
    try {
      return await updateLocationMutation.mutateAsync({ latitude, longitude });
    } finally {
      setIsLoading(false);
    }
  }, [updateLocationMutation]);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  const requestLocationAndUpdate = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First authorize
      await authorizeLocation(true);
      
      // Get current position
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      // Update location in backend
      return await updateLocation(latitude, longitude);
      
    } catch (error) {
      console.error('Failed to get and update location:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authorizeLocation, updateLocation, getCurrentPosition]);

  const getNearbyLocations = useCallback(async (
    radius: number = 50000,
    locationType: string = 'establishment'
  ) => {
    const response = await api.get('/location/nearby', {
      params: { radius, location_type: locationType }
    });
    return response.data;
  }, []);

  const calculateDistance = useCallback(async (lat2: number, lon2: number) => {
    const response = await api.get('/location/distance', {
      params: { lat2, lon2 }
    });
    return response.data;
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    const response = await api.post('/location/search-places', null, {
      params: { query }
    });
    return response.data;
  }, []);

  const geocodeAddress = useCallback(async (address: string) => {
    const response = await api.post('/location/geocode', null, {
      params: { address }
    });
    return response.data;
  }, []);

  const getDirections = useCallback(async (
    destLat: number,
    destLng: number,
    mode: string = 'driving'
  ) => {
    const response = await api.get('/location/directions', {
      params: { dest_lat: destLat, dest_lng: destLng, mode }
    });
    return response.data;
  }, []);

  return {
    // Data
    locationData,
    locationContext,
    techHubs,
    africanCountries,
    
    // Loading states
    isLoading: isLoading || isLocationLoading,
    isContextLoading,
    isHubsLoading,
    isCountriesLoading,
    
    // Error
    locationError,
    
    // Actions
    authorizeLocation,
    updateLocation,
    getCurrentPosition,
    requestLocationAndUpdate,
    getNearbyLocations,
    calculateDistance,
    searchPlaces,
    geocodeAddress,
    getDirections,
    
    // Computed values
    hasLocation: !!locationData?.authorized && !!locationData?.latitude && !!locationData?.longitude,
    isAuthorized: !!locationData?.authorized
  };
}
