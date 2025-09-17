"""
Location and Google Maps integration endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db, User
from ..core.security import get_current_active_user
from ..services.location_service import LocationService
from ..services.maps_service import GoogleMapsService

router = APIRouter()

class LocationUpdate(BaseModel):
    """Location update request schema"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")

class LocationAuthorizationUpdate(BaseModel):
    """Location authorization update schema"""
    authorized: bool = Field(..., description="Location authorization status")

class LocationResponse(BaseModel):
    """Location response schema"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    authorized: bool = False
    updated_at: Optional[str] = None

@router.post("/authorize")
async def authorize_location(
    authorization: LocationAuthorizationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Set user's location authorization status
    """
    location_service = LocationService()
    
    success = location_service.set_location_authorization(
        current_user, 
        authorization.authorized, 
        db
    )
    
    if success:
        return {
            "success": True,
            "message": f"Location authorization {'granted' if authorization.authorized else 'revoked'}",
            "authorized": authorization.authorized
        }
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to update location authorization"
        )

@router.post("/update")
async def update_location(
    location_data: LocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user's current location
    """
    location_service = LocationService()
    
    result = location_service.update_user_location(
        current_user,
        location_data.latitude,
        location_data.longitude,
        db
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(
            status_code=400,
            detail=result['message']
        )

@router.get("/current", response_model=LocationResponse)
async def get_current_location(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user's current location information
    """
    return LocationResponse(
        latitude=current_user.latitude,
        longitude=current_user.longitude,
        address=current_user.location_address,
        city=current_user.location_city,
        country=current_user.location_country,
        authorized=current_user.location_authorized,
        updated_at=current_user.location_updated_at.isoformat() if current_user.location_updated_at else None
    )

@router.get("/context")
async def get_location_context(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get location context including nearby African tech hubs
    """
    location_service = LocationService()
    return location_service.get_user_location_context(current_user)

@router.get("/nearby")
async def get_nearby_locations(
    radius: int = Query(50000, ge=1000, le=100000, description="Search radius in meters"),
    location_type: str = Query("establishment", description="Type of places to search"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get nearby locations based on user's current location
    """
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=400,
            detail="User location not available. Please authorize and set location first."
        )
    
    location_service = LocationService()
    locations = location_service.get_nearby_locations(
        current_user.latitude,
        current_user.longitude,
        radius,
        location_type
    )
    
    return {
        "user_location": {
            "latitude": current_user.latitude,
            "longitude": current_user.longitude,
            "city": current_user.location_city,
            "country": current_user.location_country
        },
        "search_params": {
            "radius_km": radius / 1000,
            "location_type": location_type
        },
        "nearby_locations": locations
    }

@router.get("/tech-hubs")
async def get_tech_hubs():
    """
    Get African tech hubs data for map visualization
    """
    maps_service = GoogleMapsService()
    return maps_service.get_tech_hubs_map_data()

@router.get("/african-countries")
async def get_african_countries():
    """
    Get African countries coverage data
    """
    maps_service = GoogleMapsService()
    return maps_service.get_african_countries_coverage()

@router.get("/distance")
async def calculate_distance(
    lat2: float = Query(..., description="Destination latitude"),
    lon2: float = Query(..., description="Destination longitude"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Calculate distance from user's location to a destination
    """
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=400,
            detail="User location not available"
        )
    
    location_service = LocationService()
    distance_km = location_service.calculate_distance(
        current_user.latitude,
        current_user.longitude,
        lat2,
        lon2
    )
    
    return {
        "from": {
            "latitude": current_user.latitude,
            "longitude": current_user.longitude,
            "city": current_user.location_city,
            "country": current_user.location_country
        },
        "to": {
            "latitude": lat2,
            "longitude": lon2
        },
        "distance_km": distance_km
    }

@router.post("/search-places")
async def search_places(
    query: str = Query(..., description="Search query"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Search for places near user's location
    """
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=400,
            detail="User location not available"
        )
    
    maps_service = GoogleMapsService()
    places = maps_service.search_places_by_type(
        current_user.latitude,
        current_user.longitude,
        query
    )
    
    return {
        "query": query,
        "user_location": {
            "latitude": current_user.latitude,
            "longitude": current_user.longitude
        },
        "results": places
    }

@router.post("/geocode")
async def geocode_address(
    address: str = Query(..., description="Address to geocode")
):
    """
    Convert address to coordinates
    """
    maps_service = GoogleMapsService()
    result = maps_service.geocode_address(address)
    
    if result:
        return result
    else:
        raise HTTPException(
            status_code=404,
            detail="Address not found"
        )

@router.get("/directions")
async def get_directions(
    dest_lat: float = Query(..., description="Destination latitude"),
    dest_lng: float = Query(..., description="Destination longitude"),
    mode: str = Query("driving", description="Travel mode"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get directions from user's location to destination
    """
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=400,
            detail="User location not available"
        )
    
    maps_service = GoogleMapsService()
    directions = maps_service.get_directions(
        (current_user.latitude, current_user.longitude),
        (dest_lat, dest_lng),
        mode
    )
    
    if directions:
        return directions
    else:
        raise HTTPException(
            status_code=404,
            detail="Directions not found"
        )
