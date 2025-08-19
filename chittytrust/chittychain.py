"""
ChittyChain Blockchain Integration
Provides immutable trust record storage and cross-platform verification
"""
import os
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
import requests
import logging

class ChittyChainClient:
    """Client for ChittyChain blockchain trust verification"""
    
    def __init__(self):
        self.db_url = os.environ.get('CHITTYCHAIN_DB_URL')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ChittyTrust/1.0'
        })
        
    def record_trust_event(self, user_id: str, event_data: Dict, trust_scores: Dict) -> str:
        """Record a trust event on the blockchain"""
        try:
            # Create immutable trust record
            trust_record = {
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat(),
                'event_data': event_data,
                'trust_scores': trust_scores,
                'verification_hash': self._generate_verification_hash(user_id, event_data, trust_scores)
            }
            
            # For demo purposes, simulate blockchain storage
            # In production, this would interact with actual blockchain
            response = self._simulate_blockchain_write(trust_record)
            
            logging.info(f"Trust event recorded on ChittyChain: {response['transaction_id']}")
            return response['transaction_id']
            
        except Exception as e:
            logging.error(f"ChittyChain recording failed: {e}")
            return ""
    
    def verify_trust_record(self, transaction_id: str) -> Optional[Dict]:
        """Verify a trust record exists on the blockchain"""
        try:
            # Simulate blockchain read
            record = self._simulate_blockchain_read(transaction_id)
            
            if record and self._verify_record_integrity(record):
                return {
                    'verified': True,
                    'record': record,
                    'blockchain_confirmed': True,
                    'verification_time': datetime.utcnow().isoformat()
                }
            
            return {'verified': False, 'error': 'Record not found or corrupted'}
            
        except Exception as e:
            logging.error(f"ChittyChain verification failed: {e}")
            return {'verified': False, 'error': str(e)}
    
    def get_user_trust_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get complete trust history for a user from blockchain"""
        try:
            # Simulate blockchain query
            records = self._simulate_blockchain_query(user_id, limit)
            
            return [{
                'transaction_id': record['transaction_id'],
                'timestamp': record['timestamp'],
                'trust_scores': record['trust_scores'],
                'verification_status': 'blockchain_verified',
                'immutable': True
            } for record in records]
            
        except Exception as e:
            logging.error(f"ChittyChain history query failed: {e}")
            return []
    
    def create_trust_passport(self, user_id: str) -> Dict:
        """Create a portable trust passport for cross-platform use"""
        try:
            # Get user's complete trust history
            history = self.get_user_trust_history(user_id)
            
            # Calculate aggregated trust metrics
            if not history:
                return {'error': 'No trust history found'}
            
            latest_scores = history[0]['trust_scores'] if history else {}
            
            passport = {
                'user_id': user_id,
                'passport_id': f"ctp_{hashlib.sha256(user_id.encode()).hexdigest()[:16]}",
                'issued_at': datetime.utcnow().isoformat(),
                'current_scores': latest_scores,
                'history_count': len(history),
                'verification_level': self._calculate_verification_level(latest_scores),
                'cross_platform_verified': True,
                'blockchain_anchor': history[0]['transaction_id'] if history else None,
                'validity_period': '1_year',
                'issuer': 'ChittyTrust_Certified'
            }
            
            # Record passport creation on blockchain
            passport_tx = self.record_trust_event(
                user_id, 
                {'event_type': 'passport_created', 'passport_data': passport},
                latest_scores
            )
            
            passport['blockchain_transaction'] = passport_tx
            
            return passport
            
        except Exception as e:
            logging.error(f"Trust passport creation failed: {e}")
            return {'error': str(e)}
    
    def _generate_verification_hash(self, user_id: str, event_data: Dict, trust_scores: Dict) -> str:
        """Generate verification hash for trust record integrity"""
        combined_data = f"{user_id}{json.dumps(event_data, sort_keys=True)}{json.dumps(trust_scores, sort_keys=True)}"
        return hashlib.sha256(combined_data.encode()).hexdigest()
    
    def _simulate_blockchain_write(self, record: Dict) -> Dict:
        """Simulate writing to blockchain (replace with actual blockchain API)"""
        transaction_id = f"ctx_{hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest()[:16]}"
        
        # In production, this would use actual blockchain API
        return {
            'transaction_id': transaction_id,
            'block_height': 12345,  # Demo data
            'confirmation_time': datetime.utcnow().isoformat(),
            'gas_used': 21000,  # Demo data
            'status': 'confirmed'
        }
    
    def _simulate_blockchain_read(self, transaction_id: str) -> Optional[Dict]:
        """Simulate reading from blockchain"""
        # In production, this would query actual blockchain
        return {
            'transaction_id': transaction_id,
            'timestamp': datetime.utcnow().isoformat(),
            'trust_scores': {
                'composite': 78.5,
                'source': 82.3,
                'temporal': 75.8,
                'outcome': 84.2,
                'justice': 91.7
            },
            'verified': True
        }
    
    def _simulate_blockchain_query(self, user_id: str, limit: int) -> List[Dict]:
        """Simulate querying blockchain for user records"""
        # In production, this would query actual blockchain
        records = []
        for i in range(min(limit, 10)):  # Demo: return up to 10 records
            records.append({
                'transaction_id': f"ctx_{user_id}_{i:04d}",
                'timestamp': datetime.utcnow().isoformat(),
                'trust_scores': {
                    'composite': 78.5 + (i * 0.5),
                    'source': 82.3,
                    'temporal': 75.8,
                    'outcome': 84.2,
                    'justice': 91.7
                }
            })
        return records
    
    def _verify_record_integrity(self, record: Dict) -> bool:
        """Verify the integrity of a blockchain record"""
        # In production, this would verify cryptographic signatures
        return True  # Demo: always return true
    
    def _calculate_verification_level(self, trust_scores: Dict) -> str:
        """Calculate verification level based on trust scores"""
        composite = trust_scores.get('composite', 0)
        
        if composite >= 90:
            return 'L4_PLATINUM'
        elif composite >= 80:
            return 'L3_GOLD'
        elif composite >= 70:
            return 'L2_SILVER'
        elif composite >= 60:
            return 'L1_BRONZE'
        else:
            return 'L0_UNVERIFIED'

# Global ChittyChain client instance
chittychain_client = ChittyChainClient()