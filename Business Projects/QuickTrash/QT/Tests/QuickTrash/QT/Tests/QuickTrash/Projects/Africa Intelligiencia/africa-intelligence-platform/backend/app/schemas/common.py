"""
Common Pydantic schemas
"""
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class ResponseModel(BaseModel):
    """Base response model"""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Items per page")
    
class PaginatedResponse(BaseModel):
    """Paginated response model"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

class FilterParams(BaseModel):
    """Common filter parameters"""
    search: Optional[str] = Field(None, description="Search query")
    date_from: Optional[datetime] = Field(None, description="Filter from date")
    date_to: Optional[datetime] = Field(None, description="Filter to date")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: Optional[str] = Field("desc", regex="^(asc|desc)$", description="Sort order")

class HealthCheck(BaseModel):
    """Health check response"""
    status: str = "healthy"
    timestamp: datetime
    version: str
    environment: str
    database: str = "connected"
    redis: str = "connected"
