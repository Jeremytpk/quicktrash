"""
User management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db, User, UserPreference, ArticleBookmark, ReadingHistory
from ..schemas.users import (
    UserResponse, UserUpdate, UserPreferenceUpdate, UserPreferenceResponse,
    BookmarkResponse, UserProfileResponse
)
from ..core.security import get_current_active_user

router = APIRouter()

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user profile with statistics
    """
    # Get user stats
    bookmark_count = db.query(ArticleBookmark).filter(
        ArticleBookmark.user_id == current_user.id
    ).count()
    
    reading_count = db.query(ReadingHistory).filter(
        ReadingHistory.user_id == current_user.id
    ).count()
    
    stats = {
        "bookmarks_count": bookmark_count,
        "articles_read": reading_count,
        "member_since": current_user.created_at.strftime("%B %Y")
    }
    
    return UserProfileResponse(
        user=current_user,
        stats=stats
    )

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile information
    """
    # Check if email is being changed and if it's already taken
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/preferences", response_model=UserPreferenceResponse)
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user preferences
    """
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = UserPreference(
            user_id=current_user.id,
            preferred_categories=["general"],
            preferred_regions=["Africa"],
            preferred_content_types=["article", "summary"]
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences

@router.put("/preferences", response_model=UserPreferenceResponse)
async def update_user_preferences(
    preference_update: UserPreferenceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user preferences
    """
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create new preferences
        preferences = UserPreference(user_id=current_user.id)
        db.add(preferences)
    
    # Update preference fields
    update_data = preference_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)
    
    from datetime import datetime
    preferences.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(preferences)
    
    return preferences

@router.get("/bookmarks", response_model=List[BookmarkResponse])
async def get_user_bookmarks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user's bookmarked articles
    """
    bookmarks = db.query(ArticleBookmark).filter(
        ArticleBookmark.user_id == current_user.id
    ).order_by(ArticleBookmark.created_at.desc()).all()
    
    return bookmarks

@router.get("/reading-history")
async def get_reading_history(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user's reading history
    """
    history = db.query(ReadingHistory).filter(
        ReadingHistory.user_id == current_user.id
    ).order_by(ReadingHistory.read_at.desc()).limit(limit).all()
    
    return [
        {
            "article_id": str(record.article_id),
            "read_at": record.read_at,
            "time_spent_seconds": record.time_spent_seconds,
            "completion_percentage": record.completion_percentage,
            "device_type": record.device_type
        }
        for record in history
    ]

@router.delete("/reading-history")
async def clear_reading_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Clear user's reading history
    """
    db.query(ReadingHistory).filter(
        ReadingHistory.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {"message": "Reading history cleared successfully"}

@router.get("/dashboard")
async def get_user_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get personalized dashboard data for the user
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Get recent reading activity
    last_week = datetime.utcnow() - timedelta(days=7)
    
    reading_stats = db.query(
        func.count(ReadingHistory.id).label('total_reads'),
        func.avg(ReadingHistory.time_spent_seconds).label('avg_time_spent'),
        func.sum(ReadingHistory.time_spent_seconds).label('total_time_spent')
    ).filter(
        ReadingHistory.user_id == current_user.id,
        ReadingHistory.read_at >= last_week
    ).first()
    
    # Get favorite categories based on reading history
    favorite_categories = db.query(
        func.count().label('count')
    ).select_from(ReadingHistory).join(
        Article, ReadingHistory.article_id == Article.id
    ).filter(
        ReadingHistory.user_id == current_user.id
    ).group_by(Article.category).order_by(
        func.count().desc()
    ).limit(5).all()
    
    # Get recommended articles based on preferences
    preferences = current_user.preferences
    recommended_query = db.query(Article).filter(
        Article.status == "processed"
    ).order_by(Article.relevance_score.desc()).limit(10)
    
    if preferences and preferences.preferred_categories:
        recommended_query = recommended_query.filter(
            Article.category.in_(preferences.preferred_categories)
        )
    
    recommended_articles = recommended_query.all()
    
    return {
        "reading_stats": {
            "total_reads_this_week": reading_stats.total_reads or 0,
            "average_time_per_article": reading_stats.avg_time_spent or 0,
            "total_time_this_week": reading_stats.total_time_spent or 0
        },
        "favorite_categories": [cat for cat, count in favorite_categories],
        "recommended_articles": [
            {
                "id": str(article.id),
                "title": article.title,
                "category": article.category,
                "relevance_score": article.relevance_score
            }
            for article in recommended_articles
        ]
    }
