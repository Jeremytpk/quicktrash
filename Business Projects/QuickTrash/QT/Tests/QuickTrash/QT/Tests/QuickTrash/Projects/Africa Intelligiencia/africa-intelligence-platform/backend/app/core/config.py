"""
Application configuration settings
"""
import os
from typing import List, Optional
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://username:password@localhost:5432/africa_intelligence"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://localhost:8080,https://localhost:3000"
    ).split(",")
    
    ALLOWED_HOSTS: List[str] = os.getenv(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1,0.0.0.0"
    ).split(",")
    
    # AI/ML Settings
    AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "./models")
    HUGGINGFACE_CACHE_DIR: str = os.getenv("HUGGINGFACE_CACHE_DIR", "./hf_cache")
    
    # AWS Settings
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    # S3 Storage
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "africa-intelligence-storage")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    
    # Social Media API Keys
    TWITTER_BEARER_TOKEN: Optional[str] = os.getenv("TWITTER_BEARER_TOKEN")
    LINKEDIN_CLIENT_ID: Optional[str] = os.getenv("LINKEDIN_CLIENT_ID")
    LINKEDIN_CLIENT_SECRET: Optional[str] = os.getenv("LINKEDIN_CLIENT_SECRET")
    
    # Google Maps API
    GOOGLE_MAPS_API_KEY: Optional[str] = os.getenv("GOOGLE_MAPS_API_KEY")
    
    # Email Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@africaintelligence.com")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    SPLUNK_HOST: Optional[str] = os.getenv("SPLUNK_HOST")
    SPLUNK_TOKEN: Optional[str] = os.getenv("SPLUNK_TOKEN")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    RATE_LIMIT_PER_HOUR: int = int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
    
    # Content Generation
    MAX_ARTICLES_PER_BATCH: int = int(os.getenv("MAX_ARTICLES_PER_BATCH", "10"))
    DEFAULT_SUMMARY_LENGTH: int = int(os.getenv("DEFAULT_SUMMARY_LENGTH", "150"))
    DEFAULT_VIDEO_DURATION: int = int(os.getenv("DEFAULT_VIDEO_DURATION", "45"))
    DEFAULT_BLOG_LENGTH: int = int(os.getenv("DEFAULT_BLOG_LENGTH", "600"))
    
    # Scraping
    DEFAULT_SCRAPING_DELAY: float = float(os.getenv("DEFAULT_SCRAPING_DELAY", "1.0"))
    MAX_ARTICLES_PER_SOURCE: int = int(os.getenv("MAX_ARTICLES_PER_SOURCE", "20"))
    SCRAPING_USER_AGENT: str = os.getenv(
        "SCRAPING_USER_AGENT",
        "Africa Intelligence Platform Bot/1.0"
    )
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts"""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
