#!/bin/bash
#
# Phase 1 Deployment Validation Script
# Validates that Phase 1 is ready for production deployment
#
# Usage:
#   ./scripts/validate-deployment.sh staging
#   ./scripts/validate-deployment.sh production
#

set -e

ENV=${1:-staging}
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════════"
echo "  Phase 1 Deployment Validation"
echo "  Environment: $ENV"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Load environment variables
if [ -f ".env.$ENV" ]; then
    source ".env.$ENV"
elif [ -f ".env" ]; then
    source ".env"
else
    echo -e "${YELLOW}⚠️  Warning: No .env file found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Helper functions
check_required() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ FAIL: $var_name is not set${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo -e "${GREEN}✅ PASS: $var_name is set${NC}"
        return 0
    fi
}

check_optional() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠️  WARN: $var_name is not set (optional)${NC}"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}✅ PASS: $var_name is set${NC}"
        return 0
    fi
}

test_endpoint() {
    local url=$1
    local expected_status=${2:-200}

    if command -v curl &> /dev/null; then
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        if [ "$status" == "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS: $url ($status)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAIL: $url (got $status, expected $expected_status)${NC}"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  WARN: curl not installed, skipping endpoint test${NC}"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

# Section 1: Environment Variables
echo ""
echo "─────────────────────────────────────────────────────────"
echo "1. Environment Variables"
echo "─────────────────────────────────────────────────────────"
echo ""

check_required "DATABASE_URL"
check_required "OPENAI_API_KEY"
check_required "ANTHROPIC_API_KEY"
check_optional "ENABLE_HYBRID_SEARCH"
check_optional "ENABLE_RAG"
check_optional "EMBEDDING_MODEL"
check_optional "EMBEDDING_DIMENSIONS"

# Section 2: Database Checks
echo ""
echo "─────────────────────────────────────────────────────────"
echo "2. Database Checks"
echo "─────────────────────────────────────────────────────────"
echo ""

if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    # Check pgvector extension
    echo "Checking pgvector extension..."
    if psql "$DATABASE_URL" -t -c "SELECT 1 FROM pg_extension WHERE extname = 'vector';" | grep -q 1; then
        echo -e "${GREEN}✅ PASS: pgvector extension installed${NC}"
    else
        echo -e "${RED}❌ FAIL: pgvector extension not installed${NC}"
        echo "   Run: psql -d \$DATABASE_URL -c 'CREATE EXTENSION vector;'"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for embedding columns
    echo "Checking vector columns..."
    if psql "$DATABASE_URL" -t -c "\d timeline_entries" | grep -q "content_embedding"; then
        echo -e "${GREEN}✅ PASS: Vector columns exist${NC}"
    else
        echo -e "${RED}❌ FAIL: Vector columns missing${NC}"
        echo "   Run migration: psql -d \$DATABASE_URL -f migrations/001_add_pgvector.sql"
        ERRORS=$((ERRORS + 1))
    fi

    # Check embedding coverage
    echo "Checking embedding coverage..."
    coverage=$(psql "$DATABASE_URL" -t -c "SELECT coverage_percentage FROM embedding_coverage WHERE table_name = 'timeline_entries';" | tr -d ' ')
    if [ -n "$coverage" ]; then
        echo -e "${BLUE}ℹ️  INFO: Embedding coverage: ${coverage}%${NC}"
        if (( $(echo "$coverage < 50" | bc -l) )); then
            echo -e "${YELLOW}⚠️  WARN: Low embedding coverage (<50%)${NC}"
            echo "   Run: npm run embeddings:generate"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  WARN: Could not check embedding coverage${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARN: psql not installed or DATABASE_URL not set, skipping DB checks${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Section 3: Dependencies
echo ""
echo "─────────────────────────────────────────────────────────"
echo "3. Dependencies"
echo "─────────────────────────────────────────────────────────"
echo ""

if [ -f "package.json" ]; then
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ PASS: node_modules directory exists${NC}"
    else
        echo -e "${RED}❌ FAIL: node_modules not found${NC}"
        echo "   Run: npm install"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for required packages
    if grep -q '"openai"' package.json; then
        echo -e "${GREEN}✅ PASS: openai package in package.json${NC}"
    else
        echo -e "${RED}❌ FAIL: openai package missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q '"@anthropic-ai/sdk"' package.json; then
        echo -e "${GREEN}✅ PASS: @anthropic-ai/sdk package in package.json${NC}"
    else
        echo -e "${RED}❌ FAIL: @anthropic-ai/sdk package missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Section 4: File Structure
echo ""
echo "─────────────────────────────────────────────────────────"
echo "4. File Structure"
echo "─────────────────────────────────────────────────────────"
echo ""

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ PASS: $1 exists${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: $1 missing${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_file "migrations/001_add_pgvector.sql"
check_file "server/embeddingService.ts"
check_file "server/hybridSearchService.ts"
check_file "server/ragService.ts"
check_file "server/sotaRoutes.ts"
check_file "scripts/generate-embeddings.ts"
check_file "docs/PHASE1_DEPLOYMENT_GUIDE.md"

# Section 5: Build Check
echo ""
echo "─────────────────────────────────────────────────────────"
echo "5. Build Check"
echo "─────────────────────────────────────────────────────────"
echo ""

if command -v npm &> /dev/null; then
    echo "Running TypeScript type check..."
    if npm run check &> /dev/null; then
        echo -e "${GREEN}✅ PASS: TypeScript compiles without errors${NC}"
    else
        echo -e "${RED}❌ FAIL: TypeScript compilation errors${NC}"
        echo "   Run: npm run check"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  WARN: npm not installed, skipping build check${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Section 6: API Endpoints (if server is running)
echo ""
echo "─────────────────────────────────────────────────────────"
echo "6. API Endpoints (if server running)"
echo "─────────────────────────────────────────────────────────"
echo ""

BASE_URL=${BASE_URL:-http://localhost:5000}

echo "Testing endpoints at: $BASE_URL"
echo "(Server must be running for these tests)"
echo ""

# Test if server is running
if test_endpoint "$BASE_URL" 200; then
    # Test SOTA endpoints
    echo "Testing SOTA endpoints..."

    # These will return 400 without proper params, which is expected
    test_endpoint "$BASE_URL/api/admin/embeddings/coverage" 200

    echo ""
    echo -e "${BLUE}ℹ️  INFO: For full endpoint testing, run integration tests:${NC}"
    echo "   TEST_CASE_ID=<uuid> npm test"
else
    echo -e "${YELLOW}⚠️  WARN: Server not running, skipping endpoint tests${NC}"
    echo "   Start server: npm run dev"
    WARNINGS=$((WARNINGS + 1))
fi

# Section 7: API Key Validation
echo ""
echo "─────────────────────────────────────────────────────────"
echo "7. API Key Validation"
echo "─────────────────────────────────────────────────────────"
echo ""

if [ -n "$OPENAI_API_KEY" ]; then
    echo "Testing OpenAI API key..."
    if curl -s -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models | grep -q "gpt"; then
        echo -e "${GREEN}✅ PASS: OpenAI API key is valid${NC}"
    else
        echo -e "${RED}❌ FAIL: OpenAI API key is invalid${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Testing Anthropic API key..."
    if curl -s -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
        https://api.anthropic.com/v1/messages | grep -q "content"; then
        echo -e "${GREEN}✅ PASS: Anthropic API key is valid${NC}"
    else
        echo -e "${RED}❌ FAIL: Anthropic API key is invalid${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Validation Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Phase 1 is ready for $ENV deployment!"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Phase 1 can be deployed to $ENV, but review warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Fix errors above before deploying to $ENV."
    echo ""
    exit 1
fi
