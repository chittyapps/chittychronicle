"""
Advanced trust analytics and insights generation.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from dataclasses import dataclass

from .models import TrustEntity, TrustEvent


@dataclass
class TrustInsight:
    """Individual trust insight with contextual information."""
    category: str
    title: str
    description: str
    impact: str  # "positive", "negative", "neutral"
    confidence: float  # 0-100
    supporting_evidence: List[str]
    trend: Optional[str] = None  # "improving", "declining", "stable"


@dataclass
class TrustPattern:
    """Behavioral pattern detected in trust data."""
    pattern_type: str
    description: str
    frequency: int
    last_occurrence: datetime
    risk_level: str  # "low", "medium", "high"
    recommendation: str


class TrustAnalytics:
    """Advanced analytics engine for trust data."""
    
    def __init__(self):
        self.risk_thresholds = {
            "identity_verification": 70,
            "network_quality": 60,
            "outcome_consistency": 75,
            "temporal_stability": 65
        }
    
    async def generate_insights(
        self, 
        entity: TrustEntity, 
        events: List[TrustEvent],
        dimension_scores: Dict[str, float]
    ) -> List[TrustInsight]:
        """Generate contextual insights about trust profile."""
        insights = []
        
        # Identity verification insights
        insights.extend(self._analyze_identity_verification(entity, dimension_scores))
        
        # Behavioral pattern insights
        insights.extend(self._analyze_behavioral_patterns(events, dimension_scores))
        
        # Network quality insights
        insights.extend(self._analyze_network_quality(entity, events))
        
        # Risk assessment insights
        insights.extend(self._analyze_risk_factors(entity, events, dimension_scores))
        
        # Temporal trend insights
        insights.extend(self._analyze_temporal_trends(events, dimension_scores))
        
        return sorted(insights, key=lambda x: x.confidence, reverse=True)
    
    def _analyze_identity_verification(
        self, 
        entity: TrustEntity, 
        scores: Dict[str, float]
    ) -> List[TrustInsight]:
        """Analyze identity verification strength."""
        insights = []
        source_score = scores.get("source", 0)
        
        if source_score >= 85:
            insights.append(TrustInsight(
                category="identity",
                title="Strong Identity Verification",
                description="Multiple verified credentials and government ID confirmation provide high confidence in identity authenticity.",
                impact="positive",
                confidence=92.0,
                supporting_evidence=[
                    f"Identity verified: {entity.identity_verified}",
                    f"Credentials count: {len(entity.credentials or [])}",
                    "Government ID verified"
                ]
            ))
        elif source_score < 50:
            insights.append(TrustInsight(
                category="identity",
                title="Identity Verification Concerns",
                description="Limited identity verification may pose risks for high-trust interactions.",
                impact="negative",
                confidence=78.0,
                supporting_evidence=[
                    "Missing government ID verification",
                    "Limited professional credentials",
                    "Low source dimension score"
                ],
                trend="stable"
            ))
        
        return insights
    
    def _analyze_behavioral_patterns(
        self, 
        events: List[TrustEvent], 
        scores: Dict[str, float]
    ) -> List[TrustInsight]:
        """Analyze behavioral patterns and consistency."""
        insights = []
        
        if not events:
            return insights
        
        # Analyze outcome consistency
        positive_events = [e for e in events if e.outcome == "positive"]
        negative_events = [e for e in events if e.outcome == "negative"]
        
        if len(positive_events) / len(events) > 0.85:
            insights.append(TrustInsight(
                category="behavior",
                title="Exceptional Outcome Consistency",
                description="Consistently delivers positive outcomes across interactions, indicating high reliability.",
                impact="positive",
                confidence=88.0,
                supporting_evidence=[
                    f"Positive outcome rate: {len(positive_events)/len(events)*100:.1f}%",
                    f"Total events analyzed: {len(events)}",
                    "Low negative event frequency"
                ],
                trend="stable"
            ))
        
        # Analyze activity patterns
        recent_events = [
            e for e in events 
            if e.timestamp > datetime.utcnow() - timedelta(days=30)
        ]
        
        if len(recent_events) > 10:
            insights.append(TrustInsight(
                category="activity",
                title="High Recent Activity",
                description="Strong recent engagement suggests active and reliable presence.",
                impact="positive",
                confidence=75.0,
                supporting_evidence=[
                    f"Recent events (30 days): {len(recent_events)}",
                    "Consistent activity pattern",
                    "Regular interaction frequency"
                ]
            ))
        
        return insights
    
    def _analyze_network_quality(
        self, 
        entity: TrustEntity, 
        events: List[TrustEvent]
    ) -> List[TrustInsight]:
        """Analyze network connections and quality."""
        insights = []
        connections = entity.connections or []
        
        if connections:
            avg_trust = np.mean([c.trust_score for c in connections])
            high_trust_connections = [c for c in connections if c.trust_score > 80]
            
            if avg_trust > 85:
                insights.append(TrustInsight(
                    category="network",
                    title="High-Quality Network",
                    description="Connected to highly trusted entities, indicating strong professional or social standing.",
                    impact="positive",
                    confidence=82.0,
                    supporting_evidence=[
                        f"Average network trust: {avg_trust:.1f}",
                        f"High-trust connections: {len(high_trust_connections)}",
                        f"Total connections: {len(connections)}"
                    ]
                ))
            
            # Analyze connection diversity
            connection_types = set(c.connection_type for c in connections)
            if len(connection_types) >= 3:
                insights.append(TrustInsight(
                    category="network",
                    title="Diverse Network Connections",
                    description="Multiple types of professional and social connections demonstrate broad engagement.",
                    impact="positive",
                    confidence=70.0,
                    supporting_evidence=[
                        f"Connection types: {len(connection_types)}",
                        f"Types: {', '.join(connection_types)}",
                        "Broad professional engagement"
                    ]
                ))
        
        return insights
    
    def _analyze_risk_factors(
        self, 
        entity: TrustEntity, 
        events: List[TrustEvent],
        scores: Dict[str, float]
    ) -> List[TrustInsight]:
        """Identify potential risk factors."""
        insights = []
        
        # Check for concerning patterns
        negative_events = [e for e in events if e.outcome == "negative"]
        recent_negative = [
            e for e in negative_events 
            if e.timestamp > datetime.utcnow() - timedelta(days=90)
        ]
        
        if len(recent_negative) > 2:
            insights.append(TrustInsight(
                category="risk",
                title="Recent Negative Outcomes",
                description="Multiple recent negative outcomes warrant careful consideration for future engagements.",
                impact="negative",
                confidence=85.0,
                supporting_evidence=[
                    f"Recent negative events: {len(recent_negative)}",
                    "Pattern of concerning outcomes",
                    "Elevated risk profile"
                ],
                trend="declining"
            ))
        
        # Low transparency score
        if entity.transparency_level < 0.5:
            insights.append(TrustInsight(
                category="risk",
                title="Limited Transparency",
                description="Low transparency level may indicate reluctance to share information or verify claims.",
                impact="negative",
                confidence=70.0,
                supporting_evidence=[
                    f"Transparency level: {entity.transparency_level:.1f}",
                    "Limited information disclosure",
                    "Verification challenges"
                ]
            ))
        
        return insights
    
    def _analyze_temporal_trends(
        self, 
        events: List[TrustEvent], 
        scores: Dict[str, float]
    ) -> List[TrustInsight]:
        """Analyze trends over time."""
        insights = []
        
        if len(events) < 5:
            return insights
        
        # Analyze trend in event outcomes
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        recent_half = sorted_events[len(sorted_events)//2:]
        early_half = sorted_events[:len(sorted_events)//2]
        
        recent_positive_rate = len([e for e in recent_half if e.outcome == "positive"]) / len(recent_half)
        early_positive_rate = len([e for e in early_half if e.outcome == "positive"]) / len(early_half)
        
        if recent_positive_rate > early_positive_rate + 0.2:
            insights.append(TrustInsight(
                category="trend",
                title="Improving Performance Trend",
                description="Significant improvement in outcome quality over time demonstrates growth and learning.",
                impact="positive",
                confidence=78.0,
                supporting_evidence=[
                    f"Recent positive rate: {recent_positive_rate*100:.1f}%",
                    f"Early positive rate: {early_positive_rate*100:.1f}%",
                    "Upward trajectory in performance"
                ],
                trend="improving"
            ))
        elif early_positive_rate > recent_positive_rate + 0.2:
            insights.append(TrustInsight(
                category="trend",
                title="Declining Performance Trend",
                description="Recent decrease in positive outcomes may indicate changing circumstances or capabilities.",
                impact="negative",
                confidence=82.0,
                supporting_evidence=[
                    f"Recent positive rate: {recent_positive_rate*100:.1f}%",
                    f"Early positive rate: {early_positive_rate*100:.1f}%",
                    "Downward trajectory in performance"
                ],
                trend="declining"
            ))
        
        return insights
    
    async def detect_patterns(
        self, 
        entity: TrustEntity, 
        events: List[TrustEvent]
    ) -> List[TrustPattern]:
        """Detect behavioral patterns in trust data."""
        patterns = []
        
        # Pattern: Regular high-value transactions
        high_value_events = [e for e in events if e.event_type == "transaction" and hasattr(e, 'value') and e.value > 1000]
        if len(high_value_events) > 5:
            patterns.append(TrustPattern(
                pattern_type="high_value_activity",
                description="Regular high-value transactions with consistent positive outcomes",
                frequency=len(high_value_events),
                last_occurrence=max(high_value_events, key=lambda e: e.timestamp).timestamp,
                risk_level="low",
                recommendation="Suitable for high-value engagements"
            ))
        
        # Pattern: Community engagement
        community_events = [e for e in events if e.event_type in ["community_service", "endorsement", "collaboration"]]
        if len(community_events) > 8:
            patterns.append(TrustPattern(
                pattern_type="community_engagement",
                description="Strong pattern of community involvement and collaborative activities",
                frequency=len(community_events),
                last_occurrence=max(community_events, key=lambda e: e.timestamp).timestamp,
                risk_level="low",
                recommendation="Excellent for community-focused initiatives"
            ))
        
        # Pattern: Professional growth
        professional_events = [e for e in events if e.event_type in ["certification", "professional_development", "training"]]
        if len(professional_events) > 3:
            patterns.append(TrustPattern(
                pattern_type="professional_development",
                description="Consistent investment in professional growth and skill development",
                frequency=len(professional_events),
                last_occurrence=max(professional_events, key=lambda e: e.timestamp).timestamp,
                risk_level="low",
                recommendation="Strong candidate for professional partnerships"
            ))
        
        return patterns
    
    def calculate_confidence_intervals(
        self, 
        scores: Dict[str, float], 
        events: List[TrustEvent]
    ) -> Dict[str, Tuple[float, float]]:
        """Calculate confidence intervals for trust scores."""
        intervals = {}
        
        # Base confidence on number of events and score stability
        event_count = len(events)
        confidence_factor = min(event_count / 20, 1.0)  # Max confidence at 20+ events
        
        for dimension, score in scores.items():
            # Calculate margin of error based on score volatility and event count
            base_margin = 5.0  # Base 5-point margin
            count_adjustment = max(0, (20 - event_count) * 0.5)  # Wider for fewer events
            
            margin = base_margin + count_adjustment
            
            lower_bound = max(0, score - margin)
            upper_bound = min(100, score + margin)
            
            intervals[dimension] = (lower_bound, upper_bound)
        
        return intervals