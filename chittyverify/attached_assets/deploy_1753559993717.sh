#!/bin/bash

# ChittyChain Deployment Script
# This script handles deployment of ChittyChain to various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
PROJECT_NAME="chittychain"

echo -e "${GREEN}🚀 ChittyChain Deployment Script${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo ""

# Check if environment variables are set
check_env() {
    echo -e "${YELLOW}Checking environment variables...${NC}"
    
    if [ ! -f .env.local ]; then
        echo -e "${RED}❌ .env.local file not found${NC}"
        echo "Please copy .env.example to .env.local and configure it"
        exit 1
    fi
    
    # Source environment variables
    source .env.local
    
    # Check required variables
    required_vars=(
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "NOTION_API_KEY"
        "NOTION_DATABASE_ID"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ $var is not set${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    # Run blockchain tests
    echo "Testing blockchain core..."
    node test-blockchain.js
    
    echo "Testing blockchain v2..."
    node test-blockchain-v2.js
    
    echo "Testing blockchain core features..."
    node test-blockchain-core.js
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Build the application
build_app() {
    echo -e "${YELLOW}Building application...${NC}"
    
    # Install dependencies
    npm ci
    
    # Build Next.js app
    npm run build
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${YELLOW}Deploying to Vercel...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found${NC}"
        echo "Install with: npm install -g vercel"
        exit 1
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
    
    echo -e "${GREEN}✅ Deployed to Vercel${NC}"
}

# Deploy to Railway
deploy_railway() {
    echo -e "${YELLOW}Deploying to Railway...${NC}"
    
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found${NC}"
        echo "Install with: npm install -g @railway/cli"
        exit 1
    fi
    
    railway up
    
    echo -e "${GREEN}✅ Deployed to Railway${NC}"
}

# Deploy to Cloudflare
deploy_cloudflare() {
    echo -e "${YELLOW}Deploying to Cloudflare...${NC}"
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found${NC}"
        echo "Install with: npm install -g wrangler"
        exit 1
    fi
    
    # Deploy Pages
    wrangler pages deploy .next
    
    echo -e "${GREEN}✅ Deployed to Cloudflare${NC}"
}

# Main deployment logic
main() {
    case $ENVIRONMENT in
        development)
            check_env
            run_tests
            build_app
            echo -e "${GREEN}🎉 Development build complete${NC}"
            ;;
        staging)
            check_env
            run_tests
            build_app
            deploy_vercel
            echo -e "${GREEN}🎉 Staging deployment complete${NC}"
            ;;
        production)
            check_env
            run_tests
            build_app
            deploy_cloudflare
            echo -e "${GREEN}🎉 Production deployment complete${NC}"
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
            echo "Usage: ./deploy.sh [development|staging|production]"
            exit 1
            ;;
    esac
}

# Run main function
main

echo ""
echo -e "${GREEN}✨ ChittyChain deployment completed successfully!${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo ""