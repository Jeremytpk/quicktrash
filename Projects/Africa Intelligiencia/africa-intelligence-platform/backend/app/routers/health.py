"""
Health check endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import redis
from ..database import get_db
from ..schemas.common import HealthCheck
from ..core.config import settings

router = APIRouter()

@router.get("/", response_model=HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check endpoint
    """
    health_status = HealthCheck(
        timestamp=datetime.utcnow(),
        version="1.0.0",
        environment=settings.ENVIRONMENT
    )
    
    # Check database connection
    try:
        db.execute("SELECT 1")
        health_status.database = "connected"
    except Exception:
        health_status.database = "disconnected"
        health_status.status = "unhealthy"
    
    # Check Redis connection
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health_status.redis = "connected"
    except Exception:
        health_status.redis = "disconnected"
        health_status.status = "degraded"
    
    return health_status

@router.get("/readiness")
async def readiness_check():
    """
    Kubernetes readiness probe endpoint
    """
    return {"status": "ready", "timestamp": datetime.utcnow()}

@router.get("/liveness") 
async def liveness_check():
    """
    Kubernetes liveness probe endpoint
    """
    return {"status": "alive", "timestamp": datetime.utcnow()}
