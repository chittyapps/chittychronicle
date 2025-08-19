# ✅ VERIFIED
"""
Tests for core trust engine functionality.
"""

import pytest
from datetime import datetime, timedelta
from chitty_trust import (
    TrustEngine, 
    TrustEntity, 
    TrustEvent, 
    calculate_trust,
    Credential,
    Connection
)
from chitty_trust.models import CredentialType, EventType, Outcome


@pytest.fixture
def sample_entity():
    """Create a sample entity for testing."""
    return TrustEntity(
        id="test_user_1",
        entity_type="person",
        name="Test User",
        created_at=datetime.utcnow() - timedelta(days=365),
        identity_verified=True,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="DMV",
                issued_at=datetime.utcnow() - timedelta(days=180),
                verification_status="verified"
            )
        ],
        connections=[
            Connection(
                entity_id="friend_1",
                connection_type="friend",
                established_at=datetime.utcnow() - timedelta(days=90),
                trust_score=85.0,
                interaction_count=50
            )
        ],
        transparency_level=0.8
    )


@pytest.fixture
def sample_events():
    """Create sample trust events."""
    base_time = datetime.utcnow()
    return [
        TrustEvent(
            id="evt_1",
            entity_id="test_user_1",
            event_type=EventType.TRANSACTION,
            timestamp=base_time - timedelta(days=30),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=7.5,
            tags=["community_impact", "transparency"]
        ),
        TrustEvent(
            id="evt_2",
            entity_id="test_user_1",
            event_type=EventType.ENDORSEMENT,
            timestamp=base_time - timedelta(days=15),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=5.0,
            tags=["professional"]
        ),
        TrustEvent(
            id="evt_3",
            entity_id="test_user_1",
            event_type=EventType.COLLABORATION,
            timestamp=base_time - timedelta(days=7),
            channel="bank_transfer",
            outcome=Outcome.POSITIVE,
            impact_score=8.0,
            tags=["justice", "fairness"]
        ),
    ]


@pytest.mark.asyncio
async def test_trust_engine_initialization():
    """Test that trust engine initializes properly."""
    engine = TrustEngine()
    assert engine.source_dim is not None
    assert engine.temporal_dim is not None
    assert engine.channel_dim is not None
    assert engine.outcome_dim is not None
    assert engine.network_dim is not None
    assert engine.justice_dim is not None


@pytest.mark.asyncio
async def test_calculate_trust_basic(sample_entity, sample_events):
    """Test basic trust calculation."""
    score = await calculate_trust(sample_entity, sample_events)
    
    assert score is not None
    assert 0 <= score.source_score <= 100
    assert 0 <= score.temporal_score <= 100
    assert 0 <= score.channel_score <= 100
    assert 0 <= score.outcome_score <= 100
    assert 0 <= score.network_score <= 100
    assert 0 <= score.justice_score <= 100
    
    assert 0 <= score.people_score <= 100
    assert 0 <= score.legal_score <= 100
    assert 0 <= score.state_score <= 100
    assert 0 <= score.chitty_score <= 100
    
    assert score.confidence > 0
    assert isinstance(score.explanation, dict)


@pytest.mark.asyncio
async def test_composite_score_calculation(sample_entity, sample_events):
    """Test that composite score is calculated correctly."""
    score = await calculate_trust(sample_entity, sample_events)
    
    # Manually calculate expected composite
    weights = {
        "source": 0.15,
        "temporal": 0.10,
        "channel": 0.15,
        "outcome": 0.20,
        "network": 0.15,
        "justice": 0.25,
    }
    
    expected = (
        score.source_score * weights["source"] +
        score.temporal_score * weights["temporal"] +
        score.channel_score * weights["channel"] +
        score.outcome_score * weights["outcome"] +
        score.network_score * weights["network"] +
        score.justice_score * weights["justice"]
    )
    
    assert abs(score.composite_score - expected) < 0.01


@pytest.mark.asyncio
async def test_trust_score_to_dict(sample_entity, sample_events):
    """Test trust score dictionary conversion."""
    score = await calculate_trust(sample_entity, sample_events)
    score_dict = score.to_dict()
    
    assert "dimensions" in score_dict
    assert "scores" in score_dict
    assert "metadata" in score_dict
    
    assert all(dim in score_dict["dimensions"] for dim in [
        "source", "temporal", "channel", "outcome", "network", "justice"
    ])
    
    assert all(s in score_dict["scores"] for s in [
        "people", "legal", "state", "chitty", "composite"
    ])


@pytest.mark.asyncio
async def test_empty_events():
    """Test handling of entity with no events."""
    entity = TrustEntity(
        id="new_user",
        entity_type="person",
        name="New User",
        created_at=datetime.utcnow(),
        identity_verified=False
    )
    
    score = await calculate_trust(entity, [])
    
    assert score is not None
    assert score.temporal_score == 0  # No events means no temporal score
    assert score.confidence < 0.5  # Low confidence with no data


@pytest.mark.asyncio
async def test_negative_events_impact():
    """Test that negative events properly impact scores."""
    entity = TrustEntity(
        id="mixed_user",
        entity_type="person",
        name="Mixed User",
        created_at=datetime.utcnow() - timedelta(days=180),
        identity_verified=True
    )
    
    events = [
        TrustEvent(
            id="pos_1",
            entity_id="mixed_user",
            event_type=EventType.TRANSACTION,
            timestamp=datetime.utcnow() - timedelta(days=30),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=5.0
        ),
        TrustEvent(
            id="neg_1",
            entity_id="mixed_user",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=15),
            channel="email",
            outcome=Outcome.NEGATIVE,
            impact_score=8.0,
            tags=["violation", "fraud"]
        ),
    ]
    
    score = await calculate_trust(entity, events)
    
    # Negative events should significantly impact scores
    assert score.outcome_score < 50
    assert score.people_score < 60  # Community trust affected
    assert score.legal_score < 40   # Legal compliance heavily affected


@pytest.mark.asyncio
async def test_transformation_bonus():
    """Test the 'Shitty to Chitty' transformation bonus."""
    entity = TrustEntity(
        id="transformed_user",
        entity_type="person",
        name="Transformed User",
        created_at=datetime.utcnow() - timedelta(days=730),
        identity_verified=True
    )
    
    events = [
        # Early negative behavior
        TrustEvent(
            id="old_neg",
            entity_id="transformed_user",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=600),
            channel="anonymous",
            outcome=Outcome.NEGATIVE,
            impact_score=5.0
        ),
        # Transformation event
        TrustEvent(
            id="transform",
            entity_id="transformed_user",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=365),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=10.0,
            tags=["transformation", "redemption"]
        ),
        # Recent positive behavior
        TrustEvent(
            id="new_pos",
            entity_id="transformed_user",
            event_type=EventType.COLLABORATION,
            timestamp=datetime.utcnow() - timedelta(days=30),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=8.0,
            tags=["justice", "community_impact"]
        ),
    ]
    
    score = await calculate_trust(entity, events)
    
    # Should have higher Chitty Score due to transformation
    assert score.chitty_score > 60  # Despite early negative behavior