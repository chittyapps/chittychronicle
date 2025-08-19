"""
Demo data for the three personas.
"""

from datetime import datetime, timedelta
from typing import Tuple, List, Optional
from src.chitty_trust.models import (
    TrustEntity, TrustEvent, Credential, Connection,
    CredentialType, EventType, Outcome
)


def get_persona_data(persona_id: str) -> Tuple[Optional[TrustEntity], List[TrustEvent]]:
    """Get entity and events for a specific persona."""
    if persona_id == 'alice':
        return create_alice_community()
    elif persona_id == 'bob':
        return create_bob_business()
    elif persona_id == 'charlie':
        return create_charlie_changed()
    else:
        return None, []


def create_alice_community() -> Tuple[TrustEntity, List[TrustEvent]]:
    """Alice Community: High-trust community leader."""
    
    # Create entity
    entity = TrustEntity(
        id="alice_community",
        entity_type="person",
        name="Alice Community",
        created_at=datetime.utcnow() - timedelta(days=1095),  # 3 years ago
        identity_verified=True,
        transparency_level=0.9,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State of Illinois",
                issued_at=datetime.utcnow() - timedelta(days=900),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.PROFESSIONAL,
                issuer="Community Leadership Certificate",
                issued_at=datetime.utcnow() - timedelta(days=600),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.EDUCATIONAL,
                issuer="University of Chicago",
                issued_at=datetime.utcnow() - timedelta(days=2000),
                verification_status="verified"
            )
        ],
        connections=[
            Connection(
                entity_id="nonprofit_org_1",
                connection_type="leadership",
                established_at=datetime.utcnow() - timedelta(days=800),
                trust_score=92.0,
                interaction_count=150
            ),
            Connection(
                entity_id="local_government",
                connection_type="civic_engagement",
                established_at=datetime.utcnow() - timedelta(days=600),
                trust_score=88.0,
                interaction_count=75
            ),
            Connection(
                entity_id="community_members",
                connection_type="community",
                established_at=datetime.utcnow() - timedelta(days=1000),
                trust_score=94.0,
                interaction_count=300
            )
        ]
    )
    
    # Create events
    events = [
        # Community impact events
        TrustEvent(
            id="alice_evt_1",
            entity_id="alice_community",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=30),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=8.5,
            tags=["community_impact", "justice", "helped_vulnerable"],
            metadata={"description": "Organized community food drive"}
        ),
        TrustEvent(
            id="alice_evt_2",
            entity_id="alice_community",
            event_type=EventType.COLLABORATION,
            timestamp=datetime.utcnow() - timedelta(days=60),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=7.2,
            tags=["transparency", "community_impact"],
            metadata={"description": "Led transparent budget planning"}
        ),
        TrustEvent(
            id="alice_evt_3",
            entity_id="alice_community",
            event_type=EventType.DISPUTE_RESOLUTION,
            timestamp=datetime.utcnow() - timedelta(days=90),
            channel="email",
            outcome=Outcome.POSITIVE,
            impact_score=6.8,
            tags=["justice", "fairness", "mediation"],
            metadata={"description": "Successfully mediated neighbor dispute"}
        ),
        TrustEvent(
            id="alice_evt_4",
            entity_id="alice_community",
            event_type=EventType.ENDORSEMENT,
            timestamp=datetime.utcnow() - timedelta(days=45),
            channel="social_media",
            outcome=Outcome.POSITIVE,
            impact_score=5.5,
            tags=["community", "endorsement"],
            metadata={"description": "Endorsed by community members"}
        ),
        TrustEvent(
            id="alice_evt_5",
            entity_id="alice_community",
            event_type=EventType.VERIFICATION,
            timestamp=datetime.utcnow() - timedelta(days=15),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=4.0,
            tags=["transparency", "accountability"],
            metadata={"description": "Background check completed"}
        )
    ]
    
    return entity, events


