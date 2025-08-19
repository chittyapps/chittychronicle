"""
Six dimensions of trust calculation.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import numpy as np

from .models import TrustEntity, TrustEvent


class TrustDimension(ABC):
    """Base class for trust dimensions."""
    
    @abstractmethod
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        """Calculate dimension score (0-100)."""
        pass


class SourceDimension(TrustDimension):
    """Who: Identity verification and credential assessment."""
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        score = 0.0
        
        # Identity verification level
        if entity.identity_verified:
            score += 30
        
        # Credential assessment
        credentials = entity.credentials or []
        credential_score = min(len(credentials) * 10, 30)
        score += credential_score
        
        # Government ID verification
        if any(c.type == "government_id" for c in credentials):
            score += 20
        
        # Professional certifications
        prof_certs = [c for c in credentials if c.type == "professional"]
        score += min(len(prof_certs) * 5, 20)
        
        return min(score, 100)


class TemporalDimension(TrustDimension):
    """When: Time-based analysis and consistency."""
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        if not events:
            return 0.0
        
        # Account age
        account_age_days = (datetime.utcnow() - entity.created_at).days
        age_score = min(account_age_days / 365 * 30, 30)
        
        # Event consistency
        event_dates = [e.timestamp for e in events]
        event_gaps = []
        for i in range(1, len(event_dates)):
            gap = (event_dates[i] - event_dates[i-1]).days
            event_gaps.append(gap)
        
        if event_gaps:
            avg_gap = np.mean(event_gaps)
            consistency_score = max(0, 30 - avg_gap / 10)
        else:
            consistency_score = 15
        
        # Recent activity
        latest_event = max(events, key=lambda e: e.timestamp)
        days_since_active = (datetime.utcnow() - latest_event.timestamp).days
        recency_score = max(0, 20 - days_since_active / 10)
        
        # Long-term positive behavior
        positive_events = [e for e in events if e.outcome == "positive"]
        longevity_score = min(len(positive_events) / 10 * 20, 20)
        
        return age_score + consistency_score + recency_score + longevity_score


class ChannelDimension(TrustDimension):
    """How: Communication and transaction channels used."""
    
    CHANNEL_TRUST_SCORES = {
        "verified_api": 95,
        "blockchain": 90,
        "bank_transfer": 85,
        "credit_card": 80,
        "oauth": 75,
        "email": 60,
        "sms": 55,
        "social_media": 40,
        "anonymous": 10,
    }
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        if not events:
            return 0.0
        
        channel_scores = []
        for event in events:
            channel = event.channel or "anonymous"
            trust_score = self.CHANNEL_TRUST_SCORES.get(channel, 20)
            channel_scores.append(trust_score)
        
        # Weighted average (recent events matter more)
        weights = np.linspace(0.5, 1.0, len(channel_scores))
        if len(weights) > 0:
            weighted_score = np.average(channel_scores, weights=weights)
        else:
            weighted_score = np.mean(channel_scores)
        
        # Bonus for using multiple verified channels
        verified_channels = set()
        for event in events:
            if event.channel in ["verified_api", "blockchain", "bank_transfer"]:
                verified_channels.add(event.channel)
        
        diversity_bonus = min(len(verified_channels) * 5, 15)
        
        return min(weighted_score + diversity_bonus, 100)


class OutcomeDimension(TrustDimension):
    """Results: Track record of positive/negative outcomes."""
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        if not events:
            return 0.0
        
        positive_events = [e for e in events if e.outcome == "positive"]
        negative_events = [e for e in events if e.outcome == "negative"]
        neutral_events = [e for e in events if e.outcome == "neutral"]
        
        total_events = len(events)
        positive_ratio = len(positive_events) / total_events
        negative_ratio = len(negative_events) / total_events
        
        # Base score on positive ratio
        base_score = positive_ratio * 70
        
        # Penalty for negative events (more severe)
        negative_penalty = negative_ratio * 100
        
        # Small bonus for consistency
        if positive_ratio > 0.8 and total_events > 10:
            consistency_bonus = 20
        elif positive_ratio > 0.6:
            consistency_bonus = 10
        else:
            consistency_bonus = 0
        
        # Recent outcomes matter more
        recent_events = [
            e for e in events 
            if e.timestamp > datetime.utcnow() - timedelta(days=90)
        ]
        if recent_events:
            recent_positive = len([e for e in recent_events if e.outcome == "positive"])
            recent_ratio = recent_positive / len(recent_events)
            recency_adjustment = (recent_ratio - positive_ratio) * 20
        else:
            recency_adjustment = 0
        
        score = base_score - negative_penalty + consistency_bonus + recency_adjustment
        return max(0, min(score, 100))


class NetworkDimension(TrustDimension):
    """Connections: Quality and trust level of network."""
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        # Network size component
        connections = entity.connections or []
        size_score = min(len(connections) / 100 * 20, 20)
        
        # Network quality component
        if connections:
            avg_trust = np.mean([c.trust_score for c in connections])
            quality_score = avg_trust * 0.4
        else:
            quality_score = 0
        
        # Interaction frequency
        interaction_events = [
            e for e in events 
            if e.event_type in ["interaction", "transaction", "collaboration"]
        ]
        frequency_score = min(len(interaction_events) / 50 * 20, 20)
        
        # Endorsements and recommendations
        endorsement_events = [
            e for e in events 
            if e.event_type == "endorsement" and e.outcome == "positive"
        ]
        endorsement_score = min(len(endorsement_events) * 5, 20)
        
        return size_score + quality_score + frequency_score + endorsement_score


class JusticeDimension(TrustDimension):
    """Impact: Alignment with justice and positive societal impact."""
    
    async def calculate(
        self, entity: TrustEntity, events: List[TrustEvent]
    ) -> float:
        score = 0.0
        
        # Community impact events
        community_events = [
            e for e in events 
            if e.tags and "community_impact" in e.tags
        ]
        community_score = min(len(community_events) * 10, 30)
        score += community_score
        
        # Justice-aligned actions
        justice_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "justice", "fairness", "equality", "transparency"
            ])
        ]
        justice_score = min(len(justice_events) * 8, 25)
        score += justice_score
        
        # Harm prevention/mitigation
        harm_prevention = [
            e for e in events 
            if e.tags and "harm_prevention" in e.tags
        ]
        prevention_score = min(len(harm_prevention) * 5, 15)
        score += prevention_score
        
        # Dispute resolution
        resolution_events = [
            e for e in events 
            if e.event_type == "dispute_resolution" and e.outcome == "positive"
        ]
        resolution_score = min(len(resolution_events) * 10, 20)
        score += resolution_score
        
        # Transparency bonus
        if entity.transparency_level and entity.transparency_level > 0.7:
            score += 10
        
        return min(score, 100)
