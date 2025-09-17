"""
Specialized news website scraper
"""
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from .base_scraper import BaseScraper, ScrapedArticle
import newspaper
from newspaper import Article as NewsArticle

class NewsScraper(BaseScraper):
    """
    Specialized scraper for news websites using multiple extraction methods
    """
    
    def __init__(self, base_url: str, rate_limit: float = 1.0, **kwargs):
        super().__init__(base_url, rate_limit, **kwargs)
        
        # Site-specific configurations
        self.site_configs = {
            'actualite.cd': {
                'article_selector': 'article, .post, .news-item',
                'title_selector': 'h1, .post-title, .entry-title',
                'content_selector': '.post-content, .entry-content, .article-content',
                'date_selector': '.post-date, .entry-date, time',
                'author_selector': '.author, .post-author, .byline'
            },
            'radiookapi.net': {
                'article_selector': '.article, .news-item',
                'title_selector': 'h1.title, .article-title',
                'content_selector': '.article-body, .content',
                'date_selector': '.date, .published',
                'author_selector': '.author'
            },
            'jeuneafrique.com': {
                'article_selector': 'article, .article',
                'title_selector': 'h1, .article-title',
                'content_selector': '.article-content, .text',
                'date_selector': '.date, time',
                'author_selector': '.author, .signature'
            },
            'techcabal.com': {
                'article_selector': 'article, .post',
                'title_selector': 'h1.title, .post-title',
                'content_selector': '.post-content, .article-content',
                'date_selector': '.date, .post-date',
                'author_selector': '.author, .post-author'
            }
        }
    
    def scrape_article_urls(self) -> List[str]:
        """
        Scrape article URLs from the main page and category pages
        """
        urls = set()
        
        # Scrape main page
        main_page = self.fetch_page(self.base_url)
        if main_page:
            urls.update(self.extract_links(main_page.text, self.base_url))
        
        # Try common news site patterns
        common_paths = [
            '/news', '/actualites', '/articles', '/politics', '/business',
            '/technology', '/economie', '/politique', '/tech', '/finance'
        ]
        
        for path in common_paths:
            page_url = f"{self.base_url.rstrip('/')}{path}"
            response = self.fetch_page(page_url)
            if response:
                page_urls = self.extract_links(response.text, page_url)
                urls.update(page_urls)
        
        # Filter for likely article URLs
        article_urls = []
        for url in urls:
            if self._is_likely_article_url(url):
                article_urls.append(url)
        
        return list(article_urls)
    
    def _is_likely_article_url(self, url: str) -> bool:
        """
        Determine if a URL is likely an article based on patterns
        """
        url_lower = url.lower()
        
        # Exclude non-article paths
        exclude_patterns = [
            '/category/', '/tag/', '/author/', '/page/', '/search/',
            '/contact', '/about', '/privacy', '/terms', '/login',
            '/register', '/wp-admin', '/wp-content', '/feed',
            '.jpg', '.png', '.gif', '.pdf', '.css', '.js'
        ]
        
        if any(pattern in url_lower for pattern in exclude_patterns):
            return False
        
        # Include likely article patterns
        include_patterns = [
            '/article/', '/news/', '/post/', '/story/', '/report/',
            '/actualite/', '/article', '/nouvelles/', '/info/'
        ]
        
        # Check for date patterns (YYYY/MM/DD or YYYY-MM-DD)
        date_pattern = r'/(20\d{2})[/-](0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])/'
        if re.search(date_pattern, url):
            return True
        
        # Check for article ID patterns
        id_pattern = r'/\d{4,}/?$'
        if re.search(id_pattern, url):
            return True
        
        return any(pattern in url_lower for pattern in include_patterns)
    
    def scrape_article_content(self, url: str) -> Optional[ScrapedArticle]:
        """
        Scrape content from a specific article URL using multiple methods
        """
        # Method 1: Try newspaper3k first (best for extraction)
        article = self._scrape_with_newspaper(url)
        if article and article.content and len(article.content) > 100:
            return article
        
        # Method 2: Try custom extraction based on site configuration
        article = self._scrape_with_custom_selectors(url)
        if article and article.content and len(article.content) > 100:
            return article
        
        # Method 3: Try generic extraction
        article = self._scrape_with_generic_selectors(url)
        if article and article.content and len(article.content) > 100:
            return article
        
        return None
    
    def _scrape_with_newspaper(self, url: str) -> Optional[ScrapedArticle]:
        """
        Use newspaper3k library for content extraction
        """
        try:
            news_article = NewsArticle(url)
            news_article.download()
            news_article.parse()
            
            if not news_article.text or len(news_article.text) < 100:
                return None
            
            # Parse date
            published_date = None
            if news_article.publish_date:
                published_date = news_article.publish_date
            
            # Get authors
            authors = news_article.authors
            author = authors[0] if authors else None
            
            return ScrapedArticle(
                title=news_article.title or "",
                content=news_article.text,
                url=url,
                author=author,
                published_date=published_date,
                tags=list(news_article.tags) if news_article.tags else None,
                meta_description=news_article.meta_description,
                image_url=news_article.top_image,
                language=news_article.meta_lang or "en"
            )
            
        except Exception as e:
            self.logger.warning(f"Newspaper extraction failed for {url}: {e}")
            return None
    
    def _scrape_with_custom_selectors(self, url: str) -> Optional[ScrapedArticle]:
        """
        Use site-specific selectors for content extraction
        """
        domain = self.domain
        config = self.site_configs.get(domain)
        
        if not config:
            return None
        
        response = self.fetch_page(url)
        if not response:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title_elem = soup.select_one(config['title_selector'])
            title = title_elem.get_text(strip=True) if title_elem else ""
            
            # Extract content
            content_elem = soup.select_one(config['content_selector'])
            if not content_elem:
                return None
            
            # Clean content
            content = self._clean_content(content_elem)
            
            # Extract date
            published_date = self._extract_date(soup, config['date_selector'])
            
            # Extract author
            author_elem = soup.select_one(config['author_selector'])
            author = author_elem.get_text(strip=True) if author_elem else None
            
            if content and len(content) > 100:
                return ScrapedArticle(
                    title=title,
                    content=content,
                    url=url,
                    author=author,
                    published_date=published_date
                )
            
        except Exception as e:
            self.logger.warning(f"Custom selector extraction failed for {url}: {e}")
        
        return None
    
    def _scrape_with_generic_selectors(self, url: str) -> Optional[ScrapedArticle]:
        """
        Use generic selectors as fallback
        """
        response = self.fetch_page(url)
        if not response:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Try common title selectors
            title = ""
            title_selectors = ['h1', '.title', '.post-title', '.entry-title', '.article-title']
            for selector in title_selectors:
                elem = soup.select_one(selector)
                if elem:
                    title = elem.get_text(strip=True)
                    break
            
            # Try common content selectors
            content = ""
            content_selectors = [
                '.post-content', '.entry-content', '.article-content',
                '.content', '.text', 'article', '.post', '.main-content'
            ]
            
            for selector in content_selectors:
                elem = soup.select_one(selector)
                if elem:
                    content = self._clean_content(elem)
                    if len(content) > 100:
                        break
            
            if title and content and len(content) > 100:
                return ScrapedArticle(
                    title=title,
                    content=content,
                    url=url
                )
                
        except Exception as e:
            self.logger.warning(f"Generic extraction failed for {url}: {e}")
        
        return None
    
    def _clean_content(self, content_elem) -> str:
        """
        Clean extracted content
        """
        # Remove script and style elements
        for script in content_elem(["script", "style", "nav", "footer", "header", "aside"]):
            script.decompose()
        
        # Get text and clean it
        content = content_elem.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        content = ' '.join(chunk for chunk in chunks if chunk)
        
        return content
    
    def _extract_date(self, soup: BeautifulSoup, date_selector: str) -> Optional[datetime]:
        """
        Extract publication date from the article
        """
        date_elem = soup.select_one(date_selector)
        if not date_elem:
            # Try to find date in meta tags
            meta_date = soup.find('meta', attrs={'property': 'article:published_time'})
            if not meta_date:
                meta_date = soup.find('meta', attrs={'name': 'publishdate'})
            if meta_date:
                date_text = meta_date.get('content', '')
            else:
                return None
        else:
            date_text = date_elem.get('datetime') or date_elem.get_text(strip=True)
        
        if date_text:
            try:
                return date_parser.parse(date_text, fuzzy=True)
            except:
                pass
        
        return None
