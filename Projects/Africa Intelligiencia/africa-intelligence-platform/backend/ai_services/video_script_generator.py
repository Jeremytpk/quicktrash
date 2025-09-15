"""
AI-powered video script generation for short news videos
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import re
from .summarizer import ContentSummarizer

logger = logging.getLogger(__name__)

class VideoScriptGenerator:
    """
    Generate short video scripts (30-60 seconds) from news articles
    """
    
    def __init__(self, summarizer: Optional[ContentSummarizer] = None):
        """
        Initialize video script generator
        
        Args:
            summarizer: Content summarizer instance
        """
        self.summarizer = summarizer or ContentSummarizer()
        
        # Video script templates for different content types
        self.script_templates = {
            'breaking_news': self._generate_breaking_news_script,
            'business_update': self._generate_business_update_script,
            'tech_innovation': self._generate_tech_innovation_script,
            'investment_news': self._generate_investment_news_script,
            'government_policy': self._generate_government_policy_script,
            'startup_story': self._generate_startup_story_script,
            'general': self._generate_general_script
        }
    
    def generate_video_script(
        self, 
        article_title: str, 
        article_content: str,
        target_duration: int = 45
    ) -> Dict[str, any]:
        """
        Generate a video script from article content
        
        Args:
            article_title: Title of the article
            article_content: Full article content
            target_duration: Target video duration in seconds
            
        Returns:
            Dictionary with script content and metadata
        """
        try:
            # First, get a summary of the article
            summary_result = self.summarizer.summarize_article(
                article_content, 
                article_title,
                max_length=100,
                min_length=40
            )
            
            summary = summary_result['summary']
            headline = summary_result['catchy_headline']
            
            # Determine content type
            content_type = self._classify_content_type(article_title, article_content)
            
            # Generate script using appropriate template
            script_generator = self.script_templates.get(content_type, self.script_templates['general'])
            script_content = script_generator(headline, summary, article_content, target_duration)
            
            # Generate visual suggestions
            visual_suggestions = self._generate_visual_suggestions(content_type, summary)
            
            # Calculate estimated duration
            estimated_duration = self._estimate_duration(script_content)
            
            return {
                'script': script_content,
                'title': headline,
                'content_type': content_type,
                'estimated_duration_seconds': estimated_duration,
                'visual_suggestions': visual_suggestions,
                'target_duration': target_duration,
                'generation_timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating video script: {e}")
            return self._generate_fallback_script(article_title, article_content)
    
    def _classify_content_type(self, title: str, content: str) -> str:
        """
        Classify content type for appropriate script template
        """
        text = f"{title} {content}".lower()
        
        if any(word in text for word in ['breaking', 'urgent', 'alert', 'crisis']):
            return 'breaking_news'
        elif any(word in text for word in ['funding', 'investment', 'raised', 'valuation', 'vc']):
            return 'investment_news'
        elif any(word in text for word in ['startup', 'entrepreneur', 'founder', 'launched']):
            return 'startup_story'
        elif any(word in text for word in ['innovation', 'technology', 'ai', 'tech', 'digital']):
            return 'tech_innovation'
        elif any(word in text for word in ['government', 'policy', 'regulation', 'minister']):
            return 'government_policy'
        elif any(word in text for word in ['business', 'company', 'market', 'economic']):
            return 'business_update'
        else:
            return 'general'
    
    def _generate_breaking_news_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for breaking news content"""
        script = f\"\"\"[HOOK - 0-3 seconds]
🚨 BREAKING: {headline}

[MAIN CONTENT - 3-35 seconds]
Here's what you need to know:

{self._format_summary_for_video(summary)}

This is developing news that could significantly impact African markets and tech ecosystem.

[CALL TO ACTION - 35-{duration} seconds]
Stay tuned for updates and click the link below to read the full story. 

What are your thoughts on this development? Share in the comments!

