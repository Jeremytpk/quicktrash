"""
AI-powered content summarization service
"""
import os
import logging
from typing import Dict, List, Optional, Tuple
from transformers import (
    AutoTokenizer, AutoModelForSeq2SeqLM, 
    pipeline, Pipeline
)
import torch
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class ContentSummarizer:
    """
    AI-powered content summarization using transformer models
    """
    
    def __init__(self, model_name: str = "facebook/bart-large-cnn"):
        """
        Initialize the summarizer
        
        Args:
            model_name: HuggingFace model name for summarization
        """
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.summarizer = None
        self.tokenizer = None
        self.model = None
        
        # Load model
        self._load_model()
        
        # Africa-specific context for better summarization
        self.africa_context = [
            "Africa", "African", "DRC", "Congo", "Nigeria", "Kenya", "Ghana",
            "South Africa", "fintech", "startup", "investment", "technology",
            "infrastructure", "mining", "agriculture", "business"
        ]
    
    def _load_model(self):
        """Load the summarization model and tokenizer"""
        try:
            logger.info(f"Loading summarization model: {self.model_name}")
            
            # Initialize summarization pipeline
            self.summarizer = pipeline(
                "summarization",
                model=self.model_name,
                tokenizer=self.model_name,
                device=0 if self.device == "cuda" else -1,
                framework="pt"
            )
            
            # Also load tokenizer and model separately for more control
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
            
            if self.device == "cuda":
                self.model = self.model.cuda()
            
            logger.info("Summarization model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading summarization model: {e}")
            # Fallback to a lighter model
            try:
                self.model_name = "sshleifer/distilbart-cnn-12-6"
                self.summarizer = pipeline(
                    "summarization",
                    model=self.model_name,
                    device=0 if self.device == "cuda" else -1
                )
                logger.info("Loaded fallback summarization model")
            except Exception as e2:
                logger.error(f"Failed to load fallback model: {e2}")
                raise
    
    def summarize_article(
        self, 
        content: str, 
        title: str = "", 
        max_length: int = 150,
        min_length: int = 50
    ) -> Dict[str, str]:
        """
        Generate AI summary for an article
        
        Args:
            content: Article content
            title: Article title (optional)
            max_length: Maximum summary length
            min_length: Minimum summary length
            
        Returns:
            Dictionary with summary and catchy headline
        """
        if not content or len(content.strip()) < 100:
            return {
                "summary": "Content too short for summarization.",
                "catchy_headline": title or "Brief Update",
                "confidence_score": 0.0
            }
        
        try:
            # Preprocess content
            processed_content = self._preprocess_content(content)
            
            # Check if content is too long and chunk if necessary
            if len(processed_content.split()) > 1000:
                chunks = self._chunk_content(processed_content)
                summaries = []
                
                for chunk in chunks:
                    chunk_summary = self._generate_summary(
                        chunk, max_length//len(chunks), min_length//len(chunks)
                    )
                    if chunk_summary:
                        summaries.append(chunk_summary)
                
                # Combine chunk summaries
                if summaries:
                    final_summary = self._generate_summary(
                        " ".join(summaries), max_length, min_length
                    )
                else:
                    final_summary = "Unable to generate summary."
            else:
                final_summary = self._generate_summary(processed_content, max_length, min_length)
            
            # Generate catchy headline
            catchy_headline = self._generate_catchy_headline(final_summary, title)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(content, final_summary)
            
            return {
                "summary": final_summary,
                "catchy_headline": catchy_headline,
                "confidence_score": confidence_score
            }
            
        except Exception as e:
            logger.error(f"Error in summarization: {e}")
            return {
                "summary": "Error generating summary.",
                "catchy_headline": title or "Update",
                "confidence_score": 0.0
            }
    
    def _preprocess_content(self, content: str) -> str:
        """
        Preprocess content for better summarization
        """
        # Remove extra whitespace
        content = re.sub(r'\\s+', ' ', content)
        
        # Remove URLs
        content = re.sub(r'http\\S+|www\\S+', '', content)
        
        # Remove email addresses
        content = re.sub(r'\\S+@\\S+', '', content)
        
        # Clean up quotes
        content = re.sub(r'["""]', '"', content)
        content = re.sub(r'['']', "'", content)
        
        # Ensure African context is prominent
        content_lower = content.lower()
        africa_mentions = sum(1 for keyword in self.africa_context if keyword.lower() in content_lower)
        
        # If low African context, add emphasis
        if africa_mentions < 2:
            content = f"African business news: {content}"
        
        return content.strip()
    
    def _chunk_content(self, content: str, max_chunk_size: int = 800) -> List[str]:
        """
        Split long content into manageable chunks
        """
        words = content.split()
        chunks = []
        current_chunk = []
        
        for word in words:
            current_chunk.append(word)
            if len(current_chunk) >= max_chunk_size:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks
    
    def _generate_summary(self, content: str, max_length: int, min_length: int) -> str:
        """
        Generate summary using the transformer model
        """
        try:
            # Ensure reasonable length bounds
            max_length = min(max_length, 300)
            min_length = max(min_length, 30)
            min_length = min(min_length, max_length - 10)
            
            summary_result = self.summarizer(
                content,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                truncation=True
            )
            
            summary = summary_result[0]['summary_text']
            
            # Post-process summary
            summary = self._post_process_summary(summary)
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Summary generation failed."
    
    def _post_process_summary(self, summary: str) -> str:
        """
        Post-process generated summary
        """
        # Ensure summary ends properly
        if not summary.endswith(('.', '!', '?')):
            summary += '.'
        
        # Capitalize first letter
        if summary:
            summary = summary[0].upper() + summary[1:]
        
        # Remove redundant phrases
        redundant_phrases = [
            "This article discusses",
            "The article mentions",
            "According to the article",
            "The text states"
        ]
        
        for phrase in redundant_phrases:
            summary = summary.replace(phrase, "").strip()
        
        return summary
    
    def _generate_catchy_headline(self, summary: str, original_title: str = "") -> str:
        """
        Generate a catchy, click-worthy headline
        """
        try:
            # Headline generation prompts/patterns
            power_words = [
                "Breaking:", "Exclusive:", "Major:", "Unprecedented:", 
                "Revolutionary:", "Game-Changing:", "Critical:"
            ]
            
            # Extract key topics from summary
            key_topics = self._extract_key_topics(summary)
            
            if key_topics:
                # Create variations based on content
                if any(word in summary.lower() for word in ['funding', 'investment', 'raised']):
                    headline = f"💰 {key_topics[0]} Secures Major Investment in African Market"
                elif any(word in summary.lower() for word in ['launch', 'new', 'unveil']):
                    headline = f"🚀 {key_topics[0]} Launches Groundbreaking Solution for Africa"
                elif any(word in summary.lower() for word in ['growth', 'expand', 'scale']):
                    headline = f"📈 {key_topics[0]} Accelerates African Expansion Plans"
                elif any(word in summary.lower() for word in ['partnership', 'deal', 'agreement']):
                    headline = f"🤝 Strategic Partnership: {key_topics[0]} Transforms African Market"
                else:
                    # Generic but engaging format
                    power_word = power_words[hash(summary) % len(power_words)]
                    headline = f"{power_word} {key_topics[0]} Reshapes African Tech Landscape"
            else:
                # Fallback to enhanced original title
                if original_title:
                    if not any(word in original_title.lower() for word in ['africa', 'african']):
                        headline = f"African Focus: {original_title}"
                    else:
                        headline = original_title
                else:
                    headline = "Latest African Business Update"
            
            # Ensure reasonable length
            if len(headline) > 100:
                headline = headline[:97] + "..."
            
            return headline
            
        except Exception as e:
            logger.error(f"Error generating headline: {e}")
            return original_title or "African Business Update"
    
    def _extract_key_topics(self, text: str) -> List[str]:
        """
        Extract key topics/entities from text
        """
        # Simple keyword extraction
        text_lower = text.lower()
        topics = []
        
        # Look for companies/organizations (capitalized words)
        import re
        capitalized_words = re.findall(r'\\b[A-Z][a-zA-Z]{2,}\\b', text)
        topics.extend(capitalized_words[:3])
        
        # Look for African countries/regions
        african_entities = [
            'DRC', 'Congo', 'Nigeria', 'Kenya', 'Ghana', 'South Africa',
            'Kinshasa', 'Lagos', 'Nairobi', 'Accra', 'Cape Town'
        ]
        
        for entity in african_entities:
            if entity.lower() in text_lower:
                topics.append(entity)
        
        # Look for tech/business terms
        business_terms = [
            'fintech', 'startup', 'technology', 'innovation', 'investment',
            'infrastructure', 'mining', 'agriculture', 'energy'
        ]
        
        for term in business_terms:
            if term in text_lower:
                topics.append(term.title())
        
        return list(set(topics))[:3]  # Return top 3 unique topics
    
    def _calculate_confidence_score(self, original: str, summary: str) -> float:
        """
        Calculate confidence score for the summary
        """
        try:
            # Simple heuristics for confidence
            score = 0.5  # Base score
            
            # Length appropriateness
            original_words = len(original.split())
            summary_words = len(summary.split())
            
            if 0.1 <= summary_words / original_words <= 0.4:
                score += 0.2
            
            # African context preservation
            africa_in_original = sum(1 for keyword in self.africa_context 
                                   if keyword.lower() in original.lower())
            africa_in_summary = sum(1 for keyword in self.africa_context 
                                  if keyword.lower() in summary.lower())
            
            if africa_in_original > 0:
                context_ratio = africa_in_summary / africa_in_original
                score += min(0.2, context_ratio * 0.2)
            
            # Summary quality indicators
            if summary.count('.') >= 2:  # Multiple sentences
                score += 0.1
            
            if not any(phrase in summary.lower() for phrase in ['error', 'failed', 'unable']):
                score += 0.1
            
            return min(1.0, score)
            
        except Exception:
            return 0.3
