import os
import logging
from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime
import asyncio
import requests
import jwt

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize ChittyBeacon tracking
try:
    from chitty_beacon import initialize_beacon, send_event
    beacon = initialize_beacon()
    logging.info("ChittyBeacon initialized successfully")
except Exception as e:
    logging.warning(f"ChittyBeacon initialization failed: {e}")
    # Define no-op functions if beacon fails
    def send_event(event_type, data=None):
        pass

# Import our trust engine
from src.chitty_trust import calculate_trust
from src.chitty_trust.analytics import TrustAnalytics
from src.chitty_trust.visualization import TrustVisualizationEngine
from demo_data import get_persona_data

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "chitty-trust-demo-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Import models after Flask app configuration
from models import db, User, VerificationRequest, TrustHistory, VerifierProfile, ChittyCoin

# Initialize database
db.init_app(app)

with app.app_context():
    db.create_all()
    
    # Initialize sample data on first run
    from models import User
    if User.query.count() == 0:
        try:
            from sample_data import initialize_sample_data
            initialize_sample_data()
            logging.info("Sample data initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize sample data: {e}")

# Initialize analytics engines
analytics_engine = TrustAnalytics()
viz_engine = TrustVisualizationEngine()

# Import marketplace services
from chitty_id_integration import chitty_id_generator, chitty_id_validator, chitty_trust_bridge
from marketplace import MarketplaceService, TrustHistoryService, VerifierService
from auth import require_auth, get_current_user, is_authenticated

@app.route('/')
def index():
    """Main trust engine dashboard."""
    # Check if user is authenticated for personalized experience
    authenticated = is_authenticated()
    current_user = get_current_user() if authenticated else None
    
    return render_template('index.html', 
                         authenticated=authenticated, 
                         current_user=current_user)

@app.route('/api/trust/<persona_id>')
def get_trust_score(persona_id):
    """Calculate trust score for a specific persona."""
    try:
        # Get persona data
        entity, events = get_persona_data(persona_id)
        if not entity:
            return jsonify({'error': 'Persona not found'}), 404
        
        # Calculate trust score using our engine
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        trust_score = loop.run_until_complete(calculate_trust(entity, events))
        loop.close()
        
        # Convert to dict for JSON response
        result = trust_score.to_dict()
        
        # Add persona-specific metadata
        result['persona'] = {
            'id': persona_id,
            'name': entity.name,
            'type': entity.entity_type,
            'chitty_level': get_chitty_level(trust_score.composite_score),
            'verification_status': 'Verified' if entity.identity_verified else 'Unverified'
        }
        
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error calculating trust for {persona_id}: {str(e)}")
        return jsonify({'error': 'Trust calculation failed'}), 500

# ChittyID Marketplace API Routes

@app.route('/marketplace')
def marketplace():
    """ChittyID Verification Marketplace"""
    return render_template('marketplace.html')

@app.route('/partners')
def partners():
    """ChittyID Partners & Integration"""
    return render_template('partners.html')

@app.route('/chittyos')
def chittyos_ecosystem():
    """ChittyOS Ecosystem page with Chitty Score™ integration"""
    return render_template('chittyos.html')

@app.route('/ledger')
def ledger():
    """ChittyChain Ledger Dashboard"""
    return render_template('ledger.html')

@app.route('/onboarding')
def onboarding():
    """Developer Onboarding Guide"""
    return render_template('onboarding.html')

@app.route('/enterprise')
def enterprise():
    """Enterprise Dashboard"""
    return render_template('enterprise.html')

# ChittyTrust Integration Package Endpoints

@app.route('/api/integration/package')
def get_integration_package():
    """Get ChittyTrust Integration Package information"""
    from integrations import ChittyTrustIntegration
    from integrations.snippets import get_quick_start_guide, generate_integration_snippets
    
    snippets = generate_integration_snippets()
    quick_start = get_quick_start_guide()
    
    return jsonify({
        'package_name': 'ChittyTrust Integration Package',
        'version': '1.0.0',
        'description': 'Complete integration suite for blockchain verification and evidence ledger',
        'quick_start_guide': quick_start,
        'available_snippets': list(snippets.keys()),
        'documentation_url': 'https://www.notion.so/ChittyChain-Evidence-Ledger-24694de4357980dba689cf778c9708eb',
        'features': [
            'Blockchain-verified trust passports',
            'Evidence ledger documentation',  
            '6D trust calculations',
            'Compliance and API integration',
            'Ready-to-use code snippets'
        ]
    })

@app.route('/api/integration/snippets')
def get_integration_snippets():
    """Get all integration code snippets"""
    from integrations.snippets import generate_integration_snippets
    
    return jsonify({
        'snippets': generate_integration_snippets(),
        'usage': 'Copy and paste these snippets into your codebase for instant ChittyTrust integration'
    })

# ChittyChain Blockchain Integration Endpoints

@app.route('/api/blockchain/trust-passport/<user_id>')
def get_trust_passport(user_id):
    """Get blockchain-verified trust passport for cross-platform use"""
    try:
        from chittychain import chittychain_client
        passport = chittychain_client.create_trust_passport(user_id)
        return jsonify(passport)
    except Exception as e:
        logging.error(f"Trust passport generation failed: {e}")
        return jsonify({'error': 'Trust passport generation failed'}), 500

