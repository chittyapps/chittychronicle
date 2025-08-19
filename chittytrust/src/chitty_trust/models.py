"""
Data models for trust entities and events.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class CredentialType(str, Enum):
    """Types of credentials."""
    GOVERNMENT_ID = "government_id"
    PROFESSIONAL = "professional"
    EDUCATIONAL = "educational"
    FINANCIAL = "financial"
    SOCIAL = "social"
    BLOCKCHAIN = "blockchain"


class EventType(str, Enum):
    """Types of trust-affecting events."""
    TRANSACTION = "transaction"
    INTERACTION = "interaction"
    VERIFICATION = "verification"
    ENDORSEMENT = "endorsement"
    DISPUTE = "dispute"
    DISPUTE_RESOLUTION = "dispute_resolution"
    COLLABORATION = "collaboration"
    REVIEW = "review"
    ACHIEVEMENT = "achievement"


class Outcome(str, Enum):
    """Event outcome classifications."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    PENDING = "pending"


class Credential(BaseModel):
    """Credential information."""
    type: CredentialType
    issuer: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    verification_status: str = "unverified"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Connection(BaseModel):
    """Network connection information."""
    entity_id: str
    connection_type: str
    established_at: datetime
    trust_score: float = Field(ge=0, le=100)
    interaction_count: int = 0
    last_interaction: Optional[datetime] = None


class TrustEntity(BaseModel):
    """Entity whose trust is being calculated."""
    id: str
    entity_type: str  # person, organization, ai_agent
    name: str
    created_at: datetime
    identity_verified: bool = False
    credentials: List[Credential] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)
    transparency_level: float = Field(default=0.5, ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrustEvent(BaseModel):
    """Event that affects trust score."""
    id: str
    entity_id: str
    event_type: EventType
    timestamp: datetime
    channel: Optional[str] = None
    outcome: Outcome = Outcome.PENDING
    impact_score: float = Field(default=1.0, ge=0, le=10)
    related_entities: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def is_positive(self) -> bool:
        return self.outcome == Outcome.POSITIVE
    
    @property
    def is_negative(self) -> bool:
        return self.outcome == Outcome.NEGATIVE
    
    @property
    def is_resolved(self) -> bool:
        return self.outcome != Outcome.PENDING


class TrustRelation(BaseModel):
    """Relationship between entities affecting trust."""
    from_entity: str
    to_entity: str
    relation_type: str
    trust_impact: float = Field(ge=-1, le=1)
    established_at: datetime
    last_updated: datetime
    events: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
