"""
ChittyID Verification Marketplace Logic
Core marketplace functionality for verification requests and historical tracking
"""
from datetime import datetime, timedelta
from sqlalchemy import desc, func
from models import db, User, VerificationRequest, TrustHistory, VerifierProfile, ChittyCoin
from src.chitty_trust import calculate_trust
from demo_data import get_persona_data
from chittychain import chittychain_client
from notion_integration import notion_integration
import asyncio
import json

class MarketplaceService:
    """Service class for marketplace operations"""
    
    @staticmethod
    def create_verification_request(user_id, request_data):
        """Create a new verification request"""
        request_obj = VerificationRequest()
        request_obj.user_id = user_id
        request_obj.verification_type = request_data['verification_type']
        request_obj.title = request_data['title']
        request_obj.description = request_data['description']
        request_obj.reward_amount = float(request_data['reward_amount'])
        request_obj.deadline = datetime.fromisoformat(request_data['deadline']) if request_data.get('deadline') else None
        request_obj.priority = request_data.get('priority', 'normal')
        
        if 'evidence_urls' in request_data:
            request_obj.set_evidence_urls(request_data['evidence_urls'])
        
        if 'verification_criteria' in request_data:
            request_obj.set_verification_criteria(request_data['verification_criteria'])
        
        db.session.add(request_obj)
        db.session.commit()
        return request_obj
    
    @staticmethod
    def get_marketplace_requests(limit=20, verification_type=None, status='open'):
        """Get available verification requests"""
        query = VerificationRequest.query.filter_by(status=status)
        
        if verification_type:
            query = query.filter_by(verification_type=verification_type)
        
        return query.order_by(desc(VerificationRequest.created_at)).limit(limit).all()
    
    @staticmethod
    def claim_verification_request(request_id, verifier_id):
        """Claim a verification request"""
        request_obj = VerificationRequest.query.get(request_id)
        if not request_obj or request_obj.status != 'open':
            return False, "Request not available"
        
        request_obj.verifier_id = verifier_id
        request_obj.status = 'claimed'
        request_obj.claimed_at = datetime.utcnow()
        
        db.session.commit()
        return True, "Request claimed successfully"
    
    @staticmethod
    def get_user_requests(user_id, include_completed=False):
        """Get user's verification requests"""
        query = VerificationRequest.query.filter_by(user_id=user_id)
        
        if not include_completed:
            query = query.filter(VerificationRequest.status.in_(['open', 'claimed', 'in_progress']))
        
        return query.order_by(desc(VerificationRequest.created_at)).all()
    
    @staticmethod
    def get_verifier_requests(verifier_id):
        """Get verifier's claimed requests"""
        return VerificationRequest.query.filter_by(verifier_id=verifier_id).order_by(desc(VerificationRequest.claimed_at)).all()

