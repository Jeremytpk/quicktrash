"""
Location service for handling user location data and Google Maps integration
"""
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import googlemaps
from ..database import User
from ..core.config import settings

logger = logging.getLogger(__name__)

class LocationService:
    """
    Service for handling user location data and Google Maps operations
    """
    
    def __init__(self):
        """Initialize the location service"""
        self.gmaps = None
        if settings.GOOGLE_MAPS_API_KEY:
            try:
                self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
                logger.info("Google Maps client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Google Maps client: {e}")
    
    def update_user_location(
        self, 
        user: User, 
        latitude: float, 
        longitude: float, 
        db: Session
    ) -> Dict[str, any]:
        """
        Update user location and get address information
        
        Args:
            user: User object
            latitude: User's latitude
            longitude: User's longitude
            db: Database session
            
        Returns:
            Dictionary with location update results
        """
        try:
            # Update basic location data
            user.latitude = latitude
            user.longitude = longitude
            user.location_authorized = True
            user.location_updated_at = datetime.utcnow()
            
            # Get address information from Google Maps
            if self.gmaps:
                address_data = self._get_address_from_coordinates(latitude, longitude)
                if address_data:
                    user.location_address = address_data.get('formatted_address')
                    user.location_city = address_data.get('city')
                    user.location_country = address_data.get('country')
            
            db.commit()
            
            return {
                'success': True,
                'message': 'Location updated successfully',
                'data': {
                    'latitude': latitude,
                    'longitude': longitude,
                    'address': user.location_address,
                    'city': user.location_city,
                    'country': user.location_country,
                    'updated_at': user.location_updated_at.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error updating user location: {e}")
            db.rollback()
            return {
                'success': False,
                'message': f'Failed to update location: {str(e)}'
            }
    
    def _get_address_from_coordinates(
        self, 
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, str]]:
        """
        Get address information from coordinates using Google Maps Geocoding API
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dictionary with address components or None if failed
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return None
        
        try:
            # Reverse geocoding to get address
            result = self.gmaps.reverse_geocode((latitude, longitude))
            
            if result:
                location_data = result[0]
                
                # Extract address components
                address_components = location_data.get('address_components', [])
                
                city = None
                country = None
                
                for component in address_components:
                    types = component.get('types', [])
                    
                    if 'locality' in types:
                        city = component.get('long_name')
                    elif 'administrative_area_level_1' in types and not city:
                        city = component.get('long_name')
                    elif 'country' in types:
                        country = component.get('long_name')
                
                return {
                    'formatted_address': location_data.get('formatted_address'),
                    'city': city,
                    'country': country
                }
            
        except Exception as e:
            logger.error(f"Error in reverse geocoding: {e}")
        
        return None
    
    def get_nearby_locations(
        self, 
        latitude: float, 
        longitude: float, 
        radius: int = 50000,  # 50km in meters
        location_type: str = 'establishment'
    ) -> List[Dict[str, any]]:
        """
        Get nearby locations using Google Places API
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius: Search radius in meters
            location_type: Type of places to search for
            
        Returns:
            List of nearby locations
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return []
        
        try:
            # Search for nearby places
            places_result = self.gmaps.places_nearby(
                location=(latitude, longitude),
                radius=radius,
                type=location_type
            )
            
            locations = []
            for place in places_result.get('results', []):
                locations.append({
                    'name': place.get('name'),
                    'place_id': place.get('place_id'),
                    'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                    'longitude': place.get('geometry', {}).get('location', {}).get('lng'),
                    'rating': place.get('rating'),
                    'types': place.get('types', []),
                    'vicinity': place.get('vicinity')
                })
            
            return locations
            
        except Exception as e:
            logger.error(f"Error getting nearby locations: {e}")
            return []
    
    def calculate_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Google Maps Distance Matrix API
        
        Args:
            lat1: First location latitude
            lon1: First location longitude
            lat2: Second location latitude
            lon2: Second location longitude
            
        Returns:
            Distance in kilometers
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return 0.0
        
        try:
            # Use Distance Matrix API
            result = self.gmaps.distance_matrix(
                origins=[(lat1, lon1)],
                destinations=[(lat2, lon2)],
                units='metric'
            )
            
            if result.get('status') == 'OK':
                rows = result.get('rows', [])
                if rows and rows[0].get('elements'):
                    element = rows[0]['elements'][0]
                    if element.get('status') == 'OK':
                        distance_data = element.get('distance', {})
                        # Return distance in kilometers
                        return distance_data.get('value', 0) / 1000.0
            
        except Exception as e:
            logger.error(f"Error calculating distance: {e}")
        
        return 0.0
    
    def get_user_location_context(self, user: User) -> Dict[str, any]:
        """
        Get location context for a user including nearby African tech hubs
        
        Args:
            user: User object
            
        Returns:
            Dictionary with location context
        """
        if not user.latitude or not user.longitude:
            return {
                'has_location': False,
                'message': 'Location not available'
            }
        
        # African tech hub cities (latitude, longitude)
        tech_hubs = {
            'Lagos, Nigeria': (-6.5244, 3.3792),
            'Nairobi, Kenya': (-1.2921, 36.8219),
            'Cape Town, South Africa': (-33.9249, 18.4241),
            'Cairo, Egypt': (30.0444, 31.2357),
            'Accra, Ghana': (5.6037, -0.1870),
            'Kinshasa, DRC': (-4.4419, 15.2663),
            'Casablanca, Morocco': (33.5731, -7.5898),
            'Tunis, Tunisia': (36.8065, 10.1815),
            'Kigali, Rwanda': (-1.9441, 30.0619),
            'Addis Ababa, Ethiopia': (9.1450, 40.4897)
        }
        
        # Find nearest tech hub
        nearest_hub = None
        min_distance = float('inf')
        
        for hub_name, (hub_lat, hub_lon) in tech_hubs.items():
            distance = self.calculate_distance(
                user.latitude, user.longitude, 
                hub_lat, hub_lon
            )
            if distance < min_distance:
                min_distance = distance
                nearest_hub = hub_name
        
        return {
            'has_location': True,
            'latitude': user.latitude,
            'longitude': user.longitude,
            'address': user.location_address,
            'city': user.location_city,
            'country': user.location_country,
            'nearest_tech_hub': nearest_hub,
            'distance_to_hub_km': round(min_distance, 1) if min_distance != float('inf') else None,
            'location_updated_at': user.location_updated_at.isoformat() if user.location_updated_at else None
        }
    
    def set_location_authorization(self, user: User, authorized: bool, db: Session) -> bool:
        """
        Set user's location authorization status
        
        Args:
            user: User object
            authorized: Authorization status
            db: Database session
            
        Returns:
            Success status
        """
        try:
            user.location_authorized = authorized
            if not authorized:
                # Clear location data if authorization is revoked
                user.latitude = None
                user.longitude = None
                user.location_address = None
                user.location_city = None
                user.location_country = None
                user.location_updated_at = None
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error setting location authorization: {e}")
            db.rollback()
            return False
