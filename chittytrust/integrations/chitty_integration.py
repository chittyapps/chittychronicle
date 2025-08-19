"""
ChittyTrust Integration Class
Main integration interface for teams using ChittyTrust
"""

import asyncio
from typing import Dict, Optional
from chittychain import chittychain_client
from evidence_integration import evidence_ledger
from integration_snippets import generate_integration_snippets_for_notion

class ChittyTrustIntegration:
    """Main integration class for ChittyTrust functionality"""
    
    def __init__(self):
        self.chittychain = chittychain_client
        self.evidence_ledger = evidence_ledger
    
    def generate_trust_passport(self, user_id: str) -> Dict:
        """Generate blockchain-verified trust passport"""
        try:
            passport = self.chittychain.create_trust_passport(user_id)
            return {
                'success': True,
                'passport': passport,
                'cross_platform_verified': True
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def record_evidence(self, user_id: str, trust_data: Dict, blockchain_tx: Optional[str] = None) -> Dict:
        """Record immutable evidence with blockchain anchoring"""
        try:
            # Record on blockchain if not provided
            if not blockchain_tx:
                blockchain_tx = self.chittychain.record_trust_event(
                    user_id,
                    {'event_type': 'evidence_recording', 'source': 'integration_package'},
                    trust_data
                )
            
            # Record in evidence ledger
            evidence_id = self.evidence_ledger.record_trust_evidence(
                user_id, 
                trust_data, 
                blockchain_tx
            )
            
            return {
                'success': True,
                'evidence_id': evidence_id,
                'blockchain_tx': blockchain_tx,
                'integrity_verified': True
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_blockchain_record(self, transaction_id: str) -> Dict:
        """Verify trust record on blockchain"""
        try:
            verification = self.chittychain.verify_trust_record(transaction_id)
            return {
                'success': True,
                'verification': verification,
                'blockchain_verified': True
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_integration_snippets(self) -> Dict:
        """Get code snippets for team integration"""
        return generate_integration_snippets_for_notion()
    
    def create_documentation(self) -> Dict:
        """Create integration documentation page"""
        try:
            snippets_id = self.evidence_ledger.create_integration_snippets_page()
            return {
                'success': True,
                'documentation_id': snippets_id,
                'url': f'https://www.notion.so/{snippets_id.replace("-", "")}'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}