"""
Sample Data for ChittyID Verification Marketplace
Creates sample users, verification requests, and trust history for demonstration
"""
from datetime import datetime, timedelta
import asyncio
from models import db, User, VerificationRequest, TrustHistory, VerifierProfile
from marketplace import TrustHistoryService
import random

def create_sample_users():
    """Create sample users with different trust levels"""
    users = [
        {
            'id': 'alice_demo_123',
            'email': 'alice@example.com',
            'first_name': 'Alice',
            'last_name': 'Community',
            'verification_level': 'L3',
            'trust_score': 78.5,
            'chitty_id': 'ALCE001'
        },
        {
            'id': 'bob_demo_456',
            'email': 'bob@example.com',
            'first_name': 'Bob',
            'last_name': 'Business',
            'verification_level': 'L2',
            'trust_score': 65.2,
            'chitty_id': 'BOBB002'
        },
        {
            'id': 'charlie_demo_789',
            'email': 'charlie@example.com', 
            'first_name': 'Charlie',
            'last_name': 'Changed',
            'verification_level': 'L1',
            'trust_score': 45.8,
            'chitty_id': 'CHRL003'
        },
        {
            'id': 'diana_demo_101',
            'email': 'diana@example.com',
            'first_name': 'Diana',
            'last_name': 'Developer',
            'verification_level': 'L4',
            'trust_score': 92.1,
            'chitty_id': 'DIAN004'
        }
    ]
    
    for user_data in users:
        existing_user = User.query.get(user_data['id'])
        if not existing_user:
            user = User()
            user.id = user_data['id']
            user.email = user_data['email']
            user.first_name = user_data['first_name']
            user.last_name = user_data['last_name']
            user.verification_level = user_data['verification_level']
            user.trust_score = user_data['trust_score']
            user.chitty_id = user_data['chitty_id']
            db.session.add(user)
    
    db.session.commit()
    print("Sample users created successfully")

def create_sample_verification_requests():
    """Create sample verification requests"""
    requests = [
        {
            'user_id': 'alice_demo_123',
            'verification_type': 'experience',
            'title': 'Verify Software Engineering Experience',
            'description': 'Need verification of 5+ years Python development experience with Django framework. Have references from previous employers and project portfolio.',
            'reward_amount': 75.0,
            'priority': 'high'
        },
        {
            'user_id': 'bob_demo_456',
            'verification_type': 'identity',
            'title': 'Identity Document Verification',
            'description': 'Verify government-issued ID and proof of address for KYC compliance. Documents ready for review.',
            'reward_amount': 25.0,
            'priority': 'urgent'
        },
        {
            'user_id': 'charlie_demo_789',
            'verification_type': 'document',
            'title': 'Academic Credential Verification',
            'description': 'Verify Master\'s degree in Computer Science from Stanford University. Digital copies of transcripts available.',
            'reward_amount': 50.0,
            'priority': 'normal'
        },
        {
            'user_id': 'alice_demo_123',
            'verification_type': 'skill',
            'title': 'Machine Learning Expertise Assessment',
            'description': 'Verify proficiency in ML algorithms, TensorFlow, and PyTorch. Can provide code samples and project demonstrations.',
            'reward_amount': 100.0,
            'priority': 'normal'
        },
        {
            'user_id': 'diana_demo_101',
            'verification_type': 'experience',
            'title': 'Leadership Experience Validation',
            'description': 'Verify 10+ years of team leadership and project management experience in tech industry.',
            'reward_amount': 80.0,
            'priority': 'low'
        }
    ]
    
    for req_data in requests:
        existing_req = VerificationRequest.query.filter_by(
            user_id=req_data['user_id'],
            title=req_data['title']
        ).first()
        
        if not existing_req:
            request_obj = VerificationRequest()
            request_obj.user_id = req_data['user_id']
            request_obj.verification_type = req_data['verification_type']
            request_obj.title = req_data['title']
            request_obj.description = req_data['description']
            request_obj.reward_amount = req_data['reward_amount']
            request_obj.priority = req_data['priority']
            request_obj.status = 'open'
            
            db.session.add(request_obj)
    
    db.session.commit()
    print("Sample verification requests created successfully")

