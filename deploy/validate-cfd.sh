#!/bin/bash
# Validate ChittyCFD v1.0 Compliance
# Ensures all required components are present

set -e

echo "Validating ChittyCFD v1.0 compliance..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Function to check file existence
check_file() {
    local file=$1
    local required=${2:-true}

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        if [ "$required" = true ]; then
            echo -e "${RED}✗${NC} $file (REQUIRED)"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} $file (optional)"
            ((WARNINGS++))
        fi
    fi
}

# Check CFD metadata files
echo "CFD Metadata Files:"
check_file ".chittycfd/standard.yaml"
check_file ".chittycfd/upstream.yaml"
check_file ".chittycfd/deployment.yaml"
echo ""

# Check configuration files
echo "Configuration Files:"
check_file "config/aribia-litigation.yaml"
check_file "config/secrets.yaml"
check_file "config/development.yaml" false
check_file "config/staging.yaml" false
check_file "config/production.yaml" false
echo ""

# Check agent implementations
echo "Agent Implementations:"
check_file "custom/agents/evidence-agent.ts"
check_file "custom/agents/analysis-agent.ts"
check_file "custom/agents/litigation-agent.ts"
echo ""

# Check custom modules
echo "Custom Modules:"
check_file "custom/importers/marie-kondo-evidence-importer.ts"
check_file "custom/analyzers/contradiction-detector.ts" false
check_file "custom/analyzers/truth-scorer.ts" false
check_file "custom/analyzers/predictive-case-analytics.ts" false
echo ""

# Check deployment scripts
echo "Deployment Scripts:"
check_file "deploy/setup.sh"
check_file "deploy/apply-config.sh"
check_file "deploy/init-agents.sh"
check_file "deploy/validate-cfd.sh"
echo ""

# Check documentation
echo "Documentation:"
check_file "docs/configuration.md" false
check_file "docs/deployment.md" false
check_file "docs/agentic-architecture.md" false
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ CFD Validation: PASSED${NC}"
    echo "   Errors: $ERRORS"
    echo "   Warnings: $WARNINGS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ CFD Validation: FAILED${NC}"
    echo "   Errors: $ERRORS"
    echo "   Warnings: $WARNINGS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
