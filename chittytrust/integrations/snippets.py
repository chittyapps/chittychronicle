"""
ChittyTrust Integration Snippets
Code examples for team integration
"""

from integration_snippets import (
    trust_passport_snippet,
    evidence_ledger_snippet, 
    trust_calculation_snippet,
    compliance_integration_snippet,
    api_integration_snippet,
    generate_integration_snippets_for_notion
)

def generate_integration_snippets():
    """Generate all integration snippets"""
    return {
        'trust_passport': trust_passport_snippet,
        'evidence_ledger': evidence_ledger_snippet,
        'trust_calculation': trust_calculation_snippet,
        'compliance_integration': compliance_integration_snippet,
        'api_integration': api_integration_snippet
    }

def get_quick_start_guide():
    """Get quick start integration guide"""
    return """
# ChittyTrust Quick Start Integration

## 1. Install ChittyTrust Integration Package
```python
from integrations import ChittyTrustIntegration

# Initialize integration
chitty = ChittyTrustIntegration()
```

## 2. Generate Trust Passport
```python
passport = chitty.generate_trust_passport('user_123')
print(f"Trust Level: {passport['passport']['verification_level']}")
```

## 3. Record Evidence
```python
trust_data = {'composite': 85.3, 'justice': 92.1}
result = chitty.record_evidence('user_123', trust_data)
print(f"Evidence ID: {result['evidence_id']}")
```

## 4. Verify Blockchain Record
```python
verification = chitty.verify_blockchain_record('ctx_abc123')
print(f"Verified: {verification['blockchain_verified']}")
```
"""

__all__ = [
    'generate_integration_snippets',
    'get_quick_start_guide',
    'generate_integration_snippets_for_notion'
]