#AfricaTech #BreakingNews #BusinessUpdate\"\"\"
        
        return script
    
    def _generate_business_update_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for business update content"""
        script = f\"\"\"[INTRO - 0-5 seconds]
💼 African Business Update: {headline}

[KEY POINTS - 5-30 seconds]
{self._format_summary_for_video(summary)}

[CONTEXT - 30-40 seconds]
This development reflects the growing dynamism in African markets and the continent's increasing importance in global business.

[OUTRO - 40-{duration} seconds]
For the complete analysis, check the link in our bio. 

What's your take on this business move? Let us know below!

#AfricanBusiness #MarketUpdate #Business\"\"\"
        
        return script
    
    def _generate_tech_innovation_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for tech innovation content"""
        script = f\"\"\"[HOOK - 0-4 seconds]
🚀 Tech Innovation Alert: {headline}

[INNOVATION DETAILS - 4-25 seconds]
{self._format_summary_for_video(summary)}

[IMPACT - 25-35 seconds]
This innovation could transform how we think about technology solutions in Africa.

[ENGAGEMENT - 35-{duration} seconds]
Are you excited about this tech development? 

Drop a 🔥 if you think this will change the game!

Link to full story below 👇

#AfricaTech #Innovation #TechNews #DigitalAfrica\"\"\"
        
        return script
    
    def _generate_investment_news_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for investment news content"""
        script = f\"\"\"[ATTENTION GRABBER - 0-4 seconds]
💰 FUNDING ALERT: {headline}

[INVESTMENT DETAILS - 4-25 seconds]
{self._format_summary_for_video(summary)}

[SIGNIFICANCE - 25-35 seconds]
This investment signals growing confidence in African startups and innovation potential.

[CALL TO ACTION - 35-{duration} seconds]
Entrepreneurs, take note! 📈

Full details in the link below. What sector do you think will attract the next big investment?

#StartupFunding #AfricanStartups #Investment #VentureCapital\"\"\"
        
        return script
    
    def _generate_government_policy_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for government policy content"""
        script = f\"\"\"[ANNOUNCEMENT - 0-5 seconds]
🏛️ Policy Update: {headline}

[POLICY DETAILS - 5-30 seconds]
{self._format_summary_for_video(summary)}

[IMPLICATIONS - 30-40 seconds]
This policy could have significant implications for businesses and citizens across the region.

[ENGAGEMENT - 40-{duration} seconds]
How do you think this will impact the business environment?

Full analysis in the link below 👇

