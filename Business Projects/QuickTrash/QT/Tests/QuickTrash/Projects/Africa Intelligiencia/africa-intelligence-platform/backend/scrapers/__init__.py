"""
Web scraping modules for the Africa Intelligence Platform
"""
from .base_scraper import BaseScraper
from .news_scraper import NewsScraper  
from .social_scraper import SocialMediaScraper
from .content_extractor import ContentExtractor
from .scraper_manager import ScraperManager

__all__ = [
    "BaseScraper",
    "NewsScraper", 
    "SocialMediaScraper",
    "ContentExtractor",
    "ScraperManager"
]