def create_sample_trust_history():
    """Create sample trust history for users"""
    users = User.query.all()
    
    for user in users:
        # Create 30 days of trust history
        for i in range(30, 0, -1):
            date = datetime.utcnow() - timedelta(days=i)
            
            # Generate realistic trust scores with some variation
            base_score = user.trust_score or 50.0
            variation = random.uniform(-5, 5)
            composite_score = max(0, min(100, base_score + variation))
            
            # Generate dimensional scores that add up reasonably
            source = max(0, min(100, composite_score + random.uniform(-10, 10)))
            temporal = max(0, min(100, composite_score + random.uniform(-8, 8)))
            channel = max(0, min(100, composite_score + random.uniform(-12, 12)))
            outcome = max(0, min(100, composite_score + random.uniform(-7, 7)))
            network = max(0, min(100, composite_score + random.uniform(-15, 15)))
            justice = max(0, min(100, composite_score + random.uniform(-5, 5)))
            
            # Calculate output scores
            people_score = (outcome * 0.3 + justice * 0.3 + network * 0.2 + source * 0.2)
            legal_score = (source * 0.4 + temporal * 0.3 + channel * 0.3)
            state_score = (source * 0.5 + temporal * 0.2 + channel * 0.3)
            chitty_score = (justice * 0.4 + outcome * 0.3 + source * 0.3)
            
            # Determine trigger event
            trigger_events = ['daily_update', 'verification_completed', 'network_update', 'manual_calculation']
            trigger_event = random.choice(trigger_events) if i % 5 == 0 else 'daily_update'
            
            existing_history = TrustHistory.query.filter_by(
                user_id=user.id,
                recorded_at=date.replace(hour=12, minute=0, second=0, microsecond=0)
            ).first()
            
            if not existing_history:
                history = TrustHistory()
                history.user_id = user.id
                history.source_trust = source
                history.temporal_trust = temporal
                history.channel_trust = channel
                history.outcome_trust = outcome
                history.network_trust = network
                history.justice_trust = justice
                history.composite_score = composite_score
                history.people_score = people_score
                history.legal_score = legal_score
                history.state_score = state_score
                history.chitty_score = chitty_score
                history.trigger_event = trigger_event
                history.confidence_level = random.uniform(0.7, 0.95)
                history.calculation_method = '6d_chitty_engine'
                history.recorded_at = date.replace(hour=12, minute=0, second=0, microsecond=0)
                
                db.session.add(history)
    
    db.session.commit()
    print("Sample trust history created successfully")

def create_sample_verifier_profiles():
    """Create sample verifier profiles"""
    verifiers = [
        {
            'user_id': 'diana_demo_101',
            'specializations': ['identity', 'document', 'experience'],
            'bio': 'Experienced professional with 10+ years in identity verification and compliance.',
            'hourly_rate': 50.0,
            'minimum_reward': 20.0,
            'verifier_trust_level': 'L4'
        },
        {
            'user_id': 'alice_demo_123', 
            'specializations': ['skill', 'experience'],
            'bio': 'Software engineering expert specializing in technical skill assessment.',
            'hourly_rate': 40.0,
            'minimum_reward': 15.0,
            'verifier_trust_level': 'L3'
        }
    ]
    
    for verifier_data in verifiers:
        existing_profile = VerifierProfile.query.filter_by(user_id=verifier_data['user_id']).first()
        
        if not existing_profile:
            profile = VerifierProfile()
            profile.user_id = verifier_data['user_id']
            profile.bio = verifier_data['bio']
            profile.hourly_rate = verifier_data['hourly_rate']
            profile.minimum_reward = verifier_data['minimum_reward']
            profile.verifier_trust_level = verifier_data['verifier_trust_level']
            profile.verification_count = random.randint(10, 50)
            profile.average_rating = random.uniform(4.2, 4.9)
            profile.average_quality_score = random.uniform(0.8, 0.95)
            profile.set_specializations(verifier_data['specializations'])
            
            db.session.add(profile)
    
    db.session.commit()
    print("Sample verifier profiles created successfully")

def initialize_sample_data():
    """Initialize all sample data"""
    print("Initializing ChittyID Marketplace sample data...")
    
    create_sample_users()
    create_sample_verification_requests()
    create_sample_trust_history()
    create_sample_verifier_profiles()
    
    print("All sample data created successfully!")

if __name__ == '__main__':
    from app import app
    with app.app_context():
        initialize_sample_data()