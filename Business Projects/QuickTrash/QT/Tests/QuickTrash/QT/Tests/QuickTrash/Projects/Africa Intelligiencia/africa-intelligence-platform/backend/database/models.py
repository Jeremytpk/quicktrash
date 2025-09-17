"""
Database models for the Africa Intelligence Platform
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ENUM
import uuid

Base = declarative_base()

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"

class ContentType(str, Enum):
    ARTICLE = "article"
    VIDEO_SCRIPT = "video_script" 
    BLOG_POST = "blog_post"
    SUMMARY = "summary"

class ArticleStatus(str, Enum):
    SCRAPED = "scraped"
    PROCESSING = "processing"
    PROCESSED = "processed"
    PUBLISHED = "published"
    FAILED = "failed"

class ContentCategory(str, Enum):
    FINTECH = "fintech"
    INFRASTRUCTURE = "infrastructure"
    AGRICULTURE = "agriculture"
    MINING = "mining"
    ENERGY = "energy"
    EDUCATION = "education"
    HEALTHCARE = "healthcare"
    GOVERNMENT = "government"
    BUSINESS = "business"
    TECHNOLOGY = "technology"
    STARTUPS = "startups"
    INVESTMENT = "investment"
    DRC_SPECIFIC = "drc_specific"
    WEST_AFRICA = "west_africa"
    EAST_AFRICA = "east_africa"
    SOUTHERN_AFRICA = "southern_africa"
    GENERAL = "general"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(ENUM(UserRole), nullable=False, default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Location data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(String(500), nullable=True)
    location_city = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)
    location_authorized = Column(Boolean, default=False)
    location_updated_at = Column(DateTime, nullable=True)
    
    # Relationships
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    bookmarks = relationship("ArticleBookmark", back_populates="user")
    reading_history = relationship("ReadingHistory", back_populates="user")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Content preferences
    preferred_categories = Column(JSON)  # List of ContentCategory values
    preferred_regions = Column(JSON)     # List of regions (DRC, West Africa, etc.)
    preferred_content_types = Column(JSON)  # List of ContentType values
    
    # Display preferences
    content_per_page = Column(Integer, default=10)
    show_summaries_only = Column(Boolean, default=False)
    prioritize_videos = Column(Boolean, default=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    daily_digest = Column(Boolean, default=True)
    
    # Widget preferences
    widget_top_stories_count = Column(Integer, default=3)
    widget_categories = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="preferences")

class Source(Base):
    __tablename__ = "sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    base_domain = Column(String(255), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # news, social_media, government, blog
    country = Column(String(100))
    region = Column(String(100))
    language = Column(String(10), default="en")
    
    # Scraping configuration
    is_active = Column(Boolean, default=True)
    scraping_frequency = Column(Integer, default=24)  # hours
    last_scraped = Column(DateTime)
    robots_txt_url = Column(String(500))
    rate_limit_delay = Column(Float, default=1.0)  # seconds
    
    # Source reliability
    reliability_score = Column(Float, default=0.5)  # 0-1 scale
    total_articles_scraped = Column(Integer, default=0)
    successful_scrapes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    articles = relationship("Article", back_populates="source")

class Article(Base):
    __tablename__ = "articles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False)
    
    # Basic article information
    original_url = Column(String(1000), nullable=False, unique=True, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    author = Column(String(255))
    published_date = Column(DateTime, index=True)
    scraped_date = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Content metadata
    language = Column(String(10), default="en")
    word_count = Column(Integer)
    reading_time_minutes = Column(Integer)
    
    # Classification
    category = Column(ENUM(ContentCategory), index=True)
    tags = Column(JSON)  # List of string tags
    keywords = Column(JSON)  # Extracted keywords
    
    # Processing status
    status = Column(ENUM(ArticleStatus), default=ArticleStatus.SCRAPED, index=True)
    processing_error = Column(Text)
    
    # Relevance and engagement
    relevance_score = Column(Float, default=0.0, index=True)
    view_count = Column(Integer, default=0)
    bookmark_count = Column(Integer, default=0)
    
    # AI processing flags
    has_summary = Column(Boolean, default=False)
    has_video_script = Column(Boolean, default=False)
    has_blog_post = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    source = relationship("Source", back_populates="articles")
    generated_content = relationship("GeneratedContent", back_populates="article")
    bookmarks = relationship("ArticleBookmark", back_populates="article")
    reading_history = relationship("ReadingHistory", back_populates="article")

# Indexes for better query performance
Index('idx_articles_category_published', Article.category, Article.published_date)
Index('idx_articles_relevance_published', Article.relevance_score, Article.published_date)
Index('idx_articles_status_scraped', Article.status, Article.scraped_date)

class GeneratedContent(Base):
    __tablename__ = "generated_content"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    
    content_type = Column(ENUM(ContentType), nullable=False)
    title = Column(String(500))  # AI-generated catchy title
    content = Column(Text, nullable=False)  # Summary, script, or blog post content
    
    # Video script specific fields
    estimated_duration_seconds = Column(Integer)
    visual_suggestions = Column(JSON)  # List of suggested visuals/footage
    
    # Generation metadata
    model_used = Column(String(100))  # Which AI model was used
    generation_prompt = Column(Text)   # The prompt used for generation
    confidence_score = Column(Float)   # Model confidence (0-1)
    
    # Performance tracking
    view_count = Column(Integer, default=0)
    engagement_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    article = relationship("Article", back_populates="generated_content")

class ArticleBookmark(Base):
    __tablename__ = "article_bookmarks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="bookmarks")
    article = relationship("Article", back_populates="bookmarks")
    
    # Ensure one bookmark per user per article
    __table_args__ = (Index('idx_unique_user_article_bookmark', 'user_id', 'article_id', unique=True),)

class ReadingHistory(Base):
    __tablename__ = "reading_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    
    # Reading behavior
    time_spent_seconds = Column(Integer)
    completion_percentage = Column(Float)  # 0-1, how much was read
    device_type = Column(String(50))  # mobile, desktop, tablet
    
    read_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="reading_history")
    article = relationship("Article", back_populates="reading_history")

class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False)
    
    # Job details
    job_type = Column(String(50), nullable=False)  # scheduled, manual, priority
    status = Column(String(50), nullable=False)    # pending, running, completed, failed
    
    # Execution details
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Results
    articles_found = Column(Integer, default=0)
    articles_new = Column(Integer, default=0)
    articles_updated = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    error_details = Column(JSON)
    
    # Celery task tracking
    celery_task_id = Column(String(255), index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Add index for job monitoring
    __table_args__ = (Index('idx_scraping_jobs_status_created', 'status', 'created_at'),)

class APIUsage(Base):
    __tablename__ = "api_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Request details
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(String(500))
    
    # Response details
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer)
    response_size_bytes = Column(Integer)
    
    # Request metadata
    device_type = Column(String(50))
    is_mobile = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User")
    
    # Index for analytics
    __table_args__ = (Index('idx_api_usage_endpoint_created', 'endpoint', 'created_at'),)
