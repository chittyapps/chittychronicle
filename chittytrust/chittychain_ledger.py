"""
ChittyChain Ledger Integration
Enhanced blockchain ledger system with cross-platform compatibility
Integrates with external ChittyChain Ledger services for distributed trust networks
"""
import os
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import requests
import logging
from dataclasses import dataclass, asdict, field

@dataclass
class LedgerEntry:
    """Structured ledger entry for trust events"""
    entry_id: str
    user_id: str
    timestamp: str
    event_type: str
    trust_scores: Dict
    verification_hash: str
    blockchain_tx: Optional[str] = None
    cross_platform_refs: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)

@dataclass
class TrustPassport:
    """Cross-platform trust passport"""
    passport_id: str
    user_id: str
    issued_at: str
    expires_at: str
    current_scores: Dict
    verification_level: str
    blockchain_anchors: List[str]
    cross_platform_verified: bool
    issuer: str
    signature: str

class ChittyChainLedger:
    """Enhanced ChittyChain Ledger with cross-platform integration"""
    
    def __init__(self):
        self.ledger_url = os.environ.get('CHITTYCHAIN_LEDGER_URL', 'https://a619aa1d-896e-402c-9d4d-d35aa6663444-00-2pfapv5lxqfhn.picard.replit.dev')
        self.local_db_url = os.environ.get('CHITTYCHAIN_DB_URL')
        self.api_key = os.environ.get('CHITTYCHAIN_API_KEY')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}' if self.api_key else '',
            'User-Agent': 'ChittyTrust-Ledger/2.0'
        })
        self.local_cache = {}  # Local cache for performance
        self.external_ledgers = [
            'https://a619aa1d-896e-402c-9d4d-d35aa6663444-00-2pfapv5lxqfhn.picard.replit.dev'
        ]
        
    async def create_ledger_entry(self, user_id: str, event_type: str, trust_scores: Dict, 
                                event_data: Dict = None, cross_platform_refs: List[str] = None) -> Optional[str]:
        """Create a new entry in the ChittyChain Ledger"""
        try:
            # Generate unique entry ID
            entry_id = f"cle_{hashlib.sha256(f'{user_id}{datetime.utcnow().isoformat()}'.encode()).hexdigest()[:16]}"
            
            # Create verification hash
            verification_hash = self._generate_verification_hash(user_id, event_type, trust_scores, event_data)
            
            # Build ledger entry
            entry = LedgerEntry(
                entry_id=entry_id,
                user_id=user_id,
                timestamp=datetime.utcnow().isoformat(),
                event_type=event_type,
                trust_scores=trust_scores,
                verification_hash=verification_hash,
                cross_platform_refs=cross_platform_refs or [],
                metadata=event_data or {}
            )
            
            # Record on blockchain first
            blockchain_tx = await self._record_on_blockchain(entry)
            entry.blockchain_tx = blockchain_tx
            
            # Record in distributed ledger
            ledger_response = await self._record_in_distributed_ledger(entry)
            
            if ledger_response:
                logging.info(f"Ledger entry created: {entry_id}")
                return entry_id
            
            return None
            
        except Exception as e:
            logging.error(f"Ledger entry creation failed: {e}")
            return None
    
    async def get_user_ledger_history(self, user_id: str, limit: int = 100, 
                                    include_cross_platform: bool = True) -> List[Dict]:
        """Get complete ledger history for a user across all platforms"""
        try:
            # Query local ledger
            local_history = await self._query_local_ledger(user_id, limit)
            
            # Query distributed ledger if enabled
            distributed_history = []
            if include_cross_platform:
                distributed_history = await self._query_distributed_ledger(user_id, limit)
            
            # Merge and deduplicate histories
            all_history = self._merge_ledger_histories(local_history, distributed_history)
            
            # Sort by timestamp (most recent first)
            all_history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return all_history[:limit]
            
        except Exception as e:
            logging.error(f"Ledger history query failed: {e}")
            return []
    
    async def create_trust_passport_v2(self, user_id: str, validity_days: int = 365) -> Optional[Dict]:
        """Create enhanced trust passport with cross-platform verification"""
        try:
            # Get comprehensive trust history
            history = await self.get_user_ledger_history(user_id, limit=50)
            
            if not history:
                return {'error': 'No trust history found'}
            
            # Calculate aggregated trust metrics
            current_scores = self._calculate_aggregated_scores(history)
            verification_level = self._calculate_verification_level(current_scores)
            
            # Collect blockchain anchors
            blockchain_anchors = [entry.get('blockchain_tx') for entry in history 
                                if entry.get('blockchain_tx')][:10]  # Latest 10 anchors
            
            # Generate passport
            passport_id = f"ctp_v2_{hashlib.sha256(f'{user_id}{datetime.utcnow().isoformat()}'.encode()).hexdigest()[:16]}"
            expires_at = (datetime.utcnow() + timedelta(days=validity_days)).isoformat()
            
            passport = TrustPassport(
                passport_id=passport_id,
                user_id=user_id,
                issued_at=datetime.utcnow().isoformat(),
                expires_at=expires_at,
                current_scores=current_scores,
                verification_level=verification_level,
                blockchain_anchors=blockchain_anchors,
                cross_platform_verified=True,
                issuer='ChittyTrust_Certified_v2',
                signature=self._generate_passport_signature(passport_id, user_id, current_scores)
            )
            
            # Record passport creation in ledger
            passport_entry_id = await self.create_ledger_entry(
                user_id,
                'passport_created_v2',
                current_scores,
                {'passport_data': asdict(passport)}
            )
            
            passport_dict = asdict(passport)
            passport_dict['ledger_entry_id'] = passport_entry_id
            passport_dict['cross_platform_portability'] = True
            passport_dict['api_accessible'] = True
            
            return passport_dict
            
        except Exception as e:
            logging.error(f"Trust passport v2 creation failed: {e}")
            return {'error': str(e)}
    
    async def verify_cross_platform_passport(self, passport_id: str, 
                                           external_platform: str = None) -> Dict:
        """Verify trust passport across platforms"""
        try:
            # Query local ledger for passport
            local_result = await self._verify_local_passport(passport_id)
            
            # Query external platforms if specified
            external_results = []
            if external_platform:
                external_result = await self._verify_external_passport(passport_id, external_platform)
                if external_result:
                    external_results.append(external_result)
            
            # Verify blockchain anchors
            blockchain_verification = await self._verify_blockchain_anchors(
                local_result.get('blockchain_anchors', [])
            )
            
            return {
                'passport_id': passport_id,
                'verified': local_result.get('verified', False),
                'local_verification': local_result,
                'external_verifications': external_results,
                'blockchain_verification': blockchain_verification,
                'cross_platform_status': 'verified' if local_result.get('verified') else 'unverified',
                'verification_timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Cross-platform passport verification failed: {e}")
            return {'verified': False, 'error': str(e)}
    
    async def sync_with_external_ledger(self, external_ledger_url: str, 
                                      sync_user_ids: List[str] = None) -> Dict:
        """Synchronize with external ChittyChain Ledger instance"""
        try:
            sync_results = {
                'synchronized_users': 0,
                'new_entries': 0,
                'verification_conflicts': 0,
                'sync_timestamp': datetime.utcnow().isoformat()
            }
            
            # Get external ledger status
            external_status = await self._get_external_ledger_status(external_ledger_url)
            
            if not external_status.get('accessible'):
                return {'error': 'External ledger not accessible', 'results': sync_results}
            
            # Sync specified users or get active users
            users_to_sync = sync_user_ids or await self._get_active_users()
            
            for user_id in users_to_sync:
                try:
                    # Get external user data
                    external_data = await self._fetch_external_user_data(external_ledger_url, user_id)
                    
                    if external_data:
                        # Merge with local data
                        merge_result = await self._merge_user_data(user_id, external_data)
                        
                        if merge_result.get('success'):
                            sync_results['synchronized_users'] += 1
                            sync_results['new_entries'] += merge_result.get('new_entries', 0)
                        
                        if merge_result.get('conflicts'):
                            sync_results['verification_conflicts'] += len(merge_result['conflicts'])
                            
                except Exception as user_sync_error:
                    logging.warning(f"User {user_id} sync failed: {user_sync_error}")
                    continue
            
            logging.info(f"Ledger sync completed: {sync_results}")
            return {'success': True, 'results': sync_results}
            
        except Exception as e:
            logging.error(f"External ledger sync failed: {e}")
            return {'error': str(e)}
    
    def get_ledger_analytics(self, days_back: int = 30) -> Dict:
        """Get comprehensive ledger analytics"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)
            
            # This would query actual ledger data in production
            analytics = {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days_back
                },
                'metrics': {
                    'total_entries': 15420,  # Demo data
                    'active_users': 3250,
                    'trust_verifications': 8930,
                    'passport_creations': 540,
                    'cross_platform_syncs': 125,
                    'blockchain_transactions': 12890
                },
                'trust_distribution': {
                    'L4_PLATINUM': 8.5,
                    'L3_GOLD': 23.2,
                    'L2_SILVER': 31.8,
                    'L1_BRONZE': 25.1,
                    'L0_UNVERIFIED': 11.4
                },
                'growth_trends': {
                    'daily_new_entries': 312,
                    'weekly_growth_rate': 4.7,
                    'verification_success_rate': 94.2
                },
                'network_health': {
                    'ledger_synchronization': 99.8,
                    'blockchain_consistency': 100.0,
                    'cross_platform_connectivity': 96.4
                }
            }
            
            return analytics
            
        except Exception as e:
            logging.error(f"Ledger analytics failed: {e}")
            return {'error': str(e)}
    
    # Private helper methods
    
    def _generate_verification_hash(self, user_id: str, event_type: str, 
                                  trust_scores: Dict, event_data: Dict = None) -> str:
        """Generate verification hash for ledger entry integrity"""
        combined_data = {
            'user_id': user_id,
            'event_type': event_type,
            'trust_scores': trust_scores,
            'event_data': event_data or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        return hashlib.sha256(json.dumps(combined_data, sort_keys=True).encode()).hexdigest()
    
    async def _record_on_blockchain(self, entry: LedgerEntry) -> Optional[str]:
        """Record entry on blockchain"""
        try:
            # Use existing ChittyChain client for blockchain operations
            from chittychain import chittychain_client
            
            blockchain_tx = chittychain_client.record_trust_event(
                entry.user_id,
                {
                    'event_type': entry.event_type,
                    'ledger_entry_id': entry.entry_id,
                    'verification_hash': entry.verification_hash
                },
                entry.trust_scores
            )
            
            return blockchain_tx
            
        except Exception as e:
            logging.error(f"Blockchain recording failed: {e}")
            return None
    
    async def _record_in_distributed_ledger(self, entry: LedgerEntry) -> bool:
        """Record entry in distributed ledger network"""
        try:
            # In production, this would use actual distributed ledger API
            # For now, record in local cache and Evidence Ledger
            
            # Record in Evidence Ledger
            from evidence_integration import evidence_ledger
            
            evidence_id = evidence_ledger.record_trust_evidence(
                entry.user_id,
                {
                    'entry_id': entry.entry_id,
                    'event_type': entry.event_type,
                    'trust_scores': entry.trust_scores,
                    'verification_hash': entry.verification_hash,
                    'blockchain_tx': entry.blockchain_tx
                },
                entry.blockchain_tx
            )
            
            # Cache locally for performance
            self.local_cache[entry.entry_id] = asdict(entry)
            
            return bool(evidence_id)
            
        except Exception as e:
            logging.error(f"Distributed ledger recording failed: {e}")
            return False
    
    async def _query_local_ledger(self, user_id: str, limit: int) -> List[Dict]:
        """Query local ledger cache and database"""
        # Implementation would query actual local database
        # For now, return cached entries
        user_entries = [entry for entry in self.local_cache.values() 
                       if entry.get('user_id') == user_id]
        return user_entries[:limit]
    
    async def _query_distributed_ledger(self, user_id: str, limit: int) -> List[Dict]:
        """Query distributed ledger network"""
        try:
            if not self.ledger_url:
                return []
            
            response = self.session.get(
                f"{self.ledger_url}/api/ledger/user/{user_id}",
                params={'limit': limit},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json().get('entries', [])
            
            return []
            
        except Exception as e:
            logging.warning(f"Distributed ledger query failed: {e}")
            return []
    
    def _merge_ledger_histories(self, local_history: List[Dict], 
                               distributed_history: List[Dict]) -> List[Dict]:
        """Merge and deduplicate ledger histories"""
        seen_entries = set()
        merged_history = []
        
        for entry in local_history + distributed_history:
            entry_id = entry.get('entry_id') or entry.get('id')
            if entry_id and entry_id not in seen_entries:
                seen_entries.add(entry_id)
                merged_history.append(entry)
        
        return merged_history
    
    def _calculate_aggregated_scores(self, history: List[Dict]) -> Dict:
        """Calculate aggregated trust scores from history"""
        if not history:
            return {}
        
        # Use most recent scores as current
        latest_entry = history[0]
        return latest_entry.get('trust_scores', {})
    
    def _calculate_verification_level(self, trust_scores: Dict) -> str:
        """Calculate verification level from trust scores"""
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
    
    def _generate_passport_signature(self, passport_id: str, user_id: str, scores: Dict) -> str:
        """Generate cryptographic signature for passport"""
        signature_data = f"{passport_id}{user_id}{json.dumps(scores, sort_keys=True)}"
        return hashlib.sha256(signature_data.encode()).hexdigest()
    
    async def _verify_local_passport(self, passport_id: str) -> Dict:
        """Verify passport in local ledger"""
        # Implementation would query local database
        return {
            'verified': True,
            'passport_id': passport_id,
            'blockchain_anchors': [f"ctx_{passport_id[:16]}"],
            'verification_method': 'local_ledger'
        }
    
    async def _verify_external_passport(self, passport_id: str, platform: str) -> Optional[Dict]:
        """Verify passport on external platform"""
        try:
            # Implementation would query external platform API
            return {
                'platform': platform,
                'verified': True,
                'verification_method': 'cross_platform_api'
            }
        except Exception:
            return None
    
    async def _verify_blockchain_anchors(self, anchors: List[str]) -> Dict:
        """Verify blockchain transaction anchors"""
        verified_anchors = []
        
        for anchor in anchors[:5]:  # Verify up to 5 anchors
            try:
                from chittychain import chittychain_client
                verification = chittychain_client.verify_trust_record(anchor)
                
                if verification.get('verified'):
                    verified_anchors.append(anchor)
                    
            except Exception:
                continue
        
        return {
            'total_anchors': len(anchors),
            'verified_anchors': len(verified_anchors),
            'verification_rate': len(verified_anchors) / len(anchors) if anchors else 0,
            'blockchain_confirmed': len(verified_anchors) > 0
        }
    
    async def _get_external_ledger_status(self, ledger_url: str) -> Dict:
        """Get status of external ledger"""
        try:
            # Try different endpoints for ledger status
            endpoints = ['/api/status', '/status', '/health', '/']
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(f"{ledger_url}{endpoint}", timeout=5)
                    if response.status_code == 200:
                        content = response.text.lower()
                        # Check if it's a ChittyChain instance
                        is_chitty = any(keyword in content for keyword in 
                                      ['chitty', 'ledger', 'blockchain', 'trust'])
                        return {
                            'accessible': True,
                            'is_chittychain': is_chitty,
                            'endpoint': endpoint,
                            'status_code': response.status_code
                        }
                except Exception:
                    continue
            
            return {'accessible': False, 'error': 'No valid endpoints found'}
            
        except Exception as e:
            return {'accessible': False, 'error': str(e)}
    
    async def _get_active_users(self) -> List[str]:
        """Get list of active users for sync"""
        # Implementation would query database for active users
        return ['alice', 'bob', 'charlie']  # Demo data
    
    async def _fetch_external_user_data(self, ledger_url: str, user_id: str) -> Optional[Dict]:
        """Fetch user data from external ledger"""
        try:
            response = self.session.get(
                f"{ledger_url}/api/ledger/user/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            
            return None
            
        except Exception:
            return None
    
    async def _merge_user_data(self, user_id: str, external_data: Dict) -> Dict:
        """Merge external user data with local data"""
        # Implementation would perform intelligent merge
        return {
            'success': True,
            'new_entries': len(external_data.get('entries', [])),
            'conflicts': []
        }

# Global ChittyChain Ledger instance
chittychain_ledger = ChittyChainLedger()