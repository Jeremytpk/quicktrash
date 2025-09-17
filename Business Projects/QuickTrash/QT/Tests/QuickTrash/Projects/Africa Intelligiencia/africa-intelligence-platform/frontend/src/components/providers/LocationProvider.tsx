'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { LocationAuthorization } from '@/components/location/LocationAuthorization';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';

interface LocationContextType {
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
  hasLocationAccess: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { locationData, isLoading } = useLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  // Check if user needs location authorization
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !isLoading &&
      !hasShownModal &&
      (!locationData?.authorized || (!locationData?.latitude && !locationData?.longitude))
    ) {
      // Show location modal after a short delay to ensure smooth login experience
      const timer = setTimeout(() => {
        setShowLocationModal(true);
        setHasShownModal(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, locationData, isLoading, hasShownModal]);

  const handleLocationAuthorized = () => {
    setShowLocationModal(false);
  };

  const handleCloseModal = () => {
    setShowLocationModal(false);
    setHasShownModal(true);
  };

  const hasLocationAccess = !!(
    locationData?.authorized &&
    locationData?.latitude &&
    locationData?.longitude
  );

  return (
    <LocationContext.Provider
      value={{
        showLocationModal,
        setShowLocationModal,
        hasLocationAccess
      }}
    >
      {children}
      
      {/* Location Authorization Modal */}
      <LocationAuthorization
        isOpen={showLocationModal}
        onClose={handleCloseModal}
        onAuthorized={handleLocationAuthorized}
      />
    </LocationContext.Provider>
  );
}
