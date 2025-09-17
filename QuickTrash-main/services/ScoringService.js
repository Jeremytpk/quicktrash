// Scoring Service for QuickTrash App
// Implements a DoorDash-like scoring system tailored for waste management

export class ScoringService {
  static SCORE_WEIGHTS = {
    // Overall rating weight (40% of total score)
    overallRating: 0.4,
    
    // Category-specific weights (60% of total score)
    categories: {
      timeliness: 0.25,      // 25% of category score
      communication: 0.25,   // 25% of category score
      professionalism: 0.25, // 25% of category score
      quality: 0.25,         // 25% of category score
    },
    
    // Behavioral factors
    completionRate: 0.15,    // 15% bonus/penalty
    cancellationRate: -0.2,  // 20% penalty
    responseTime: 0.1,       // 10% bonus for quick responses
    repeatBusiness: 0.05,    // 5% bonus for repeat customers/contractors
  };

  static SCORE_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    AVERAGE: 60,
    BELOW_AVERAGE: 45,
    POOR: 30,
  };

  static BEHAVIORAL_PENALTIES = {
    // Customer penalties
    customer: {
      lastMinuteCancellation: -10,    // Cancel within 2 hours
      noShow: -15,                    // Contractor arrives, no customer
      unpreparedPickup: -5,           // Items not ready when contractor arrives
      incorrectVolume: -8,            // Volume significantly different than stated
      poorCommunication: -5,          // Unresponsive to messages
      multipleDisputes: -12,          // Multiple dispute reports
    },
    
    // Contractor penalties
    contractor: {
      lateArrival: -8,                // More than 15 minutes late
      noShow: -20,                    // Doesn't show up at all
      incompletePickup: -10,          // Doesn't complete the job properly
      poorCommunication: -5,          // Unresponsive to customer messages
      unprofessionalBehavior: -15,    // Reports of unprofessional conduct
      vehicleIssues: -5,              // Vehicle problems causing delays
    },
  };

  static BEHAVIORAL_BONUSES = {
    // Customer bonuses
    customer: {
      earlyReady: 3,                  // Items ready 30+ minutes early
      clearInstructions: 2,           // Provides detailed pickup instructions
      flexibleScheduling: 2,          // Accommodates contractor schedule changes
      positiveFeedback: 5,            // Receives positive feedback from contractors
      frequentUser: 3,                // Regular customer (5+ orders)
      onTimePayment: 2,               // Always pays on time
    },
    
    // Contractor bonuses
    contractor: {
      earlyArrival: 5,                // Arrives 15+ minutes early
      exceedsExpectations: 8,         // Goes above and beyond
      handlesDifficultSituations: 5,  // Successfully handles challenging pickups
      highVolumeCapacity: 3,          // Handles large volume pickups efficiently
      flexibleSchedule: 2,            // Available during peak times
      consistentPerformance: 4,       // Maintains high ratings over time
    },
  };

  /**
   * Calculate overall user score based on ratings and behavior
   * @param {Object} userData - User data with ratings and behavior metrics
   * @param {string} userRole - 'customer' or 'contractor'
   * @returns {Object} Calculated scores and breakdown
   */
  static calculateUserScore(userData, userRole) {
    const {
      ratings = [],
      behaviorMetrics = {},
      performanceMetrics = {},
    } = userData;

    // Calculate rating-based score
    const ratingScore = this.calculateRatingScore(ratings);
    
    // Calculate behavioral score
    const behavioralScore = this.calculateBehavioralScore(behaviorMetrics, userRole);
    
    // Calculate performance metrics
    const performanceScore = this.calculatePerformanceScore(performanceMetrics, userRole);
    
    // Combine scores
    const totalScore = Math.min(100, Math.max(0, 
      ratingScore + behavioralScore + performanceScore
    ));

    return {
      totalScore: Math.round(totalScore),
      ratingScore: Math.round(ratingScore),
      behavioralScore: Math.round(behavioralScore),
      performanceScore: Math.round(performanceScore),
      breakdown: {
        ratingBreakdown: this.getRatingBreakdown(ratings),
        behavioralBreakdown: this.getBehavioralBreakdown(behaviorMetrics, userRole),
        performanceBreakdown: this.getPerformanceBreakdown(performanceMetrics, userRole),
      },
      level: this.getScoreLevel(totalScore),
      recommendations: this.getScoreRecommendations(totalScore, userData, userRole),
    };
  }

  /**
   * Calculate score based on ratings
   */
  static calculateRatingScore(ratings) {
    if (!ratings.length) return 50; // Default score for new users

    let totalScore = 0;
    let weightedSum = 0;

    ratings.forEach((rating, index) => {
      // Recent ratings have more weight (exponential decay)
      const recencyWeight = Math.pow(0.95, ratings.length - index - 1);
      
      // Overall rating component
      const overallComponent = rating.rating * 20; // Convert 1-5 to 0-100
      
      // Category ratings component
      const categoryScore = this.calculateCategoryScore(rating.categories);
      
      const ratingScore = (
        overallComponent * this.SCORE_WEIGHTS.overallRating +
        categoryScore * (1 - this.SCORE_WEIGHTS.overallRating)
      );

      totalScore += ratingScore * recencyWeight;
      weightedSum += recencyWeight;
    });

    return weightedSum > 0 ? totalScore / weightedSum : 50;
  }

  /**
   * Calculate score from category ratings
   */
  static calculateCategoryScore(categories) {
    if (!categories) return 50;

    const categorySum = Object.entries(categories).reduce((sum, [category, rating]) => {
      const weight = this.SCORE_WEIGHTS.categories[category] || 0;
      return sum + (rating * 20 * weight); // Convert 1-5 to 0-100
    }, 0);

    return categorySum;
  }

  /**
   * Calculate behavioral score
   */
  static calculateBehavioralScore(behaviorMetrics, userRole) {
    let score = 0;

    // Apply penalties
    const penalties = this.BEHAVIORAL_PENALTIES[userRole] || {};
    Object.entries(penalties).forEach(([behavior, penalty]) => {
      const count = behaviorMetrics[behavior] || 0;
      score += penalty * count;
    });

    // Apply bonuses
    const bonuses = this.BEHAVIORAL_BONUSES[userRole] || {};
    Object.entries(bonuses).forEach(([behavior, bonus]) => {
      const count = behaviorMetrics[behavior] || 0;
      score += bonus * count;
    });

    return Math.min(20, Math.max(-20, score)); // Cap behavioral adjustments
  }

  /**
   * Calculate performance metrics score
   */
  static calculatePerformanceScore(performanceMetrics, userRole) {
    let score = 0;

    // Completion rate bonus/penalty
    const completionRate = performanceMetrics.completionRate || 0;
    if (completionRate >= 0.95) {
      score += 10;
    } else if (completionRate >= 0.9) {
      score += 5;
    } else if (completionRate < 0.8) {
      score -= 10;
    }

    // Cancellation rate penalty
    const cancellationRate = performanceMetrics.cancellationRate || 0;
    if (cancellationRate > 0.1) {
      score -= 15;
    } else if (cancellationRate > 0.05) {
      score -= 8;
    }

    // Response time bonus (for contractors)
    if (userRole === 'contractor') {
      const avgResponseTime = performanceMetrics.avgResponseTime || 0; // in minutes
      if (avgResponseTime < 5) {
        score += 5;
      } else if (avgResponseTime < 15) {
        score += 2;
      } else if (avgResponseTime > 60) {
        score -= 5;
      }
    }

    // Repeat business bonus
    const repeatRate = performanceMetrics.repeatRate || 0;
    if (repeatRate > 0.3) {
      score += 5;
    }

    return Math.min(15, Math.max(-15, score)); // Cap performance adjustments
  }

  /**
   * Get score level based on total score
   */
  static getScoreLevel(score) {
    if (score >= this.SCORE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (score >= this.SCORE_THRESHOLDS.GOOD) return 'GOOD';
    if (score >= this.SCORE_THRESHOLDS.AVERAGE) return 'AVERAGE';
    if (score >= this.SCORE_THRESHOLDS.BELOW_AVERAGE) return 'BELOW_AVERAGE';
    return 'POOR';
  }

  /**
   * Get detailed breakdown of ratings
   */
  static getRatingBreakdown(ratings) {
    if (!ratings.length) return null;

    const totals = {
      overall: 0,
      timeliness: 0,
      communication: 0,
      professionalism: 0,
      quality: 0,
      count: ratings.length,
    };

    ratings.forEach(rating => {
      totals.overall += rating.rating;
      Object.entries(rating.categories || {}).forEach(([category, value]) => {
        totals[category] += value;
      });
    });

    return {
      overall: (totals.overall / totals.count).toFixed(1),
      timeliness: (totals.timeliness / totals.count).toFixed(1),
      communication: (totals.communication / totals.count).toFixed(1),
      professionalism: (totals.professionalism / totals.count).toFixed(1),
      quality: (totals.quality / totals.count).toFixed(1),
      totalRatings: totals.count,
    };
  }

  /**
   * Get behavioral breakdown
   */
  static getBehavioralBreakdown(behaviorMetrics, userRole) {
    const penalties = this.BEHAVIORAL_PENALTIES[userRole] || {};
    const bonuses = this.BEHAVIORAL_BONUSES[userRole] || {};
    
    const breakdown = {
      penalties: [],
      bonuses: [],
      totalImpact: 0,
    };

    Object.entries(penalties).forEach(([behavior, penalty]) => {
      const count = behaviorMetrics[behavior] || 0;
      if (count > 0) {
        breakdown.penalties.push({
          behavior,
          count,
          impact: penalty * count,
        });
        breakdown.totalImpact += penalty * count;
      }
    });

    Object.entries(bonuses).forEach(([behavior, bonus]) => {
      const count = behaviorMetrics[behavior] || 0;
      if (count > 0) {
        breakdown.bonuses.push({
          behavior,
          count,
          impact: bonus * count,
        });
        breakdown.totalImpact += bonus * count;
      }
    });

    return breakdown;
  }

  /**
   * Get performance breakdown
   */
  static getPerformanceBreakdown(performanceMetrics, userRole) {
    return {
      completionRate: performanceMetrics.completionRate || 0,
      cancellationRate: performanceMetrics.cancellationRate || 0,
      avgResponseTime: performanceMetrics.avgResponseTime || 0,
      repeatRate: performanceMetrics.repeatRate || 0,
      totalJobs: performanceMetrics.totalJobs || 0,
    };
  }

  /**
   * Get personalized recommendations for score improvement
   */
  static getScoreRecommendations(score, userData, userRole) {
    const recommendations = [];
    const level = this.getScoreLevel(score);
    const { behaviorMetrics = {}, performanceMetrics = {} } = userData;

    if (level === 'POOR' || level === 'BELOW_AVERAGE') {
      if (userRole === 'customer') {
        recommendations.push({
          category: 'Communication',
          title: 'Improve Communication',
          description: 'Respond promptly to contractor messages and provide clear pickup instructions.',
          impact: 'Can improve your score by 5-10 points',
          priority: 'HIGH',
        });

        if (behaviorMetrics.noShow > 0) {
          recommendations.push({
            category: 'Reliability',
            title: 'Be Available During Pickup',
            description: 'Ensure you or someone is available when contractors arrive for pickup.',
            impact: 'Can improve your score by 10-15 points',
            priority: 'HIGH',
          });
        }

        if (behaviorMetrics.lastMinuteCancellation > 0) {
          recommendations.push({
            category: 'Planning',
            title: 'Plan Ahead',
            description: 'Avoid last-minute cancellations. Cancel at least 2 hours in advance.',
            impact: 'Can improve your score by 8-12 points',
            priority: 'HIGH',
          });
        }
      } else {
        recommendations.push({
          category: 'Punctuality',
          title: 'Arrive On Time',
          description: 'Aim to arrive within the scheduled time window to improve customer satisfaction.',
          impact: 'Can improve your score by 8-12 points',
          priority: 'HIGH',
        });

        if (behaviorMetrics.lateArrival > 0) {
          recommendations.push({
            category: 'Time Management',
            title: 'Better Time Planning',
            description: 'Plan your route and allow extra time for traffic or unexpected delays.',
            impact: 'Can improve your score by 5-8 points',
            priority: 'MEDIUM',
          });
        }

        if (performanceMetrics.avgResponseTime > 30) {
          recommendations.push({
            category: 'Communication',
            title: 'Faster Response Time',
            description: 'Respond to customer messages within 15 minutes.',
            impact: 'Can improve your score by 3-5 points',
            priority: 'MEDIUM',
          });
        }
      }
    }

    // General recommendations for all levels
    if (level !== 'EXCELLENT') {
      recommendations.push({
        category: 'Service Quality',
        title: 'Exceed Expectations',
        description: userRole === 'customer' 
          ? 'Have items ready early and provide detailed instructions.'
          : 'Go above and beyond by arriving early and handling items with care.',
        impact: 'Can improve your score by 3-8 points',
        priority: 'MEDIUM',
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Get score color based on level
   */
  static getScoreColor(level) {
    const colors = {
      EXCELLENT: '#34A853',
      GOOD: '#1E88E5',
      AVERAGE: '#FF8F00',
      BELOW_AVERAGE: '#F59E0B',
      POOR: '#EF4444',
    };
    return colors[level] || '#6B7280';
  }

  /**
   * Get score description
   */
  static getScoreDescription(level) {
    const descriptions = {
      EXCELLENT: 'Outstanding service provider',
      GOOD: 'Reliable and professional',
      AVERAGE: 'Meets basic expectations',
      BELOW_AVERAGE: 'Needs improvement',
      POOR: 'Requires immediate attention',
    };
    return descriptions[level] || 'New user';
  }
}

export default ScoringService;
