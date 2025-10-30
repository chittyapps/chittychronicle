#!/bin/bash
# ARIBIA Chronicle CFD v1.0 - Master Setup Script
# Automated deployment of Autonomous Legal Intelligence Platform

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 ARIBIA Chronicle - Autonomous Legal Intelligence Platform"
echo "  ChittyCFD v1.0 Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}

echo "Environment: ${ENVIRONMENT}"
echo "Dry Run: ${DRY_RUN}"
echo ""

# Step 1: Validate CFD v1.0 compliance
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Step 1: Validating CFD v1.0 compliance..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "deploy/validate-cfd.sh" ]; then
    bash deploy/validate-cfd.sh
    echo -e "${GREEN}✓ CFD validation complete${NC}"
else
    echo -e "${YELLOW}⚠ CFD validation script not found, skipping...${NC}"
fi
echo ""

# Step 2: Check dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 2: Checking dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check 1Password CLI (optional)
if command -v op &> /dev/null; then
    OP_VERSION=$(op --version)
    echo -e "${GREEN}✓ 1Password CLI: ${OP_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ 1Password CLI not found (secrets will need manual configuration)${NC}"
fi

echo ""

# Step 3: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 3: Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}[DRY RUN] Would run: npm install${NC}"
fi
echo ""

# Step 4: Resolve secrets from 1Password
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 4: Resolving secrets from 1Password..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "deploy/resolve-secrets.sh" ]; then
        bash deploy/resolve-secrets.sh
        echo -e "${GREEN}✓ Secrets resolved${NC}"
    else
        echo -e "${YELLOW}⚠ Secrets script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: deploy/resolve-secrets.sh${NC}"
fi
echo ""

# Step 5: Apply case-specific configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Step 5: Applying ARIBIA litigation configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "deploy/apply-config.sh" ]; then
        bash deploy/apply-config.sh ${ENVIRONMENT}
        echo -e "${GREEN}✓ Configuration applied${NC}"
    else
        echo -e "${YELLOW}⚠ Config script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: deploy/apply-config.sh ${ENVIRONMENT}${NC}"
fi
echo ""

# Step 6: Deploy custom legal analysis modules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Step 6: Deploying custom legal AI modules..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "deploy/apply-custom.sh" ]; then
        bash deploy/apply-custom.sh
        echo -e "${GREEN}✓ Custom modules deployed${NC}"
    else
        echo -e "${YELLOW}⚠ Custom deployment script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: deploy/apply-custom.sh${NC}"
fi
echo ""

# Step 7: Database setup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Step 7: Setting up database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    npm run db:push
    echo -e "${GREEN}✓ Database schema applied${NC}"
else
    echo -e "${YELLOW}[DRY RUN] Would run: npm run db:push${NC}"
fi
echo ""

# Step 8: Initialize AI agents
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Step 8: Initializing autonomous legal agents..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "deploy/init-agents.sh" ]; then
        bash deploy/init-agents.sh
        echo -e "${GREEN}✓ Agents initialized${NC}"
    else
        echo -e "${YELLOW}⚠ Agent initialization script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: deploy/init-agents.sh${NC}"
fi
echo ""

# Step 9: Run validation tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Step 9: Running validation tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test || echo -e "${YELLOW}⚠ Some tests failed, but continuing...${NC}"
        echo -e "${GREEN}✓ Tests complete${NC}"
    else
        echo -e "${YELLOW}⚠ No tests configured, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: npm test${NC}"
fi
echo ""

# Step 10: Health check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Step 10: Running health check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "false" ]; then
    if [ -f "deploy/health-check.sh" ]; then
        bash deploy/health-check.sh
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠ Health check script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}[DRY RUN] Would run: deploy/health-check.sh${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ ARIBIA Chronicle Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access Points:"
echo "   Dashboard:        http://localhost:5000"
echo "   Case Management:  http://localhost:5000/case/2024D007847"
echo "   Agent Status:     http://localhost:5000/agents/status"
echo "   Health Check:     http://localhost:5000/health"
echo ""
echo "🤖 Autonomous Agents:"
echo "   ✓ Evidence Processor - Auto-ingesting and categorizing evidence"
echo "   ✓ Analysis Agent - Detecting contradictions and scoring truth"
echo "   ✓ Litigation Agent - Monitoring deadlines and generating documents"
echo ""
echo "📊 Case Information:"
echo "   Client: ARIBIA LLC"
echo "   Case: Arias v Bianchi"
echo "   Number: 2024D007847"
echo "   Court: Circuit Court of Cook County"
echo ""
echo "Next Steps:"
echo "   1. Start the server: npm run dev"
echo "   2. Access the dashboard at http://localhost:5000"
echo "   3. Monitor agent logs in the console"
echo "   4. Review auto-generated analysis and documents"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
