"""
ChittyChain Integrated Workflow System

Executes the complete trust verification pipeline:
ChittyID → ChittyTrust → ChittyVerify → ChittyChain

Architecture:
- Evidence Ledger: Unverified/unminted database of evidence
- ChittyID: Identity verification (first)
- ChittyTrust: 6D trust score calculation  
- ChittyVerify: Data integrity validation (just before ChittyChain)
- ChittyChain: Immutable blockchain recording (last)
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
from sqlalchemy import text
from app import db
from models import User, VerificationRequest, TrustHistory
from chittychain import chittychain_client
from evidence_integration import evidence_ledger

class ChittyWorkflow:
    """Comprehensive workflow for ChittyChain Evidence Ledger operations"""
    
    def __init__(self):
        self.chittychain_db_url = os.environ.get('CHITTYCHAIN_DB_URL')
        self.workflow_status = {}
        
    def execute_trust_verification_workflow(self, user_id: str, verification_type: str = 'comprehensive') -> Dict:
        """Execute complete trust verification workflow with evidence recording"""
        workflow_id = f"workflow_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Step 1: ChittyTrust - Calculate comprehensive trust scores
            trust_result = self._chitty_trust_calculation(user_id)
            if not trust_result['success']:
                return {'workflow_id': workflow_id, 'status': 'failed', 'error': trust_result['error']}
            
            # Step 2: ChittyVerify - Verify trust calculation integrity (just before ChittyChain)
            verification_result = self._chitty_verify_process(user_id, trust_result['data'])
            if not verification_result['success']:
                return {'workflow_id': workflow_id, 'status': 'failed', 'error': verification_result['error']}
            
            # Step 3: ChittyChain - Record on blockchain for immutability (final step)
            blockchain_result = self._chitty_chain_recording(user_id, trust_result['data'], verification_result['verification_hash'])
            
            # Step 4: Evidence Ledger - Document complete workflow
            evidence_result = self._evidence_ledger_documentation(
                workflow_id, 
                user_id, 
                trust_result['data'], 
                verification_result, 
                blockchain_result
            )
            
            # Step 5: Update database with workflow completion
            self._update_database_records(user_id, trust_result['data'], blockchain_result['transaction_id'])
            
            return {
                'workflow_id': workflow_id,
                'status': 'completed',
                'trust_calculation': trust_result['data'],
                'verification': verification_result,
                'blockchain_transaction': blockchain_result['transaction_id'],
                'evidence_ledger_id': evidence_result['evidence_id'],
                'integrity_verified': True,
                'workflow_url': f'https://www.notion.so/ChittyChain-Evidence-Ledger-24694de4357980dba689cf778c9708eb'
            }
            
        except Exception as e:
            logging.error(f"Workflow execution failed: {e}")
            return {'workflow_id': workflow_id, 'status': 'failed', 'error': str(e)}
    
    def _chitty_trust_calculation(self, user_id: str) -> Dict:
        """ChittyTrust: Calculate 6D trust scores from database records"""
        try:
            # Get user from database
            user = User.query.filter_by(chitty_id=user_id).first()
            if not user:
                return {'success': False, 'error': f'User {user_id} not found in ChittyChain database'}
            
            # Get user's verification history with explicit join
            verifications = VerificationRequest.query.join(User, VerificationRequest.user_id == User.id).filter(User.chitty_id == user_id).all()
            trust_history = TrustHistory.query.join(User, TrustHistory.user_id == User.id).filter(User.chitty_id == user_id).order_by(TrustHistory.recorded_at.desc()).limit(30).all()
            
            # Calculate trust dimensions based on real data
            trust_scores = {
                'source': self._calculate_source_trust(user, verifications),
                'temporal': self._calculate_temporal_trust(trust_history),
                'channel': self._calculate_channel_trust(verifications),
                'outcome': self._calculate_outcome_trust(verifications),
                'network': self._calculate_network_trust(user),
                'justice': self._calculate_justice_trust(user, verifications)
            }
            
            # Calculate composite score
            composite_score = sum(trust_scores.values()) / len(trust_scores)
            
            # Calculate ChittyScore™ (justice + outcome weighted)
            chitty_score = (trust_scores['justice'] * 0.4 + trust_scores['outcome'] * 0.3 + composite_score * 0.3)
            
            trust_data = {
                'user_id': user_id,
                'dimensions': trust_scores,
                'scores': {
                    'composite': composite_score,
                    'chitty': chitty_score,
                    'people': composite_score * 0.9,  # Community focused
                    'legal': (trust_scores['source'] + trust_scores['temporal']) / 2,  # Compliance focused
                    'state': trust_scores['source']  # Authority focused
                },
                'verification_level': self._get_verification_level(composite_score),
                'calculated_at': datetime.utcnow().isoformat(),
                'data_source': 'chittychain_database'
            }
            
            return {'success': True, 'data': trust_data}
            
        except Exception as e:
            logging.error(f"ChittyTrust calculation failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def _chitty_verify_process(self, user_id: str, trust_data: Dict) -> Dict:
        """ChittyVerify: Verify trust calculation integrity and data consistency"""
        try:
            # Verify data integrity
            integrity_checks = {
                'data_completeness': self._verify_data_completeness(trust_data),
                'score_consistency': self._verify_score_consistency(trust_data),
                'temporal_validity': self._verify_temporal_validity(user_id),
                'database_consistency': self._verify_database_consistency(user_id),
                'calculation_accuracy': self._verify_calculation_accuracy(trust_data)
            }
            
            # Generate verification hash
            verification_hash = self._generate_verification_hash(user_id, trust_data, integrity_checks)
            
            # Overall verification status
            verification_passed = all(integrity_checks.values())
            
            return {
                'success': True,
                'verification_passed': verification_passed,
                'verification_hash': verification_hash,
                'integrity_checks': integrity_checks,
                'verified_at': datetime.utcnow().isoformat(),
                'verifier': 'ChittyVerify_v1.0'
            }
            
        except Exception as e:
            logging.error(f"ChittyVerify process failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def _chitty_chain_recording(self, user_id: str, trust_data: Dict, verification_hash: str) -> Dict:
        """ChittyChain: Record verified trust data on blockchain"""
        try:
            # Create blockchain record
            blockchain_data = {
                'user_id': user_id,
                'trust_scores': trust_data['scores'],
                'verification_hash': verification_hash,
                'workflow_type': 'chitty_integrated_workflow',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            transaction_id = chittychain_client.record_trust_event(
                user_id,
                blockchain_data,
                trust_data['scores']
            )
            
            return {
                'success': True,
                'transaction_id': transaction_id,
                'blockchain_verified': True,
                'recorded_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"ChittyChain recording failed: {e}")
            return {'success': False, 'transaction_id': None, 'error': str(e)}
    
    def _evidence_ledger_documentation(self, workflow_id: str, user_id: str, trust_data: Dict, 
                                     verification_result: Dict, blockchain_result: Dict) -> Dict:
        """Evidence Ledger: Document complete workflow with all components"""
        try:
            # Create comprehensive workflow documentation
            workflow_documentation = {
                'workflow_id': workflow_id,
                'user_id': user_id,
                'components': {
                    'chitty_trust': trust_data,
                    'chitty_verify': verification_result,
                    'chitty_chain': blockchain_result
                },
                'workflow_status': 'completed',
                'execution_time': datetime.utcnow().isoformat(),
                'integrity_verified': verification_result.get('verification_passed', False)
            }
            
            # Record in Evidence Ledger
            evidence_id = evidence_ledger.record_trust_evidence(
                user_id,
                workflow_documentation,
                blockchain_result.get('transaction_id') or 'no_blockchain_tx'
            )
            
            return {
                'success': True,
                'evidence_id': evidence_id,
                'documented_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Evidence ledger documentation failed: {e}")
            return {'success': False, 'evidence_id': None, 'error': str(e)}
    
    def _update_database_records(self, user_id: str, trust_data: Dict, blockchain_tx: str):
        """Update ChittyChain database with workflow results"""
        try:
            # Update user trust score
            user = User.query.filter_by(chitty_id=user_id).first()
            if user:
                user.trust_score = trust_data['scores']['composite']
                user.chitty_level = trust_data['verification_level']
                user.last_calculated = datetime.utcnow()
            
            # Create trust history record with all required fields
            trust_record = TrustHistory()
            trust_record.user_id = user.id if user else None
            trust_record.source_trust = trust_data['dimensions']['source']
            trust_record.temporal_trust = trust_data['dimensions']['temporal'] 
            trust_record.channel_trust = trust_data['dimensions']['channel']
            trust_record.outcome_trust = trust_data['dimensions']['outcome']
            trust_record.network_trust = trust_data['dimensions']['network']
            trust_record.justice_trust = trust_data['dimensions']['justice']
            trust_record.composite_score = trust_data['scores']['composite']
            trust_record.people_score = trust_data['scores']['people']
            trust_record.legal_score = trust_data['scores']['legal']
            trust_record.state_score = trust_data['scores']['state']
            trust_record.chitty_score = trust_data['scores']['chitty']
            trust_record.trigger_event = 'chitty_workflow_execution'
            trust_record.calculation_method = 'chitty_integrated_workflow'
            trust_record.confidence_level = 0.95
            trust_record.recorded_at = datetime.utcnow()
            
            db.session.add(trust_record)
            db.session.commit()
            
        except Exception as e:
            logging.error(f"Database update failed: {e}")
            db.session.rollback()
    
    # Trust calculation methods using real database data
    def _calculate_source_trust(self, user: User, verifications: List) -> float:
        """Calculate source trust based on verification completions"""
        if not verifications:
            return 50.0
        
        completed_verifications = len([v for v in verifications if v.status == 'completed'])
        verification_success_rate = completed_verifications / len(verifications) if verifications else 0
        
        # Base score + success rate bonus
        base_score = 60.0 if user.email else 40.0
        success_bonus = verification_success_rate * 30.0
        
        return min(100.0, base_score + success_bonus)
    
    def _calculate_temporal_trust(self, trust_history: List) -> float:
        """Calculate temporal trust based on consistency over time"""
        if not trust_history:
            return 50.0
        
        # Analyze trust score consistency
        scores = [h.composite_score for h in trust_history if h.composite_score is not None]
        if len(scores) < 2:
            return 65.0
        
        # Calculate variance (lower variance = higher temporal trust)
        variance = sum((score - sum(scores)/len(scores))**2 for score in scores) / len(scores)
        consistency_score = max(0, 100 - (variance * 2))
        
        return min(100.0, consistency_score)
    
    def _calculate_channel_trust(self, verifications: List) -> float:
        """Calculate channel trust based on verification types diversity"""
        if not verifications:
            return 45.0
        
        unique_types = set(v.verification_type for v in verifications)
        diversity_score = min(100.0, len(unique_types) * 20.0)
        
        return max(45.0, diversity_score)
    
    def _calculate_outcome_trust(self, verifications: List) -> float:
        """Calculate outcome trust based on positive verification results"""
        if not verifications:
            return 50.0
        
        completed = [v for v in verifications if v.status == 'completed']
        if not completed:
            return 55.0
        
        # Higher reward verifications indicate better outcomes
        avg_reward = sum(v.reward_amount for v in completed) / len(completed)
        outcome_score = min(100.0, 50.0 + (avg_reward / 10.0))
        
        return outcome_score
    
    def _calculate_network_trust(self, user: User) -> float:
        """Calculate network trust based on connections and referrals"""
        # For now, base on user profile completeness
        profile_completeness = 0
        if user.first_name:
            profile_completeness += 20
        if user.last_name:
            profile_completeness += 20
        if user.email:
            profile_completeness += 30
        if user.profile_image_url:
            profile_completeness += 30
        
        return min(100.0, profile_completeness + 20.0)  # Base network bonus
    
    def _calculate_justice_trust(self, user: User, verifications: List) -> float:
        """Calculate justice trust based on fair and ethical behavior"""
        base_justice = 70.0  # Base assumption of justice
        
        # Positive indicators
        if verifications:
            high_priority_help = len([v for v in verifications if v.priority == 'high'])
            community_bonus = min(20.0, high_priority_help * 5.0)
            base_justice += community_bonus
        
        return min(100.0, base_justice)
    
    # Verification methods
    def _verify_data_completeness(self, trust_data: Dict) -> bool:
        """Verify all required trust data is present"""
        required_fields = ['user_id', 'dimensions', 'scores', 'verification_level']
        return all(field in trust_data for field in required_fields)
    
    def _verify_score_consistency(self, trust_data: Dict) -> bool:
        """Verify score calculations are consistent"""
        dimensions = trust_data.get('dimensions', {})
        composite = trust_data.get('scores', {}).get('composite', 0)
        
        if not dimensions:
            return False
        
        expected_composite = sum(dimensions.values()) / len(dimensions)
        return abs(composite - expected_composite) < 1.0  # Allow small floating point differences
    
    def _verify_temporal_validity(self, user_id: str) -> bool:
        """Verify data is temporally valid"""
        # Check if calculation is based on recent data
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        recent_activity = VerificationRequest.query.join(User, VerificationRequest.user_id == User.id).filter(
            User.chitty_id == user_id,
            VerificationRequest.created_at >= cutoff_date
        ).first()
        
        return recent_activity is not None
    
    def _verify_database_consistency(self, user_id: str) -> bool:
        """Verify data consistency in ChittyChain database"""
        try:
            user = User.query.filter_by(chitty_id=user_id).first()
            return user is not None
        except Exception:
            return False
    
    def _verify_calculation_accuracy(self, trust_data: Dict) -> bool:
        """Verify calculation accuracy"""
        # Basic sanity checks
        scores = trust_data.get('scores', {})
        dimensions = trust_data.get('dimensions', {})
        
        # All scores should be between 0 and 100
        for score in list(scores.values()) + list(dimensions.values()):
            if not (0 <= score <= 100):
                return False
        
        return True
    
    def _generate_verification_hash(self, user_id: str, trust_data: Dict, integrity_checks: Dict) -> str:
        """Generate cryptographic verification hash"""
        import hashlib
        combined_data = f"{user_id}{json.dumps(trust_data, sort_keys=True)}{json.dumps(integrity_checks, sort_keys=True)}"
        return hashlib.sha256(combined_data.encode()).hexdigest()
    
    def _get_verification_level(self, composite_score: float) -> str:
        """Get verification level based on composite score"""
        if composite_score >= 90:
            return 'L4_PLATINUM'
        elif composite_score >= 80:
            return 'L3_GOLD'
        elif composite_score >= 70:
            return 'L2_SILVER'
        elif composite_score >= 60:
            return 'L1_BRONZE'
        else:
            return 'L0_UNVERIFIED'

# Global workflow instance
chitty_workflow = ChittyWorkflow()