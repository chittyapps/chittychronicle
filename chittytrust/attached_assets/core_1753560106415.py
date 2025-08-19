# ✅ VERIFIED
"""
Core Trust Engine implementation with 6D scoring algorithm.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
from pydantic import BaseModel, Field

from .dimensions import (
    ChannelDimension,
    JusticeDimension,
    NetworkDimension,
    OutcomeDimension,
    SourceDimension,
    TemporalDimension,
)
from .models import TrustEntity, TrustEvent
from .scores import ChittyScore, LegalScore, PeopleScore, StateScore


@dataclass
class TrustScore:
    """Composite trust score with all dimensions and output scores."""
    
    # 6D dimension scores (0-100)
    source_score: float
    temporal_score: float
    channel_score: float
    outcome_score: float
    network_score: float
    justice_score: float
    
    # Output scores (0-100)
    people_score: float
    legal_score: float
    state_score: float
    chitty_score: float
    
    # Metadata
    calculated_at: datetime
    confidence: float
    explanation: Dict[str, str]
    
    @property
    def composite_score(self) -> float:
        """Calculate weighted composite score."""
        weights = {
            "source": 0.15,
            "temporal": 0.10,
            "channel": 0.15,
            "outcome": 0.20,
            "network": 0.15,
            "justice": 0.25,
        }
        
        scores = [
            self.source_score * weights["source"],
            self.temporal_score * weights["temporal"],
            self.channel_score * weights["channel"],
            self.outcome_score * weights["outcome"],
            self.network_score * weights["network"],
            self.justice_score * weights["justice"],
        ]
        
        return sum(scores)
    
    def to_dict(self) -> Dict[str, any]:
        """Convert to dictionary for API responses."""
        return {
            "dimensions": {
                "source": self.source_score,
                "temporal": self.temporal_score,
                "channel": self.channel_score,
                "outcome": self.outcome_score,
                "network": self.network_score,
                "justice": self.justice_score,
            },
            "scores": {
                "people": self.people_score,
                "legal": self.legal_score,
                "state": self.state_score,
                "chitty": self.chitty_score,
                "composite": self.composite_score,
            },
            "metadata": {
                "calculated_at": self.calculated_at.isoformat(),
                "confidence": self.confidence,
                "explanation": self.explanation,
            },
        }


class TrustEngine:
    """Main trust calculation engine."""
    
    def __init__(self):
        self.source_dim = SourceDimension()
        self.temporal_dim = TemporalDimension()
        self.channel_dim = ChannelDimension()
        self.outcome_dim = OutcomeDimension()
        self.network_dim = NetworkDimension()
        self.justice_dim = JusticeDimension()
        
        self.people_scorer = PeopleScore()
        self.legal_scorer = LegalScore()
        self.state_scorer = StateScore()
        self.chitty_scorer = ChittyScore()
    
    async def calculate_trust(
        self,
        entity: TrustEntity,
        events: List[TrustEvent],
        context: Optional[Dict[str, any]] = None,
    ) -> TrustScore:
        """Calculate comprehensive trust score for an entity."""
        
        # Calculate dimension scores
        source_score = await self.source_dim.calculate(entity, events)
        temporal_score = await self.temporal_dim.calculate(entity, events)
        channel_score = await self.channel_dim.calculate(entity, events)
        outcome_score = await self.outcome_dim.calculate(entity, events)
        network_score = await self.network_dim.calculate(entity, events)
        justice_score = await self.justice_dim.calculate(entity, events)
        
        # Calculate output scores
        dimension_scores = {
            "source": source_score,
            "temporal": temporal_score,
            "channel": channel_score,
            "outcome": outcome_score,
            "network": network_score,
            "justice": justice_score,
        }
        
        people_score = await self.people_scorer.calculate(dimension_scores, entity, events)
        legal_score = await self.legal_scorer.calculate(dimension_scores, entity, events)
        state_score = await self.state_scorer.calculate(dimension_scores, entity, events)
        chitty_score = await self.chitty_scorer.calculate(dimension_scores, entity, events)
        
        # Generate explanation
        explanation = self._generate_explanation(
            entity, dimension_scores, context
        )
        
        # Calculate confidence
        confidence = self._calculate_confidence(events, dimension_scores)
        
        return TrustScore(
            source_score=source_score,
            temporal_score=temporal_score,
            channel_score=channel_score,
            outcome_score=outcome_score,
            network_score=network_score,
            justice_score=justice_score,
            people_score=people_score,
            legal_score=legal_score,
            state_score=state_score,
            chitty_score=chitty_score,
            calculated_at=datetime.utcnow(),
            confidence=confidence,
            explanation=explanation,
        )
    
    def _generate_explanation(
        self,
        entity: TrustEntity,
        scores: Dict[str, float],
        context: Optional[Dict[str, any]],
    ) -> Dict[str, str]:
        """Generate human-readable explanations for scores."""
        explanations = {}
        
        # Source explanation
        if scores["source"] < 50:
            explanations["source"] = "Limited verification of identity and credentials"
        elif scores["source"] < 80:
            explanations["source"] = "Partially verified identity with some credentials"
        else:
            explanations["source"] = "Fully verified identity with strong credentials"
        
        # Temporal explanation
        if scores["temporal"] < 50:
            explanations["temporal"] = "Limited or inconsistent history"
        elif scores["temporal"] < 80:
            explanations["temporal"] = "Moderate history with some gaps"
        else:
            explanations["temporal"] = "Long, consistent history of positive behavior"
        
        # Channel explanation
        if scores["channel"] < 50:
            explanations["channel"] = "Uses unverified or low-trust channels"
        elif scores["channel"] < 80:
            explanations["channel"] = "Mix of verified and unverified channels"
        else:
            explanations["channel"] = "Primarily uses verified, high-trust channels"
        
        # Outcome explanation
        if scores["outcome"] < 50:
            explanations["outcome"] = "Poor track record of outcomes"
        elif scores["outcome"] < 80:
            explanations["outcome"] = "Mixed outcomes with room for improvement"
        else:
            explanations["outcome"] = "Excellent track record of positive outcomes"
        
        # Network explanation
        if scores["network"] < 50:
            explanations["network"] = "Limited or low-trust network connections"
        elif scores["network"] < 80:
            explanations["network"] = "Growing network with mixed trust levels"
        else:
            explanations["network"] = "Strong network of high-trust connections"
        
        # Justice explanation
        if scores["justice"] < 50:
            explanations["justice"] = "Actions show limited alignment with justice"
        elif scores["justice"] < 80:
            explanations["justice"] = "Generally justice-aligned with some concerns"
        else:
            explanations["justice"] = "Strongly aligned with justice principles"
        
        return explanations
    
    def _calculate_confidence(
        self, events: List[TrustEvent], scores: Dict[str, float]
    ) -> float:
        """Calculate confidence level in the trust score."""
        # Base confidence on data quantity
        event_confidence = min(len(events) / 100, 1.0) * 0.5
        
        # Adjust for score consistency
        score_variance = np.var(list(scores.values()))
        consistency_confidence = (1 - score_variance / 5000) * 0.3
        
        # Time-based confidence (recent data is better)
        if events:
            latest_event = max(events, key=lambda e: e.timestamp)
            days_old = (datetime.utcnow() - latest_event.timestamp).days
            recency_confidence = max(0, 1 - days_old / 365) * 0.2
        else:
            recency_confidence = 0
        
        total_confidence = (
            event_confidence + consistency_confidence + recency_confidence
        )
        
        return min(max(total_confidence, 0.1), 1.0)


# Convenience function
async def calculate_trust(
    entity: TrustEntity,
    events: List[TrustEvent],
    context: Optional[Dict[str, any]] = None,
) -> TrustScore:
    """Calculate trust score using default engine."""
    engine = TrustEngine()
    return await engine.calculate_trust(entity, events, context)