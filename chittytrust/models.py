"""
ChittyID Verification Marketplace Models
Database models for verification marketplace and historical trust tracking
"""
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import json

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class User(db.Model):
    """User model integrated with Clerk authentication"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(255), primary_key=True)  # Clerk user ID
    email = db.Column(db.String(255), unique=True, nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    profile_image_url = db.Column(db.String(500))
    
    # ChittyID specific fields
    chitty_id = db.Column(db.String(50), unique=True, nullable=True)
    verification_level = db.Column(db.String(20), default='L0')  # L0-L4
    trust_score = db.Column(db.Float, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    verification_requests = db.relationship('VerificationRequest', foreign_keys='VerificationRequest.user_id', backref='user', lazy=True)
    trust_history = db.relationship('TrustHistory', backref='user', lazy=True)
    verifier_requests = db.relationship('VerificationRequest', foreign_keys='VerificationRequest.verifier_id', backref='verifier', lazy=True)

class VerificationRequest(db.Model):
    """Verification requests in the marketplace"""
    __tablename__ = 'verification_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    verifier_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=True)
    
    # Request details
    verification_type = db.Column(db.String(50), nullable=False)  # identity, document, skill, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    reward_amount = db.Column(db.Float, nullable=False)  # In ChittyCoins or USD
    
    # Evidence and documents
    evidence_urls = db.Column(db.Text)  # JSON array of document URLs
    verification_criteria = db.Column(db.Text)  # JSON object with criteria
    
    # Status tracking
    status = db.Column(db.String(20), default='open')  # open, claimed, in_progress, completed, disputed
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, urgent
    
    # Timing
    deadline = db.Column(db.DateTime)
    claimed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_evidence_urls(self):
        return json.loads(self.evidence_urls) if self.evidence_urls else []
    
    def set_evidence_urls(self, urls):
        self.evidence_urls = json.dumps(urls)
    
    def get_verification_criteria(self):
        return json.loads(self.verification_criteria) if self.verification_criteria else {}
    
    def set_verification_criteria(self, criteria):
        self.verification_criteria = json.dumps(criteria)

class VerificationResult(db.Model):
    """Results of verification processes"""
    __tablename__ = 'verification_results'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('verification_requests.id'), nullable=False)
    
    # Verification outcome
    result = db.Column(db.String(20), nullable=False)  # verified, rejected, needs_more_info
    confidence_score = db.Column(db.Float)  # 0.0 to 1.0
    trust_impact = db.Column(db.Float)  # Impact on trust score
    
    # Verification details
    verification_method = db.Column(db.String(100))
    evidence_reviewed = db.Column(db.Text)  # JSON array
    verification_notes = db.Column(db.Text)
    
    # Quality metrics
    verification_quality = db.Column(db.Float)  # Quality of verification work
    user_satisfaction = db.Column(db.Integer)  # 1-5 rating from user
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    request = db.relationship('VerificationRequest', backref='result', lazy=True)

class TrustHistory(db.Model):
    """Historical trust tracking per dimension"""
    __tablename__ = 'trust_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    
    # Trust dimensions (6D ChittyOS Trust Engine)
    source_trust = db.Column(db.Float, nullable=False)
    temporal_trust = db.Column(db.Float, nullable=False)
    channel_trust = db.Column(db.Float, nullable=False)
    outcome_trust = db.Column(db.Float, nullable=False)
    network_trust = db.Column(db.Float, nullable=False)
    justice_trust = db.Column(db.Float, nullable=False)
    
    # Composite scores
    composite_score = db.Column(db.Float, nullable=False)
    people_score = db.Column(db.Float, nullable=False)
    legal_score = db.Column(db.Float, nullable=False)
    state_score = db.Column(db.Float, nullable=False)
    chitty_score = db.Column(db.Float, nullable=False)
    
    # Context
    trigger_event = db.Column(db.String(100))  # What caused this trust update
    verification_id = db.Column(db.Integer, db.ForeignKey('verification_requests.id'), nullable=True)
    
    # Metadata
    confidence_level = db.Column(db.Float)
    calculation_method = db.Column(db.String(50))
    
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

class VerifierProfile(db.Model):
    """Verifier marketplace profiles"""
    __tablename__ = 'verifier_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    
    # Verifier credentials
    specializations = db.Column(db.Text)  # JSON array of specialization areas
    certifications = db.Column(db.Text)  # JSON array of certifications
    bio = db.Column(db.Text)
    
    # Performance metrics
    verification_count = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    average_quality_score = db.Column(db.Float, default=0.0)
    response_time_hours = db.Column(db.Float)
    
    # Marketplace settings
    is_active = db.Column(db.Boolean, default=True)
    hourly_rate = db.Column(db.Float)
    minimum_reward = db.Column(db.Float, default=10.0)
    maximum_concurrent = db.Column(db.Integer, default=5)
    
    # Trust-specific
    verifier_trust_level = db.Column(db.String(10), default='L1')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='verifier_profile', lazy=True)
    
    def get_specializations(self):
        return json.loads(self.specializations) if self.specializations else []
    
    def set_specializations(self, specs):
        self.specializations = json.dumps(specs)
    
    def get_certifications(self):
        return json.loads(self.certifications) if self.certifications else []
    
    def set_certifications(self, certs):
        self.certifications = json.dumps(certs)

class ChittyCoin(db.Model):
    """ChittyCoin transactions for marketplace rewards"""
    __tablename__ = 'chitty_coins'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    
    # Transaction details
    transaction_type = db.Column(db.String(50), nullable=False)  # earned, spent, bonus, penalty
    amount = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float, nullable=False)
    
    # Context
    verification_id = db.Column(db.Integer, db.ForeignKey('verification_requests.id'), nullable=True)
    description = db.Column(db.String(200))
    
    # Metadata
    transaction_hash = db.Column(db.String(100))  # For blockchain integration
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='coin_transactions', lazy=True)
    verification = db.relationship('VerificationRequest', backref='coin_transactions', lazy=True)