"""
Generated content schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from ..database import ContentType

class GeneratedContentResponse(BaseModel):
    """Generated content response schema"""
    id: str
    article_id: str
    content_type: ContentType
    title: Optional[str] = None
    content: str
    estimated_duration_seconds: Optional[int] = None
    visual_suggestions: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = None
    generation_prompt: Optional[str] = None
    confidence_score: Optional[float] = None
    view_count: int
    engagement_score: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class ContentGenerationRequest(BaseModel):
    """Content generation request schema"""
    article_id: str
    content_types: List[ContentType] = Field(description="Types of content to generate")
    regenerate: bool = Field(False, description="Force regeneration if content exists")

class VideoScriptResponse(BaseModel):
    """Video script specific response"""
    id: str
    article_id: str
    title: str
    script: str
    estimated_duration_seconds: int
    visual_suggestions: List[Dict[str, Any]]
    content_type: str
    view_count: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class BlogPostResponse(BaseModel):
    """Blog post specific response"""
    id: str
    article_id: str
    title: str
    content: str
    word_count: int
    reading_time_minutes: int
    tags: List[str]
    category: str
    view_count: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class SummaryResponse(BaseModel):
    """Summary specific response"""
    id: str
    article_id: str
    title: str
    summary: str
    confidence_score: Optional[float] = None
    view_count: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class ContentStats(BaseModel):
    """Content generation statistics"""
    total_articles: int
    processed_articles: int
    pending_articles: int
    failed_articles: int
    total_summaries: int
    total_video_scripts: int
    total_blog_posts: int
    average_confidence_score: float
