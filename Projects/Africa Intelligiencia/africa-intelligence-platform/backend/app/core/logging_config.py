"""
Logging configuration for the application
"""
import logging
import logging.config
import os
from typing import Dict, Any

def setup_logging():
    """Setup application logging configuration"""
    
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv(
        "LOG_FORMAT",
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": log_format,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(filename)s %(lineno)d %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "default",
                "stream": "ext://sys.stdout"
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "detailed",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            }
        },
        "loggers": {
            "": {  # Root logger
                "level": log_level,
                "handlers": ["console"],
                "propagate": False
            },
            "app": {
                "level": log_level,
                "handlers": ["console", "file"],
                "propagate": False
            },
            "scrapers": {
                "level": log_level,
                "handlers": ["console", "file"],
                "propagate": False
            },
            "ai_services": {
                "level": log_level,
                "handlers": ["console", "file"],
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            }
        }
    }
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Apply logging configuration
    logging.config.dictConfig(logging_config)
