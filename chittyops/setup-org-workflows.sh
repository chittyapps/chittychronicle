#!/bin/bash

# Setup CI/CD workflows across all ChittyOS organization repositories
# This script will add GitHub Actions workflows and ChittyBeacon to all repos

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ORGS=("ChittyOS" "ChittyCorp" "nevershitty")
WORKFLOW_DIR=".github/workflows"
BEACON_PACKAGE="@chittycorp/app-beacon"

echo -e "${GREEN}🚀 ChittyOS CI/CD Setup Script${NC}"
echo -e "${GREEN}================================${NC}"

# Function to detect project type
detect_project_type() {
    local repo_path=$1
    
    if [ -f "$repo_path/package.json" ]; then
        if grep -q "next" "$repo_path/package.json"; then
            echo "nextjs"
        elif grep -q "@cloudflare/workers-types" "$repo_path/package.json"; then
            echo "cloudflare"
        else
            echo "node"
        fi
    elif [ -f "$repo_path/requirements.txt" ] || [ -f "$repo_path/setup.py" ]; then
        echo "python"
    elif [ -f "$repo_path/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$repo_path/go.mod" ]; then
        echo "go"
    else
        echo "unknown"
    fi
}

# Function to add ChittyBeacon to package.json
add_beacon_to_package() {
    local repo_path=$1
    
    if [ -f "$repo_path/package.json" ]; then
        echo -e "${YELLOW}Adding ChittyBeacon to package.json...${NC}"
        
        # Use jq to add the dependency if not present
        if command -v jq &> /dev/null; then
            jq --arg beacon "$BEACON_PACKAGE" \
               '.dependencies[$beacon] = "^1.0.0"' \
               "$repo_path/package.json" > "$repo_path/package.json.tmp" && \
               mv "$repo_path/package.json.tmp" "$repo_path/package.json"
        else
            # Fallback to node script
            node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$repo_path/package.json', 'utf8'));
            if (!pkg.dependencies) pkg.dependencies = {};
            if (!pkg.dependencies['$BEACON_PACKAGE']) {
                pkg.dependencies['$BEACON_PACKAGE'] = '^1.0.0';
                fs.writeFileSync('$repo_path/package.json', JSON.stringify(pkg, null, 2));
                console.log('✅ Added ChittyBeacon to dependencies');
            } else {
                console.log('✓ ChittyBeacon already in dependencies');
            }
            "
        fi
    fi
}

# Function to setup workflows for a repository
setup_repo_workflows() {
    local repo=$1
    local org=$2
    
    echo -e "\n${GREEN}Processing: $org/$repo${NC}"
    
    # Clone or update repo
    if [ -d "$repo" ]; then
        cd "$repo"
        git pull origin main || git pull origin master || true
    else
        git clone "git@github.com:$org/$repo.git" || return 1
        cd "$repo"
    fi
    
    # Detect project type
    PROJECT_TYPE=$(detect_project_type ".")
    echo -e "Project type: ${YELLOW}$PROJECT_TYPE${NC}"
    
    # Create workflow directory
    mkdir -p "$WORKFLOW_DIR"
    
    # Copy appropriate workflows based on project type
    case $PROJECT_TYPE in
        "node"|"nextjs")
            cp ../node-ci.yml "$WORKFLOW_DIR/ci.yml"
            cp ../dependency-update.yml "$WORKFLOW_DIR/dependency-update.yml"
            add_beacon_to_package "."
            ;;
        "cloudflare")
            cp ../node-ci.yml "$WORKFLOW_DIR/ci.yml"
            cp ../cloudflare-deploy.yml "$WORKFLOW_DIR/deploy.yml"
            cp ../dependency-update.yml "$WORKFLOW_DIR/dependency-update.yml"
            add_beacon_to_package "."
            ;;
        "python")
            cp ../python-ci.yml "$WORKFLOW_DIR/ci.yml"
            ;;
        *)
            echo -e "${YELLOW}⚠️  Unknown project type, skipping workflow setup${NC}"
            ;;
    esac
    
    # Add organization-specific workflow
    cat > "$WORKFLOW_DIR/chitty-standard.yml" << 'EOF'
name: ChittyOS Standard Checks

on:
  push:
    branches: [ main, master, develop ]
  pull_request:

