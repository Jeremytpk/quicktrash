"""
Social media content scraper (Twitter/X, LinkedIn public data)
"""
import re
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
import requests
from .base_scraper import BaseScraper, ScrapedArticle

class SocialMediaScraper(BaseScraper):
    """
    Scraper for public social media content related to African tech/business
    """
    
    def __init__(self, platform: str, rate_limit: float = 2.0, **kwargs):
        """
        Initialize social media scraper
        
        Args:
            platform: 'twitter' or 'linkedin'
            rate_limit: Delay between requests (higher for social media)
        """
        self.platform = platform.lower()
        
        if platform == 'twitter':
            base_url = "https://twitter.com"
        elif platform == 'linkedin':
            base_url = "https://linkedin.com"
        else:
            raise ValueError(f"Unsupported platform: {platform}")
        
        super().__init__(base_url, rate_limit, **kwargs)
        
        # African tech keywords for filtering
        self.africa_keywords = [
            'africa', 'african', 'drc', 'congo', 'kinshasa', 'lubumbashi',
            'nigeria', 'kenya', 'south africa', 'ghana', 'egypt',
            'fintech africa', 'african startup', 'african tech', 
            'african business', 'african investment', 'african innovation'
        ]
        
        # Setup platform-specific headers
        self._setup_platform_headers()
    
    def _setup_platform_headers(self):
        """Setup platform-specific headers"""
        if self.platform == 'twitter':
            self.session.headers.update({
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://twitter.com',
            })
        elif self.platform == 'linkedin':
            self.session.headers.update({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://linkedin.com',
            })
    
    def scrape_article_urls(self) -> List[str]:
        """
        Get URLs for social media posts/content
        Note: This is a simplified implementation for demonstration
        """
        urls = []
        
        if self.platform == 'twitter':
            urls.extend(self._get_twitter_search_urls())
        elif self.platform == 'linkedin':
            urls.extend(self._get_linkedin_content_urls())
        
        return urls
    
    def _get_twitter_search_urls(self) -> List[str]:
        """
        Get Twitter search URLs for African tech content
        Note: In production, use Twitter API v2 for better results
        """
        search_queries = [
            "african fintech",
            "drc technology", 
            "congo innovation",
            "african startup funding",
            "african business news",
            "tech africa investment"
        ]
        
        urls = []
        for query in search_queries:
            # This is a placeholder - in production use Twitter API
            search_url = f"https://twitter.com/search?q={query.replace(' ', '%20')}&f=live"
            urls.append(search_url)
        
        return urls
    
    def _get_linkedin_content_urls(self) -> List[str]:
        """
        Get LinkedIn content URLs for African business/tech
        """
        # Key African tech companies and influencers on LinkedIn
        linkedin_profiles = [
            "https://linkedin.com/company/techcabal",
            "https://linkedin.com/company/disrupt-africa", 
            "https://linkedin.com/company/africa-business-angel-network",
            "https://linkedin.com/company/partech-partners",
            "https://linkedin.com/company/tlcom-capital"
        ]
        
        return linkedin_profiles
    
    def scrape_article_content(self, url: str) -> Optional[ScrapedArticle]:
        """
        Scrape content from social media post
        """
        if self.platform == 'twitter':
            return self._scrape_twitter_content(url)
        elif self.platform == 'linkedin':
            return self._scrape_linkedin_content(url)
        
        return None
    
    def _scrape_twitter_content(self, url: str) -> Optional[ScrapedArticle]:
        """
        Scrape Twitter content (simplified implementation)
        Note: In production, use Twitter API v2
        """
        response = self.fetch_page(url)
        if not response:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for tweet content (this is a simplified approach)
            tweet_selectors = [
                '[data-testid="tweetText"]',
                '.tweet-text',
                '.js-tweet-text'
            ]
            
            tweets = []
            for selector in tweet_selectors:
                elements = soup.select(selector)
                for elem in elements:
                    text = elem.get_text(strip=True)
                    if self._is_africa_related(text) and len(text) > 50:
                        tweets.append(text)
            
            if tweets:
                # Combine all relevant tweets
                content = "\\n\\n".join(tweets[:5])  # Limit to 5 tweets
                
                return ScrapedArticle(
                    title=f"African Tech Twitter Updates - {datetime.now().strftime('%Y-%m-%d')}",
                    content=content,
                    url=url,
                    published_date=datetime.now(),
                    tags=['twitter', 'social_media', 'africa_tech']
                )
        
        except Exception as e:
            self.logger.error(f"Error scraping Twitter content from {url}: {e}")
        
        return None
    
    def _scrape_linkedin_content(self, url: str) -> Optional[ScrapedArticle]:
        """
        Scrape LinkedIn company/profile content
        """
        response = self.fetch_page(url)
        if not response:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for LinkedIn post content
            post_selectors = [
                '.feed-shared-update-v2__description-wrapper',
                '.feed-shared-text',
                '.share-update-card__update-text'
            ]
            
            posts = []
            for selector in post_selectors:
                elements = soup.select(selector)
                for elem in elements:
                    text = elem.get_text(strip=True)
                    if self._is_africa_related(text) and len(text) > 100:
                        posts.append(text)
            
            if posts:
                content = "\\n\\n---\\n\\n".join(posts[:3])  # Limit to 3 posts
                
                # Try to get company/profile name
                title_elem = soup.select_one('h1, .top-card-layout__title')
                title = title_elem.get_text(strip=True) if title_elem else "LinkedIn Updates"
                
                return ScrapedArticle(
                    title=f"{title} - African Tech Updates",
                    content=content,
                    url=url,
                    published_date=datetime.now(),
                    tags=['linkedin', 'social_media', 'africa_business']
                )
        
        except Exception as e:
            self.logger.error(f"Error scraping LinkedIn content from {url}: {e}")
        
        return None
    
    def _is_africa_related(self, text: str) -> bool:
        """
        Check if text content is related to Africa/African tech/business
        """
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.africa_keywords)
    
    def scrape_trending_topics(self) -> List[str]:
        """
        Scrape trending topics related to African tech/business
        """
        if self.platform == 'twitter':
            return self._get_twitter_trends()
        elif self.platform == 'linkedin':
            return self._get_linkedin_trends()
        
        return []
    
    def _get_twitter_trends(self) -> List[str]:
        """
        Get Twitter trending topics (simplified)
        In production, use Twitter API v2 trends endpoint
        """
        try:
            # This would use Twitter API in production
            trends_url = "https://twitter.com/i/trends"
            response = self.fetch_page(trends_url)
            
            if response:
                soup = BeautifulSoup(response.text, 'html.parser')
                trend_elements = soup.select('[data-testid="trend"]')
                
                trends = []
                for elem in trend_elements:
                    trend_text = elem.get_text(strip=True)
                    if self._is_africa_related(trend_text):
                        trends.append(trend_text)
                
                return trends[:10]  # Return top 10 Africa-related trends
        
        except Exception as e:
            self.logger.error(f"Error getting Twitter trends: {e}")
        
        return []
    
    def _get_linkedin_trends(self) -> List[str]:
        """
        Get LinkedIn trending topics (simplified)
        """
        # LinkedIn doesn't have a public trends API
        # This would track popular hashtags in African business posts
        return [
            "#AfricanTech", "#AfricanStartups", "#AfricanInnovation",
            "#DRCTech", "#NigeriaTech", "#KenyaTech", "#AfricanFintech"
        ]
