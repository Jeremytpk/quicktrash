"""
AI-powered blog post generation from news articles
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import re
from .summarizer import ContentSummarizer

logger = logging.getLogger(__name__)

class BlogPostGenerator:
    """
    Generate comprehensive blog posts (500-700 words) from news articles
    """
    
    def __init__(self, summarizer: Optional[ContentSummarizer] = None):
        """
        Initialize blog post generator
        
        Args:
            summarizer: Content summarizer instance
        """
        self.summarizer = summarizer or ContentSummarizer()
        
        # Blog post templates for different content types
        self.post_templates = {
            'breaking_news': self._generate_breaking_news_post,
            'business_analysis': self._generate_business_analysis_post,
            'tech_deep_dive': self._generate_tech_deep_dive_post,
            'investment_spotlight': self._generate_investment_spotlight_post,
            'policy_analysis': self._generate_policy_analysis_post,
            'startup_feature': self._generate_startup_feature_post,
            'general': self._generate_general_post
        }
    
    def generate_blog_post(
        self, 
        article_title: str, 
        article_content: str,
        original_url: str,
        target_length: int = 600
    ) -> Dict[str, any]:
        """
        Generate a comprehensive blog post from article content
        
        Args:
            article_title: Original article title
            article_content: Full article content
            original_url: URL of the original article
            target_length: Target blog post length in words
            
        Returns:
            Dictionary with blog post content and metadata
        """
        try:
            # Get article summary first
            summary_result = self.summarizer.summarize_article(
                article_content, 
                article_title,
                max_length=120,
                min_length=60
            )
            
            summary = summary_result['summary']
            enhanced_title = summary_result['catchy_headline']
            
            # Classify content for appropriate template
            content_type = self._classify_blog_content_type(article_title, article_content)
            
            # Generate blog post using template
            post_generator = self.post_templates.get(content_type, self.post_templates['general'])
            blog_content = post_generator(
                enhanced_title, 
                summary, 
                article_content, 
                original_url,
                target_length
            )
            
            # Generate metadata
            metadata = self._generate_blog_metadata(content_type, summary, article_content)
            
            return {
                'title': enhanced_title,
                'content': blog_content,
                'summary': summary,
                'content_type': content_type,
                'word_count': len(blog_content.split()),
                'reading_time_minutes': max(1, len(blog_content.split()) // 200),
                'tags': metadata['tags'],
                'category': metadata['category'],
                'seo_keywords': metadata['seo_keywords'],
                'meta_description': metadata['meta_description'],
                'original_source': original_url,
                'publication_date': datetime.utcnow().isoformat(),
                'author': 'Africa Intelligence Platform'
            }
            
        except Exception as e:
            logger.error(f"Error generating blog post: {e}")
            return self._generate_fallback_post(article_title, article_content, original_url)
    
    def _classify_blog_content_type(self, title: str, content: str) -> str:
        """
        Classify content for blog post template selection
        """
        text = f"{title} {content}".lower()
        
        if any(word in text for word in ['breaking', 'urgent', 'alert', 'developing']):
            return 'breaking_news'
        elif any(word in text for word in ['funding', 'investment', 'raised', 'series', 'valuation']):
            return 'investment_spotlight'
        elif any(word in text for word in ['startup', 'entrepreneur', 'founder', 'company']):
            return 'startup_feature'
        elif any(word in text for word in ['technology', 'ai', 'innovation', 'digital', 'tech']):
            return 'tech_deep_dive'
        elif any(word in text for word in ['policy', 'government', 'regulation', 'law']):
            return 'policy_analysis'
        elif any(word in text for word in ['business', 'market', 'industry', 'economic']):
            return 'business_analysis'
        else:
            return 'general'
    
    def _generate_breaking_news_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate breaking news blog post"""
        
        post = f\"\"\"# {title}
        
*Breaking news from Africa's dynamic business and technology landscape.*

## What's Happening

{summary}

## The Details

