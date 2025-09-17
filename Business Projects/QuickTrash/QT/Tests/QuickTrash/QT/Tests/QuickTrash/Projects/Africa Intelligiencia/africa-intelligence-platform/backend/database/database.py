"""
Database configuration and session management
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://username:password@localhost:5432/africa_intelligence"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true"
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all tables in the database
    """
    from .models import Base
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """
    Drop all tables in the database (use with caution!)
    """
    from .models import Base
    Base.metadata.drop_all(bind=engine)
