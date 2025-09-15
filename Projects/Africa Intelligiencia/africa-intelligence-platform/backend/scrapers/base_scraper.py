"""
Base scraper class with common functionality
"""
import logging
import time
import requests
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse, robots
from urllib.robotparser import RobotFileParser
from dataclasses import dataclass
from datetime import datetime
import random
from fake_useragent import UserAgent

@dataclass
class ScrapedArticle:
    """Data class for scraped article information"""
    title: str
    content: str
    url: str
    author: Optional[str] = None
    published_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    meta_description: Optional[str] = None
    image_url: Optional[str] = None
    language: str = "en"

class BaseScraper(ABC):
    """
    Base scraper class with common functionality for ethical web scraping
    """
    
    def __init__(self, base_url: str, rate_limit: float = 1.0, respect_robots: bool = True):
        """
        Initialize the base scraper
        
        Args:
            base_url: The base URL of the website to scrape
            rate_limit: Delay between requests in seconds
            respect_robots: Whether to respect robots.txt
        """
        self.base_url = base_url
        self.rate_limit = rate_limit
        self.respect_robots = respect_robots
        self.domain = urlparse(base_url).netloc
        
        # Setup logging
        self.logger = logging.getLogger(f"{self.__class__.__name__}_{self.domain}")
        self.logger.setLevel(logging.INFO)
        
        # Setup session with proper headers
        self.session = requests.Session()
        self.ua = UserAgent()
        self._setup_headers()
        
        # Robots.txt handler
        self.robots_parser = None
        if respect_robots:
            self._load_robots_txt()
        
        self.last_request_time = 0
    
    def _setup_headers(self):
        """Setup request headers to mimic real browser"""
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def _load_robots_txt(self):
        """Load and parse robots.txt"""
        try:
            robots_url = urljoin(self.base_url, '/robots.txt')
            self.robots_parser = RobotFileParser()
            self.robots_parser.set_url(robots_url)
            self.robots_parser.read()
            self.logger.info(f"Loaded robots.txt from {robots_url}")
        except Exception as e:
            self.logger.warning(f"Could not load robots.txt: {e}")
            self.robots_parser = None
    
    def _can_fetch(self, url: str) -> bool:
        """Check if URL can be fetched according to robots.txt"""
        if not self.robots_parser or not self.respect_robots:
            return True
        
        user_agent = self.session.headers.get('User-Agent', '*')
        return self.robots_parser.can_fetch(user_agent, url)
    
    def _rate_limit_delay(self):
        """Implement rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit:
            sleep_time = self.rate_limit - time_since_last + random.uniform(0.1, 0.5)
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def fetch_page(self, url: str, **kwargs) -> Optional[requests.Response]:
        """
        Fetch a web page with error handling and rate limiting
        
        Args:
            url: URL to fetch
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object or None if failed
        """
        # Check robots.txt
        if not self._can_fetch(url):
            self.logger.warning(f"Robots.txt disallows fetching {url}")
            return None
        
        # Rate limiting
        self._rate_limit_delay()
        
        try:
            # Randomize user agent occasionally
            if random.random() < 0.1:  # 10% chance
                self.session.headers['User-Agent'] = self.ua.random
            
            response = self.session.get(url, timeout=30, **kwargs)
            response.raise_for_status()
            
            self.logger.info(f"Successfully fetched {url}")
            return response
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching {url}: {e}")
            return None
    
    def extract_links(self, html: str, base_url: str) -> List[str]:
        """
        Extract and normalize links from HTML content
        
        Args:
            html: HTML content
            base_url: Base URL for resolving relative links
            
        Returns:
            List of absolute URLs
        """
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        links = []
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href:
                absolute_url = urljoin(base_url, href)
                if self._is_valid_url(absolute_url):
                    links.append(absolute_url)
        
        return list(set(links))  # Remove duplicates
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid and belongs to the same domain"""
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in ('http', 'https') and
                parsed.netloc == self.domain and
                not any(ext in url.lower() for ext in ['.pdf', '.doc', '.zip', '.exe'])
            )
        except:
            return False
    
    @abstractmethod
    def scrape_article_urls(self) -> List[str]:
        """
        Scrape article URLs from the website
        Must be implemented by subclasses
        """
        pass
    
    @abstractmethod  
    def scrape_article_content(self, url: str) -> Optional[ScrapedArticle]:
        """
        Scrape content from a specific article URL
        Must be implemented by subclasses
        """
        pass
    
    def scrape_site(self, max_articles: int = 50) -> List[ScrapedArticle]:
        """
        Main method to scrape articles from the website
        
        Args:
            max_articles: Maximum number of articles to scrape
            
        Returns:
            List of scraped articles
        """
        self.logger.info(f"Starting scrape of {self.domain}")
        
        # Get article URLs
        article_urls = self.scrape_article_urls()
        self.logger.info(f"Found {len(article_urls)} article URLs")
        
        # Limit the number of articles
        article_urls = article_urls[:max_articles]
        
        # Scrape each article
        articles = []
        for i, url in enumerate(article_urls, 1):
            self.logger.info(f"Scraping article {i}/{len(article_urls)}: {url}")
            
            article = self.scrape_article_content(url)
            if article:
                articles.append(article)
            else:
                self.logger.warning(f"Failed to scrape article: {url}")
        
        self.logger.info(f"Successfully scraped {len(articles)} articles from {self.domain}")
        return articles
