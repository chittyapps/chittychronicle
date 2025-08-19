"""
Notion Integration for Enterprise Documentation
Automatically creates audit trails, compliance documentation, and trust reports
"""
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import requests
import logging

class NotionIntegration:
    """Notion integration for enterprise trust documentation"""
    
    def __init__(self):
        self.integration_secret = os.environ.get('NOTION_INTEGRATION_SECRET')
        self.base_url = 'https://api.notion.com/v1'
        self.headers = {
            'Authorization': f'Bearer {self.integration_secret}',
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        }
        
    def create_trust_audit_page(self, user_id: str, trust_data: Dict, verification_details: Dict) -> Optional[str]:
        """Create comprehensive trust audit documentation in Notion"""
        try:
            # Create audit page content in ChittyChain Evidence Ledger
            page_data = {
                'parent': {'type': 'page_id', 'page_id': self._get_audit_database_id()},
                'properties': {
                    'title': {'title': [{'text': {'content': f'Trust Audit: {user_id}'}}]}
                },
                'children': self._build_audit_content(user_id, trust_data, verification_details)
            }
            
            # Create page in Notion
            response = self._make_notion_request('POST', '/pages', page_data)
            
            if response and response.get('id'):
                logging.info(f"Trust audit page created in Notion: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Notion audit page creation failed: {e}")
            return None
    
    def create_compliance_report(self, organization_id: str, report_data: Dict) -> Optional[str]:
        """Generate compliance report for enterprise customers"""
        try:
            report_content = {
                'parent': {'type': 'database_id', 'database_id': self._get_compliance_database_id()},
                'properties': {
                    'Organization': {'title': [{'text': {'content': organization_id}}]},
                    'Report Type': {'select': {'name': 'Trust Compliance'}},
                    'Generated': {'date': {'start': datetime.utcnow().isoformat()}},
                    'Total Users': {'number': report_data.get('total_users', 0)},
                    'Avg Trust Score': {'number': report_data.get('average_trust_score', 0)},
                    'Compliance Status': {'select': {'name': report_data.get('compliance_status', 'Pending')}}
                },
                'children': self._build_compliance_content(report_data)
            }
            
            response = self._make_notion_request('POST', '/pages', report_content)
            
            if response and response.get('id'):
                logging.info(f"Compliance report created: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Compliance report creation failed: {e}")
            return None
    
    def create_verification_workflow(self, request_id: str, workflow_data: Dict) -> Optional[str]:
        """Document verification workflow for audit trail"""
        try:
            workflow_page = {
                'parent': {'type': 'database_id', 'database_id': self._get_workflow_database_id()},
                'properties': {
                    'Request ID': {'title': [{'text': {'content': str(request_id)}}]},
                    'Verification Type': {'select': {'name': workflow_data.get('verification_type', 'Unknown')}},
                    'Status': {'select': {'name': workflow_data.get('status', 'In Progress')}},
                    'Created': {'date': {'start': workflow_data.get('created_at', datetime.utcnow().isoformat())}},
                    'Verifier': {'people': []},  # Would be populated with actual Notion users
                    'Reward': {'number': workflow_data.get('reward_amount', 0)}
                },
                'children': self._build_workflow_content(workflow_data)
            }
            
            response = self._make_notion_request('POST', '/pages', workflow_page)
            
            if response and response.get('id'):
                logging.info(f"Verification workflow documented: {response['id']}")
                return response['id']
            
            return None
            
        except Exception as e:
            logging.error(f"Workflow documentation failed: {e}")
            return None
    
    def update_trust_dashboard(self, metrics: Dict) -> bool:
        """Update enterprise trust dashboard in Notion"""
        try:
            dashboard_page_id = self._get_dashboard_page_id()
            
            # Update dashboard with latest metrics
            dashboard_updates = {
                'properties': {
                    'Last Updated': {'date': {'start': datetime.utcnow().isoformat()}},
                    'Total Verifications': {'number': metrics.get('total_verifications', 0)},
                    'Active Users': {'number': metrics.get('active_users', 0)},
                    'Avg Trust Score': {'number': metrics.get('average_trust_score', 0)}
                }
            }
            
            response = self._make_notion_request('PATCH', f'/pages/{dashboard_page_id}', dashboard_updates)
            
            return response is not None
            
        except Exception as e:
            logging.error(f"Dashboard update failed: {e}")
            return False
    
    def _build_audit_content(self, user_id: str, trust_data: Dict, verification_details: Dict) -> List[Dict]:
        """Build comprehensive audit content blocks"""
        content = [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': f'Trust Audit: {user_id}'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': f'Comprehensive trust evaluation conducted on {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': '6D Trust Dimensions'}}]}
            }
        ]
        
        # Add dimension scores
        dimensions = trust_data.get('dimensions', {})
        for dimension, score in dimensions.items():
            content.append({
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'{dimension.title()}: {score:.1f}/100'}}]
                }
            })
        
        # Add output scores
        content.append({
            'object': 'block',
            'type': 'heading_2',
            'heading_2': {'rich_text': [{'text': {'content': 'Output Scores'}}]}
        })
        
        scores = trust_data.get('scores', {})
        for score_type, value in scores.items():
            content.append({
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'{score_type.replace("_", " ").title()}: {value:.1f}'}}]
                }
            })
        
        # Add verification details
        if verification_details:
            content.append({
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {'rich_text': [{'text': {'content': 'Verification Details'}}]}
            })
            
            content.append({
                'object': 'block',
                'type': 'code',
                'code': {
                    'rich_text': [{'text': {'content': json.dumps(verification_details, indent=2)}}],
                    'language': 'json'
                }
            })
        
        return content
    
    def _build_compliance_content(self, report_data: Dict) -> List[Dict]:
        """Build compliance report content"""
        return [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': 'Trust Compliance Report'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': f'Generated: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Total Users Evaluated: {report_data.get("total_users", 0)}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Average Trust Score: {report_data.get("average_trust_score", 0):.1f}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Compliance Status: {report_data.get("compliance_status", "Pending")}'}}]
                }
            }
        ]
    
    def _build_workflow_content(self, workflow_data: Dict) -> List[Dict]:
        """Build verification workflow documentation"""
        return [
            {
                'object': 'block',
                'type': 'heading_1',
                'heading_1': {'rich_text': [{'text': {'content': f'Verification Request: {workflow_data.get("title", "Untitled")}'}}]}
            },
            {
                'object': 'block',
                'type': 'paragraph',
                'paragraph': {
                    'rich_text': [{'text': {'content': workflow_data.get('description', 'No description provided')}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Type: {workflow_data.get("verification_type", "Unknown")}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Reward: ${workflow_data.get("reward_amount", 0):.2f}'}}]
                }
            },
            {
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [{'text': {'content': f'Priority: {workflow_data.get("priority", "Normal")}'}}]
                }
            }
        ]
    
    def _make_notion_request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
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
    
    def _get_audit_database_id(self) -> str:
        """Get the database ID for trust audits"""
        # Extract database ID from ChittyChain Evidence Ledger
        return "24694de4357980dba689cf778c9708eb"
    
    def _get_compliance_database_id(self) -> str:
        """Get the database ID for compliance reports"""
        # Use the same ChittyChain Evidence Ledger for compliance
        return "24694de4357980dba689cf778c9708eb"
    
    def _get_workflow_database_id(self) -> str:
        """Get the database ID for verification workflows"""
        # Use the same ChittyChain Evidence Ledger for workflows
        return "24694de4357980dba689cf778c9708eb"
    
    def _get_dashboard_page_id(self) -> str:
        """Get the page ID for the trust dashboard"""
        # ChittyChain Evidence Ledger page ID
        return "24694de4357980dba689cf778c9708eb"

# Global Notion integration instance
notion_integration = NotionIntegration()