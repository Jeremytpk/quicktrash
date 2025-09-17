"""
Scraper manager for orchestrating all scraping operations
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from celery import Celery
from ..database import get_db, Source, Article, ScrapingJob, ArticleStatus
from .news_scraper import NewsScraper
from .social_scraper import SocialMediaScraper
from .base_scraper import ScrapedArticle
import uuid

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScraperManager:
    """
    Manages all scraping operations for the Africa Intelligence Platform
    """
    
    def __init__(self, celery_app: Optional[Celery] = None):
        """
        Initialize the scraper manager
        
        Args:
            celery_app: Celery application instance for task scheduling
        """
        self.celery_app = celery_app
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Content categories mapping
        self.category_keywords = {
            'fintech': ['fintech', 'payment', 'mobile money', 'banking', 'financial technology'],
            'infrastructure': ['infrastructure', 'construction', 'roads', 'energy', 'telecommunications'],
            'agriculture': ['agriculture', 'farming', 'agtech', 'food security', 'rural'],
            'mining': ['mining', 'minerals', 'extraction', 'cobalt', 'copper', 'gold'],
            'energy': ['energy', 'power', 'solar', 'renewable', 'electricity', 'grid'],
            'education': ['education', 'edtech', 'learning', 'school', 'university'],
            'healthcare': ['healthcare', 'health', 'medical', 'hospital', 'telemedicine'],
            'government': ['government', 'policy', 'regulation', 'public sector', 'governance'],
            'business': ['business', 'commerce', 'trade', 'enterprise', 'market'],
            'technology': ['technology', 'tech', 'innovation', 'digital', 'software'],
            'startups': ['startup', 'entrepreneur', 'venture', 'funding', 'investment'],
            'drc_specific': ['drc', 'congo', 'kinshasa', 'lubumbashi', 'democratic republic']
        }
    
    def scrape_all_sources(self, max_articles_per_source: int = 20) -> Dict[str, Any]:
        """
        Scrape all active sources in the database
        
        Args:
            max_articles_per_source: Maximum articles to scrape per source
            
        Returns:
            Dictionary with scraping results
        """
        self.logger.info("Starting comprehensive scraping of all sources")
        
        db = next(get_db())
        try:
            # Get all active sources
            sources = db.query(Source).filter(Source.is_active == True).all()
            
            results = {
                'total_sources': len(sources),
                'successful_sources': 0,
                'failed_sources': 0,
                'total_articles': 0,
                'new_articles': 0,
                'source_results': {}
            }
            
            for source in sources:
                self.logger.info(f"Scraping source: {source.name} ({source.url})")
                
                # Create scraping job record
                job = ScrapingJob(
                    source_id=source.id,
                    job_type='scheduled',
                    status='running',
                    started_at=datetime.utcnow()
                )
                db.add(job)
                db.commit()
                
                try:
                    # Scrape the source
                    source_result = self.scrape_source(source, max_articles_per_source, db)
                    
                    # Update job with results
                    job.status = 'completed'
                    job.completed_at = datetime.utcnow()
                    job.duration_seconds = int((job.completed_at - job.started_at).total_seconds())
                    job.articles_found = source_result['articles_found']
                    job.articles_new = source_result['articles_new']
                    job.articles_updated = source_result['articles_updated']
                    
                    results['successful_sources'] += 1
                    results['total_articles'] += source_result['articles_found']
                    results['new_articles'] += source_result['articles_new']
                    results['source_results'][source.name] = source_result
                    
                    # Update source stats
                    source.last_scraped = datetime.utcnow()
                    source.total_articles_scraped += source_result['articles_found']
                    source.successful_scrapes += 1
                    
                except Exception as e:
                    self.logger.error(f"Error scraping source {source.name}: {e}")
                    
                    # Update job with error
                    job.status = 'failed'
                    job.completed_at = datetime.utcnow()
                    job.duration_seconds = int((job.completed_at - job.started_at).total_seconds())
                    job.errors_count = 1
                    job.error_details = {'error': str(e)}
                    
                    results['failed_sources'] += 1
                    results['source_results'][source.name] = {'error': str(e)}
                
                db.commit()
            
            self.logger.info(f"Scraping completed. Results: {results}")
            return results
            
        finally:
            db.close()
    
    def scrape_source(self, source: Source, max_articles: int, db: Session) -> Dict[str, Any]:
        """
        Scrape a single source
        
        Args:
            source: Source database object
            max_articles: Maximum articles to scrape
            db: Database session
            
        Returns:
            Dictionary with scraping results for this source
        """
        result = {
            'articles_found': 0,
            'articles_new': 0,
            'articles_updated': 0,
            'errors': []
        }
        
        try:
            # Create appropriate scraper
            if source.source_type == 'social_media':
                if 'twitter' in source.base_domain:
                    scraper = SocialMediaScraper('twitter', rate_limit=source.rate_limit_delay)
                elif 'linkedin' in source.base_domain:
                    scraper = SocialMediaScraper('linkedin', rate_limit=source.rate_limit_delay)
                else:
                    scraper = NewsScraper(source.url, rate_limit=source.rate_limit_delay)
            else:
                scraper = NewsScraper(source.url, rate_limit=source.rate_limit_delay)
            
            # Scrape articles
            scraped_articles = scraper.scrape_site(max_articles)
            result['articles_found'] = len(scraped_articles)
            
            # Process each scraped article
            for scraped_article in scraped_articles:
                try:
                    article_result = self.process_scraped_article(scraped_article, source, db)
                    if article_result == 'new':
                        result['articles_new'] += 1
                    elif article_result == 'updated':
                        result['articles_updated'] += 1
                        
                except Exception as e:
                    self.logger.error(f"Error processing article {scraped_article.url}: {e}")
                    result['errors'].append(str(e))
            
        except Exception as e:
            self.logger.error(f"Error in scraper for {source.url}: {e}")
            result['errors'].append(str(e))
        
        return result
    
    def process_scraped_article(self, scraped_article: ScrapedArticle, source: Source, db: Session) -> str:
        """
        Process and save a scraped article to the database
        
        Args:
            scraped_article: Scraped article data
            source: Source database object
            db: Database session
            
        Returns:
            'new', 'updated', or 'duplicate'
        """
        # Check if article already exists
        existing_article = db.query(Article).filter(
            Article.original_url == scraped_article.url
        ).first()
        
        if existing_article:
            # Update existing article if content changed
            if existing_article.content != scraped_article.content:
                existing_article.content = scraped_article.content
                existing_article.title = scraped_article.title
                existing_article.updated_at = datetime.utcnow()
                db.commit()
                return 'updated'
            return 'duplicate'
        
        # Create new article
        article = Article(
            source_id=source.id,
            original_url=scraped_article.url,
            title=scraped_article.title,
            content=scraped_article.content,
            author=scraped_article.author,
            published_date=scraped_article.published_date,
            language=scraped_article.language,
            tags=scraped_article.tags,
            status=ArticleStatus.SCRAPED,
            word_count=len(scraped_article.content.split()) if scraped_article.content else 0
        )
        
        # Calculate reading time (average 200 words per minute)
        if article.word_count:
            article.reading_time_minutes = max(1, article.word_count // 200)
        
        # Categorize article
        article.category = self.categorize_article(scraped_article)
        
        # Calculate relevance score
        article.relevance_score = self.calculate_relevance_score(scraped_article, source)
        
        db.add(article)
        db.commit()
        
        self.logger.info(f"Saved new article: {article.title}")
        return 'new'
    
    def categorize_article(self, article: ScrapedArticle) -> str:
        """
        Categorize article based on content and keywords
        
        Args:
            article: Scraped article
            
        Returns:
            Category string
        """
        text = f"{article.title} {article.content}".lower()
        
        # Check for DRC-specific content first
        drc_keywords = self.category_keywords['drc_specific']
        if any(keyword in text for keyword in drc_keywords):
            return 'drc_specific'
        
        # Check other categories
        category_scores = {}
        for category, keywords in self.category_keywords.items():
            if category == 'drc_specific':
                continue
            
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                category_scores[category] = score
        
        # Return category with highest score
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
        return 'general'
    
    def calculate_relevance_score(self, article: ScrapedArticle, source: Source) -> float:
        """
        Calculate relevance score for an article
        
        Args:
            article: Scraped article
            source: Source object
            
        Returns:
            Relevance score between 0 and 1
        """
        score = 0.0
        
        # Base score from source reliability
        score += source.reliability_score * 0.3
        
        # Score based on article length (prefer substantial articles)
        if article.content:
            word_count = len(article.content.split())
            if word_count > 500:
                score += 0.2
            elif word_count > 200:
                score += 0.1
        
        # Score based on recency
        if article.published_date:
            days_old = (datetime.now() - article.published_date).days
            if days_old <= 1:
                score += 0.3
            elif days_old <= 7:
                score += 0.2
            elif days_old <= 30:
                score += 0.1
        else:
            score += 0.1  # Unknown date gets moderate score
        
        # Score based on African keywords
        text = f"{article.title} {article.content}".lower()
        africa_keywords = [
            'africa', 'african', 'drc', 'congo', 'nigeria', 'kenya', 
            'ghana', 'south africa', 'fintech', 'startup'
        ]
        
        keyword_matches = sum(1 for keyword in africa_keywords if keyword in text)
        score += min(0.2, keyword_matches * 0.05)
        
        return min(1.0, score)
    
    def schedule_scraping_jobs(self):
        """
        Schedule scraping jobs for all active sources based on their frequency
        """
        if not self.celery_app:
            self.logger.warning("No Celery app configured, cannot schedule jobs")
            return
        
        db = next(get_db())
        try:
            sources = db.query(Source).filter(Source.is_active == True).all()
            
            for source in sources:
                # Check if source needs scraping
                if self._should_scrape_source(source):
                    self.logger.info(f"Scheduling scraping job for {source.name}")
                    
                    # Schedule with Celery
                    self.celery_app.send_task(
                        'scrapers.scrape_source_task',
                        args=[str(source.id)],
                        countdown=0
                    )
        
        finally:
            db.close()
    
    def _should_scrape_source(self, source: Source) -> bool:
        """
        Determine if a source should be scraped based on its frequency and last scrape time
        """
        if not source.last_scraped:
            return True
        
        hours_since_last_scrape = (datetime.utcnow() - source.last_scraped).total_seconds() / 3600
        return hours_since_last_scrape >= source.scraping_frequency