def create_bob_business() -> Tuple[TrustEntity, List[TrustEvent]]:
    """Bob Business: Mixed business history with dispute resolution."""
    
    entity = TrustEntity(
        id="bob_business",
        entity_type="person",
        name="Bob Business",
        created_at=datetime.utcnow() - timedelta(days=1800),  # 5 years ago
        identity_verified=True,
        transparency_level=0.6,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State of Illinois",
                issued_at=datetime.utcnow() - timedelta(days=1500),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.PROFESSIONAL,
                issuer="Illinois Business License",
                issued_at=datetime.utcnow() - timedelta(days=1200),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.FINANCIAL,
                issuer="Chase Bank",
                issued_at=datetime.utcnow() - timedelta(days=800),
                verification_status="verified"
            )
        ],
        connections=[
            Connection(
                entity_id="business_partner_1",
                connection_type="business",
                established_at=datetime.utcnow() - timedelta(days=1200),
                trust_score=75.0,
                interaction_count=200
            ),
            Connection(
                entity_id="customers",
                connection_type="commercial",
                established_at=datetime.utcnow() - timedelta(days=1500),
                trust_score=82.0,
                interaction_count=500
            ),
            Connection(
                entity_id="suppliers",
                connection_type="vendor",
                established_at=datetime.utcnow() - timedelta(days=1000),
                trust_score=68.0,
                interaction_count=150
            )
        ]
    )
    
    events = [
        # Mixed business history
        TrustEvent(
            id="bob_evt_1",
            entity_id="bob_business", 
            event_type=EventType.TRANSACTION,
            timestamp=datetime.utcnow() - timedelta(days=20),
            channel="bank_transfer",
            outcome=Outcome.POSITIVE,
            impact_score=6.0,
            tags=["business", "payment"],
            metadata={"description": "Successful large transaction"}
        ),
        TrustEvent(
            id="bob_evt_2",
            entity_id="bob_business",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=120),
            channel="email",
            outcome=Outcome.NEGATIVE,
            impact_score=3.0,
            tags=["dispute", "customer_service"],
            metadata={"description": "Customer complaint about delivery"}
        ),
        TrustEvent(
            id="bob_evt_3",
            entity_id="bob_business",
            event_type=EventType.DISPUTE_RESOLUTION,
            timestamp=datetime.utcnow() - timedelta(days=100),
            channel="phone",
            outcome=Outcome.POSITIVE,
            impact_score=7.5,
            tags=["resolution", "customer_satisfaction"],
            metadata={"description": "Successfully resolved dispute with refund"}
        ),
        TrustEvent(
            id="bob_evt_4",
            entity_id="bob_business",
            event_type=EventType.REVIEW,
            timestamp=datetime.utcnow() - timedelta(days=50),
            channel="social_media",
            outcome=Outcome.POSITIVE,
            impact_score=4.5,
            tags=["review", "reputation"],
            metadata={"description": "Positive customer review"}
        ),
        TrustEvent(
            id="bob_evt_5",
            entity_id="bob_business",
            event_type=EventType.VERIFICATION,
            timestamp=datetime.utcnow() - timedelta(days=200),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=5.0,
            tags=["compliance", "audit_passed"],
            metadata={"description": "Business license renewal"}
        )
    ]
    
    return entity, events


def create_charlie_changed() -> Tuple[TrustEntity, List[TrustEvent]]:
    """Charlie Changed: Transformation story - 'Shitty to Chitty'."""
    
    entity = TrustEntity(
        id="charlie_changed",
        entity_type="person", 
        name="Charlie Changed",
        created_at=datetime.utcnow() - timedelta(days=2190),  # 6 years ago
        identity_verified=True,
        transparency_level=0.8,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State of Illinois",
                issued_at=datetime.utcnow() - timedelta(days=2000),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.EDUCATIONAL,
                issuer="Community College Certificate",
                issued_at=datetime.utcnow() - timedelta(days=365),
                verification_status="verified"
            )
        ],
        connections=[
            Connection(
                entity_id="support_group",
                connection_type="recovery",
                established_at=datetime.utcnow() - timedelta(days=730),
                trust_score=85.0,
                interaction_count=100
            ),
            Connection(
                entity_id="mentor",
                connection_type="mentorship",
                established_at=datetime.utcnow() - timedelta(days=500),
                trust_score=90.0,
                interaction_count=50
            ),
            Connection(
                entity_id="employer",
                connection_type="employment",
                established_at=datetime.utcnow() - timedelta(days=400),
                trust_score=78.0,
                interaction_count=80
            )
        ]
    )
    
    events = [
        # Early negative period
        TrustEvent(
            id="charlie_evt_1",
            entity_id="charlie_changed",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=1800),
            channel="anonymous",
            outcome=Outcome.NEGATIVE,
            impact_score=2.0,
            tags=["violation", "past_mistakes"],
            metadata={"description": "Early dispute - learning period"}
        ),
        # Transformation begins
        TrustEvent(
            id="charlie_evt_2",
            entity_id="charlie_changed",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=730),
            channel="email",
            outcome=Outcome.POSITIVE,
            impact_score=6.0,
            tags=["transformation", "personal_growth"],
            metadata={"description": "Completed rehabilitation program"}
        ),
        # Positive growth
        TrustEvent(
            id="charlie_evt_3",
            entity_id="charlie_changed",
            event_type=EventType.COLLABORATION,
            timestamp=datetime.utcnow() - timedelta(days=400),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=7.0,
            tags=["community_impact", "helped_vulnerable", "mentoring"],
            metadata={"description": "Now mentoring others in recovery"}
        ),
        TrustEvent(
            id="charlie_evt_4",
            entity_id="charlie_changed",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=200),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=8.0,
            tags=["transformation", "justice", "accountability"],
            metadata={"description": "Speaking at transformation conferences"}
        ),
        TrustEvent(
            id="charlie_evt_5",
            entity_id="charlie_changed",
            event_type=EventType.ENDORSEMENT,
            timestamp=datetime.utcnow() - timedelta(days=100),
            channel="social_media",
            outcome=Outcome.POSITIVE,
            impact_score=5.5,
            tags=["community", "transformation", "inspiration"],
            metadata={"description": "Endorsed by community for positive change"}
        )
    ]
    
    return entity, events
