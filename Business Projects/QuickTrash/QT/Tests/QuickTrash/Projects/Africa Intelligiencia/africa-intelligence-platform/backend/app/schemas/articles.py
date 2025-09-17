"""
Article schemas
"""
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from ..database import ArticleStatus, ContentCategory

class ArticleResponse(BaseModel):
    """Article response schema"""
    id: str
    title: str
    content: Optional[str] = None
    author: Optional[str] = None
    original_url: str
    published_date: Optional[datetime] = None
    scraped_date: datetime
    language: str
    word_count: Optional[int] = None
    reading_time_minutes: Optional[int] = None
    category: Optional[ContentCategory] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    status: ArticleStatus
    relevance_score: float
    view_count: int
    bookmark_count: int
    has_summary: bool
    has_video_script: bool
    has_blog_post: bool
    created_at: datetime
    source: "SourceResponse"
    
    class Config:
        orm_mode = True

class ArticleSummaryResponse(BaseModel):
    """Article summary response schema"""
    id: str
    title: str
    author: Optional[str] = None
    original_url: str
    published_date: Optional[datetime] = None
    category: Optional[ContentCategory] = None
    tags: Optional[List[str]] = None
    relevance_score: float
    reading_time_minutes: Optional[int] = None
    has_summary: bool
    has_video_script: bool
    has_blog_post: bool
    source_name: str
    
    class Config:
        orm_mode = True

class ArticleFilter(BaseModel):
    """Article filtering parameters"""
    categories: Optional[List[ContentCategory]] = Field(None, description="Filter by categories")
    regions: Optional[List[str]] = Field(None, description="Filter by regions")
    date_from: Optional[datetime] = Field(None, description="Filter from date")
    date_to: Optional[datetime] = Field(None, description="Filter to date")
    min_relevance: Optional[float] = Field(None, ge=0, le=1, description="Minimum relevance score")
    has_video: Optional[bool] = Field(None, description="Has video script")
    has_summary: Optional[bool] = Field(None, description="Has summary")
    languages: Optional[List[str]] = Field(None, description="Filter by languages")
    search: Optional[str] = Field(None, description="Search in title and content")

class SourceResponse(BaseModel):
    """Source response schema"""
    id: str
    name: str
    url: str
    base_domain: str
    source_type: str
    country: Optional[str] = None
    region: Optional[str] = None
    language: str
    reliability_score: float
    
    class Config:
        orm_mode = True

# Forward reference resolution
ArticleResponse.update_forward_refs()
