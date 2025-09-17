"""
Admin endpoints for platform management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from ..database import (
    get_db, User, Article, Source, ScrapingJob, APIUsage,
    ArticleStatus, UserRole
)
from ..core.security import require_admin, require_moderator_or_admin
from ..schemas.common import ResponseModel
from ..scrapers import ScraperManager
from ..ai_services import ContentGenerator

router = APIRouter()

@router.get("/stats")
async def get_platform_stats(
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive platform statistics
    """
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    new_users_this_week = db.query(User).filter(
        User.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    # Article statistics
    total_articles = db.query(Article).count()
    processed_articles = db.query(Article).filter(
        Article.status == ArticleStatus.PROCESSED
    ).count()
    pending_articles = db.query(Article).filter(
        Article.status == ArticleStatus.SCRAPED
    ).count()
    failed_articles = db.query(Article).filter(
        Article.status == ArticleStatus.FAILED
    ).count()
    
    # Source statistics
    total_sources = db.query(Source).count()
    active_sources = db.query(Source).filter(Source.is_active == True).count()
    
    # Recent scraping jobs
    recent_jobs = db.query(ScrapingJob).filter(
        ScrapingJob.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    successful_jobs = db.query(ScrapingJob).filter(
        ScrapingJob.status == 'completed',
        ScrapingJob.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    # API usage statistics
    api_requests_today = db.query(APIUsage).filter(
        APIUsage.created_at >= datetime.utcnow().date()
    ).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_this_week": new_users_this_week
        },
        "articles": {
            "total": total_articles,
            "processed": processed_articles,
            "pending": pending_articles,
            "failed": failed_articles
        },
        "sources": {
            "total": total_sources,
            "active": active_sources
        },
        "scraping": {
            "jobs_24h": recent_jobs,
            "successful_jobs_24h": successful_jobs,
            "success_rate": successful_jobs / recent_jobs if recent_jobs > 0 else 0
        },
        "api": {
            "requests_today": api_requests_today
        }
    }

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = Query(None),
    active_only: bool = Query(False),
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of users
    """
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    if active_only:
        query = query.filter(User.is_active == True)
    
    total = query.count()
    offset = (page - 1) * size
    users = query.offset(offset).limit(size).all()
    
    return {
        "users": [
            {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "last_login": user.last_login
            }
            for user in users
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Update user role
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role
    db.commit()
    
    return {"message": f"User role updated to {new_role.value}"}

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate user
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    db.commit()
    
    status = "activated" if is_active else "deactivated"
    return {"message": f"User {status} successfully"}

@router.get("/articles")
async def get_articles_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[ArticleStatus] = Query(None),
    source_id: Optional[str] = Query(None),
    moderator_user: User = Depends(require_moderator_or_admin()),
    db: Session = Depends(get_db)
):
    """
    Get articles for admin review
    """
    query = db.query(Article)
    
    if status:
        query = query.filter(Article.status == status)
    
    if source_id:
        query = query.filter(Article.source_id == source_id)
    
    total = query.count()
    offset = (page - 1) * size
    articles = query.order_by(desc(Article.created_at)).offset(offset).limit(size).all()
    
    return {
        "articles": [
            {
                "id": str(article.id),
                "title": article.title,
                "source": article.source.name if article.source else "Unknown",
                "status": article.status,
                "relevance_score": article.relevance_score,
                "view_count": article.view_count,
                "created_at": article.created_at,
                "has_summary": article.has_summary,
                "has_video_script": article.has_video_script,
                "has_blog_post": article.has_blog_post
            }
            for article in articles
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

@router.post("/scraping/start")
async def start_scraping(
    background_tasks: BackgroundTasks,
    max_articles_per_source: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Start manual scraping job
    """
    def run_scraping():
        scraper_manager = ScraperManager()
        results = scraper_manager.scrape_all_sources(max_articles_per_source)
        return results
    
    background_tasks.add_task(run_scraping)
    
    return {"message": "Scraping job started", "max_articles_per_source": max_articles_per_source}

@router.get("/scraping/jobs")
async def get_scraping_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Get scraping job history
    """
    query = db.query(ScrapingJob)
    
    if status:
        query = query.filter(ScrapingJob.status == status)
    
    total = query.count()
    offset = (page - 1) * size
    jobs = query.order_by(desc(ScrapingJob.created_at)).offset(offset).limit(size).all()
    
    return {
        "jobs": [
            {
                "id": str(job.id),
                "source_name": job.source.name if job.source else "Unknown",
                "job_type": job.job_type,
                "status": job.status,
                "started_at": job.started_at,
                "completed_at": job.completed_at,
                "duration_seconds": job.duration_seconds,
                "articles_found": job.articles_found,
                "articles_new": job.articles_new,
                "errors_count": job.errors_count
            }
            for job in jobs
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

@router.post("/content/generate-batch")
async def generate_content_batch(
    background_tasks: BackgroundTasks,
    limit: int = Query(10, ge=1, le=50),
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Generate AI content for pending articles
    """
    def run_content_generation():
        content_generator = ContentGenerator()
        results = content_generator.process_article_queue(db, limit)
        return results
    
    background_tasks.add_task(run_content_generation)
    
    return {"message": "Content generation batch started", "limit": limit}

@router.get("/sources")
async def get_sources_admin(
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Get all sources with statistics
    """
    sources = db.query(Source).all()
    
    source_stats = []
    for source in sources:
        article_count = db.query(Article).filter(Article.source_id == source.id).count()
        last_scrape = db.query(ScrapingJob).filter(
            ScrapingJob.source_id == source.id
        ).order_by(desc(ScrapingJob.created_at)).first()
        
        source_stats.append({
            "id": str(source.id),
            "name": source.name,
            "url": source.url,
            "source_type": source.source_type,
            "country": source.country,
            "region": source.region,
            "is_active": source.is_active,
            "reliability_score": source.reliability_score,
            "total_articles": article_count,
            "last_scraped": source.last_scraped,
            "last_scrape_status": last_scrape.status if last_scrape else None
        })
    
    return {"sources": source_stats}

@router.put("/sources/{source_id}/status")
async def update_source_status(
    source_id: str,
    is_active: bool,
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate a source
    """
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    source.is_active = is_active
    db.commit()
    
    status = "activated" if is_active else "deactivated"
    return {"message": f"Source {status} successfully"}

@router.get("/api-usage")
async def get_api_usage(
    days: int = Query(7, ge=1, le=30),
    admin_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """
    Get API usage statistics
    """
    since = datetime.utcnow() - timedelta(days=days)
    
    usage_stats = db.query(
        func.date(APIUsage.created_at).label('date'),
        func.count(APIUsage.id).label('requests'),
        func.avg(APIUsage.response_time_ms).label('avg_response_time')
    ).filter(
        APIUsage.created_at >= since
    ).group_by(
        func.date(APIUsage.created_at)
    ).order_by(
        func.date(APIUsage.created_at)
    ).all()
    
    endpoint_stats = db.query(
        APIUsage.endpoint,
        func.count(APIUsage.id).label('requests'),
        func.avg(APIUsage.response_time_ms).label('avg_response_time')
    ).filter(
        APIUsage.created_at >= since
    ).group_by(
        APIUsage.endpoint
    ).order_by(
        func.count(APIUsage.id).desc()
    ).limit(10).all()
    
    return {
        "daily_usage": [
            {
                "date": stat.date.isoformat(),
                "requests": stat.requests,
                "avg_response_time_ms": float(stat.avg_response_time) if stat.avg_response_time else 0
            }
            for stat in usage_stats
        ],
        "top_endpoints": [
            {
                "endpoint": stat.endpoint,
                "requests": stat.requests,
                "avg_response_time_ms": float(stat.avg_response_time) if stat.avg_response_time else 0
            }
            for stat in endpoint_stats
        ]
    }
