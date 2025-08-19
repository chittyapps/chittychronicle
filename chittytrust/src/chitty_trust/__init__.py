"""
ChittyOS Trust Engine - 6D Trust Scoring System

Making power structures visible, justice measurable, and business processes antifragile.
"""

from .core import TrustEngine, TrustScore, calculate_trust
from .dimensions import (
    SourceDimension,
    TemporalDimension,
    ChannelDimension,
    OutcomeDimension,
    NetworkDimension,
    JusticeDimension,
)
from .models import TrustEntity, TrustEvent, TrustRelation
from .scores import PeopleScore, LegalScore, StateScore, ChittyScore

__version__ = "0.1.0"

__all__ = [
    "TrustEngine",
    "TrustScore",
    "calculate_trust",
    "SourceDimension",
    "TemporalDimension",
    "ChannelDimension",
    "OutcomeDimension",
    "NetworkDimension",
    "JusticeDimension",
    "TrustEntity",
    "TrustEvent",
    "TrustRelation",
    "PeopleScore",
    "LegalScore",
    "StateScore",
    "ChittyScore",
]