class TrustHistoryService:
    """Service for historical trust tracking"""
    
    @staticmethod
    def record_trust_snapshot(user_id, trust_data, trigger_event=None, verification_id=None):
        """Record a trust score snapshot"""
        history_entry = TrustHistory()
        history_entry.user_id = user_id
        history_entry.source_trust = trust_data['dimensions']['source']
        history_entry.temporal_trust = trust_data['dimensions']['temporal']
        history_entry.channel_trust = trust_data['dimensions']['channel']
        history_entry.outcome_trust = trust_data['dimensions']['outcome']
        history_entry.network_trust = trust_data['dimensions']['network']
        history_entry.justice_trust = trust_data['dimensions']['justice']
        history_entry.composite_score = trust_data['scores']['composite']
        history_entry.people_score = trust_data['scores']['people']
        history_entry.legal_score = trust_data['scores']['legal']
        history_entry.state_score = trust_data['scores']['state']
        history_entry.chitty_score = trust_data['scores']['chitty']
        history_entry.trigger_event = trigger_event
        history_entry.verification_id = verification_id
        history_entry.confidence_level = trust_data['metadata'].get('confidence', 0.5)
        history_entry.calculation_method = '6d_chitty_engine'
        
        db.session.add(history_entry)
        db.session.commit()
        return history_entry
    
    @staticmethod
    def get_trust_history(user_id, days_back=30, dimension=None):
        """Get trust history for a user"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        query = TrustHistory.query.filter(
            TrustHistory.user_id == user_id,
            TrustHistory.recorded_at >= cutoff_date
        ).order_by(TrustHistory.recorded_at)
        
        return query.all()
    
    @staticmethod
    def get_trust_trends(user_id, days_back=7):
        """Get trust trends for visualization"""
        history = TrustHistoryService.get_trust_history(user_id, days_back)
        
        if len(history) < 2:
            return {
                'trend': 'insufficient_data',
                'change': 0,
                'dimensions': {},
                'data_points': len(history)
            }
        
        latest = history[-1]
        earliest = history[0]
        
        dimension_changes = {
            'source': latest.source_trust - earliest.source_trust,
            'temporal': latest.temporal_trust - earliest.temporal_trust,
            'channel': latest.channel_trust - earliest.channel_trust,
            'outcome': latest.outcome_trust - earliest.outcome_trust,
            'network': latest.network_trust - earliest.network_trust,
            'justice': latest.justice_trust - earliest.justice_trust
        }
        
        composite_change = latest.composite_score - earliest.composite_score
        
        trend = 'stable'
        if composite_change > 5:
            trend = 'improving'
        elif composite_change < -5:
            trend = 'declining'
        
        return {
            'trend': trend,
            'change': composite_change,
            'dimensions': dimension_changes,
            'data_points': len(history),
            'time_range_days': days_back
        }
    
    @staticmethod
    async def calculate_and_record_trust(user_id, trigger_event=None, verification_id=None):
        """Calculate trust score and record in history"""
        # For demo purposes, use Alice's data as template
        # In production, this would use user's actual data
        entity, events = get_persona_data('alice')  # Placeholder
        if not entity:
            raise ValueError("Could not load demo data for trust calculation")
        
        # Calculate trust using our engine
        trust_score = await calculate_trust(entity, events)
        trust_data = trust_score.to_dict()
        
        # Record in history
        history_entry = TrustHistoryService.record_trust_snapshot(
            user_id, trust_data, trigger_event, verification_id
        )
        
        # Update user's current trust score
        user = User.query.get(user_id)
        if user:
            user.trust_score = trust_data['scores']['composite']
            user.verification_level = TrustHistoryService.get_trust_level(trust_data['scores']['composite'])
            db.session.commit()
        
        return trust_data, history_entry
    
    @staticmethod
    def get_trust_level(score):
        """Convert trust score to level"""
        if score >= 90:
            return 'L4'
        elif score >= 75:
            return 'L3'
        elif score >= 50:
            return 'L2'
        elif score >= 25:
            return 'L1'
        else:
            return 'L0'

class VerifierService:
    """Service for verifier management"""
    
    @staticmethod
    def create_verifier_profile(user_id, profile_data):
        """Create or update verifier profile"""
        profile = VerifierProfile.query.filter_by(user_id=user_id).first()
        
        if not profile:
            profile = VerifierProfile()
            profile.user_id = user_id
            db.session.add(profile)
        
        profile.bio = profile_data.get('bio', '')
        profile.hourly_rate = profile_data.get('hourly_rate')
        profile.minimum_reward = profile_data.get('minimum_reward', 10.0)
        profile.maximum_concurrent = profile_data.get('maximum_concurrent', 5)
        
        if 'specializations' in profile_data:
            profile.set_specializations(profile_data['specializations'])
        
        if 'certifications' in profile_data:
            profile.set_certifications(profile_data['certifications'])
        
        db.session.commit()
        return profile
    
    @staticmethod
    def get_available_verifiers(verification_type=None, min_rating=0.0):
        """Get available verifiers"""
        query = VerifierProfile.query.filter(
            VerifierProfile.is_active == True,
            VerifierProfile.average_rating >= min_rating
        )
        
        # Filter by specialization if verification type specified
        if verification_type:
            # This would need more sophisticated matching in production
            pass
        
        return query.order_by(desc(VerifierProfile.average_rating)).all()