#Policy #Government #AfricanPolitics #Business\"\"\"
        
        return script
    
    def _generate_startup_story_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate script for startup story content"""
        script = f\"\"\"[INTRO - 0-4 seconds]
🌟 Startup Spotlight: {headline}

[STORY - 4-30 seconds]
{self._format_summary_for_video(summary)}

[INSPIRATION - 30-40 seconds]
Another example of African entrepreneurship driving innovation and creating solutions!

[COMMUNITY - 40-{duration} seconds]
Entrepreneurs, what's your startup story? 

Share your journey in the comments! 

Full story linked below 👇

#AfricanStartups #Entrepreneurship #Innovation #StartupLife\"\"\"
        
        return script
    
    def _generate_general_script(self, headline: str, summary: str, content: str, duration: int) -> str:
        """Generate general script template"""
        script = f\"\"\"[INTRO - 0-5 seconds]
📰 {headline}

[MAIN CONTENT - 5-35 seconds]
{self._format_summary_for_video(summary)}

[ENGAGEMENT - 35-{duration} seconds]
What are your thoughts on this story?

Check out the full article below and let us know in the comments!

#AfricaNews #Business #Technology\"\"\"
        
        return script
    
    def _format_summary_for_video(self, summary: str) -> str:
        """
        Format summary text for video script readability
        """
        # Break long sentences into shorter, punchier statements
        sentences = summary.split('.')
        formatted_sentences = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence:
                # Add emphasis to key points
                if any(word in sentence.lower() for word in ['million', 'billion', 'percent', '%']):
                    sentence = f"💡 {sentence}"
                elif any(word in sentence.lower() for word in ['first', 'new', 'launch']):
                    sentence = f"🎯 {sentence}"
                elif any(word in sentence.lower() for word in ['growth', 'increase', 'expand']):
                    sentence = f"📈 {sentence}"
                
                formatted_sentences.append(sentence)
        
        return '.\\n\\n'.join(formatted_sentences[:3])  # Limit to 3 key points
    
    def _generate_visual_suggestions(self, content_type: str, summary: str) -> List[Dict[str, str]]:
        """
        Generate suggestions for visuals to accompany the video
        """
        base_visuals = [
            {
                "type": "graphic",
                "description": "African map highlighting relevant countries",
                "timing": "0-5 seconds"
            },
            {
                "type": "text_overlay", 
                "description": "Key statistics or numbers from the story",
                "timing": "Throughout video"
            }
        ]
        
        content_specific_visuals = {
            'breaking_news': [
                {"type": "footage", "description": "News ticker animation", "timing": "0-3 seconds"},
                {"type": "graphic", "description": "Breaking news banner", "timing": "0-5 seconds"}
            ],
            'business_update': [
                {"type": "footage", "description": "Modern African office spaces", "timing": "5-15 seconds"},
                {"type": "graphic", "description": "Business growth charts", "timing": "15-25 seconds"}
            ],
            'tech_innovation': [
                {"type": "footage", "description": "Tech workspace, coding, innovation labs", "timing": "5-20 seconds"},
                {"type": "animation", "description": "Digital transformation graphics", "timing": "20-30 seconds"}
            ],
            'investment_news': [
                {"type": "footage", "description": "Handshake, signing documents", "timing": "5-15 seconds"},
                {"type": "graphic", "description": "Investment amount visualization", "timing": "15-25 seconds"}
            ],
            'startup_story': [
                {"type": "footage", "description": "Entrepreneurs at work, team meetings", "timing": "5-20 seconds"},
                {"type": "graphic", "description": "Company logo and product showcase", "timing": "20-30 seconds"}
            ]
        }
        
        visuals = base_visuals + content_specific_visuals.get(content_type, [])
        
        # Add closing visual
        visuals.append({
            "type": "text_overlay",
            "description": "Call-to-action: 'Read full story' with link",
            "timing": "Last 5 seconds"
        })
        
        return visuals
    
    def _estimate_duration(self, script: str) -> int:
        """
        Estimate video duration based on script length
        Assumes average speaking rate of 150 words per minute
        """
        # Remove timestamp markers and formatting
        clean_text = re.sub(r'\\[.*?\\]', '', script)
        clean_text = re.sub(r'[🚨💼🚀💰🏛️🌟📰💡🎯📈#]', '', clean_text)
        
        word_count = len(clean_text.split())
        
        # Average speaking rate: 150 words per minute = 2.5 words per second
        estimated_seconds = word_count / 2.5
        
        return int(estimated_seconds)
    
    def _generate_fallback_script(self, title: str, content: str) -> Dict[str, any]:
        """
        Generate a simple fallback script when main generation fails
        """
        script = f\"\"\"📰 {title}

Here's the latest update from Africa's business and tech landscape.

{content[:200]}...

For the complete story, check the link below and share your thoughts in the comments!

#AfricaNews #Business #Technology\"\"\"
        
        return {
            'script': script,
            'title': title,
            'content_type': 'general',
            'estimated_duration_seconds': 30,
            'visual_suggestions': [
                {"type": "text_overlay", "description": "Article headline", "timing": "0-5 seconds"},
                {"type": "graphic", "description": "African map", "timing": "Throughout"}
            ],
            'target_duration': 30,
            'generation_timestamp': datetime.utcnow().isoformat()
        }
