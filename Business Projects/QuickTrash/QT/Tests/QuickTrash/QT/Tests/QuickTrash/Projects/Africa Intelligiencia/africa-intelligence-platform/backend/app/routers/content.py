"""
Generated content endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db, GeneratedContent, Article, ContentType
from ..schemas.content import (
    GeneratedContentResponse, VideoScriptResponse, BlogPostResponse,
    SummaryResponse, ContentGenerationRequest, ContentStats
)
from ..core.security import get_current_user, get_current_active_user
from ..ai_services import ContentGenerator

router = APIRouter()

@router.get("/article/{article_id}", response_model=List[GeneratedContentResponse])
async def get_article_content(
    article_id: str,
    content_type: Optional[ContentType] = Query(None, description="Filter by content type"),
    db: Session = Depends(get_db)
):
    """
    Get all generated content for a specific article
    """
    query = db.query(GeneratedContent).filter(
        GeneratedContent.article_id == article_id
    )
    
    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)
    
    content_items = query.order_by(GeneratedContent.created_at.desc()).all()
    
    if not content_items:
        raise HTTPException(status_code=404, detail="No generated content found")
    
    return content_items

@router.get("/summary/{article_id}", response_model=SummaryResponse)
async def get_article_summary(
    article_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated summary for an article
    """
    summary = db.query(GeneratedContent).filter(
        GeneratedContent.article_id == article_id,
        GeneratedContent.content_type == ContentType.SUMMARY
    ).first()
    
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    # Track view
    summary.view_count += 1
    db.commit()
    
    return SummaryResponse(
        id=str(summary.id),
        article_id=str(summary.article_id),
        title=summary.title,
        summary=summary.content,
        confidence_score=summary.confidence_score,
        view_count=summary.view_count,
        created_at=summary.created_at
    )

@router.get("/video-script/{article_id}", response_model=VideoScriptResponse)
async def get_video_script(
    article_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated video script for an article
    """
    script = db.query(GeneratedContent).filter(
        GeneratedContent.article_id == article_id,
        GeneratedContent.content_type == ContentType.VIDEO_SCRIPT
    ).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Video script not found")
    
    # Track view
    script.view_count += 1
    db.commit()
    
    return VideoScriptResponse(
        id=str(script.id),
        article_id=str(script.article_id),
        title=script.title,
        script=script.content,
        estimated_duration_seconds=script.estimated_duration_seconds,
        visual_suggestions=script.visual_suggestions or [],
        content_type="video_script",
        view_count=script.view_count,
        created_at=script.created_at
    )

@router.get("/blog-post/{article_id}", response_model=BlogPostResponse)
async def get_blog_post(
    article_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated blog post for an article
    """
    blog_post = db.query(GeneratedContent).filter(
        GeneratedContent.article_id == article_id,
        GeneratedContent.content_type == ContentType.BLOG_POST
    ).first()
    
    if not blog_post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Track view
    blog_post.view_count += 1
    db.commit()
    
    # Extract metadata from generation prompt or estimate
    word_count = len(blog_post.content.split()) if blog_post.content else 0
    reading_time = max(1, word_count // 200)  # 200 words per minute
    
    return BlogPostResponse(
        id=str(blog_post.id),
        article_id=str(blog_post.article_id),
        title=blog_post.title,
        content=blog_post.content,
        word_count=word_count,
        reading_time_minutes=reading_time,
        tags=["African Business", "Technology", "News"],  # Could be extracted from content
        category="business",  # Could be derived from article category
        view_count=blog_post.view_count,
        created_at=blog_post.created_at
    )

@router.post("/generate")
async def generate_content(
    request: ContentGenerationRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI content for an article
    """
    # Check if article exists
    article = db.query(Article).filter(Article.id == request.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Initialize content generator
    content_generator = ContentGenerator()
    
    results = {}
    
    # Generate requested content types
    for content_type in request.content_types:
        try:
            if content_type == ContentType.SUMMARY:
                if request.regenerate:
                    # Delete existing summary
                    existing = db.query(GeneratedContent).filter(
                        GeneratedContent.article_id == article.id,
                        GeneratedContent.content_type == ContentType.SUMMARY
                    ).first()
                    if existing:
                        db.delete(existing)
                        db.commit()
                
                result = content_generator.generate_summary(article, db)
                results['summary'] = result
                
            elif content_type == ContentType.VIDEO_SCRIPT:
                if request.regenerate:
                    existing = db.query(GeneratedContent).filter(
                        GeneratedContent.article_id == article.id,
                        GeneratedContent.content_type == ContentType.VIDEO_SCRIPT
                    ).first()
                    if existing:
                        db.delete(existing)
                        db.commit()
                
                result = content_generator.generate_video_script(article, db)
                results['video_script'] = result
                
            elif content_type == ContentType.BLOG_POST:
                if request.regenerate:
                    existing = db.query(GeneratedContent).filter(
                        GeneratedContent.article_id == article.id,
                        GeneratedContent.content_type == ContentType.BLOG_POST
                    ).first()
                    if existing:
                        db.delete(existing)
                        db.commit()
                
                result = content_generator.generate_blog_post(article, db)
                results['blog_post'] = result
                
        except Exception as e:
            results[f'{content_type.value}_error'] = str(e)
    
    return {
        "message": "Content generation completed",
        "article_id": request.article_id,
        "results": results
    }

@router.get("/stats", response_model=ContentStats)
async def get_content_stats(db: Session = Depends(get_db)):
    """
    Get content generation statistics
    """
    content_generator = ContentGenerator()
    stats = content_generator.get_generation_stats(db)
    
    return ContentStats(
        total_articles=stats.get('total_articles', 0),
        processed_articles=stats.get('article_status_counts', {}).get('processed', 0),
        pending_articles=stats.get('article_status_counts', {}).get('scraped', 0),
        failed_articles=stats.get('article_status_counts', {}).get('failed', 0),
        total_summaries=stats.get('generated_content_counts', {}).get('summary', 0),
        total_video_scripts=stats.get('generated_content_counts', {}).get('video_script', 0),
        total_blog_posts=stats.get('generated_content_counts', {}).get('blog_post', 0),
        average_confidence_score=stats.get('average_confidence_score', 0.0)
    )

@router.get("/popular", response_model=List[GeneratedContentResponse])
async def get_popular_content(
    content_type: Optional[ContentType] = Query(None, description="Filter by content type"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    """
    Get popular generated content based on view count
    """
    query = db.query(GeneratedContent)
    
    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)
    
    content_items = query.order_by(
        GeneratedContent.view_count.desc()
    ).limit(limit).all()
    
    return content_items

@router.get("/recent", response_model=List[GeneratedContentResponse])
async def get_recent_content(
    content_type: Optional[ContentType] = Query(None, description="Filter by content type"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    """
    Get recently generated content
    """
    query = db.query(GeneratedContent)
    
    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)
    
    content_items = query.order_by(
        GeneratedContent.created_at.desc()
    ).limit(limit).all()
    
    return content_items
