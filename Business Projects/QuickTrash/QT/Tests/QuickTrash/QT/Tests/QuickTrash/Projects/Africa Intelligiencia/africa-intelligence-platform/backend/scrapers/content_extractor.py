"""
Advanced content extraction utilities
"""
import re
import json
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import requests
from datetime import datetime
from dateutil import parser as date_parser

class ContentExtractor:
    """
    Advanced content extraction for various website structures
    """
    
    def __init__(self):
        self.json_ld_extractors = {
            'Article': self._extract_article_json_ld,
            'NewsArticle': self._extract_article_json_ld,
            'BlogPosting': self._extract_article_json_ld
        }
    
    def extract_structured_data(self, html: str, url: str) -> Dict[str, Any]:
        """
        Extract structured data from HTML using multiple methods
        
        Args:
            html: HTML content
            url: Original URL
            
        Returns:
            Dictionary with extracted data
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        extracted_data = {
            'title': None,
            'content': None,
            'author': None,
            'published_date': None,
            'modified_date': None,
            'description': None,
            'keywords': [],
            'image_url': None,
            'language': None
        }
        
        # Try JSON-LD first
        json_ld_data = self._extract_json_ld(soup)
        if json_ld_data:
            extracted_data.update(json_ld_data)
        
        # Try Open Graph metadata
        og_data = self._extract_open_graph(soup, url)
        if og_data:
            # Only update None values
            for key, value in og_data.items():
                if extracted_data.get(key) is None and value:
                    extracted_data[key] = value
        
        # Try meta tags
        meta_data = self._extract_meta_tags(soup)
        if meta_data:
            for key, value in meta_data.items():
                if extracted_data.get(key) is None and value:
                    extracted_data[key] = value
        
        # Try microdata
        microdata = self._extract_microdata(soup)
        if microdata:
            for key, value in microdata.items():
                if extracted_data.get(key) is None and value:
                    extracted_data[key] = value
        
        # Fallback to heuristic extraction
        if not extracted_data['content']:
            extracted_data['content'] = self._extract_content_heuristic(soup)
        
        if not extracted_data['title']:
            extracted_data['title'] = self._extract_title_heuristic(soup)
        
        return extracted_data
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Extract data from JSON-LD structured data"""
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Handle single objects or arrays
                if isinstance(data, list):
                    data = data[0]
                
                # Check if it's an article type
                schema_type = data.get('@type', '')
                if schema_type in self.json_ld_extractors:
                    return self.json_ld_extractors[schema_type](data)
                
            except (json.JSONDecodeError, KeyError, IndexError):
                continue
        
        return None
    
    def _extract_article_json_ld(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract article data from JSON-LD"""
        extracted = {}
        
        # Title
        if 'headline' in data:
            extracted['title'] = data['headline']
        elif 'name' in data:
            extracted['title'] = data['name']
        
        # Content
        if 'articleBody' in data:
            extracted['content'] = data['articleBody']
        elif 'text' in data:
            extracted['content'] = data['text']
        
        # Author
        if 'author' in data:
            author_data = data['author']
            if isinstance(author_data, dict):
                extracted['author'] = author_data.get('name')
            elif isinstance(author_data, list) and author_data:
                extracted['author'] = author_data[0].get('name', str(author_data[0]))
            else:
                extracted['author'] = str(author_data)
        
        # Dates
        if 'datePublished' in data:
            extracted['published_date'] = self._parse_date(data['datePublished'])
        
        if 'dateModified' in data:
            extracted['modified_date'] = self._parse_date(data['dateModified'])
        
        # Description
        if 'description' in data:
            extracted['description'] = data['description']
        
        # Keywords
        if 'keywords' in data:
            keywords = data['keywords']
            if isinstance(keywords, str):
                extracted['keywords'] = [k.strip() for k in keywords.split(',')]
            elif isinstance(keywords, list):
                extracted['keywords'] = keywords
        
        # Image
        if 'image' in data:
            image_data = data['image']
            if isinstance(image_data, dict):
                extracted['image_url'] = image_data.get('url')
            elif isinstance(image_data, list) and image_data:
                extracted['image_url'] = image_data[0] if isinstance(image_data[0], str) else image_data[0].get('url')
            else:
                extracted['image_url'] = str(image_data)
        
        # Language
        if 'inLanguage' in data:
            extracted['language'] = data['inLanguage']
        
        return extracted
    
    def _extract_open_graph(self, soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
        """Extract Open Graph metadata"""
        extracted = {}
        
        og_mappings = {
            'og:title': 'title',
            'og:description': 'description',
            'og:image': 'image_url',
            'og:locale': 'language',
            'article:author': 'author',
            'article:published_time': 'published_date',
            'article:modified_time': 'modified_date',
            'article:tag': 'keywords'
        }
        
        for property_name, field_name in og_mappings.items():
            meta_tag = soup.find('meta', property=property_name)
            if meta_tag and meta_tag.get('content'):
                content = meta_tag['content']
                
                if field_name == 'published_date' or field_name == 'modified_date':
                    extracted[field_name] = self._parse_date(content)
                elif field_name == 'image_url':
                    extracted[field_name] = urljoin(base_url, content)
                elif field_name == 'keywords':
                    if field_name not in extracted:
                        extracted[field_name] = []
                    extracted[field_name].append(content)
                else:
                    extracted[field_name] = content
        
        return extracted
    
    def _extract_meta_tags(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract data from standard meta tags"""
        extracted = {}
        
        meta_mappings = {
            'description': 'description',
            'keywords': 'keywords',
            'author': 'author',
            'language': 'language',
            'publishdate': 'published_date',
            'date': 'published_date'
        }
        
        for name, field_name in meta_mappings.items():
            meta_tag = soup.find('meta', attrs={'name': name})
            if meta_tag and meta_tag.get('content'):
                content = meta_tag['content']
                
                if field_name == 'keywords':
                    extracted[field_name] = [k.strip() for k in content.split(',')]
                elif field_name == 'published_date':
                    extracted[field_name] = self._parse_date(content)
                else:
                    extracted[field_name] = content
        
        return extracted
    
    def _extract_microdata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract microdata structured information"""
        extracted = {}
        
        # Look for elements with itemtype
        article_types = [
            'http://schema.org/Article',
            'http://schema.org/NewsArticle',
            'http://schema.org/BlogPosting'
        ]
        
        for article_type in article_types:
            article_elem = soup.find(attrs={'itemtype': article_type})
            if article_elem:
                # Extract properties
                title_elem = article_elem.find(attrs={'itemprop': 'headline'}) or article_elem.find(attrs={'itemprop': 'name'})
                if title_elem:
                    extracted['title'] = title_elem.get_text(strip=True)
                
                content_elem = article_elem.find(attrs={'itemprop': 'articleBody'}) or article_elem.find(attrs={'itemprop': 'text'})
                if content_elem:
                    extracted['content'] = content_elem.get_text(strip=True)
                
                author_elem = article_elem.find(attrs={'itemprop': 'author'})
                if author_elem:
                    extracted['author'] = author_elem.get_text(strip=True)
                
                date_elem = article_elem.find(attrs={'itemprop': 'datePublished'})
                if date_elem:
                    date_text = date_elem.get('datetime') or date_elem.get_text(strip=True)
                    extracted['published_date'] = self._parse_date(date_text)
                
                break
        
        return extracted
    
    def _extract_content_heuristic(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main content using heuristic methods"""
        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'advertisement']):
            element.decompose()
        
        # Try common content selectors in order of preference
        content_selectors = [
            '[role="main"]',
            'main',
            'article',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.content',
            '.post-body',
            '.article-body',
            '#content',
            '#main-content',
            '.main-content'
        ]
        
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(separator=' ', strip=True)
                if len(content) > 200:  # Minimum content length
                    return content
        
        # Fallback: find the largest text block
        paragraphs = soup.find_all('p')
        if paragraphs:
            all_text = ' '.join(p.get_text(strip=True) for p in paragraphs)
            if len(all_text) > 100:
                return all_text
        
        return None
    
    def _extract_title_heuristic(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract title using heuristic methods"""
        # Try common title selectors
        title_selectors = [
            'h1',
            '.post-title',
            '.entry-title',
            '.article-title',
            '.title',
            '.headline'
        ]
        
        for selector in title_selectors:
            element = soup.select_one(selector)
            if element:
                title = element.get_text(strip=True)
                if title and len(title) > 10:
                    return title
        
        # Fallback to page title
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text(strip=True)
        
        return None
    
    def _parse_date(self, date_string: str) -> Optional[datetime]:
        """Parse date string into datetime object"""
        if not date_string:
            return None
        
        try:
            return date_parser.parse(date_string, fuzzy=True)
        except (ValueError, TypeError):
            return None
    
    def extract_keywords_from_content(self, content: str) -> List[str]:
        """
        Extract relevant keywords from content using simple NLP techniques
        """
        if not content:
            return []
        
        # African-specific keywords to prioritize
        africa_keywords = [
            'africa', 'african', 'drc', 'congo', 'kinshasa', 'lubumbashi',
            'nigeria', 'lagos', 'kenya', 'nairobi', 'ghana', 'accra',
            'south africa', 'cape town', 'johannesburg', 'egypt', 'cairo',
            'fintech', 'startup', 'investment', 'technology', 'innovation',
            'infrastructure', 'mining', 'agriculture', 'energy', 'healthcare'
        ]
        
        content_lower = content.lower()
        found_keywords = []
        
        for keyword in africa_keywords:
            if keyword in content_lower:
                found_keywords.append(keyword)
        
        # Extract capitalized words (likely proper nouns/companies)
        proper_nouns = re.findall(r'\\b[A-Z][a-zA-Z]{2,}\\b', content)
        
        # Combine and deduplicate
        all_keywords = found_keywords + proper_nouns[:10]  # Limit proper nouns
        return list(set(all_keywords))[:20]  # Return max 20 keywords
