"""
Articles endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from ..database import (
    get_db, Article, Source, ArticleBookmark, ReadingHistory, 
    User, ContentCategory, ArticleStatus
)
from ..schemas.articles import (
    ArticleResponse, ArticleSummaryResponse, ArticleFilter, SourceResponse
)
from ..schemas.common import PaginatedResponse, PaginationParams
from ..schemas.users import BookmarkCreate, BookmarkResponse
from ..core.security import get_current_user, get_current_active_user

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_articles(
    request: Request,
    pagination: PaginationParams = Depends(),
    category: Optional[ContentCategory] = Query(None, description="Filter by category"),
    region: Optional[str] = Query(None, description="Filter by region"),
    search: Optional[str] = Query(None, description="Search in title and content"),
    min_relevance: Optional[float] = Query(None, ge=0, le=1, description="Minimum relevance score"),
    has_video: Optional[bool] = Query(None, description="Has video script"),
    has_summary: Optional[bool] = Query(None, description="Has AI summary"),
    language: Optional[str] = Query(None, description="Article language"),
    sort_by: str = Query("relevance_score", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of articles with filtering and sorting
    """
    # Build query
    query = db.query(Article).filter(Article.status == ArticleStatus.PROCESSED)
    
    # Apply filters
    if category:
        query = query.filter(Article.category == category)
    
    if region:
        query = query.join(Source).filter(Source.region.ilike(f"%{region}%"))
    
    if search:
        query = query.filter(
            or_(
                Article.title.ilike(f"%{search}%"),
                Article.content.ilike(f"%{search}%")
            )
        )
    
    if min_relevance is not None:
        query = query.filter(Article.relevance_score >= min_relevance)
    
    if has_video is not None:
        query = query.filter(Article.has_video_script == has_video)
    
    if has_summary is not None:
        query = query.filter(Article.has_summary == has_summary)
    
    if language:
        query = query.filter(Article.language == language)
    
    # Apply sorting
    sort_field = getattr(Article, sort_by, Article.relevance_score)
    if sort_order == "desc":
        query = query.order_by(desc(sort_field))
    else:
        query = query.order_by(asc(sort_field))
    
    # Apply personalization if user is authenticated
    if current_user and current_user.preferences:
        prefs = current_user.preferences
        
        # Filter by preferred categories
        if prefs.preferred_categories:
            query = query.filter(Article.category.in_(prefs.preferred_categories))
        
        # Filter by preferred regions
        if prefs.preferred_regions:
            query = query.join(Source).filter(
                or_(*[Source.region.ilike(f"%{region}%") for region in prefs.preferred_regions])
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (pagination.page - 1) * pagination.size
    articles = query.offset(offset).limit(pagination.size).all()
    
    # Convert to summary response
    items = []
    for article in articles:
        summary = ArticleSummaryResponse(
            id=str(article.id),
            title=article.title,
            author=article.author,
            original_url=article.original_url,
            published_date=article.published_date,
            category=article.category,
            tags=article.tags,
            relevance_score=article.relevance_score,
            reading_time_minutes=article.reading_time_minutes,
            has_summary=article.has_summary,
            has_video_script=article.has_video_script,
            has_blog_post=article.has_blog_post,
            source_name=article.source.name if article.source else "Unknown"
        )
        items.append(summary)
    
    # Calculate pagination info
    pages = (total + pagination.size - 1) // pagination.size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages,
        has_next=pagination.page < pages,
        has_prev=pagination.page > 1
    )

@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific article by ID
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Track view if user is authenticated
    if current_user:
        # Check if user has already viewed this article recently
        from datetime import datetime, timedelta
        recent_view = db.query(ReadingHistory).filter(
            ReadingHistory.user_id == current_user.id,
            ReadingHistory.article_id == article.id,
            ReadingHistory.read_at > datetime.utcnow() - timedelta(hours=1)
        ).first()
        
        if not recent_view:
            # Record reading history
            reading_history = ReadingHistory(
                user_id=current_user.id,
                article_id=article.id,
                device_type="web"  # Could be determined from user agent
            )
            db.add(reading_history)
            
            # Increment view count
            article.view_count += 1
            db.commit()
    
    return article

@router.post("/{article_id}/bookmark", response_model=BookmarkResponse)
async def bookmark_article(
    article_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Bookmark an article
    """
    # Check if article exists
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if already bookmarked
    existing_bookmark = db.query(ArticleBookmark).filter(
        ArticleBookmark.user_id == current_user.id,
        ArticleBookmark.article_id == article.id
    ).first()
    
    if existing_bookmark:
        raise HTTPException(status_code=400, detail="Article already bookmarked")
    
    # Create bookmark
    bookmark = ArticleBookmark(
        user_id=current_user.id,
        article_id=article.id
    )
    
    db.add(bookmark)
    
    # Update bookmark count
    article.bookmark_count += 1
    db.commit()
    
    return bookmark

@router.delete("/{article_id}/bookmark")
async def remove_bookmark(
    article_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Remove bookmark from an article
    """
    bookmark = db.query(ArticleBookmark).filter(
        ArticleBookmark.user_id == current_user.id,
        ArticleBookmark.article_id == article_id
    ).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    # Remove bookmark
    db.delete(bookmark)
    
    # Update bookmark count
    article = db.query(Article).filter(Article.id == article_id).first()
    if article and article.bookmark_count > 0:
        article.bookmark_count -= 1
    
    db.commit()
    
    return {"message": "Bookmark removed successfully"}

@router.get("/categories/", response_model=List[str])
async def get_categories(db: Session = Depends(get_db)):
    """
    Get all available article categories
    """
    from ..database import ContentCategory
    return [category.value for category in ContentCategory]

@router.get("/sources/", response_model=List[SourceResponse])
async def get_sources(
    active_only: bool = Query(True, description="Get only active sources"),
    db: Session = Depends(get_db)
):
    """
    Get all news sources
    """
    query = db.query(Source)
    
    if active_only:
        query = query.filter(Source.is_active == True)
    
    sources = query.order_by(Source.reliability_score.desc()).all()
    return sources

@router.get("/trending/", response_model=List[ArticleSummaryResponse])
async def get_trending_articles(
    limit: int = Query(10, ge=1, le=50, description="Number of trending articles"),
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
    db: Session = Depends(get_db)
):
    """
    Get trending articles based on engagement
    """
    from datetime import datetime, timedelta
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get articles with high engagement in the specified time window
    articles = db.query(Article).filter(
        Article.status == ArticleStatus.PROCESSED,
        Article.created_at >= since
    ).order_by(
        desc(Article.view_count + Article.bookmark_count * 2 + Article.relevance_score * 10)
    ).limit(limit).all()
    
    items = []
    for article in articles:
        summary = ArticleSummaryResponse(
            id=str(article.id),
            title=article.title,
            author=article.author,
            original_url=article.original_url,
            published_date=article.published_date,
            category=article.category,
            tags=article.tags,
            relevance_score=article.relevance_score,
            reading_time_minutes=article.reading_time_minutes,
            has_summary=article.has_summary,
            has_video_script=article.has_video_script,
            has_blog_post=article.has_blog_post,
            source_name=article.source.name if article.source else "Unknown"
        )
        items.append(summary)
    
    return items
