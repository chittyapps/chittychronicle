"""
ChittyChain Evidence Ledger Integration
Real integration with the actual Notion Evidence Ledger for authentic documentation
"""
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import requests
import logging

class EvidenceLedgerIntegration:
    """Integration with the actual ChittyChain Evidence Ledger Notion page"""
    
    def __init__(self):
        self.integration_secret = os.environ.get('NOTION_INTEGRATION_SECRET')
        self.evidence_ledger_id = "24694de4357980dba689cf778c9708eb"
        self.base_url = 'https://api.notion.com/v1'
        self.headers = {
            'Authorization': f'Bearer {self.integration_secret}',
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        }
        
    def record_trust_evidence(self, user_id: str, trust_data: Dict, blockchain_tx: Optional[str] = None) -> Optional[str]:
        """Record trust evidence in the ChittyChain Evidence Ledger"""
        try:
            # Create comprehensive evidence entry
            evidence_entry = {
                'parent': {'type': 'page_id', 'page_id': self.evidence_ledger_id},
                'properties': {
                    'title': {'title': [{'text': {'content': f'Trust Evidence: {user_id} - {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}'}}]}
                },
                'children': self._build_evidence_blocks(user_id, trust_data, blockchain_tx)
            }
            
            response = self._make_notion_request('POST', '/pages', evidence_entry)
            
            if response and response.get('id'):
                logging.info(f"Trust evidence recorded in ledger: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Evidence ledger recording failed: {e}")
            return None
    
    def create_verification_record(self, verification_id: str, verification_data: Dict, outcome: str) -> Optional[str]:
        """Create verification outcome record in evidence ledger"""
        try:
            verification_record = {
                'parent': {'type': 'page_id', 'page_id': self.evidence_ledger_id},
                'properties': {
                    'title': {'title': [{'text': {'content': f'Verification #{verification_id} - {outcome}'}}]}
                },
                'children': self._build_verification_blocks(verification_id, verification_data, outcome)
            }
            
            response = self._make_notion_request('POST', '/pages', verification_record)
            
            if response and response.get('id'):
                logging.info(f"Verification record created: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Verification record creation failed: {e}")
            return None
    
    def log_blockchain_transaction(self, tx_id: str, user_id: str, event_type: str, trust_scores: Dict) -> Optional[str]:
        """Log blockchain transaction in evidence ledger"""
        try:
            blockchain_log = {
                'parent': {'type': 'page_id', 'page_id': self.evidence_ledger_id},
                'properties': {
                    'title': {'title': [{'text': {'content': f'Blockchain TX: {tx_id[:16]}... - {event_type}'}}]}
                },
                'children': self._build_blockchain_blocks(tx_id, user_id, event_type, trust_scores)
            }
            
            response = self._make_notion_request('POST', '/pages', blockchain_log)
            
            if response and response.get('id'):
                logging.info(f"Blockchain transaction logged: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Blockchain logging failed: {e}")
            return None
    
    def create_compliance_audit_trail(self, organization: str, audit_data: Dict) -> Optional[str]:
        """Create comprehensive compliance audit trail"""
        try:
            audit_trail = {
                'parent': {'type': 'page_id', 'page_id': self.evidence_ledger_id},
                'properties': {
                    'title': {'title': [{'text': {'content': f'Compliance Audit: {organization} - {datetime.utcnow().strftime("%Y-%m-%d")}'}}]}
                },
                'children': self._build_compliance_blocks(organization, audit_data)
            }
            
            response = self._make_notion_request('POST', '/pages', audit_trail)
            
            if response and response.get('id'):
                logging.info(f"Compliance audit trail created: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Compliance audit creation failed: {e}")
            return None
    
    def create_integration_snippets_page(self) -> Optional[str]:
        """Create integration snippets page for team collaboration"""
        try:
            from integration_snippets import generate_integration_snippets_for_notion
            
            snippets = generate_integration_snippets_for_notion()
            
            snippets_page = {
                'parent': {'type': 'page_id', 'page_id': self.evidence_ledger_id},
                'properties': {
                    'title': {'title': [{'text': {'content': f'ChittyTrust Integration Snippets - {datetime.utcnow().strftime("%Y-%m-%d")}'}}]}
                },
                'children': self._build_integration_snippets_blocks(snippets)
            }
            
            response = self._make_notion_request('POST', '/pages', snippets_page)
            
            if response and response.get('id'):
                logging.info(f"Integration snippets page created: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Integration snippets page creation failed: {e}")
            return None
    
    def _build_evidence_blocks(self, user_id: str, trust_data: Dict, blockchain_tx: Optional[str] = None) -> List[Dict]:
        """Build evidence documentation blocks"""
        blocks = [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': f'Trust Evidence Record'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'User ID: '}},
                        {'text': {'content': user_id, 'annotations': {'bold': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Timestamp: '}},
                        {'text': {'content': datetime.utcnow().isoformat(), 'annotations': {'code': True}}}
                    ]
                }
            }
        ]
        
        # Add blockchain transaction if available
        if blockchain_tx:
            blocks.append({
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Blockchain TX: '}},
                        {'text': {'content': blockchain_tx, 'annotations': {'code': True, 'color': 'green'}}}
                    ]
                }
            })
        
        # Add trust scores
        blocks.append({
            'object': 'block',
            'type': 'heading_2',
            'heading_2': {'rich_text': [{'text': {'content': '6D Trust Scores'}}]}
        })
        
        scores = trust_data.get('scores', {})
        dimensions = trust_data.get('dimensions', {})
        
        # Create trust metrics table
        if scores or dimensions:
            blocks.append({
                'object': 'block',
                'type': 'table',
                'table': {
                    'table_width': 3,
                    'has_column_header': True,
                    'children': [
                        {
                            'object': 'block',
                            'type': 'table_row',
                            'table_row': {
                                'cells': [
                                    [{'text': {'content': 'Metric', 'annotations': {'bold': True}}}],
                                    [{'text': {'content': 'Score', 'annotations': {'bold': True}}}],
                                    [{'text': {'content': 'Level', 'annotations': {'bold': True}}}]
                                ]
                            }
                        },
                        {
                            'object': 'block',
                            'type': 'table_row',
                            'table_row': {
                                'cells': [
                                    [{'text': {'content': 'Composite Trust'}}],
                                    [{'text': {'content': f"{scores.get('composite', 0):.1f}/100"}}],
                                    [{'text': {'content': self._get_trust_level(scores.get('composite', 0))}}]
                                ]
                            }
                        }
                    ]
                }
            })
        
        # Add dimensional breakdown
        if dimensions:
            blocks.append({
                'object': 'block',
                'type': 'heading_3',
                'heading_3': {'rich_text': [{'text': {'content': 'Dimensional Analysis'}}]}
            })
            
            for dimension, score in dimensions.items():
                blocks.append({
                    'object': 'block',
                    'type': 'bulleted_list_item',
                    'bulleted_list_item': {
                        'rich_text': [
                            {'text': {'content': f'{dimension.title()}: '}},
                            {'text': {'content': f'{score:.1f}/100', 'annotations': {'bold': True}}}
                        ]
                    }
                })
        
        # Add evidence integrity verification
        blocks.append({
            'object': 'block',
            'type': 'heading_3',
            'heading_3': {'rich_text': [{'text': {'content': 'Evidence Integrity'}}]}
        })
        
        blocks.append({
            'object': 'block',
            'type': 'paragraph',
            'paragraph': {
                'rich_text': [
                    {'text': {'content': '✅ Cryptographic Hash: '}},
                    {'text': {'content': self._generate_evidence_hash(user_id, trust_data), 'annotations': {'code': True}}}
                ]
            }
        })
        
        blocks.append({
            'object': 'block',
            'type': 'paragraph',
            'paragraph': {
                'rich_text': [
                    {'text': {'content': '🔗 Blockchain Anchored: '}},
                    {'text': {'content': 'Yes' if blockchain_tx else 'Pending', 'annotations': {'bold': True, 'color': 'green' if blockchain_tx else 'orange'}}}
                ]
            }
        })
        
        return blocks
    
    def _build_verification_blocks(self, verification_id: str, verification_data: Dict, outcome: str) -> List[Dict]:
        """Build verification record blocks"""
        return [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': f'Verification Record #{verification_id}'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Outcome: '}},
                        {'text': {'content': outcome, 'annotations': {'bold': True, 'color': 'green' if outcome == 'VERIFIED' else 'red'}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Type: '}},
                        {'text': {'content': verification_data.get('verification_type', 'Unknown')}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Title: '}},
                        {'text': {'content': verification_data.get('title', 'Untitled')}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'quote',
                'quote': {
                    'rich_text': [{'text': {'content': verification_data.get('description', 'No description provided')}}]
                }
            }
        ]
    
    def _build_blockchain_blocks(self, tx_id: str, user_id: str, event_type: str, trust_scores: Dict) -> List[Dict]:
        """Build blockchain transaction log blocks"""
        return [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': 'Blockchain Transaction Log'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Transaction ID: '}},
                        {'text': {'content': tx_id, 'annotations': {'code': True, 'color': 'blue'}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'User: '}},
                        {'text': {'content': user_id, 'annotations': {'bold': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Event Type: '}},
                        {'text': {'content': event_type, 'annotations': {'bold': True, 'color': 'green'}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': json.dumps(trust_scores, indent=2)}}],
                    'language': 'json'
                }
            }
        ]
    
    def _build_compliance_blocks(self, organization: str, audit_data: Dict) -> List[Dict]:
        """Build compliance audit blocks"""
        return [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': f'Compliance Audit: {organization}'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': f'Audit Date: '}},
                        {'text': {'content': datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'), 'annotations': {'bold': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': 'Compliance Metrics'}}]}
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f"Total Users: {audit_data.get('total_users', 0)}"}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f"Average Trust Score: {audit_data.get('average_trust_score', 0):.1f}"}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f"High Trust Users: {audit_data.get('high_trust_users', 0)}"}}]
                }
            }
        ]
    
    def _make_notion_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Make authenticated request to Notion API"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=data)
            else:
                return None
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logging.error(f"Notion API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logging.error(f"Notion request failed: {e}")
            return None
    
    def _generate_evidence_hash(self, user_id: str, trust_data: Dict) -> str:
        """Generate cryptographic hash for evidence integrity"""
        import hashlib
        combined_data = f"{user_id}{json.dumps(trust_data, sort_keys=True)}{datetime.utcnow().date().isoformat()}"
        return hashlib.sha256(combined_data.encode()).hexdigest()[:16]
    
    def _build_integration_snippets_blocks(self, snippets: Dict) -> List[Dict]:
        """Build integration snippets documentation blocks"""
        blocks = [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': 'ChittyTrust Integration Snippets'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [
                        {'text': {'content': 'Ready-to-use code snippets for integrating ChittyTrust blockchain verification and evidence ledger functionality into your applications.'}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '🔐 Trust Passport Generation'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': 'Generate blockchain-verified trust passports for cross-platform verification:'}}]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': snippets['trust_passport']}}],
                    'language': 'python'
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '📋 Evidence Ledger Recording'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': 'Record immutable evidence with blockchain anchoring:'}}]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': snippets['evidence_ledger']}}],
                    'language': 'python'
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '⚖️ 6D Trust Calculation'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': 'Calculate comprehensive trust scores using the ChittyTrust engine:'}}]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': snippets['trust_calculation']}}],
                    'language': 'python'
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '🏢 Enterprise Compliance'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': 'Generate automated compliance documentation:'}}]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': snippets['compliance_integration']}}],
                    'language': 'python'
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '🌐 API Integration'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': 'Flask API endpoints for trust verification services:'}}]
                }
            },
            {
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': snippets['api_integration']}}],
                    'language': 'python'
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '🔗 Key Integrations'}}]}
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [
                        {'text': {'content': 'ChittyChain Database: '}},
                        {'text': {'content': 'CHITTYCHAIN_DB_URL', 'annotations': {'code': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [
                        {'text': {'content': 'Notion Integration: '}},
                        {'text': {'content': 'NOTION_INTEGRATION_SECRET', 'annotations': {'code': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [
                        {'text': {'content': 'Evidence Ledger ID: '}},
                        {'text': {'content': '24694de4357980dba689cf778c9708eb', 'annotations': {'code': True}}}
                    ]
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '🚀 Quick Start'}}]}
            },
            {
                'object': 'block',
                'type': 'numbered_list_item',
                'numbered_list_item': {
                    'rich_text': [{'text': {'content': 'Set up environment variables for ChittyChain and Notion integration'}}]
                }
            },
            {
                'object': 'block',
                'type': 'numbered_list_item',
                'numbered_list_item': {
                    'rich_text': [{'text': {'content': 'Import the integration modules in your application'}}]
                }
            },
            {
                'object': 'block',
                'type': 'numbered_list_item',
                'numbered_list_item': {
                    'rich_text': [{'text': {'content': 'Use the provided snippets to add trust verification to your workflows'}}]
                }
            },
            {
                'object': 'block',
                'type': 'numbered_list_item',
                'numbered_list_item': {
                    'rich_text': [{'text': {'content': 'Monitor evidence ledger for audit trails and compliance documentation'}}]
                }
            },
            {
                'object': 'block',
                'type': 'callout',
                'callout': {
                    'rich_text': [
                        {'text': {'content': '💡 Pro Tip: All trust calculations are automatically recorded on blockchain with cryptographic verification for audit trails.'}}
                    ],
                    'icon': {'emoji': '💡'}
                }
            }
        ]
        
        return blocks
    
    def _get_trust_level(self, score: float) -> str:
        """Convert trust score to trust level"""
        if score >= 90:
            return 'L4 - Platinum'
        elif score >= 80:
            return 'L3 - Gold'
        elif score >= 70:
            return 'L2 - Silver'
        elif score >= 60:
            return 'L1 - Bronze'
        else:
            return 'L0 - Unverified'

# Global evidence ledger integration
evidence_ledger = EvidenceLedgerIntegration()