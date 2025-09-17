'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPinIcon, 
  GlobeAltIcon, 
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import toast from 'react-hot-toast';

interface LocationAuthorizationProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: () => void;
}

export function LocationAuthorization({
  isOpen,
  onClose,
  onAuthorized
}: LocationAuthorizationProps) {
  const { user } = useAuth();
  const { authorizeLocation, updateLocation, isLoading } = useLocation();
  const [step, setStep] = useState<'intro' | 'permission' | 'getting-location' | 'success'>('intro');
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const handleAuthorize = async () => {
    try {
      setStep('permission');
      
      // First, authorize location in backend
      await authorizeLocation(true);
      
      setStep('getting-location');
      
      // Request browser geolocation
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Update location in backend
            const result = await updateLocation(latitude, longitude);
            
            setLocationData({
              latitude,
              longitude,
              address: result.data?.address
            });
            
            setStep('success');
            toast.success('Location authorized successfully!');
            
            // Auto-close after 2 seconds
            setTimeout(() => {
              onAuthorized();
              onClose();
            }, 2000);
            
          } catch (error) {
            console.error('Failed to update location:', error);
            toast.error('Failed to save location');
            setStep('intro');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          toast.error(errorMessage);
          setStep('intro');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
      
    } catch (error) {
      console.error('Authorization failed:', error);
      toast.error('Failed to authorize location');
      setStep('intro');
    }
  };

  const handleSkip = async () => {
    try {
      await authorizeLocation(false);
      onClose();
    } catch (error) {
      console.error('Failed to skip authorization:', error);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Content based on step */}
            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                    <MapPinIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                    Enable Location Services
                  </h2>
                  
                  <p className="mb-6 text-gray-600">
                    We&apos;d like to access your location to provide personalized news and insights 
                    relevant to your region. This helps us show you content about your local African tech ecosystem.
                  </p>
                  
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <GlobeAltIcon className="mr-2 h-4 w-4 text-primary-500" />
                      Discover local tech hubs and startup ecosystems
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ShieldCheckIcon className="mr-2 h-4 w-4 text-primary-500" />
                      Your location data is encrypted and secure
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleAuthorize}
                      disabled={isLoading}
                      className="btn btn-primary btn-lg w-full"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <MapPinIcon className="mr-2 h-4 w-4" />
                      )}
                      Allow Location Access
                    </button>
                    
                    <button
                      onClick={handleSkip}
                      className="btn btn-ghost btn-lg w-full"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'permission' && (
                <motion.div
                  key="permission"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                    <ShieldCheckIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                    Browser Permission Required
                  </h2>
                  
                  <p className="mb-6 text-gray-600">
                    Please allow location access when prompted by your browser. 
                    This enables us to provide location-specific content and insights.
                  </p>
                  
                  <div className="flex justify-center">
                    <LoadingSpinner size="lg" />
                  </div>
                </motion.div>
              )}

              {step === 'getting-location' && (
                <motion.div
                  key="getting-location"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <GlobeAltIcon className="h-8 w-8 text-blue-600 animate-pulse" />
                  </div>
                  
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                    Getting Your Location
                  </h2>
                  
                  <p className="mb-6 text-gray-600">
                    We&apos;re securely retrieving your location information...
                  </p>
                  
                  <div className="flex justify-center">
                    <LoadingSpinner size="lg" />
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckIcon className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                    Location Authorized!
                  </h2>
                  
                  <p className="mb-4 text-gray-600">
                    Great! We can now provide you with personalized content based on your location.
                  </p>
                  
                  {locationData && (
                    <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
                      <div className="font-medium text-gray-900">Your Location:</div>
                      {locationData.address ? (
                        <div className="text-gray-600">{locationData.address}</div>
                      ) : (
                        <div className="text-gray-600">
                          {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    Redirecting to your personalized dashboard...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
