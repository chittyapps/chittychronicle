#!/bin/bash
# ARIBIA Chronicle - Cloudflare Remote Deployment Setup
# Creates all necessary Cloudflare resources for remote deployment

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ☁️  ARIBIA Chronicle - Cloudflare Remote Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="aribia-chronicle"

echo "Environment: ${ENVIRONMENT}"
echo ""

# Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check wrangler CLI
if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version)
    echo -e "${GREEN}✓ Wrangler CLI: ${WRANGLER_VERSION}${NC}"
else
    echo -e "${RED}✗ Wrangler CLI not found${NC}"
    echo "  Installing wrangler..."
    npm install -g wrangler
fi

# Check cloudflare authentication
echo ""
echo "Checking Cloudflare authentication..."
if wrangler whoami &> /dev/null; then
    echo -e "${GREEN}✓ Cloudflare authenticated${NC}"
else
    echo -e "${YELLOW}⚠ Not authenticated with Cloudflare${NC}"
    echo "  Please run: wrangler login"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🗄️  Creating Cloudflare Resources"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Create D1 Database
echo -e "${BLUE}[1/6]${NC} Creating D1 Database..."
DB_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

if wrangler d1 list | grep -q "$DB_NAME"; then
    echo -e "${YELLOW}  Database '$DB_NAME' already exists${NC}"
else
    echo "  Creating new D1 database: $DB_NAME"
    wrangler d1 create "$DB_NAME"
    echo -e "${GREEN}✓ D1 database created${NC}"
fi
echo ""

# 2. Create R2 Buckets
echo -e "${BLUE}[2/6]${NC} Creating R2 Storage Buckets..."

# Evidence storage bucket
EVIDENCE_BUCKET="aribia-evidence-${ENVIRONMENT}"
if wrangler r2 bucket list | grep -q "$EVIDENCE_BUCKET"; then
    echo -e "${YELLOW}  Bucket '$EVIDENCE_BUCKET' already exists${NC}"
else
    echo "  Creating R2 bucket: $EVIDENCE_BUCKET"
    wrangler r2 bucket create "$EVIDENCE_BUCKET"
    echo -e "${GREEN}✓ Evidence storage bucket created${NC}"
fi

# Document storage bucket
DOCUMENT_BUCKET="aribia-documents-${ENVIRONMENT}"
if wrangler r2 bucket list | grep -q "$DOCUMENT_BUCKET"; then
    echo -e "${YELLOW}  Bucket '$DOCUMENT_BUCKET' already exists${NC}"
else
    echo "  Creating R2 bucket: $DOCUMENT_BUCKET"
    wrangler r2 bucket create "$DOCUMENT_BUCKET"
    echo -e "${GREEN}✓ Document storage bucket created${NC}"
fi
echo ""

# 3. Create KV Namespaces
echo -e "${BLUE}[3/6]${NC} Creating KV Namespaces..."

# Agent state KV
AGENT_KV="${PROJECT_NAME}-agent-state-${ENVIRONMENT}"
if wrangler kv:namespace list | grep -q "$AGENT_KV"; then
    echo -e "${YELLOW}  KV namespace '$AGENT_KV' already exists${NC}"
else
    echo "  Creating KV namespace: $AGENT_KV"
    wrangler kv:namespace create "$AGENT_KV"
    echo -e "${GREEN}✓ Agent state KV created${NC}"
fi

# Cache KV
CACHE_KV="${PROJECT_NAME}-cache-${ENVIRONMENT}"
if wrangler kv:namespace list | grep -q "$CACHE_KV"; then
    echo -e "${YELLOW}  KV namespace '$CACHE_KV' already exists${NC}"
else
    echo "  Creating KV namespace: $CACHE_KV"
    wrangler kv:namespace create "$CACHE_KV"
    echo -e "${GREEN}✓ Cache KV created${NC}"
fi
echo ""

# 4. Apply Database Schema
echo -e "${BLUE}[4/6]${NC} Applying Database Schema..."
if [ -f "drizzle/schema.sql" ]; then
    echo "  Applying schema to D1 database..."
    wrangler d1 execute "$DB_NAME" --file=drizzle/schema.sql --env="$ENVIRONMENT"
    echo -e "${GREEN}✓ Schema applied${NC}"
else
    echo -e "${YELLOW}  Schema file not found, skipping...${NC}"
fi
echo ""

# 5. Set Secrets
echo -e "${BLUE}[5/6]${NC} Setting Secrets..."
echo ""
echo "You need to manually set the following secrets:"
echo ""
echo "  wrangler secret put ANTHROPIC_API_KEY --env=$ENVIRONMENT"
echo "  wrangler secret put CHITTYID_SERVICE_TOKEN --env=$ENVIRONMENT"
echo "  wrangler secret put CHITTYCHAIN_API_KEY --env=$ENVIRONMENT"
echo "  wrangler secret put SESSION_SECRET --env=$ENVIRONMENT"
echo ""
echo -e "${YELLOW}⚠ Run these commands after setup completes${NC}"
echo ""

# 6. Build Application
echo -e "${BLUE}[6/6]${NC} Building Application..."
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Cloudflare Resources Created!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Resources Created:"
echo "  ✓ D1 Database: $DB_NAME"
echo "  ✓ R2 Bucket (Evidence): $EVIDENCE_BUCKET"
echo "  ✓ R2 Bucket (Documents): $DOCUMENT_BUCKET"
echo "  ✓ KV Namespace (Agent State): $AGENT_KV"
echo "  ✓ KV Namespace (Cache): $CACHE_KV"
echo ""
echo "Next Steps:"
echo ""
echo "1. Update wrangler.aribia.toml with resource IDs:"
echo "   - Get D1 ID: wrangler d1 list"
echo "   - Get KV IDs: wrangler kv:namespace list"
echo ""
echo "2. Set secrets (required):"
echo "   wrangler secret put ANTHROPIC_API_KEY --env=$ENVIRONMENT"
echo "   wrangler secret put SESSION_SECRET --env=$ENVIRONMENT"
echo ""
echo "3. Deploy to Cloudflare:"
echo "   bash deploy/cloudflare-deploy.sh $ENVIRONMENT"
echo ""
echo "4. Access your deployment:"
echo "   https://aribia-chronicle.chitty.cc"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