{self._extract_key_details(content, 150)}

## Why This Matters

This development is significant for several reasons:

{self._generate_significance_points(content)}

## Market Impact

{self._generate_market_impact_analysis(content)}

## What's Next

{self._generate_forward_looking_analysis(content)}

## Stay Informed

This is a developing story, and we'll continue to monitor the situation as it unfolds. The implications for African markets and the broader tech ecosystem could be substantial.

---

*For the complete original coverage, visit: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Related Topics:** {self._generate_related_topics(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_business_analysis_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate business analysis blog post"""
        
        post = f\"\"\"# {title}

*An in-depth look at the latest developments shaping African business landscapes.*

## Executive Summary

{summary}

## Business Context

{self._extract_business_context(content, 120)}

## Key Takeaways

{self._generate_business_takeaways(content)}

## Industry Implications

{self._generate_industry_implications(content)}

## Competitive Landscape

{self._analyze_competitive_landscape(content)}

## Future Outlook

{self._generate_business_outlook(content)}

## Investment Perspective

For investors and stakeholders, this development signals important trends in the African market. {self._generate_investment_perspective(content)}

---

*This analysis is based on reporting from: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Industry Tags:** {self._generate_industry_tags(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_tech_deep_dive_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate technology deep dive blog post"""
        
        post = f\"\"\"# {title}

*Exploring the cutting-edge technology trends transforming African innovation.*

## Technology Overview

{summary}

## Technical Details

{self._extract_technical_details(content, 140)}

## Innovation Impact

{self._analyze_innovation_impact(content)}

## Technical Challenges & Solutions

{self._identify_tech_challenges_solutions(content)}

## Adoption Potential

{self._assess_adoption_potential(content)}

## Developer Community Impact

{self._analyze_developer_impact(content)}

## Future Technological Implications

{self._project_tech_future(content)}

## Conclusion

This technological development represents another step forward in Africa's digital transformation journey. The potential for widespread impact across multiple sectors makes this a story worth following closely.

---

*Original technical coverage: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Tech Stack:** {self._extract_tech_stack(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_investment_spotlight_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate investment spotlight blog post"""
        
        post = f\"\"\"# {title}

*Spotlighting the latest investment trends and funding developments in African startups.*

## Investment Summary

{summary}

## Funding Details

{self._extract_funding_details(content, 130)}

## Company Profile

{self._generate_company_profile(content)}

## Investment Rationale

{self._analyze_investment_rationale(content)}

## Market Opportunity

{self._assess_market_opportunity(content)}

## Investor Perspective

{self._provide_investor_perspective(content)}

## Sector Analysis

{self._analyze_sector_trends(content)}

## What This Means for African Startups

This funding round is indicative of broader trends in African venture capital and startup ecosystem development. {self._contextualize_funding_trends(content)}

---

*Original funding coverage: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Investment Focus:** {self._generate_investment_tags(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_startup_feature_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate startup feature blog post"""
        
        post = f\"\"\"# {title}

*Featuring the entrepreneurs and startups driving innovation across Africa.*

## Startup Story

{summary}

## Company Background

{self._extract_startup_background(content, 120)}

## Founder Journey

{self._highlight_founder_story(content)}

## Product/Service Innovation

{self._describe_innovation(content)}

## Market Traction

{self._analyze_market_traction(content)}

## Growth Strategy

{self._outline_growth_strategy(content)}

## Challenges & Opportunities

{self._identify_challenges_opportunities(content)}

## Inspiring the Next Generation

Stories like this showcase the entrepreneurial spirit driving African innovation. {self._generate_inspiration_message(content)}

---

*Full startup profile: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Startup Categories:** {self._generate_startup_tags(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_policy_analysis_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate policy analysis blog post"""
        
        post = f\"\"\"# {title}

*Analyzing policy developments and their impact on African business and technology sectors.*

## Policy Overview

{summary}

## Regulatory Context

{self._extract_regulatory_context(content, 130)}

## Key Policy Changes

{self._identify_policy_changes(content)}

## Business Impact Assessment

{self._assess_business_impact(content)}

## Compliance Considerations

{self._outline_compliance_considerations(content)}

## Industry Response

{self._analyze_industry_response(content)}

## Long-term Implications

{self._project_long_term_implications(content)}

## Recommendations

For businesses operating in this space, staying informed about policy developments is crucial for strategic planning and compliance.

---

*Original policy reporting: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Policy Areas:** {self._generate_policy_tags(content)}
\"\"\"
        
        return post.strip()
    
    def _generate_general_post(self, title: str, summary: str, content: str, source_url: str, target_length: int) -> str:
        """Generate general blog post"""
        
        post = f\"\"\"# {title}

*Keeping you informed about the latest developments in African business and technology.*

## Overview

{summary}

## Key Points

{self._extract_key_points(content, 150)}

## Context & Background

{self._provide_context_background(content)}

## Analysis

{self._provide_general_analysis(content)}

## Broader Implications

{self._discuss_broader_implications(content)}

## Looking Ahead

{self._provide_forward_outlook(content)}

## Conclusion

This development adds another chapter to Africa's evolving business and technology narrative. As the continent continues to position itself as a global innovation hub, stories like this highlight the dynamic changes taking place across multiple sectors.

---

*Source article: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*

**Related Topics:** {self._generate_general_tags(content)}
\"\"\"
        
        return post.strip()
    
    # Helper methods for content extraction and analysis
    def _extract_key_details(self, content: str, word_limit: int) -> str:
        """Extract key details from content"""
        sentences = content.split('.')[:5]  # First 5 sentences
        details = '. '.join(sentences).strip()
        words = details.split()
        if len(words) > word_limit:
            details = ' '.join(words[:word_limit]) + '...'
        return details
    
    def _generate_significance_points(self, content: str) -> str:
        """Generate significance points"""
        points = [
            "• Demonstrates the continued growth and dynamism of African markets",
            "• Highlights the increasing global attention on African business opportunities", 
            "• Showcases local innovation and entrepreneurship",
            "• Indicates positive trends in the regional business ecosystem"
        ]
        return '\\n'.join(points[:3])
    
    def _generate_market_impact_analysis(self, content: str) -> str:
        """Generate market impact analysis"""
        return "The immediate market implications include increased investor confidence, potential for sector growth, and enhanced visibility for African businesses on the global stage. This development may also influence similar initiatives across the region."
    
    def _generate_forward_looking_analysis(self, content: str) -> str:
        """Generate forward-looking analysis"""
        return "Moving forward, stakeholders will be watching for follow-up developments, market response, and potential ripple effects across related sectors. The success of this initiative could pave the way for similar developments across Africa."
    
    def _generate_related_topics(self, content: str) -> str:
        """Generate related topic tags"""
        topics = ["African Business", "Technology Innovation", "Market Development", "Regional Growth"]
        return " | ".join(topics[:3])
    
    def _extract_business_context(self, content: str, word_limit: int) -> str:
        """Extract business context"""
        return self._extract_key_details(content, word_limit)
    
    def _generate_business_takeaways(self, content: str) -> str:
        """Generate business takeaways"""
        takeaways = [
            "• Strategic positioning in African markets requires understanding local dynamics",
            "• Innovation and adaptation are key to success in emerging markets",
            "• Collaboration between local and international stakeholders drives growth"
        ]
        return '\\n'.join(takeaways)
    
    def _generate_industry_implications(self, content: str) -> str:
        """Generate industry implications"""
        return "This development has significant implications for industry stakeholders, potentially reshaping competitive dynamics and creating new opportunities for market participants."
    
    def _analyze_competitive_landscape(self, content: str) -> str:
        """Analyze competitive landscape"""
        return "The competitive landscape continues to evolve, with new entrants challenging established players and innovative solutions disrupting traditional business models."
    
    def _generate_business_outlook(self, content: str) -> str:
        """Generate business outlook"""
        return "The business outlook remains positive, with continued growth expected as market conditions stabilize and new opportunities emerge across the African continent."
    
    def _generate_investment_perspective(self, content: str) -> str:
        """Generate investment perspective"""
        return "Key factors to monitor include market penetration rates, regulatory developments, and competitive responses."
    
    def _generate_industry_tags(self, content: str) -> str:
        """Generate industry tags"""
        tags = ["Business Development", "Market Analysis", "Industry Trends", "African Markets"]
        return " | ".join(tags[:3])
    
    def _generate_blog_metadata(self, content_type: str, summary: str, content: str) -> Dict[str, any]:
        """Generate blog metadata"""
        return {
            'tags': self._extract_content_tags(content),
            'category': content_type.replace('_', ' ').title(),
            'seo_keywords': self._extract_seo_keywords(summary, content),
            'meta_description': summary[:155] + '...' if len(summary) > 155 else summary
        }
    
    def _extract_content_tags(self, content: str) -> List[str]:
        """Extract relevant tags from content"""
        base_tags = ["Africa", "Business", "Technology", "Innovation"]
        
        # Add specific tags based on content
        content_lower = content.lower()
        specific_tags = []
        
        if 'startup' in content_lower:
            specific_tags.append("Startups")
        if 'investment' in content_lower or 'funding' in content_lower:
            specific_tags.append("Investment")
        if 'fintech' in content_lower:
            specific_tags.append("Fintech")
        if 'drc' in content_lower or 'congo' in content_lower:
            specific_tags.append("DRC")
        if 'nigeria' in content_lower:
            specific_tags.append("Nigeria")
        if 'kenya' in content_lower:
            specific_tags.append("Kenya")
        
        return base_tags + specific_tags[:3]
    
    def _extract_seo_keywords(self, summary: str, content: str) -> List[str]:
        """Extract SEO keywords"""
        keywords = [
            "African business", "African technology", "African startups", 
            "African investment", "African innovation", "African markets"
        ]
        return keywords[:5]
    
    def _generate_fallback_post(self, title: str, content: str, source_url: str) -> Dict[str, any]:
        """Generate fallback blog post"""
        fallback_content = f\"\"\"# {title}

## Overview

{content[:300]}...

## Analysis

This development represents continued progress in African business and technology sectors. As the continent continues to grow and evolve, developments like this highlight the dynamic nature of African markets.

## Conclusion

For more detailed information, please refer to the original source article.

---

*Source: [{source_url}]({source_url})*

*Published on {datetime.now().strftime('%B %d, %Y')} | Africa Intelligence Platform*
\"\"\"
        
        return {
            'title': title,
            'content': fallback_content,
            'summary': content[:200] + '...',
            'content_type': 'general',
            'word_count': len(fallback_content.split()),
            'reading_time_minutes': 2,
            'tags': ["Africa", "Business", "News"],
            'category': "General",
            'seo_keywords': ["African business", "African news"],
            'meta_description': content[:150] + '...',
            'original_source': source_url,
            'publication_date': datetime.utcnow().isoformat(),
            'author': 'Africa Intelligence Platform'
        }
    
    # Placeholder methods for specific content analysis
    # In production, these would contain more sophisticated logic
    def _extract_technical_details(self, content: str, word_limit: int) -> str:
        return self._extract_key_details(content, word_limit)
    
    def _analyze_innovation_impact(self, content: str) -> str:
        return "This innovation demonstrates the growing sophistication of African technology solutions."
    
    def _identify_tech_challenges_solutions(self, content: str) -> str:
        return "Technical challenges are being addressed through innovative approaches and collaborative solutions."
    
    def _assess_adoption_potential(self, content: str) -> str:
        return "Adoption potential remains strong given the market demand and technological readiness."
    
    def _analyze_developer_impact(self, content: str) -> str:
        return "The developer community stands to benefit from increased opportunities and skill development."
    
    def _project_tech_future(self, content: str) -> str:
        return "Future technological developments will likely build upon these foundations."
    
    def _extract_tech_stack(self, content: str) -> str:
        return "Modern Technology | Cloud Solutions | Mobile-First"
    
    def _extract_funding_details(self, content: str, word_limit: int) -> str:
        return self._extract_key_details(content, word_limit)
    
    def _generate_company_profile(self, content: str) -> str:
        return "This company represents the innovative spirit driving African entrepreneurship forward."
    
    def _analyze_investment_rationale(self, content: str) -> str:
        return "Investment rationale is based on strong market potential and innovative solutions."
    
    def _assess_market_opportunity(self, content: str) -> str:
        return "Market opportunity remains significant with substantial room for growth."
    
    def _provide_investor_perspective(self, content: str) -> str:
        return "From an investor perspective, this represents a strategic opportunity in growing markets."
    
    def _analyze_sector_trends(self, content: str) -> str:
        return "Sector trends indicate continued growth and increasing investor interest."
    
    def _contextualize_funding_trends(self, content: str) -> str:
        return "Funding trends remain positive with increasing available capital."
    
    def _generate_investment_tags(self, content: str) -> str:
        return "Venture Capital | Startup Funding | African Investment"
    
    def _extract_startup_background(self, content: str, word_limit: int) -> str:
        return self._extract_key_details(content, word_limit)
    
    def _highlight_founder_story(self, content: str) -> str:
        return "The founder's journey exemplifies the entrepreneurial drive across Africa."
    
    def _describe_innovation(self, content: str) -> str:
        return "The innovation addresses real market needs with practical solutions."
    
    def _analyze_market_traction(self, content: str) -> str:
        return "Market traction indicates strong product-market fit and growth potential."
    
    def _outline_growth_strategy(self, content: str) -> str:
        return "Growth strategy focuses on sustainable expansion and market penetration."
    
    def _identify_challenges_opportunities(self, content: str) -> str:
        return "Key challenges include scaling operations while opportunities exist for market leadership."
    
    def _generate_inspiration_message(self, content: str) -> str:
        return "This serves as inspiration for aspiring entrepreneurs across the continent."
    
    def _generate_startup_tags(self, content: str) -> str:
        return "Entrepreneurship | Innovation | African Startups"
    
    def _extract_regulatory_context(self, content: str, word_limit: int) -> str:
        return self._extract_key_details(content, word_limit)
    
    def _identify_policy_changes(self, content: str) -> str:
        return "Policy changes aim to improve business environment and regulatory clarity."
    
    def _assess_business_impact(self, content: str) -> str:
        return "Business impact is expected to be positive with improved operational frameworks."
    
    def _outline_compliance_considerations(self, content: str) -> str:
        return "Compliance considerations include understanding new requirements and timelines."
    
    def _analyze_industry_response(self, content: str) -> str:
        return "Industry response has been generally positive with constructive engagement."
    
    def _project_long_term_implications(self, content: str) -> str:
        return "Long-term implications include improved business environment and increased investment."
    
    def _generate_policy_tags(self, content: str) -> str:
        return "Policy Analysis | Regulation | Business Environment"
    
    def _extract_key_points(self, content: str, word_limit: int) -> str:
        return self._extract_key_details(content, word_limit)
    
    def _provide_context_background(self, content: str) -> str:
        return "Understanding the context helps appreciate the significance of this development."
    
    def _provide_general_analysis(self, content: str) -> str:
        return "Analysis indicates positive trends in the African business and technology ecosystem."
    
    def _discuss_broader_implications(self, content: str) -> str:
        return "Broader implications include continued growth and increased global attention."
    
    def _provide_forward_outlook(self, content: str) -> str:
        return "The outlook remains positive with continued development expected."
    
    def _generate_general_tags(self, content: str) -> str:
        return "African Business | Technology | Development"