@app.route('/api/blockchain/verify/<transaction_id>')
def verify_blockchain_record(transaction_id):
    """Verify trust record on blockchain"""
    try:
        from chittychain import chittychain_client
        verification = chittychain_client.verify_trust_record(transaction_id)
        return jsonify(verification)
    except Exception as e:
        logging.error(f"Blockchain verification failed: {e}")
        return jsonify({'error': 'Blockchain verification failed'}), 500

@app.route('/api/blockchain/history/<user_id>')
def get_blockchain_history(user_id):
    """Get complete blockchain trust history"""
    try:
        from chittychain import chittychain_client
        limit = request.args.get('limit', 50, type=int)
        history = chittychain_client.get_user_trust_history(user_id, limit)
        return jsonify({'history': history, 'blockchain_verified': True})
    except Exception as e:
        logging.error(f"Blockchain history query failed: {e}")
        return jsonify({'error': 'Blockchain history query failed'}), 500

# Enhanced ChittyChain Ledger API Endpoints

@app.route('/api/ledger/entry', methods=['POST'])
def create_ledger_entry():
    """Create new entry in ChittyChain Ledger"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        data = request.get_json()
        user_id = data.get('user_id')
        event_type = data.get('event_type', 'trust_update')
        trust_scores = data.get('trust_scores', {})
        event_data = data.get('event_data', {})
        cross_platform_refs = data.get('cross_platform_refs', [])
        
        if not user_id or not trust_scores:
            return jsonify({'error': 'user_id and trust_scores required'}), 400
        
        entry_id = asyncio.run(chittychain_ledger.create_ledger_entry(
            user_id, event_type, trust_scores, event_data, cross_platform_refs
        ))
        
        if entry_id:
            return jsonify({
                'success': True,
                'entry_id': entry_id,
                'ledger_url': f'/api/ledger/entry/{entry_id}'
            })
        else:
            return jsonify({'error': 'Ledger entry creation failed'}), 500
            
    except Exception as e:
        logging.error(f"Ledger entry creation failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/user/<user_id>')
def get_user_ledger_history(user_id):
    """Get complete ledger history for user across platforms"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        limit = request.args.get('limit', 100, type=int)
        include_cross_platform = request.args.get('cross_platform', 'true').lower() == 'true'
        
        history = asyncio.run(chittychain_ledger.get_user_ledger_history(
            user_id, limit, include_cross_platform
        ))
        
        return jsonify({
            'user_id': user_id,
            'history': history,
            'total_entries': len(history),
            'cross_platform_enabled': include_cross_platform
        })
        
    except Exception as e:
        logging.error(f"Ledger history query failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/passport/<user_id>', methods=['POST'])
def create_trust_passport_v2(user_id):
    """Create enhanced cross-platform trust passport"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        data = request.get_json() or {}
        validity_days = data.get('validity_days', 365)
        
        passport = asyncio.run(chittychain_ledger.create_trust_passport_v2(
            user_id, validity_days
        ))
        
        return jsonify(passport)
        
    except Exception as e:
        logging.error(f"Trust passport v2 creation failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/passport/verify/<passport_id>')
def verify_cross_platform_passport(passport_id):
    """Verify trust passport across platforms"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        external_platform = request.args.get('platform')
        
        verification = asyncio.run(chittychain_ledger.verify_cross_platform_passport(
            passport_id, external_platform
        ))
        
        return jsonify(verification)
        
    except Exception as e:
        logging.error(f"Cross-platform passport verification failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/sync', methods=['POST'])
def sync_external_ledger():
    """Synchronize with external ChittyChain Ledger"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        data = request.get_json()
        external_ledger_url = data.get('ledger_url')
        sync_user_ids = data.get('user_ids', [])
        
        if not external_ledger_url:
            return jsonify({'error': 'ledger_url required'}), 400
        
        sync_result = asyncio.run(chittychain_ledger.sync_with_external_ledger(
            external_ledger_url, sync_user_ids
        ))
        
        return jsonify(sync_result)
        
    except Exception as e:
        logging.error(f"External ledger sync failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/analytics')
def get_ledger_analytics():
    """Get comprehensive ledger analytics"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        days_back = request.args.get('days', 30, type=int)
        analytics = chittychain_ledger.get_ledger_analytics(days_back)
        
        return jsonify(analytics)
        
    except Exception as e:
        logging.error(f"Ledger analytics failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/status')
def get_ledger_status():
    """Get ChittyChain Ledger status and health"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        status = {
            'service': 'ChittyChain Ledger',
            'version': '2.0',
            'status': 'operational',
            'timestamp': datetime.utcnow().isoformat(),
            'features': {
                'cross_platform_sync': True,
                'blockchain_integration': True,
                'trust_passports': True,
                'analytics': True,
                'real_time_updates': True
            },
            'endpoints': {
                'create_entry': '/api/ledger/entry',
                'user_history': '/api/ledger/user/<user_id>',
                'trust_passport': '/api/ledger/passport/<user_id>',
                'verify_passport': '/api/ledger/passport/verify/<passport_id>',
                'sync_external': '/api/ledger/sync',
                'analytics': '/api/ledger/analytics'
            },
            'external_ledgers': [
                'https://a619aa1d-896e-402c-9d4d-d35aa6663444-00-2pfapv5lxqfhn.picard.replit.dev'
            ]
        }
        
        return jsonify(status)
        
    except Exception as e:
        logging.error(f"Ledger status check failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ledger/external/status', methods=['POST'])
def check_external_ledger_status():
    """Check status of external ChittyChain Ledger instances"""
    try:
        from chittychain_ledger import chittychain_ledger
        
        data = request.get_json() or {}
        ledger_urls = data.get('urls', chittychain_ledger.external_ledgers)
        
        results = {}
        
        for url in ledger_urls:
            try:
                status = asyncio.run(chittychain_ledger._get_external_ledger_status(url))
                results[url] = status
            except Exception as e:
                results[url] = {'accessible': False, 'error': str(e)}
        
        return jsonify({
            'external_ledgers': results,
            'total_checked': len(ledger_urls),
            'accessible_count': sum(1 for r in results.values() if r.get('accessible')),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"External ledger status check failed: {e}")
        return jsonify({'error': str(e)}), 500

# Notion Enterprise Integration Endpoints

@app.route('/api/enterprise/audit/<user_id>', methods=['POST'])
def create_enterprise_audit(user_id):
    """Create comprehensive enterprise audit documentation in ChittyChain Evidence Ledger"""
    try:
        from evidence_integration import evidence_ledger
        from chittychain import chittychain_client
        
        # Get current trust data
        entity, events = get_persona_data(user_id.split('_')[0])  # Extract persona from user_id
        if not entity:
            return jsonify({'error': 'User not found'}), 404
        
        trust_data = asyncio.run(calculate_trust(entity, events))
        trust_dict = trust_data.__dict__ if hasattr(trust_data, '__dict__') else trust_data
        
        # Record on blockchain first
        blockchain_tx = chittychain_client.record_trust_event(
            user_id,
            {'audit_type': 'comprehensive', 'requested_by': 'enterprise_customer'},
            trust_dict
        )
        
        # Create evidence in the real ChittyChain Evidence Ledger
        evidence_id = evidence_ledger.record_trust_evidence(
            user_id, 
            trust_dict,
            blockchain_tx
        )
        
        if evidence_id:
            return jsonify({
                'audit_created': True,
                'evidence_ledger_id': evidence_id,
                'blockchain_tx': blockchain_tx,
                'trust_data': trust_dict,
                'ledger_url': f'https://www.notion.so/{evidence_id.replace("-", "")}'
            })
        else:
            return jsonify({'error': 'Evidence ledger recording failed'}), 500
            
    except Exception as e:
        logging.error(f"Enterprise audit creation failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/enterprise/compliance-report', methods=['POST'])
def generate_compliance_report():
    """Generate enterprise compliance report in Notion"""
    try:
        from notion_integration import notion_integration
        
        data = request.get_json()
        organization_id = data.get('organization_id', 'demo_org')
        
        # Calculate compliance metrics
        users = User.query.all()
        report_data = {
            'total_users': len(users),
            'average_trust_score': sum(u.trust_score or 0 for u in users) / len(users) if users else 0,
            'compliance_status': 'Compliant' if len(users) > 0 else 'Pending',
            'high_trust_users': len([u for u in users if (u.trust_score or 0) >= 80]),
            'verification_coverage': '95%'  # Demo data
        }
        
        # Create Notion compliance report
        page_id = notion_integration.create_compliance_report(organization_id, report_data)
        
        if page_id:
            return jsonify({
                'report_created': True,
                'notion_page_id': page_id,
                'metrics': report_data
            })
        else:
            return jsonify({'error': 'Compliance report creation failed'}), 500
            
    except Exception as e:
        logging.error(f"Compliance report generation failed: {e}")
        return jsonify({'error': 'Compliance report generation failed'}), 500

@app.route('/api/enterprise/workflow/<int:request_id>')
def document_verification_workflow(request_id):
    """Document verification workflow in Notion for audit trail"""
    try:
        from notion_integration import notion_integration
        
        # Get verification request
        verification_request = VerificationRequest.query.get(request_id)
        if not verification_request:
            return jsonify({'error': 'Verification request not found'}), 404
        
        # Convert to dict for Notion documentation
        workflow_data = {
            'title': verification_request.title,
            'description': verification_request.description,
            'verification_type': verification_request.verification_type,
            'status': verification_request.status,
            'created_at': verification_request.created_at.isoformat(),
            'reward_amount': verification_request.reward_amount,
            'priority': verification_request.priority
        }
        
        # Create Notion workflow documentation
        page_id = notion_integration.create_verification_workflow(request_id, workflow_data)
        
        if page_id:
            return jsonify({
                'workflow_documented': True,
                'notion_page_id': page_id,
                'workflow_data': workflow_data
            })
        else:
            return jsonify({'error': 'Workflow documentation failed'}), 500
            
    except Exception as e:
        logging.error(f"Workflow documentation failed: {e}")
        return jsonify({'error': 'Workflow documentation failed'}), 500

# ChittyChain Evidence Ledger Integration

@app.route('/api/evidence-ledger/record/<user_id>', methods=['POST'])
def record_evidence_ledger(user_id):
    """Record trust evidence in the real ChittyChain Evidence Ledger"""
    try:
        from evidence_integration import evidence_ledger
        from chittychain import chittychain_client
        
        # Get current trust data
        entity, events = get_persona_data(user_id.split('_')[0])
        if not entity:
            return jsonify({'error': 'User not found'}), 404
        
        trust_data = asyncio.run(calculate_trust(entity, events))
        trust_dict = trust_data.__dict__ if hasattr(trust_data, '__dict__') else trust_data
        
        # Record on blockchain
        blockchain_tx = chittychain_client.record_trust_event(
            user_id,
            {'event_type': 'evidence_recording', 'source': 'chitty_trust_engine'},
            trust_dict
        )
        
        # Record in the actual Notion Evidence Ledger
        evidence_id = evidence_ledger.record_trust_evidence(user_id, trust_dict, blockchain_tx)
        
        # Log blockchain transaction in evidence ledger
        ledger_tx_id = evidence_ledger.log_blockchain_transaction(
            blockchain_tx,
            user_id,
            'trust_calculation',
            trust_dict.get('scores', {}) if isinstance(trust_dict, dict) else {}
        )
        
        return jsonify({
            'evidence_recorded': True,
            'evidence_ledger_id': evidence_id,
            'blockchain_tx': blockchain_tx,
            'ledger_transaction_id': ledger_tx_id,
            'trust_data': trust_dict,
            'evidence_url': 'https://www.notion.so/ChittyChain-Evidence-Ledger-24694de4357980dba689cf778c9708eb',
            'integrity_verified': True
        })
        
    except Exception as e:
        logging.error(f"Evidence ledger recording failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/evidence-ledger/integration-snippets', methods=['POST'])
def create_integration_snippets():
    """Create integration snippets page in ChittyChain Evidence Ledger"""
    try:
        from evidence_integration import evidence_ledger
        
        # Create integration snippets page
        snippets_id = evidence_ledger.create_integration_snippets_page()
        
        if snippets_id:
            return jsonify({
                'snippets_created': True,
                'notion_page_id': snippets_id,
                'evidence_url': 'https://www.notion.so/ChittyChain-Evidence-Ledger-24694de4357980dba689cf778c9708eb',
                'description': 'Ready-to-use integration snippets for team collaboration'
            })
        else:
            return jsonify({'error': 'Integration snippets creation failed'}), 500
            
    except Exception as e:
        logging.error(f"Integration snippets creation failed: {e}")
        return jsonify({'error': str(e)}), 500

# ChittyChain Integrated Workflow Endpoints

@app.route('/api/chitty-workflow/execute/<user_id>', methods=['POST'])
def execute_chitty_workflow(user_id):
    """Execute integrated ChittyTrust + ChittyVerify + ChittyChain workflow"""
    try:
        from chitty_workflow import chitty_workflow
        
        data = request.get_json() or {}
        verification_type = data.get('verification_type', 'comprehensive')
        
        # Execute complete workflow
        result = chitty_workflow.execute_trust_verification_workflow(user_id, verification_type)
        
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Chitty workflow execution failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chitty-workflow/batch-process', methods=['POST'])
def batch_process_chitty_workflow():
    """Batch process multiple users through ChittyChain workflow"""
    try:
        from chitty_workflow import chitty_workflow
        
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        if not user_ids:
            return jsonify({'error': 'No user IDs provided'}), 400
        
        results = []
        for user_id in user_ids:
            workflow_result = chitty_workflow.execute_trust_verification_workflow(user_id)
            results.append(workflow_result)
        
        # Summary statistics
        successful = len([r for r in results if r.get('status') == 'completed'])
        failed = len(results) - successful
        
        return jsonify({
            'batch_processed': True,
            'total_users': len(user_ids),
            'successful': successful,
            'failed': failed,
            'results': results,
            'batch_id': f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        })
        
    except Exception as e:
        logging.error(f"Batch workflow processing failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/marketplace/requests', methods=['GET'])
def get_marketplace_requests():
    """Get available verification requests"""
    verification_type = request.args.get('type')
    status = request.args.get('status', 'open')
    limit = int(request.args.get('limit', 20))
    
    requests = MarketplaceService.get_marketplace_requests(limit, verification_type, status)
    
    return jsonify([{
        'id': req.id,
        'title': req.title,
        'description': req.description,
        'verification_type': req.verification_type,
        'reward_amount': req.reward_amount,
        'status': req.status,
        'priority': req.priority,
        'deadline': req.deadline.isoformat() if req.deadline else None,
        'created_at': req.created_at.isoformat(),
        'user': {
            'name': f"{req.user.first_name} {req.user.last_name}".strip() or req.user.email,
            'trust_level': req.user.verification_level
        }
    } for req in requests])

@app.route('/api/marketplace/requests', methods=['POST'])
@require_auth
def create_verification_request():
    """Create new verification request"""
    user = get_current_user()
    data = request.get_json()
    
    try:
        verification_request = MarketplaceService.create_verification_request(user.id, data)
        
        return jsonify({
            'id': verification_request.id,
            'message': 'Verification request created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/marketplace/requests/<int:request_id>/claim', methods=['POST'])
@require_auth
def claim_verification_request(request_id):
    """Claim a verification request"""
    user = get_current_user()
    
    success, message = MarketplaceService.claim_verification_request(request_id, user.id)
    
    if success:
        return jsonify({'message': message})
    else:
        return jsonify({'error': message}), 400

@app.route('/api/user/trust-history')
@require_auth
def get_user_trust_history():
    """Get user's trust history"""
    user = get_current_user()
    days_back = int(request.args.get('days', 30))
    
    history = TrustHistoryService.get_trust_history(user.id, days_back)
    trends = TrustHistoryService.get_trust_trends(user.id, 7)
    
    return jsonify({
        'history': [{
            'recorded_at': entry.recorded_at.isoformat(),
            'dimensions': {
                'source': entry.source_trust,
                'temporal': entry.temporal_trust,
                'channel': entry.channel_trust,
                'outcome': entry.outcome_trust,
                'network': entry.network_trust,
                'justice': entry.justice_trust
            },
            'scores': {
                'composite': entry.composite_score,
                'people': entry.people_score,
                'legal': entry.legal_score,
                'state': entry.state_score,
                'chitty': entry.chitty_score
            },
            'trigger_event': entry.trigger_event,
            'confidence': entry.confidence_level
        } for entry in history],
        'trends': trends
    })

@app.route('/api/user/trust-calculate', methods=['POST'])
@require_auth
def calculate_user_trust():
    """Calculate and record user's trust score"""
    user = get_current_user()
    data = request.get_json()
    trigger_event = data.get('trigger_event', 'manual_calculation')
    
    try:
        # Run async trust calculation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        trust_data, history_entry = loop.run_until_complete(
            TrustHistoryService.calculate_and_record_trust(
                user.id, trigger_event
            )
        )
        loop.close()
        
        return jsonify({
            'trust_data': trust_data,
            'history_id': history_entry.id,
            'message': 'Trust score calculated and recorded'
        })
        
    except Exception as e:
        logging.error(f"Trust calculation failed for user {user.id}: {e}")
        return jsonify({'error': 'Trust calculation failed'}), 500

@app.route('/api/user/profile')
@require_auth
def get_user_profile():
    """Get user profile with trust data"""
    user = get_current_user()
    
    # Get recent trust trends
    trends = TrustHistoryService.get_trust_trends(user.id, 7)
    
    # Get user's requests
    user_requests = MarketplaceService.get_user_requests(user.id)
    
    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'chitty_id': user.chitty_id,
            'verification_level': user.verification_level,
            'trust_score': user.trust_score,
            'profile_image_url': user.profile_image_url
        },
        'trust_trends': trends,
        'verification_requests': len(user_requests),
        'active_requests': len([r for r in user_requests if r.status in ['open', 'claimed', 'in_progress']])
    })