jobs:
  beacon-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Verify ChittyBeacon Integration
      run: |
        if [ -f "package.json" ]; then
          if grep -q "@chittycorp/app-beacon" package.json; then
            echo "✅ ChittyBeacon is included"
          else
            echo "⚠️  ChittyBeacon not found in package.json"
            echo "Please add: npm install @chittycorp/app-beacon"
          fi
        fi
    
    - name: Check for sensitive data
      run: |
        # Check for common secret patterns
        if grep -r -E "(api_key|apikey|api-key|secret|password|token)" . \
           --exclude-dir=node_modules \
           --exclude-dir=.git \
           --exclude="*.lock" \
           --exclude="*-lock.json" | \
           grep -v -E "(example|sample|test|mock|dummy)"; then
          echo "⚠️  Potential secrets found! Please review."
          exit 1
        else
          echo "✅ No obvious secrets detected"
        fi

  license-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Check for LICENSE file
      run: |
        if [ -f "LICENSE" ] || [ -f "LICENSE.md" ] || [ -f "LICENSE.txt" ]; then
          echo "✅ License file found"
        else
          echo "⚠️  No LICENSE file found"
          echo "Creating MIT LICENSE..."
          cat > LICENSE << 'LICENSE_EOF'
MIT License

Copyright (c) $(date +%Y) ChittyOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
LICENSE_EOF
        fi
EOF
    
    # Commit changes if any
    if git status --porcelain | grep -q .; then
        git add .
        git commit -m "ci: add GitHub Actions workflows and ChittyBeacon integration

- Added CI/CD workflows for automated testing and deployment
- Integrated ChittyBeacon for application monitoring
- Added security scanning and dependency updates
- Added ChittyOS standard checks

This is part of organization-wide CI/CD standardization."
        
        # Create branch and push
        BRANCH="ci/add-workflows-$(date +%s)"
        git checkout -b "$BRANCH"
        git push origin "$BRANCH"
        
        # Create PR using GitHub CLI
        gh pr create \
            --title "🚀 Add CI/CD Workflows and ChittyBeacon Integration" \
            --body "This PR adds:
- GitHub Actions workflows for CI/CD
- ChittyBeacon integration for app monitoring
- Security scanning workflows
- Automated dependency updates

Part of organization-wide standardization effort." \
            --base main || \
        gh pr create \
            --title "🚀 Add CI/CD Workflows and ChittyBeacon Integration" \
            --body "This PR adds:
- GitHub Actions workflows for CI/CD
- ChittyBeacon integration for app monitoring
- Security scanning workflows
- Automated dependency updates

Part of organization-wide standardization effort." \
            --base master || \
        echo "Failed to create PR"
    else
        echo -e "${GREEN}✓ No changes needed${NC}"
    fi
    
    cd ..
}

# Main execution
main() {
    # Create working directory
    WORK_DIR="chitty-cicd-setup-$(date +%s)"
    mkdir -p "$WORK_DIR"
    cd "$WORK_DIR"
    
    # Copy workflow templates
    cp ../*.yml .
    
    # Process each organization
    for ORG in "${ORGS[@]}"; do
        echo -e "\n${GREEN}📁 Processing organization: $ORG${NC}"
        echo -e "${GREEN}=====================================${NC}"
        
        # Get list of repos (excluding forks and archives)
        REPOS=$(gh repo list "$ORG" --limit 100 --no-archived --source --json name -q '.[].name')
        
        for REPO in $REPOS; do
            setup_repo_workflows "$REPO" "$ORG"
        done
    done
    
    echo -e "\n${GREEN}✅ CI/CD setup complete!${NC}"
    echo -e "${GREEN}========================${NC}"
    echo -e "Next steps:"
    echo -e "1. Review and merge the created PRs"
    echo -e "2. Add required secrets to each repository:"
    echo -e "   - CLOUDFLARE_API_TOKEN"
    echo -e "   - VERCEL_TOKEN"
    echo -e "   - BEACON_ENDPOINT (optional)"
    echo -e "3. Monitor deployments at https://beacon.cloudeto.com"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) is required but not installed.${NC}"
        echo "Install it from: https://cli.github.com/"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}❌ Please authenticate with GitHub CLI first:${NC}"
        echo "Run: gh auth login"
        exit 1
    fi
}

# Run the script
check_prerequisites
main