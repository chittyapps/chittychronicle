# ✅ VERIFIED
"""
Output score calculators that combine the 6 dimensions.
"""

from abc import ABC, abstractmethod
from typing import Dict, List
import numpy as np

from .models import TrustEntity, TrustEvent


class OutputScore(ABC):
    """Base class for output score calculators."""
    
    @abstractmethod
    async def calculate(
        self,
        dimension_scores: Dict[str, float],
        entity: TrustEntity,
        events: List[TrustEvent],
    ) -> float:
        """Calculate output score (0-100) from dimension scores."""
        pass


class PeopleScore(OutputScore):
    """Community impact and social trust score."""
    
    async def calculate(
        self,
        dimension_scores: Dict[str, float],
        entity: TrustEntity,
        events: List[TrustEvent],
    ) -> float:
        # People's score emphasizes network, justice, and outcomes
        weights = {
            "source": 0.10,
            "temporal": 0.10,
            "channel": 0.10,
            "outcome": 0.20,
            "network": 0.25,
            "justice": 0.25,
        }
        
        base_score = sum(
            dimension_scores[dim] * weight 
            for dim, weight in weights.items()
        )
        
        # Bonus for community engagement
        community_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "community", "volunteer", "charity", "public_good"
            ])
        ]
        community_bonus = min(len(community_events) * 2, 10)
        
        # Penalty for anti-social behavior
        antisocial_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "harassment", "discrimination", "fraud", "violation"
            ])
        ]
        antisocial_penalty = len(antisocial_events) * 5
        
        return max(0, min(base_score + community_bonus - antisocial_penalty, 100))


class LegalScore(OutputScore):
    """Technical compliance and legal standing score."""
    
    async def calculate(
        self,
        dimension_scores: Dict[str, float],
        entity: TrustEntity,
        events: List[TrustEvent],
    ) -> float:
        # Legal score emphasizes source verification and compliance
        weights = {
            "source": 0.25,
            "temporal": 0.15,
            "channel": 0.20,
            "outcome": 0.15,
            "network": 0.10,
            "justice": 0.15,
        }
        
        base_score = sum(
            dimension_scores[dim] * weight 
            for dim, weight in weights.items()
        )
        
        # Bonus for compliance events
        compliance_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "compliance", "regulatory", "audit_passed", "certification"
            ])
        ]
        compliance_bonus = min(len(compliance_events) * 3, 15)
        
        # Severe penalty for legal violations
        violation_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "violation", "breach", "illegal", "sanctioned"
            ])
        ]
        violation_penalty = len(violation_events) * 10
        
        # Bonus for proper documentation
        if entity.credentials:
            doc_score = min(len(entity.credentials) * 2, 10)
        else:
            doc_score = 0
        
        return max(0, min(
            base_score + compliance_bonus + doc_score - violation_penalty, 100
        ))


class StateScore(OutputScore):
    """Authority approval and institutional trust score."""
    
    async def calculate(
        self,
        dimension_scores: Dict[str, float],
        entity: TrustEntity,
        events: List[TrustEvent],
    ) -> float:
        # State score heavily weights source verification and channels
        weights = {
            "source": 0.30,
            "temporal": 0.15,
            "channel": 0.25,
            "outcome": 0.10,
            "network": 0.10,
            "justice": 0.10,
        }
        
        base_score = sum(
            dimension_scores[dim] * weight 
            for dim, weight in weights.items()
        )
        
        # Major bonus for government verification
        gov_credentials = [
            c for c in entity.credentials 
            if c.type == "government_id" and c.verification_status == "verified"
        ]
        gov_bonus = len(gov_credentials) * 15
        
        # Bonus for institutional relationships
        institutional_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "government", "institutional", "official", "licensed"
            ])
        ]
        inst_bonus = min(len(institutional_events) * 2, 10)
        
        # Penalty for anti-establishment activities
        anti_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "protest", "dissent", "whistleblower", "activist"
            ])
        ]
        # Note: Lower penalty as these may be legitimate
        anti_penalty = len(anti_events) * 2
        
        return max(0, min(
            base_score + gov_bonus + inst_bonus - anti_penalty, 100
        ))


class ChittyScore(OutputScore):
    """Justice + outcomes focused score - the true measure."""
    
    async def calculate(
        self,
        dimension_scores: Dict[str, float],
        entity: TrustEntity,
        events: List[TrustEvent],
    ) -> float:
        # Chitty score prioritizes justice and real outcomes
        weights = {
            "source": 0.10,
            "temporal": 0.10,
            "channel": 0.10,
            "outcome": 0.25,
            "network": 0.15,
            "justice": 0.30,
        }
        
        base_score = sum(
            dimension_scores[dim] * weight 
            for dim, weight in weights.items()
        )
        
        # Major bonus for justice-aligned actions
        justice_events = [
            e for e in events 
            if e.tags and any(tag in e.tags for tag in [
                "justice", "fairness", "helped_vulnerable", "truth_telling",
                "accountability", "reparation", "reform"
            ])
        ]
        justice_bonus = min(len(justice_events) * 4, 20)
        
        # Bonus for positive real-world impact
        impact_events = [
            e for e in events 
            if e.outcome == "positive" and e.impact_score > 5
        ]
        impact_bonus = min(sum(e.impact_score for e in impact_events) / 10, 15)
        
        # Penalty reduced for "rebel with a cause"
        violation_events = [
            e for e in events 
            if e.tags and "violation" in e.tags
        ]
        # Check if violations were for justice
        justice_violations = [
            e for e in violation_events
            if any(tag in e.tags for tag in ["civil_disobedience", "whistleblower"])
        ]
        
        # Regular violations get full penalty, justice violations get reduced
        regular_violations = len(violation_events) - len(justice_violations)
        violation_penalty = regular_violations * 5 + len(justice_violations) * 1
        
        # Easter egg: "Shitty to Chitty" transformation bonus
        transformation_events = [
            e for e in events 
            if e.tags and "transformation" in e.tags
        ]
        if transformation_events:
            transformation_bonus = 10
        else:
            transformation_bonus = 0
        
        return max(0, min(
            base_score + justice_bonus + impact_bonus + transformation_bonus - violation_penalty, 
            100
        ))