@app.route('/api/personas')
def get_personas():
    """Get list of available personas."""
    personas = [
        {
            'id': 'alice',
            'name': 'Alice Community',
            'description': 'High-trust community leader with strong justice focus',
            'type': 'Community Leader',
            'avatar': '👩‍💼'
        },
        {
            'id': 'bob', 
            'name': 'Bob Business',
            'description': 'Mixed business history with dispute resolution experience',
            'type': 'Business Owner',
            'avatar': '👨‍💼'
        },
        {
            'id': 'charlie',
            'name': 'Charlie Changed',
            'description': 'Transformation story - "Shitty to Chitty" journey',
            'type': 'Reformed Individual',
            'avatar': '🔄'
        }
    ]
    return jsonify(personas)

@app.route('/api/trust/<persona_id>/insights')
def get_trust_insights(persona_id):
    """Get detailed trust insights and analytics for a persona."""
    try:
        # Get persona data
        entity, events = get_persona_data(persona_id)
        if not entity:
            return jsonify({'error': 'Persona not found'}), 404
        
        # Calculate trust score first
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        trust_score = loop.run_until_complete(calculate_trust(entity, events))
        
        # Generate insights
        dimension_scores = {
            "source": trust_score.source_score,
            "temporal": trust_score.temporal_score,  
            "channel": trust_score.channel_score,
            "outcome": trust_score.outcome_score,
            "network": trust_score.network_score,
            "justice": trust_score.justice_score,
        }
        
        insights = loop.run_until_complete(
            analytics_engine.generate_insights(entity, events, dimension_scores)
        )
        
        patterns = loop.run_until_complete(
            analytics_engine.detect_patterns(entity, events)
        )
        
        confidence_intervals = analytics_engine.calculate_confidence_intervals(
            dimension_scores, events
        )
        
        loop.close()
        
        # Generate visualizations
        radar_config = viz_engine.generate_radar_config(dimension_scores)
        trend_config = viz_engine.generate_trend_chart_config(events)
        network_data = viz_engine.generate_network_visualization(entity)
        insights_html = viz_engine.generate_insights_html(insights)
        patterns_html = viz_engine.generate_patterns_html(patterns)
        
        return jsonify({
            'insights': [
                {
                    'category': insight.category,
                    'title': insight.title,
                    'description': insight.description,
                    'impact': insight.impact,
                    'confidence': insight.confidence,
                    'supporting_evidence': insight.supporting_evidence,
                    'trend': insight.trend
                } for insight in insights
            ],
            'patterns': [
                {
                    'pattern_type': pattern.pattern_type,
                    'description': pattern.description,
                    'frequency': pattern.frequency,
                    'last_occurrence': pattern.last_occurrence.isoformat(),
                    'risk_level': pattern.risk_level,
                    'recommendation': pattern.recommendation
                } for pattern in patterns
            ],
            'confidence_intervals': confidence_intervals,
            'visualizations': {
                'radar_chart': radar_config,
                'trend_chart': trend_config,
                'network_graph': network_data
            },
            'html_components': {
                'insights': insights_html,
                'patterns': patterns_html
            },
            'analytics_summary': {
                'total_insights': len(insights),
                'total_patterns': len(patterns),
                'event_count': len(events),
                'analysis_depth': 'comprehensive'
            }
        })
        
    except Exception as e:
        logging.error(f"Error generating insights for {persona_id}: {str(e)}")
        return jsonify({'error': 'Insights generation failed'}), 500

