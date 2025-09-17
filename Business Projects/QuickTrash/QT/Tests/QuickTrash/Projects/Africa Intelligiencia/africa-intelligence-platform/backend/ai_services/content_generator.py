"""
Main content generator service that orchestrates all AI-powered content generation
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import Article, GeneratedContent, ContentType
from .summarizer import ContentSummarizer
from .video_script_generator import VideoScriptGenerator
from .blog_post_generator import BlogPostGenerator

logger = logging.getLogger(__name__)

class ContentGenerator:
    """
    Main service for generating AI-powered content from scraped articles
    """
    
    def __init__(self):
        """Initialize the content generator with all AI services"""
        try:
            self.summarizer = ContentSummarizer()
            self.video_generator = VideoScriptGenerator(self.summarizer)
            self.blog_generator = BlogPostGenerator(self.summarizer)
            
            logger.info("Content generator services initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing content generator: {e}")
            raise
    
    def generate_all_content(self, article: Article, db: Session) -> Dict[str, Any]:
        """
        Generate all types of content for an article
        
        Args:
            article: Article database object
            db: Database session
            
        Returns:
            Dictionary with generation results
        """
        results = {
            'article_id': str(article.id),
            'summary': None,
            'video_script': None,
            'blog_post': None,
            'errors': []
        }
        
        try:
            # Generate summary first (required for other content types)
            logger.info(f"Generating summary for article: {article.title}")
            summary_result = self.generate_summary(article, db)
            results['summary'] = summary_result
            
            # Generate video script
            logger.info(f"Generating video script for article: {article.title}")
            video_result = self.generate_video_script(article, db)
            results['video_script'] = video_result
            
            # Generate blog post
            logger.info(f"Generating blog post for article: {article.title}")
            blog_result = self.generate_blog_post(article, db)
            results['blog_post'] = blog_result
            
            # Update article flags
            article.has_summary = results['summary'] is not None
            article.has_video_script = results['video_script'] is not None
            article.has_blog_post = results['blog_post'] is not None
            
            db.commit()
            
            logger.info(f"Content generation completed for article: {article.title}")
            
        except Exception as e:
            logger.error(f"Error in content generation for article {article.id}: {e}")
            results['errors'].append(str(e))
            db.rollback()
        
        return results
    
    def generate_summary(self, article: Article, db: Session) -> Optional[Dict[str, Any]]:
        """
        Generate AI summary for an article
        
        Args:
            article: Article database object
            db: Database session
            
        Returns:
            Dictionary with summary generation results
        """
        try:
            # Check if summary already exists
            existing_summary = db.query(GeneratedContent).filter(
                GeneratedContent.article_id == article.id,
                GeneratedContent.content_type == ContentType.SUMMARY
            ).first()
            
            if existing_summary:
                logger.info(f"Summary already exists for article {article.id}")
                return {
                    'id': str(existing_summary.id),
                    'content': existing_summary.content,
                    'title': existing_summary.title,
                    'confidence_score': existing_summary.confidence_score
                }
            
            # Generate new summary
            summary_data = self.summarizer.summarize_article(
                content=article.content,
                title=article.title,
                max_length=150,
                min_length=50
            )
            
            # Save to database
            generated_content = GeneratedContent(
                article_id=article.id,
                content_type=ContentType.SUMMARY,
                title=summary_data['catchy_headline'],
                content=summary_data['summary'],
                model_used="facebook/bart-large-cnn",
                confidence_score=summary_data['confidence_score'],
                generation_prompt="Summarize this African business/tech article"
            )
            
            db.add(generated_content)
            db.commit()
            
            return {
                'id': str(generated_content.id),
                'content': summary_data['summary'],
                'title': summary_data['catchy_headline'],
                'confidence_score': summary_data['confidence_score']
            }
            
        except Exception as e:
            logger.error(f"Error generating summary for article {article.id}: {e}")
            return None
    
    def generate_video_script(self, article: Article, db: Session) -> Optional[Dict[str, Any]]:
        """
        Generate video script for an article
        
        Args:
            article: Article database object
            db: Database session
            
        Returns:
            Dictionary with video script generation results
        """
        try:
            # Check if video script already exists
            existing_script = db.query(GeneratedContent).filter(
                GeneratedContent.article_id == article.id,
                GeneratedContent.content_type == ContentType.VIDEO_SCRIPT
            ).first()
            
            if existing_script:
                logger.info(f"Video script already exists for article {article.id}")
                return {
                    'id': str(existing_script.id),
                    'script': existing_script.content,
                    'title': existing_script.title,
                    'duration': existing_script.estimated_duration_seconds,
                    'visuals': existing_script.visual_suggestions
                }
            
            # Generate new video script
            script_data = self.video_generator.generate_video_script(
                article_title=article.title,
                article_content=article.content,
                target_duration=45  # 45-second videos
            )
            
            # Save to database
            generated_content = GeneratedContent(
                article_id=article.id,
                content_type=ContentType.VIDEO_SCRIPT,
                title=script_data['title'],
                content=script_data['script'],
                estimated_duration_seconds=script_data['estimated_duration_seconds'],
                visual_suggestions=script_data['visual_suggestions'],
                model_used="custom_video_script_generator",
                generation_prompt=f"Generate {script_data['target_duration']}-second video script"
            )
            
            db.add(generated_content)
            db.commit()
            
            return {
                'id': str(generated_content.id),
                'script': script_data['script'],
                'title': script_data['title'],
                'duration': script_data['estimated_duration_seconds'],
                'visuals': script_data['visual_suggestions'],
                'content_type': script_data['content_type']
            }
            
        except Exception as e:
            logger.error(f"Error generating video script for article {article.id}: {e}")
            return None
    
    def generate_blog_post(self, article: Article, db: Session) -> Optional[Dict[str, Any]]:
        """
        Generate blog post for an article
        
        Args:
            article: Article database object
            db: Database session
            
        Returns:
            Dictionary with blog post generation results
        """
        try:
            # Check if blog post already exists
            existing_blog = db.query(GeneratedContent).filter(
                GeneratedContent.article_id == article.id,
                GeneratedContent.content_type == ContentType.BLOG_POST
            ).first()
            
            if existing_blog:
                logger.info(f"Blog post already exists for article {article.id}")
                return {
                    'id': str(existing_blog.id),
                    'content': existing_blog.content,
                    'title': existing_blog.title,
                    'word_count': len(existing_blog.content.split()) if existing_blog.content else 0
                }
            
            # Generate new blog post
            blog_data = self.blog_generator.generate_blog_post(
                article_title=article.title,
                article_content=article.content,
                original_url=article.original_url,
                target_length=600
            )
            
            # Save to database
            generated_content = GeneratedContent(
                article_id=article.id,
                content_type=ContentType.BLOG_POST,
                title=blog_data['title'],
                content=blog_data['content'],
                model_used="custom_blog_post_generator",
                generation_prompt=f"Generate {blog_data['word_count']}-word blog post"
            )
            
            db.add(generated_content)
            db.commit()
            
            return {
                'id': str(generated_content.id),
                'content': blog_data['content'],
                'title': blog_data['title'],
                'word_count': blog_data['word_count'],
                'reading_time': blog_data['reading_time_minutes'],
                'tags': blog_data['tags'],
                'category': blog_data['category']
            }
            
        except Exception as e:
            logger.error(f"Error generating blog post for article {article.id}: {e}")
            return None
    
    def process_article_queue(self, db: Session, limit: int = 10) -> Dict[str, Any]:
        """
        Process a queue of articles that need content generation
        
        Args:
            db: Database session
            limit: Maximum number of articles to process
            
        Returns:
            Processing results summary
        """
        from ..database import ArticleStatus
        
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Get articles that have been scraped but not processed
            articles = db.query(Article).filter(
                Article.status == ArticleStatus.SCRAPED,
                Article.content.isnot(None),
                Article.word_count > 100  # Minimum content length
            ).limit(limit).all()
            
            logger.info(f"Processing {len(articles)} articles for content generation")
            
            for article in articles:
                try:
                    # Update article status to processing
                    article.status = ArticleStatus.PROCESSING
                    db.commit()
                    
                    # Generate all content types
                    generation_results = self.generate_all_content(article, db)
                    
                    # Check if generation was successful
                    if generation_results['errors']:
                        article.status = ArticleStatus.FAILED
                        article.processing_error = '; '.join(generation_results['errors'])
                        results['failed'] += 1
                        results['errors'].extend(generation_results['errors'])
                    else:
                        article.status = ArticleStatus.PROCESSED
                        results['successful'] += 1
                    
                    results['processed'] += 1
                    db.commit()
                    
                    logger.info(f"Processed article {article.id}: {article.title}")
                    
                except Exception as e:
                    logger.error(f"Error processing article {article.id}: {e}")
                    article.status = ArticleStatus.FAILED
                    article.processing_error = str(e)
                    results['failed'] += 1
                    results['errors'].append(str(e))
                    db.commit()
            
            logger.info(f"Content generation batch completed: {results}")
            
        except Exception as e:
            logger.error(f"Error in process_article_queue: {e}")
            results['errors'].append(str(e))
        
        return results
    
    def regenerate_content(
        self, 
        article_id: str, 
        content_types: List[str], 
        db: Session
    ) -> Dict[str, Any]:
        """
        Regenerate specific content types for an article
        
        Args:
            article_id: Article ID
            content_types: List of content types to regenerate ('summary', 'video_script', 'blog_post')
            db: Database session
            
        Returns:
            Regeneration results
        """
        results = {
            'article_id': article_id,
            'regenerated': [],
            'errors': []
        }
        
        try:
            # Get the article
            article = db.query(Article).filter(Article.id == article_id).first()
            if not article:
                results['errors'].append(f"Article {article_id} not found")
                return results
            
            # Delete existing content for specified types
            for content_type in content_types:
                if content_type == 'summary':
                    db_content_type = ContentType.SUMMARY
                elif content_type == 'video_script':
                    db_content_type = ContentType.VIDEO_SCRIPT
                elif content_type == 'blog_post':
                    db_content_type = ContentType.BLOG_POST
                else:
                    results['errors'].append(f"Unknown content type: {content_type}")
                    continue
                
                # Delete existing content
                existing_content = db.query(GeneratedContent).filter(
                    GeneratedContent.article_id == article.id,
                    GeneratedContent.content_type == db_content_type
                ).first()
                
                if existing_content:
                    db.delete(existing_content)
                
                # Generate new content
                if content_type == 'summary':
                    result = self.generate_summary(article, db)
                elif content_type == 'video_script':
                    result = self.generate_video_script(article, db)
                elif content_type == 'blog_post':
                    result = self.generate_blog_post(article, db)
                
                if result:
                    results['regenerated'].append(content_type)
                else:
                    results['errors'].append(f"Failed to regenerate {content_type}")
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error regenerating content for article {article_id}: {e}")
            results['errors'].append(str(e))
            db.rollback()
        
        return results
    
    def get_generation_stats(self, db: Session) -> Dict[str, Any]:
        """
        Get statistics about content generation
        
        Args:
            db: Database session
            
        Returns:
            Statistics dictionary
        """
        try:
            from sqlalchemy import func
            
            # Get article counts by status
            status_counts = db.query(
                Article.status,
                func.count(Article.id)
            ).group_by(Article.status).all()
            
            # Get generated content counts by type
            content_counts = db.query(
                GeneratedContent.content_type,
                func.count(GeneratedContent.id)
            ).group_by(GeneratedContent.content_type).all()
            
            # Get average confidence scores
            avg_confidence = db.query(
                func.avg(GeneratedContent.confidence_score)
            ).filter(
                GeneratedContent.confidence_score.isnot(None)
            ).scalar()
            
            return {
                'article_status_counts': dict(status_counts),
                'generated_content_counts': dict(content_counts),
                'average_confidence_score': float(avg_confidence) if avg_confidence else 0.0,
                'total_articles': sum(count for _, count in status_counts),
                'total_generated_content': sum(count for _, count in content_counts)
            }
            
        except Exception as e:
            logger.error(f"Error getting generation stats: {e}")
            return {
                'error': str(e)
            }
