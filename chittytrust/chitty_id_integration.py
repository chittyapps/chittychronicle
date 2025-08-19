"""
ChittyID Integration Module
Connects ChittyID identity verification with ChittyTrust scoring system
Ensures proper Chitty Score™ calculation and distribution
"""

import hashlib
import time
import uuid
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import requests
import logging

class ChittyIDGenerator:
    """ChittyID generation system with trust score integration"""
    
    def __init__(self):
        self.node_id = 1
        self.jurisdiction = "USA"
        self.trust_integration_enabled = True
        
    def generate_chitty_id(self, vertical: str = "user", user_data: Dict = None) -> Dict:
        """Generate ChittyID with integrated trust scoring capability"""
        
        # Generate base ChittyID components
        timestamp = int(time.time() * 1000)
        sequence = self._generate_sequence()
        vertical_code = self._get_vertical_code(vertical)
        
        # Create ChittyID structure: CH-YEAR-VER-SEQUENCE-CODE
        year = datetime.now().year
        chitty_id = f"CH-{year}-VER-{sequence}-{vertical_code}"
        
        # Initialize trust scoring components
        initial_trust_data = self._initialize_trust_profile(chitty_id, user_data)
        
        return {
            'chitty_id': chitty_id,
            'display_format': chitty_id,
            'timestamp': timestamp,
            'vertical': vertical,
            'node_id': self.node_id,
            'jurisdiction': self.jurisdiction,
            'trust_profile': initial_trust_data,
            'chitty_score_ready': True,
            'valid': True,
            'created_at': datetime.utcnow().isoformat()
        }
    
    def _generate_sequence(self) -> str:
        """Generate unique sequence for ChittyID"""
        random_part = str(uuid.uuid4()).replace('-', '')[:8].upper()
        node_part = f"{self.node_id:02d}"
        return f"{random_part[:4]}{node_part}"
    
    def _get_vertical_code(self, vertical: str) -> str:
        """Get vertical-specific code"""
        vertical_codes = {
            'user': 'A',
            'business': 'B',
            'organization': 'O',
            'government': 'G',
            'ai_agent': 'AI'
        }
        return vertical_codes.get(vertical, 'A')
    
    def _initialize_trust_profile(self, chitty_id: str, user_data: Optional[Dict] = None) -> Dict:
        """Initialize trust profile for new ChittyID"""
        
        base_profile = {
            'chitty_id': chitty_id,
            'verification_status': 'pending',
            'trust_dimensions': {
                'source': {'score': 0.0, 'status': 'unverified'},
                'temporal': {'score': 0.0, 'status': 'new'},
                'channel': {'score': 0.0, 'status': 'unverified'},
                'outcome': {'score': 0.0, 'status': 'no_history'},
                'network': {'score': 0.0, 'status': 'isolated'},
                'justice': {'score': 0.0, 'status': 'unknown'}
            },
            'trust_scores': {
                'peoples_score': 0.0,
                'legal_score': 0.0,
                'state_score': 0.0,
                'chitty_score': 0.0  # Our proprietary Chitty Score™
            },
            'verification_events': [],
            'trust_events': [],
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Apply initial verification data if provided
        if user_data is not None:
            base_profile = self._apply_initial_verification(base_profile, user_data)
        
        return base_profile

    def _apply_initial_verification(self, profile: Dict, user_data: Optional[Dict]) -> Dict:
        """Apply initial verification data to trust profile"""
        
        # Source dimension - Identity verification
        if user_data and user_data.get('identity_verified'):
            profile['trust_dimensions']['source']['score'] = 0.7
            profile['trust_dimensions']['source']['status'] = 'government_id_verified'
        
        # Update Chitty Score™ based on initial verification
        profile['trust_scores']['chitty_score'] = self._calculate_initial_chitty_score(profile)
        
        return profile

    def _calculate_initial_chitty_score(self, profile: Dict) -> float:
        """Calculate initial Chitty Score™ - Justice + Outcomes focused"""
        
        # Chitty Score™ emphasizes justice and outcomes
        justice_weight = 0.4
        outcome_weight = 0.3
        source_weight = 0.2
        other_weight = 0.1
        
        justice_score = profile['trust_dimensions']['justice']['score']
        outcome_score = profile['trust_dimensions']['outcome']['score']
        source_score = profile['trust_dimensions']['source']['score']
        
        # Average of remaining dimensions
        temporal_score = profile['trust_dimensions']['temporal']['score']
        channel_score = profile['trust_dimensions']['channel']['score']
        network_score = profile['trust_dimensions']['network']['score']
        other_avg = (temporal_score + channel_score + network_score) / 3
        
        chitty_score = (
            justice_score * justice_weight +
            outcome_score * outcome_weight +
            source_score * source_weight +
            other_avg * other_weight
        )
        
        return round(chitty_score * 100, 1)  # Convert to percentage

class ChittyIDValidator:
    """Validation system for ChittyIDs with trust score verification"""
    
    @staticmethod
    def validate_chitty_id(chitty_id: str) -> Dict:
        """Validate ChittyID format and structure"""
        
        # ChittyID format: CH-YEAR-VER-SEQUENCE-CODE
        pattern = r'^CH-(\d{4})-VER-([A-Z0-9]{6})-([A-Z0-9]+)$'
        match = re.match(pattern, chitty_id)
        
        if not match:
            return {
                'valid': False,
                'error': 'Invalid ChittyID format',
                'expected_format': 'CH-YEAR-VER-SEQUENCE-CODE'
            }
        
        year, sequence, code = match.groups()
        current_year = datetime.now().year
        
        # Validate year range
        if int(year) < 2020 or int(year) > current_year + 1:
            return {
                'valid': False,
                'error': f'Invalid year: {year}',
                'valid_range': f'2020-{current_year + 1}'
            }
        
        return {
            'valid': True,
            'chitty_id': chitty_id,
            'year': int(year),
            'sequence': sequence,
            'vertical_code': code,
            'parsed_at': datetime.utcnow().isoformat()
        }

    @staticmethod
    def parse_chitty_id(chitty_id: str) -> Optional[Dict]:
        """Parse ChittyID into components"""
        validation = ChittyIDValidator.validate_chitty_id(chitty_id)
        
        if not validation['valid']:
            return None
        
        vertical_mapping = {
            'A': 'user',
            'B': 'business', 
            'O': 'organization',
            'G': 'government',
            'AI': 'ai_agent'
        }
        
        return {
            'chitty_id': chitty_id,
            'year': validation['year'],
            'sequence': validation['sequence'],
            'vertical_code': validation['vertical_code'],
            'vertical': vertical_mapping.get(validation['vertical_code'], 'unknown'),
            'timestamp': None,  # Would come from database lookup
            'trust_enabled': True
        }

class ChittyIDTrustBridge:
    """Bridge between ChittyID and ChittyTrust systems"""
    
    def __init__(self, trust_engine_url: str = None):
        self.trust_engine_url = trust_engine_url or "http://localhost:5000"
        self.generator = ChittyIDGenerator()
        self.validator = ChittyIDValidator()
        
    def create_verified_identity(self, verification_data: Dict) -> Dict:
        """Create ChittyID with immediate trust score calculation"""
        
        # Generate ChittyID
        chitty_data = self.generator.generate_chitty_id(
            vertical=verification_data.get('vertical', 'user'),
            user_data=verification_data
        )
        
        # Calculate full trust scores using ChittyTrust engine
        trust_scores = self._calculate_full_trust_scores(chitty_data, verification_data)
        
        # Update ChittyID with complete trust data
        chitty_data['trust_profile']['trust_scores'] = trust_scores
        chitty_data['trust_complete'] = True
        
        return chitty_data
    
    def _calculate_full_trust_scores(self, chitty_data: Dict, verification_data: Dict) -> Dict:
        """Calculate complete trust scores including Chitty Score™"""
        
        try:
            # Call ChittyTrust API for full 6D analysis
            response = requests.post(
                f"{self.trust_engine_url}/api/trust/calculate",
                json={
                    'entity_id': chitty_data['chitty_id'],
                    'entity_type': 'chitty_id_user',
                    'verification_data': verification_data,
                    'events': []  # New identity, no events yet
                },
                timeout=10
            )
            
            if response.status_code == 200:
                trust_result = response.json()
                
                # Extract scores with emphasis on Chitty Score™
                return {
                    'peoples_score': trust_result.get('output_scores', {}).get('peoples_score', 0.0),
                    'legal_score': trust_result.get('output_scores', {}).get('legal_score', 0.0),
                    'state_score': trust_result.get('output_scores', {}).get('state_score', 0.0),
                    'chitty_score': trust_result.get('output_scores', {}).get('chitty_score', 0.0),
                    'composite_score': trust_result.get('composite_score', 0.0),
                    'trust_level': trust_result.get('trust_level', 'L0'),
                    'calculation_timestamp': datetime.utcnow().isoformat()
                }
            
        except Exception as e:
            logging.warning(f"Trust calculation failed for {chitty_data['chitty_id']}: {e}")
        
        # Fallback to basic calculation
        return self._calculate_fallback_scores(chitty_data, verification_data)
    
    def _calculate_fallback_scores(self, chitty_data: Dict, verification_data: Dict) -> Dict:
        """Fallback trust score calculation"""
        
        base_score = 0.0
        
        # Basic scoring based on verification completeness
        if verification_data.get('identity_verified'):
            base_score += 0.3
        if verification_data.get('address_verified'):
            base_score += 0.2
        if verification_data.get('phone_verified'):
            base_score += 0.1
        if verification_data.get('email_verified'):
            base_score += 0.1
        
        # Chitty Score™ calculation - emphasizes justice alignment
        chitty_score = base_score * 100  # Base percentage
        
        # Add justice bonus for complete verification
        if base_score >= 0.7:
            chitty_score += 10  # Justice alignment bonus
        
        return {
            'peoples_score': base_score * 85,  # Community focus
            'legal_score': base_score * 95,    # Compliance focus  
            'state_score': base_score * 90,    # Authority focus
            'chitty_score': min(chitty_score, 100),  # Our proprietary score
            'composite_score': base_score * 100,
            'trust_level': self._get_trust_level(chitty_score),
            'calculation_timestamp': datetime.utcnow().isoformat()
        }
    
    def _get_trust_level(self, score: float) -> str:
        """Convert score to trust level"""
        if score >= 90:
            return 'L4'
        elif score >= 75:
            return 'L3'
        elif score >= 60:
            return 'L2'
        elif score >= 40:
            return 'L1'
        else:
            return 'L0'

# Global instances for easy access
chitty_id_generator = ChittyIDGenerator()
chitty_id_validator = ChittyIDValidator()
chitty_trust_bridge = ChittyIDTrustBridge()