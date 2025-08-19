# ✅ VERIFIED
#!/usr/bin/env python3
"""
Example usage of the ChittyOS Trust Engine.

Run this script to see the trust engine in action with sample data.
"""

import asyncio
from datetime import datetime, timedelta
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from chitty_trust import (
    calculate_trust,
    TrustEntity,
    TrustEvent,
    Credential,
    Connection,
)
from chitty_trust.models import CredentialType, EventType, Outcome

console = Console()


async def main():
    console.print(Panel.fit("🏛️ ChittyOS Trust Engine Demo", style="bold magenta"))
    
    # Create three different personas to demonstrate scoring
    personas = await create_personas()
    
    for persona_name, entity, events in personas:
        console.print(f"\n[bold cyan]Calculating trust for: {persona_name}[/bold cyan]")
        
        # Calculate trust score
        trust_score = await calculate_trust(entity, events)
        
        # Display results
        display_trust_score(trust_score, persona_name)
        
        # Show explanation
        console.print("\n[yellow]Score Explanations:[/yellow]")
        for dimension, explanation in trust_score.explanation.items():
            console.print(f"  • {dimension.capitalize()}: {explanation}")
        
        console.print("\n" + "─" * 80)


async def create_personas():
    """Create three different personas with varying trust profiles."""
    
    # Persona 1: High Trust Community Leader
    alice = TrustEntity(
        id="alice_123",
        entity_type="person",
        name="Alice Community",
        created_at=datetime.utcnow() - timedelta(days=1095),  # 3 years
        identity_verified=True,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State DMV",
                issued_at=datetime.utcnow() - timedelta(days=365),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.PROFESSIONAL,
                issuer="Community Leadership Institute",
                issued_at=datetime.utcnow() - timedelta(days=180),
                verification_status="verified"
            ),
        ],
        connections=[
            Connection(
                entity_id=f"friend_{i}",
                connection_type="community_member",
                established_at=datetime.utcnow() - timedelta(days=365-i*30),
                trust_score=85 + i,
                interaction_count=100 + i*10
            )
            for i in range(5)
        ],
        transparency_level=0.95
    )
    
    alice_events = [
        TrustEvent(
            id=f"alice_evt_{i}",
            entity_id="alice_123",
            event_type=EventType.COLLABORATION,
            timestamp=datetime.utcnow() - timedelta(days=30*i),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=8.0,
            tags=["community_impact", "justice", "transparency"]
        )
        for i in range(10)
    ] + [
        TrustEvent(
            id="alice_volunteer",
            entity_id="alice_123",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=60),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=10.0,
            tags=["volunteer", "charity", "helped_vulnerable"]
        )
    ]
    
    # Persona 2: Mixed History Business Owner
    bob = TrustEntity(
        id="bob_456",
        entity_type="person",
        name="Bob Business",
        created_at=datetime.utcnow() - timedelta(days=730),  # 2 years
        identity_verified=True,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State DMV",
                issued_at=datetime.utcnow() - timedelta(days=400),
                verification_status="verified"
            ),
        ],
        connections=[
            Connection(
                entity_id=f"client_{i}",
                connection_type="business",
                established_at=datetime.utcnow() - timedelta(days=200-i*20),
                trust_score=70 + i*2,
                interaction_count=20 + i*5
            )
            for i in range(3)
        ],
        transparency_level=0.6
    )
    
    bob_events = [
        # Some positive transactions
        TrustEvent(
            id=f"bob_pos_{i}",
            entity_id="bob_456",
            event_type=EventType.TRANSACTION,
            timestamp=datetime.utcnow() - timedelta(days=60+i*15),
            channel="credit_card",
            outcome=Outcome.POSITIVE,
            impact_score=5.0
        )
        for i in range(5)
    ] + [
        # A dispute that was resolved
        TrustEvent(
            id="bob_dispute",
            entity_id="bob_456",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=120),
            channel="email",
            outcome=Outcome.NEGATIVE,
            impact_score=7.0,
            tags=["violation"]
        ),
        TrustEvent(
            id="bob_resolution",
            entity_id="bob_456",
            event_type=EventType.DISPUTE_RESOLUTION,
            timestamp=datetime.utcnow() - timedelta(days=100),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=6.0,
            tags=["accountability", "reparation"]
        ),
    ]
    
    # Persona 3: Transformation Story
    charlie = TrustEntity(
        id="charlie_789",
        entity_type="person",
        name="Charlie Changed",
        created_at=datetime.utcnow() - timedelta(days=1460),  # 4 years
        identity_verified=True,
        credentials=[
            Credential(
                type=CredentialType.GOVERNMENT_ID,
                issuer="State DMV",
                issued_at=datetime.utcnow() - timedelta(days=1000),
                verification_status="verified"
            ),
            Credential(
                type=CredentialType.EDUCATIONAL,
                issuer="Reform University",
                issued_at=datetime.utcnow() - timedelta(days=365),
                verification_status="verified"
            ),
        ],
        connections=[
            Connection(
                entity_id="mentor_1",
                connection_type="mentor",
                established_at=datetime.utcnow() - timedelta(days=730),
                trust_score=95.0,
                interaction_count=200
            )
        ],
        transparency_level=0.85
    )
    
    charlie_events = [
        # Early negative behavior
        TrustEvent(
            id="charlie_old_neg_1",
            entity_id="charlie_789",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=1200),
            channel="anonymous",
            outcome=Outcome.NEGATIVE,
            impact_score=8.0,
            tags=["fraud"]
        ),
        TrustEvent(
            id="charlie_old_neg_2",
            entity_id="charlie_789",
            event_type=EventType.DISPUTE,
            timestamp=datetime.utcnow() - timedelta(days=1100),
            channel="anonymous",
            outcome=Outcome.NEGATIVE,
            impact_score=6.0,
            tags=["violation"]
        ),
        # Transformation moment
        TrustEvent(
            id="charlie_transform",
            entity_id="charlie_789",
            event_type=EventType.ACHIEVEMENT,
            timestamp=datetime.utcnow() - timedelta(days=730),
            channel="verified_api",
            outcome=Outcome.POSITIVE,
            impact_score=10.0,
            tags=["transformation", "redemption", "accountability"]
        ),
        # Recent positive behavior
    ] + [
        TrustEvent(
            id=f"charlie_new_pos_{i}",
            entity_id="charlie_789",
            event_type=EventType.COLLABORATION,
            timestamp=datetime.utcnow() - timedelta(days=60+i*30),
            channel="blockchain",
            outcome=Outcome.POSITIVE,
            impact_score=7.5,
            tags=["justice", "community_impact", "mentorship"]
        )
        for i in range(8)
    ]
    
    return [
        ("Alice Community (High Trust Leader)", alice, alice_events),
        ("Bob Business (Mixed History)", bob, bob_events),
        ("Charlie Changed (Transformation Story)", charlie, charlie_events),
    ]


