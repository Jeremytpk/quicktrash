"""
Google Maps service for advanced mapping features
"""
import logging
from typing import Dict, List, Optional, Tuple
import googlemaps
from ..core.config import settings

logger = logging.getLogger(__name__)

class GoogleMapsService:
    """
    Service for Google Maps API integration
    """
    
    def __init__(self):
        """Initialize Google Maps service"""
        self.gmaps = None
        if settings.GOOGLE_MAPS_API_KEY:
            try:
                self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
                logger.info("Google Maps service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Google Maps service: {e}")
    
    def validate_coordinates(self, latitude: float, longitude: float) -> bool:
        """
        Validate if coordinates are within valid ranges
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            True if coordinates are valid
        """
        return (
            -90 <= latitude <= 90 and
            -180 <= longitude <= 180
        )
    
    def get_african_countries_coverage(self) -> List[Dict[str, any]]:
        """
        Get list of African countries with their coordinates for coverage mapping
        
        Returns:
            List of African countries with coordinates
        """
        # Major African countries and their approximate center coordinates
        african_countries = [
            {'name': 'Nigeria', 'code': 'NG', 'lat': 9.0820, 'lng': 8.6753, 'capital': 'Abuja'},
            {'name': 'Kenya', 'code': 'KE', 'lat': -0.0236, 'lng': 37.9062, 'capital': 'Nairobi'},
            {'name': 'South Africa', 'code': 'ZA', 'lat': -30.5595, 'lng': 22.9375, 'capital': 'Cape Town'},
            {'name': 'Egypt', 'code': 'EG', 'lat': 26.8206, 'lng': 30.8025, 'capital': 'Cairo'},
            {'name': 'Ghana', 'code': 'GH', 'lat': 7.9465, 'lng': -1.0232, 'capital': 'Accra'},
            {'name': 'Democratic Republic of Congo', 'code': 'CD', 'lat': -4.0383, 'lng': 21.7587, 'capital': 'Kinshasa'},
            {'name': 'Morocco', 'code': 'MA', 'lat': 31.7917, 'lng': -7.0926, 'capital': 'Rabat'},
            {'name': 'Tunisia', 'code': 'TN', 'lat': 33.8869, 'lng': 9.5375, 'capital': 'Tunis'},
            {'name': 'Rwanda', 'code': 'RW', 'lat': -1.9403, 'lng': 29.8739, 'capital': 'Kigali'},
            {'name': 'Ethiopia', 'code': 'ET', 'lat': 9.1450, 'lng': 40.4897, 'capital': 'Addis Ababa'},
            {'name': 'Uganda', 'code': 'UG', 'lat': 1.3733, 'lng': 32.2903, 'capital': 'Kampala'},
            {'name': 'Tanzania', 'code': 'TZ', 'lat': -6.3690, 'lng': 34.8888, 'capital': 'Dodoma'},
            {'name': 'Senegal', 'code': 'SN', 'lat': 14.4974, 'lng': -14.4524, 'capital': 'Dakar'},
            {'name': 'Ivory Coast', 'code': 'CI', 'lat': 7.5400, 'lng': -5.5471, 'capital': 'Abidjan'},
            {'name': 'Cameroon', 'code': 'CM', 'lat': 7.3697, 'lng': 12.3547, 'capital': 'Yaoundé'},
            {'name': 'Zambia', 'code': 'ZM', 'lat': -13.1339, 'lng': 27.8493, 'capital': 'Lusaka'},
            {'name': 'Zimbabwe', 'code': 'ZW', 'lat': -19.0154, 'lng': 29.1549, 'capital': 'Harare'},
            {'name': 'Botswana', 'code': 'BW', 'lat': -22.3285, 'lng': 24.6849, 'capital': 'Gaborone'},
            {'name': 'Namibia', 'code': 'NA', 'lat': -22.9576, 'lng': 18.4904, 'capital': 'Windhoek'},
            {'name': 'Mozambique', 'code': 'MZ', 'lat': -18.6657, 'lng': 35.5296, 'capital': 'Maputo'},
        ]
        
        return african_countries
    
    def get_tech_hubs_map_data(self) -> List[Dict[str, any]]:
        """
        Get African tech hubs data for map visualization
        
        Returns:
            List of tech hubs with coordinates and metadata
        """
        tech_hubs = [
            {
                'name': 'Lagos Tech Hub',
                'city': 'Lagos',
                'country': 'Nigeria',
                'lat': 6.5244,
                'lng': 3.3792,
                'description': 'Leading fintech and startup ecosystem in West Africa',
                'companies': ['Paystack', 'Flutterwave', 'Andela'],
                'funding_2023': '$1.2B'
            },
            {
                'name': 'Silicon Savannah',
                'city': 'Nairobi',
                'country': 'Kenya',
                'lat': -1.2921,
                'lng': 36.8219,
                'description': 'East Africa\'s innovation hub with strong mobile money ecosystem',
                'companies': ['M-Pesa', 'iHub', 'Ushahidi'],
                'funding_2023': '$800M'
            },
            {
                'name': 'Cape Town Tech',
                'city': 'Cape Town',
                'country': 'South Africa',
                'lat': -33.9249,
                'lng': 18.4241,
                'description': 'Gateway to African markets with strong VC presence',
                'companies': ['Naspers', 'GetSmarter', 'Aerobotics'],
                'funding_2023': '$600M'
            },
            {
                'name': 'Cairo Innovation',
                'city': 'Cairo',
                'country': 'Egypt',
                'lat': 30.0444,
                'lng': 31.2357,
                'description': 'Growing fintech and e-commerce hub in North Africa',
                'companies': ['Fawry', 'Swvl', 'Vezeeta'],
                'funding_2023': '$400M'
            },
            {
                'name': 'Accra Digital Hub',
                'city': 'Accra',
                'country': 'Ghana',
                'lat': 5.6037,
                'lng': -0.1870,
                'description': 'Emerging fintech and agtech center',
                'companies': ['Zeepay', 'AgroCenta', 'ExpressPay'],
                'funding_2023': '$200M'
            },
            {
                'name': 'Kinshasa Innovation',
                'city': 'Kinshasa',
                'country': 'DRC',
                'lat': -4.4419,
                'lng': 15.2663,
                'description': 'Emerging tech ecosystem with focus on mining and fintech',
                'companies': ['Flexpay', 'Uhuru', 'Kopo Kopo'],
                'funding_2023': '$50M'
            },
            {
                'name': 'Kigali Innovation City',
                'city': 'Kigali',
                'country': 'Rwanda',
                'lat': -1.9441,
                'lng': 30.0619,
                'description': 'Government-backed innovation hub with strong digital infrastructure',
                'companies': ['DMM.HeHe', 'Irembo', 'AC Group'],
                'funding_2023': '$100M'
            }
        ]
        
        return tech_hubs
    
    def search_places_by_type(
        self, 
        latitude: float, 
        longitude: float, 
        place_type: str = 'university',
        radius: int = 50000
    ) -> List[Dict[str, any]]:
        """
        Search for specific types of places near coordinates
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            place_type: Type of place to search for
            radius: Search radius in meters
            
        Returns:
            List of places
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return []
        
        try:
            places_result = self.gmaps.places_nearby(
                location=(latitude, longitude),
                radius=radius,
                type=place_type
            )
            
            places = []
            for place in places_result.get('results', []):
                places.append({
                    'name': place.get('name'),
                    'place_id': place.get('place_id'),
                    'latitude': place.get('geometry', {}).get('location', {}).get('lat'),
                    'longitude': place.get('geometry', {}).get('location', {}).get('lng'),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('user_ratings_total'),
                    'vicinity': place.get('vicinity'),
                    'types': place.get('types', []),
                    'price_level': place.get('price_level'),
                    'opening_hours': place.get('opening_hours', {}).get('open_now')
                })
            
            return places
            
        except Exception as e:
            logger.error(f"Error searching places: {e}")
            return []
    
    def get_directions(
        self, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float],
        mode: str = 'driving'
    ) -> Optional[Dict[str, any]]:
        """
        Get directions between two points
        
        Args:
            origin: Origin coordinates (lat, lng)
            destination: Destination coordinates (lat, lng)
            mode: Travel mode (driving, walking, transit, bicycling)
            
        Returns:
            Directions data or None if failed
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return None
        
        try:
            directions_result = self.gmaps.directions(
                origin=origin,
                destination=destination,
                mode=mode
            )
            
            if directions_result:
                route = directions_result[0]
                leg = route['legs'][0]
                
                return {
                    'distance': leg['distance']['text'],
                    'duration': leg['duration']['text'],
                    'start_address': leg['start_address'],
                    'end_address': leg['end_address'],
                    'steps': [
                        {
                            'instruction': step['html_instructions'],
                            'distance': step['distance']['text'],
                            'duration': step['duration']['text']
                        }
                        for step in leg['steps']
                    ],
                    'polyline': route['overview_polyline']['points']
                }
            
        except Exception as e:
            logger.error(f"Error getting directions: {e}")
        
        return None
    
    def geocode_address(self, address: str) -> Optional[Dict[str, any]]:
        """
        Convert address to coordinates
        
        Args:
            address: Address string
            
        Returns:
            Geocoding result or None if failed
        """
        if not self.gmaps:
            logger.warning("Google Maps client not initialized")
            return None
        
        try:
            geocode_result = self.gmaps.geocode(address)
            
            if geocode_result:
                result = geocode_result[0]
                location = result['geometry']['location']
                
                return {
                    'formatted_address': result['formatted_address'],
                    'latitude': location['lat'],
                    'longitude': location['lng'],
                    'place_id': result['place_id'],
                    'types': result['types']
                }
            
        except Exception as e:
            logger.error(f"Error geocoding address: {e}")
        
        return None
