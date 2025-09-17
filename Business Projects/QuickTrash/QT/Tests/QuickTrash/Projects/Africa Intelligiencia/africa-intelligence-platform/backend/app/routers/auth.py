"""
Authentication endpoints
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from ..database import get_db, User, UserPreference, UserRole
from ..schemas.auth import (
    UserRegister, UserLogin, TokenResponse, TokenRefresh,
    PasswordReset, PasswordResetConfirm, PasswordChange
)
from ..schemas.users import UserResponse
from ..core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token, get_current_user
)
from ..core.config import settings
import uuid

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    user = User(
        email=user_data.email,
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        password_hash=hashed_password,
        role=UserRole.USER
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create default user preferences
    preferences = UserPreference(
        user_id=user.id,
        preferred_categories=["general"],
        preferred_regions=["Africa"],
        preferred_content_types=["article", "summary"]
    )
    
    db.add(preferences)
    db.commit()
    
    return user

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return tokens
    """
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh):
    """
    Refresh access token using refresh token
    """
    payload = verify_token(token_data.refresh_token, "refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": user_id}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=token_data.refresh_token,  # Keep same refresh token
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user (client should discard tokens)
    """
    return {"message": "Successfully logged out"}

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user

@router.post("/verify-token")
async def verify_token_endpoint(current_user: User = Depends(get_current_user)):
    """
    Verify if token is valid
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "email": current_user.email
    }