def display_trust_score(trust_score, persona_name):
    """Display trust score in a formatted table."""
    
    # Create dimension scores table
    dim_table = Table(title="6D Trust Dimensions", show_header=True)
    dim_table.add_column("Dimension", style="cyan")
    dim_table.add_column("Score", justify="right", style="green")
    
    dim_table.add_row("Source (Who)", f"{trust_score.source_score:.1f}")
    dim_table.add_row("Temporal (When)", f"{trust_score.temporal_score:.1f}")
    dim_table.add_row("Channel (How)", f"{trust_score.channel_score:.1f}")
    dim_table.add_row("Outcome (Results)", f"{trust_score.outcome_score:.1f}")
    dim_table.add_row("Network (Connections)", f"{trust_score.network_score:.1f}")
    dim_table.add_row("Justice (Impact)", f"{trust_score.justice_score:.1f}")
    
    # Create output scores table
    out_table = Table(title="Output Scores", show_header=True)
    out_table.add_column("Score Type", style="cyan")
    out_table.add_column("Value", justify="right", style="green")
    out_table.add_column("Description", style="yellow")
    
    out_table.add_row(
        "People's Score", 
        f"{trust_score.people_score:.1f}",
        "Community trust"
    )
    out_table.add_row(
        "Legal Score", 
        f"{trust_score.legal_score:.1f}",
        "Compliance & verification"
    )
    out_table.add_row(
        "State Score", 
        f"{trust_score.state_score:.1f}",
        "Institutional approval"
    )
    out_table.add_row(
        "Chitty Score™", 
        f"{trust_score.chitty_score:.1f}",
        "Justice + outcomes (true measure)"
    )
    out_table.add_row(
        "Composite", 
        f"{trust_score.composite_score:.1f}",
        "Weighted average"
    )
    
    # Display tables side by side
    console.print("\n", dim_table)
    console.print("\n", out_table)
    console.print(f"\n[bold]Confidence Level:[/bold] {trust_score.confidence:.1%}")


if __name__ == "__main__":
    asyncio.run(main())