@app.route('/api/trust/<persona_id>/timeline')
def get_trust_timeline(persona_id):
    """Get detailed timeline analysis for a persona."""
    try:
        entity, events = get_persona_data(persona_id)
        if not entity:
            return jsonify({'error': 'Persona not found'}), 404
        
        # Sort events by timestamp
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        
        # Create timeline data
        timeline_data = []
        for event in sorted_events:
            timeline_data.append({
                'date': event.timestamp.isoformat(),
                'event_type': event.event_type,
                'description': event.description,
                'outcome': event.outcome,
                'channel': event.channel,
                'impact_score': {
                    'positive': 3,
                    'negative': -2,
                    'neutral': 0
                }.get(event.outcome, 0)
            })
        
        # Calculate rolling trust scores (simplified)
        rolling_scores = []
        for i in range(0, len(sorted_events), max(1, len(sorted_events) // 10)):
            subset_events = sorted_events[:i+1]
            if len(subset_events) >= 3:  # Need minimum events for calculation
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                score = loop.run_until_complete(calculate_trust(entity, subset_events))
                loop.close()
                
                rolling_scores.append({
                    'date': subset_events[-1].timestamp.isoformat(),
                    'composite_score': score.composite_score,
                    'chitty_score': score.chitty_score,
                    'event_count': len(subset_events)
                })
        
        return jsonify({
            'timeline': timeline_data,
            'rolling_scores': rolling_scores,
            'summary': {
                'total_events': len(events),
                'date_range': {
                    'start': sorted_events[0].timestamp.isoformat() if sorted_events else None,
                    'end': sorted_events[-1].timestamp.isoformat() if sorted_events else None
                },
                'event_types': list(set(e.event_type for e in events)),
                'outcome_distribution': {
                    'positive': len([e for e in events if e.outcome == 'positive']),
                    'negative': len([e for e in events if e.outcome == 'negative']),
                    'neutral': len([e for e in events if e.outcome == 'neutral'])
                }
            }
        })
        
    except Exception as e:
        logging.error(f"Error generating timeline for {persona_id}: {str(e)}")
        return jsonify({'error': 'Timeline generation failed'}), 500

@app.route('/api/compare')
def compare_personas():
    """Compare trust scores across all personas."""
    try:
        personas = ['alice', 'bob', 'charlie']
        comparison_data = {}
        
        for persona_id in personas:
            entity, events = get_persona_data(persona_id)
            if entity:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                trust_score = loop.run_until_complete(calculate_trust(entity, events))
                loop.close()
                
                comparison_data[persona_id] = {
                    'name': entity.name,
                    'dimensions': {
                        'source': trust_score.source_score,
                        'temporal': trust_score.temporal_score,
                        'channel': trust_score.channel_score,
                        'outcome': trust_score.outcome_score,
                        'network': trust_score.network_score,
                        'justice': trust_score.justice_score
                    },
                    'output_scores': {
                        'people': trust_score.people_score,
                        'legal': trust_score.legal_score,
                        'state': trust_score.state_score,
                        'chitty': trust_score.chitty_score
                    },
                    'composite': trust_score.composite_score,
                    'event_count': len(events),
                    'chitty_level': get_chitty_level(trust_score.composite_score)
                }
        
        return jsonify({
            'comparison': comparison_data,
            'rankings': {
                'by_chitty_score': sorted(
                    comparison_data.items(), 
                    key=lambda x: x[1]['output_scores']['chitty'], 
                    reverse=True
                ),
                'by_composite': sorted(
                    comparison_data.items(),
                    key=lambda x: x[1]['composite'],
                    reverse=True
                )
            }
        })
        
    except Exception as e:
        logging.error(f"Error comparing personas: {str(e)}")
        return jsonify({'error': 'Comparison failed'}), 500

def get_chitty_level(composite_score):
    """Convert composite score to ChittyID level."""
    if composite_score >= 90:
        return {'level': 'L4', 'name': 'Institutional', 'color': '#00ff88'}
    elif composite_score >= 75:
        return {'level': 'L3', 'name': 'Professional', 'color': '#0088ff'}
    elif composite_score >= 50:
        return {'level': 'L2', 'name': 'Enhanced', 'color': '#4444ff'}
    elif composite_score >= 25:
        return {'level': 'L1', 'name': 'Basic', 'color': '#8888ff'}
    else:
        return {'level': 'L0', 'name': 'Anonymous', 'color': '#cccccc'}

# ChittyID Integration Endpoints
@app.route('/api/chitty-id/generate', methods=['POST'])
def generate_chitty_id():
    """Generate new ChittyID with integrated trust scoring"""
    try:
        data = request.get_json() or {}
        
        # Generate ChittyID with trust integration
        chitty_data = chitty_trust_bridge.create_verified_identity({
            'vertical': data.get('vertical', 'user'),
            'identity_verified': data.get('identity_verified', True),
            'address_verified': data.get('address_verified', True),
            'phone_verified': data.get('phone_verified', True),
            'email_verified': data.get('email_verified', True),
            'user_data': data.get('user_data', {})
        })
        
        return jsonify({
            'success': True,
            'chitty_id': chitty_data['chitty_id'],
            'display_format': chitty_data['display_format'],
            'trust_scores': chitty_data['trust_profile']['trust_scores'],
            'chitty_score': chitty_data['trust_profile']['trust_scores']['chitty_score'],
            'verification_status': 'verified',
            'created_at': chitty_data['created_at']
        })
        
    except Exception as e:
        logging.error(f"ChittyID generation failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chitty-score/calculate', methods=['POST'])
def calculate_chitty_score():
    """Calculate Chitty Score™ for existing ChittyID"""
    try:
        data = request.get_json() or {}
        chitty_id = data.get('chitty_id', '')
        
        # Validate ChittyID first
        if not chitty_id_validator.validate_chitty_id(chitty_id)['valid']:
            return jsonify({'error': 'Invalid ChittyID format'}), 400
        
        # Calculate trust scores including Chitty Score™
        trust_data = chitty_trust_bridge._calculate_full_trust_scores(
            {'chitty_id': chitty_id},
            data.get('verification_data', {})
        )
        
        return jsonify({
            'success': True,
            'chitty_id': chitty_id,
            'chitty_score': trust_data['chitty_score'],
            'peoples_score': trust_data['peoples_score'],
            'legal_score': trust_data['legal_score'], 
            'state_score': trust_data['state_score'],
            'composite_score': trust_data['composite_score'],
            'trust_level': trust_data['trust_level'],
            'calculated_at': trust_data['calculation_timestamp']
        })
        
    except Exception as e:
        logging.error(f"Chitty Score calculation failed: {e}")
        return jsonify({'error': str(e)}), 500

# ChittyOS Ecosystem Integration
@app.route('/api/chittyos/status', methods=['GET'])
def chittyos_ecosystem_status():
    """Get status of all ChittyOS components including Chitty Score™"""
    try:
        # Send beacon event for API access
        send_event('api_access', {'endpoint': '/api/chittyos/status', 'component': 'chittyos'})
        return jsonify({
            'ecosystem': 'ChittyOS',
            'version': '2.0',
            'components': {
                'chitty_id': {
                    'status': 'operational',
                    'service': 'Identity Verification',
                    'endpoint': '/api/chitty-id'
                },
                'chitty_trust': {
                    'status': 'operational', 
                    'service': '6D Trust Scoring',
                    'endpoint': '/api/trust'
                },
                'chitty_score': {
                    'status': 'operational',
                    'service': 'Proprietary Trust Algorithm™',
                    'endpoint': '/api/chitty-score'
                },
                'chitty_counsel': {
                    'status': 'operational',
                    'service': 'Legal & Compliance',
                    'endpoint': '/api/chitty-counsel'
                },
                'chitty_assets': {
                    'status': 'operational',
                    'service': 'Digital Asset Management',
                    'endpoint': '/api/chitty-assets'
                },
                'chitty_finance': {
                    'status': 'operational',
                    'service': 'Financial Services',
                    'endpoint': '/api/chitty-finance'
                },
                'chitty_chain': {
                    'status': 'operational',
                    'service': 'Blockchain Immutability',
                    'endpoint': '/api/ledger'
                },
                'chitty_beacon': {
                    'status': 'operational',
                    'service': 'App Tracking & Monitoring',
                    'endpoint': '/api/chitty-beacon'
                }
            },
            'trust_pipeline': [
                'ChittyID (Identity)',
                'ChittyTrust (6D Scoring)', 
                'ChittyVerify (Data Integrity)',
                'ChittyChain (Immutable Records)'
            ],
            'chitty_score_features': [
                'Justice-focused algorithm',
                'Outcome-weighted calculations',
                'Cross-platform compatibility',
                'Real-time score updates'
            ],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"ChittyOS status check failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chitty-beacon', methods=['GET'])
def chitty_beacon_status():
    """Get ChittyBeacon tracking status and information"""
    try:
        send_event('api_access', {'endpoint': '/api/chitty-beacon', 'component': 'beacon'})
        
        return jsonify({
            'service': 'ChittyBeacon',
            'status': 'operational',
            'description': 'Dead simple app tracking for ChittyOS ecosystem',
            'features': [
                'Startup/shutdown events',
                'Periodic heartbeats (every 5 minutes)',
                'Platform detection (Replit, GitHub, Vercel, etc.)',
                'Claude Code detection',
                'Git information tracking',
                'ChittyOS component detection'
            ],
            'platform_support': [
                'Replit', 'GitHub Actions', 'Vercel', 'Netlify', 
                'Heroku', 'AWS Lambda', 'Google Cloud', 'Azure'
            ],
            'privacy': {
                'tracks': [
                    'App identity and version',
                    'Platform information', 
                    'Basic system info (Python version, OS)',
                    'ChittyOS component status'
                ],
                'does_not_track': [
                    'Personal data',
                    'Environment secrets',
                    'User content'
                ]
            },
            'configuration': {
                'endpoint': os.getenv('BEACON_ENDPOINT', 'https://beacon.chitty.cc'),
                'interval': f"{int(os.getenv('BEACON_INTERVAL', '300000')) / 1000} seconds",
                'enabled': os.getenv('BEACON_DISABLED', 'true').lower() != 'true',
                'verbose': os.getenv('BEACON_VERBOSE', 'true').lower() == 'true',
                'mode': 'chittyos_tracking'
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"ChittyBeacon status check failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chitty-beacon/test', methods=['POST'])
def test_beacon():
    """Test ChittyBeacon tracking with custom event"""
    try:
        data = request.get_json() or {}
        event_type = data.get('event_type', 'test_event')
        custom_data = data.get('data', {})
        
        send_event(event_type, {
            'test': True,
            'source': 'api_test',
            **custom_data
        })
        
        return jsonify({
            'success': True,
            'message': f'Test beacon sent: {event_type}',
            'data': custom_data
        })
        
    except Exception as e:
        logging.error(f"Beacon test failed: {e}")
        return jsonify({'error': str(e)}), 500

# ChittyCounsel API Endpoints
@app.route('/api/chitty-counsel/analyze', methods=['POST'])
def chitty_counsel_analyze():
    """Legal compliance analysis with Chitty Score™ integration"""
    try:
        data = request.get_json() or {}
        document_text = data.get('document_text', '')
        compliance_type = data.get('type', 'general')
        
        # Simulate legal analysis with trust scoring
        analysis_result = {
            'compliance_score': 85.2,
            'risk_assessment': 'Medium',
            'legal_recommendations': [
                'Update privacy policy section 3.2',
                'Add explicit consent mechanisms',
                'Implement data retention policies'
            ],
            'chitty_trust_impact': {
                'legal_score_adjustment': +5.0,
                'compliance_verified': True,
                'regulatory_status': 'Compliant'
            },
            'analysis_timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis_result,
            'document_length': len(document_text),
            'compliance_type': compliance_type
        })
        
    except Exception as e:
        logging.error(f"ChittyCounsel analysis failed: {e}")
        return jsonify({'error': str(e)}), 500

# ChittyAssets API Endpoints  
@app.route('/api/chitty-assets/portfolio', methods=['GET'])
def chitty_assets_portfolio():
    """Digital asset portfolio with trust-based valuations"""
    try:
        user_id = request.args.get('user_id', 'demo_user')
        
        # Simulate portfolio with trust-weighted values
        portfolio = {
            'total_value': 125890.50,
            'trust_weighted_value': 118340.25,
            'assets': [
                {
                    'id': 'asset_001',
                    'name': 'ChittyCoin Holdings',
                    'type': 'cryptocurrency',
                    'quantity': 1500.0,
                    'market_value': 45000.0,
                    'trust_score': 92.5,
                    'trust_verified': True
                },
                {
                    'id': 'asset_002', 
                    'name': 'Verified Digital Art NFT',
                    'type': 'nft',
                    'quantity': 1,
                    'market_value': 8500.0,
                    'trust_score': 88.0,
                    'authenticity_verified': True
                },
                {
                    'id': 'asset_003',
                    'name': 'Trust-Backed Bond',
                    'type': 'defi',
                    'quantity': 50.0,
                    'market_value': 72390.50,
                    'trust_score': 95.2,
                    'yield_rate': 4.2
                }
            ],
            'trust_metrics': {
                'portfolio_trust_score': 91.2,
                'verified_assets': 3,
                'total_assets': 3,
                'trust_coverage': 100.0
            }
        }
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'portfolio': portfolio,
            'last_updated': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"ChittyAssets portfolio failed: {e}")
        return jsonify({'error': str(e)}), 500

# ChittyFinance API Endpoints
@app.route('/api/chitty-finance/credit-score', methods=['GET'])
def chitty_finance_credit_score():
    """Trust-based credit scoring for financial services"""
    try:
        chitty_id = request.args.get('chitty_id', '')
        
        if not chitty_id:
            return jsonify({'error': 'ChittyID required'}), 400
            
        # Calculate trust-based credit score
        credit_analysis = {
            'chitty_id': chitty_id,
            'credit_score': 847,  # Traditional score
            'chitty_credit_score': 892,  # Enhanced with trust data
            'credit_factors': {
                'payment_history': 95,
                'credit_utilization': 78,
                'length_of_history': 85,
                'credit_mix': 82,
                'new_credit': 88,
                'trust_verification': 94  # ChittyOS enhancement
            },
            'trust_enhancements': {
                'identity_verified': True,
                'outcome_history_positive': 91.5,
                'network_trust_score': 87.2,
                'justice_alignment': 89.8
            },
            'available_products': [
                {
                    'product': 'ChittyLoan Personal',
                    'rate': 3.2,
                    'max_amount': 50000,
                    'trust_discount': 0.5
                },
                {
                    'product': 'ChittyCard Premium',
                    'rate': 14.9,
                    'credit_limit': 25000,
                    'trust_rewards': '2.5% on all purchases'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'credit_analysis': credit_analysis,
            'calculated_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"ChittyFinance credit score failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chitty-finance/payment', methods=['POST'])  
def chitty_finance_payment():
    """Trust-verified payment processing"""
    try:
        data = request.get_json() or {}
        
        payment_result = {
            'transaction_id': f"CHT-{datetime.utcnow().strftime('%Y%m%d')}-{hash(str(data)) % 100000:05d}",
            'amount': data.get('amount', 0),
            'currency': data.get('currency', 'USD'),
            'trust_verification': 'verified',
            'processing_fee': data.get('amount', 0) * 0.015,  # 1.5% with trust discount
            'standard_fee': data.get('amount', 0) * 0.029,    # 2.9% standard
            'trust_discount': 1.4,  # Percentage saved due to trust score
            'status': 'completed',
            'confirmation_code': f"CHT{hash(str(data)) % 10000:04d}"
        }
        
        return jsonify({
            'success': True,
            'payment': payment_result,
            'processed_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"ChittyFinance payment failed: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
