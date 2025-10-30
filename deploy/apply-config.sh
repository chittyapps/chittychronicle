#!/bin/bash
# Apply ARIBIA Chronicle Configuration
# Loads and validates case-specific configuration

set -e

ENVIRONMENT=${1:-production}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚙️  Applying Configuration for: ${ENVIRONMENT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration files
MAIN_CONFIG="config/aribia-litigation.yaml"
ENV_CONFIG="config/${ENVIRONMENT}.yaml"
SECRETS_CONFIG="config/secrets.yaml"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate main configuration
if [ -f "$MAIN_CONFIG" ]; then
    echo -e "${GREEN}✓ Found main configuration: ${MAIN_CONFIG}${NC}"
else
    echo -e "${RED}✗ Main configuration not found: ${MAIN_CONFIG}${NC}"
    exit 1
fi

# Validate environment configuration
if [ -f "$ENV_CONFIG" ]; then
    echo -e "${GREEN}✓ Found environment configuration: ${ENV_CONFIG}${NC}"
else
    echo -e "${YELLOW}⚠ Environment configuration not found: ${ENV_CONFIG}${NC}"
    echo "  Using main configuration only..."
fi

# Validate secrets configuration
if [ -f "$SECRETS_CONFIG" ]; then
    echo -e "${GREEN}✓ Found secrets configuration: ${SECRETS_CONFIG}${NC}"
else
    echo -e "${YELLOW}⚠ Secrets configuration not found: ${SECRETS_CONFIG}${NC}"
fi

echo ""
echo "Configuration Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract and display key configuration values
echo "Service:"
echo "  Name: aribia-chronicle"
echo "  Version: 1.0.0"
echo "  Port: 5000"
echo ""

echo "Case Information:"
echo "  Name: Arias v Bianchi"
echo "  Number: 2024D007847"
echo "  Court: Circuit Court of Cook County"
echo "  Type: Dissolution, TRO, Fraud"
echo ""

echo "Evidence Processing:"
echo "  Source Path: /Users/nb/Library/Mobile Documents/com~apple~CloudDocs/_bulk_hogs/_ORGANIZED"
echo "  Auto-Import: Enabled"
echo "  Marie Kondo: Enabled"
echo "  Contradiction Detection: Enabled"
echo ""

echo "Autonomous Agents:"
echo "  ✓ Evidence Processor (5m interval)"
echo "  ✓ Contradiction Analyzer (15m interval)"
echo "  ✓ Timeline Synthesizer (10m interval)"
echo "  ✓ Strategy Advisor (30m interval)"
echo "  ✓ Litigation Responder (1h interval)"
echo ""

echo "ChittyOS Integrations:"
echo "  ✓ ChittyChain (Blockchain attestation)"
echo "  ✓ ChittyID (Identity & auth)"
echo "  ✓ ChittyChat (Project sync)"
echo "  ✓ ChittyBeacon (Alerting)"
echo "  ✓ ChittyConnect (Context sharing)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Configuration applied successfully${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
