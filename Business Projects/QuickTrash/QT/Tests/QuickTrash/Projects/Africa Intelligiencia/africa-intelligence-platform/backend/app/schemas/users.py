"""
User schemas
"""
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from ..database import UserRole, ContentCategory

class UserPreferenceUpdate(BaseModel):
    """User preference update schema"""
    preferred_categories: Optional[List[ContentCategory]] = Field(None, description="Preferred content categories")
    preferred_regions: Optional[List[str]] = Field(None, description="Preferred regions")
    preferred_content_types: Optional[List[str]] = Field(None, description="Preferred content types")
    content_per_page: Optional[int] = Field(None, ge=5, le=50, description="Items per page")
    show_summaries_only: Optional[bool] = Field(None, description="Show only summaries")
    prioritize_videos: Optional[bool] = Field(None, description="Prioritize video content")
    email_notifications: Optional[bool] = Field(None, description="Enable email notifications")
    push_notifications: Optional[bool] = Field(None, description="Enable push notifications")
    daily_digest: Optional[bool] = Field(None, description="Enable daily digest")
    widget_top_stories_count: Optional[int] = Field(None, ge=1, le=10, description="Widget story count")
    widget_categories: Optional[List[ContentCategory]] = Field(None, description="Widget categories")

class UserPreferenceResponse(BaseModel):
    """User preference response schema"""
    id: str
    preferred_categories: List[ContentCategory]
    preferred_regions: List[str]
    preferred_content_types: List[str]
    content_per_page: int
    show_summaries_only: bool
    prioritize_videos: bool
    email_notifications: bool
    push_notifications: bool
    daily_digest: bool
    widget_top_stories_count: int
    widget_categories: List[ContentCategory]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    preferences: Optional[UserPreferenceResponse] = None
    
    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    """User update schema"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None

class UserProfileResponse(BaseModel):
    """User profile response with stats"""
    user: UserResponse
    stats: dict = Field(default_factory=dict)
    
class BookmarkCreate(BaseModel):
    """Bookmark creation schema"""
    article_id: str

class BookmarkResponse(BaseModel):
    """Bookmark response schema"""
    id: str
    article_id: str
    created_at: datetime
    
    class Config:
        orm_mode = True
