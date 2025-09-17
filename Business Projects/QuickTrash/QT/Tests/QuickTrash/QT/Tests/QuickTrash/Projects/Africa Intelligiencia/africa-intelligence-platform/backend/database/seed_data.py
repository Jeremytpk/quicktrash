"""
Seed data for the Africa Intelligence Platform
"""
from sqlalchemy.orm import Session
from .models import Source, ContentCategory
from .database import SessionLocal

AFRICAN_NEWS_SOURCES = [
    # DRC Sources
    {
        "name": "Actualite.cd",
        "url": "https://actualite.cd",
        "base_domain": "actualite.cd",
        "source_type": "news",
        "country": "Democratic Republic of Congo",
        "region": "Central Africa",
        "language": "fr",
        "reliability_score": 0.8
    },
    {
        "name": "Radio Okapi",
        "url": "https://www.radiookapi.net",
        "base_domain": "radiookapi.net",
        "source_type": "news",
        "country": "Democratic Republic of Congo", 
        "region": "Central Africa",
        "language": "fr",
        "reliability_score": 0.9
    },
    {
        "name": "7SUR7.CD",
        "url": "https://7sur7.cd",
        "base_domain": "7sur7.cd",
        "source_type": "news",
        "country": "Democratic Republic of Congo",
        "region": "Central Africa", 
        "language": "fr",
        "reliability_score": 0.7
    },
    
    # Regional African Sources
    {
        "name": "Jeune Afrique",
        "url": "https://www.jeuneafrique.com",
        "base_domain": "jeuneafrique.com",
        "source_type": "news",
        "country": "France",
        "region": "Africa",
        "language": "fr",
        "reliability_score": 0.9
    },
    {
        "name": "TechCabal",
        "url": "https://techcabal.com",
        "base_domain": "techcabal.com",
        "source_type": "news",
        "country": "Nigeria",
        "region": "West Africa",
        "language": "en",
        "reliability_score": 0.8
    },
    {
        "name": "Disrupt Africa",
        "url": "https://disrupt-africa.com",
        "base_domain": "disrupt-africa.com",
        "source_type": "news",
        "country": "South Africa",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.8
    },
    {
        "name": "TechMoran",
        "url": "https://techmoran.com",
        "base_domain": "techmoran.com",
        "source_type": "blog",
        "country": "Kenya",
        "region": "East Africa",
        "language": "en",
        "reliability_score": 0.7
    },
    {
        "name": "IT News Africa",
        "url": "https://www.itnewsafrica.com",
        "base_domain": "itnewsafrica.com",
        "source_type": "news",
        "country": "South Africa",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.7
    },
    
    # Financial/Business Sources
    {
        "name": "African Business",
        "url": "https://african.business",
        "base_domain": "african.business",
        "source_type": "news",
        "country": "United Kingdom",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.9
    },
    {
        "name": "ESI Africa",
        "url": "https://www.esi-africa.com",
        "base_domain": "esi-africa.com",
        "source_type": "news",
        "country": "South Africa",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.8
    },
    
    # Government and International Sources
    {
        "name": "African Development Bank",
        "url": "https://www.afdb.org",
        "base_domain": "afdb.org",
        "source_type": "government",
        "country": "Côte d'Ivoire",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.95
    },
    {
        "name": "World Bank Africa",
        "url": "https://www.worldbank.org/en/region/afr",
        "base_domain": "worldbank.org",
        "source_type": "government",
        "country": "International",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.95
    },
    {
        "name": "African Union",
        "url": "https://au.int",
        "base_domain": "au.int",
        "source_type": "government",
        "country": "Ethiopia",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.9
    },
    
    # Startup and VC Sources
    {
        "name": "WeeTracker",
        "url": "https://weetracker.com",
        "base_domain": "weetracker.com",
        "source_type": "news",
        "country": "Uganda",
        "region": "East Africa",
        "language": "en",
        "reliability_score": 0.8
    },
    {
        "name": "Ventures Africa",
        "url": "https://venturesafrica.com",
        "base_domain": "venturesafrica.com",
        "source_type": "news",
        "country": "Nigeria",
        "region": "West Africa",
        "language": "en",
        "reliability_score": 0.7
    },
    {
        "name": "The Big Deal",
        "url": "https://bigdeal.substack.com",
        "base_domain": "substack.com",
        "source_type": "blog",
        "country": "International",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.8
    },
    
    # Social Media and Platform Sources
    {
        "name": "LinkedIn - African Tech",
        "url": "https://linkedin.com",
        "base_domain": "linkedin.com",
        "source_type": "social_media",
        "country": "International",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.6
    },
    {
        "name": "Twitter/X - African Tech",
        "url": "https://twitter.com",
        "base_domain": "twitter.com",
        "source_type": "social_media",
        "country": "International",
        "region": "Africa",
        "language": "en",
        "reliability_score": 0.5
    }
]

def seed_sources():
    """
    Seed the database with African news sources
    """
    db = SessionLocal()
    try:
        # Check if sources already exist
        existing_count = db.query(Source).count()
        if existing_count > 0:
            print(f"Sources already exist ({existing_count} found). Skipping seed.")
            return
        
        # Add all sources
        for source_data in AFRICAN_NEWS_SOURCES:
            source = Source(**source_data)
            db.add(source)
        
        db.commit()
        print(f"Successfully seeded {len(AFRICAN_NEWS_SOURCES)} news sources")
        
    except Exception as e:
        print(f"Error seeding sources: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def seed_all():
    """
    Seed all initial data
    """
    print("Seeding African news sources...")
    seed_sources()
    print("Seeding completed!")

if __name__ == "__main__":
    seed_all()
