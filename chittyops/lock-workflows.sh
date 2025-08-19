#!/bin/bash

# Script to implement and lock CI/CD workflows across all organizations
# This will deploy workflows and set up branch protection rules

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ORGS=("ChittyOS" "ChittyCorp" "nevershitty")
ADMIN_TEAM="cicd-admins"
REQUIRED_CHECKS=("beacon-check" "test" "security")

echo -e "${BLUE}🔒 ChittyOS CI/CD Implementation & Lock Script${NC}"
echo -e "${BLUE}=============================================${NC}\n"

# Function to create branch protection rules
create_branch_protection() {
    local org=$1
    local repo=$2
    local branch=$3
    
    echo -e "${YELLOW}Setting up branch protection for $org/$repo:$branch...${NC}"
    
    # Create branch protection rule using GitHub API
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/$org/$repo/branches/$branch/protection" \
        -f "required_status_checks[strict]=true" \
        -f "required_status_checks[contexts][]=beacon-check" \
        -f "required_status_checks[contexts][]=test" \
        -f "required_status_checks[contexts][]=security" \
        -f "enforce_admins=false" \
        -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
        -f "required_pull_request_reviews[require_code_owner_reviews]=true" \
        -f "required_pull_request_reviews[required_approving_review_count]=1" \
        -f "required_pull_request_reviews[require_last_push_approval]=false" \
        -f "restrictions=null" \
        -f "allow_force_pushes=false" \
        -f "allow_deletions=false" \
        -f "block_creations=false" \
        -f "required_conversation_resolution=true" \
        -f "lock_branch=false" \
        -f "allow_fork_syncing=true" \
        || echo -e "${YELLOW}⚠️  Failed to set protection for $org/$repo:$branch${NC}"
}

# Function to add CODEOWNERS file
add_codeowners() {
    local repo_path=$1
    local org=$2
    
    cat > "$repo_path/CODEOWNERS" << EOF
# CI/CD Workflow Protection
# Changes to workflows require admin approval

# Protect all GitHub Actions workflows
/.github/workflows/ @$org/$ADMIN_TEAM @nickbianchi

# Protect CI/CD configuration
/.github/ @$org/$ADMIN_TEAM @nickbianchi
/CODEOWNERS @nickbianchi

# Default owners
* @$org/developers
EOF
}

# Function to create workflow protection file
create_workflow_protection() {
    local repo_path=$1
    
    mkdir -p "$repo_path/.github"
    cat > "$repo_path/.github/workflow-protection.yml" << 'EOF'
name: Workflow Protection

on:
  pull_request:
    paths:
      - '.github/workflows/**'
      - '.github/CODEOWNERS'

jobs:
  protect-workflows:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Check workflow modifications
      run: |
        echo "🔒 Workflow files are protected and require admin approval"
        echo "Modified files:"
        git diff --name-only origin/${{ github.base_ref }}..HEAD | grep -E "^\.github/(workflows/|CODEOWNERS)" || true
    
    - name: Verify CODEOWNERS
      run: |
        if [ ! -f ".github/CODEOWNERS" ] && [ ! -f "CODEOWNERS" ]; then
          echo "❌ CODEOWNERS file is missing!"
          exit 1
        fi
        echo "✅ CODEOWNERS file present"
EOF
}

# Main implementation function
implement_and_lock() {
    local org=$1
    local repo=$2
    
    echo -e "\n${GREEN}Processing: $org/$repo${NC}"
    echo -e "${GREEN}========================${NC}"
    
    # Clone or update repo
    if [ -d "$repo" ]; then
        cd "$repo"
        git pull origin main || git pull origin master || true
    else
        git clone "git@github.com:$org/$repo.git" || return 1
        cd "$repo"
    fi
    
    # Determine default branch
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
    
    # Add CODEOWNERS
    add_codeowners "." "$org"
    
    # Add workflow protection
    create_workflow_protection "."
    
    # Commit changes if any
    if git status --porcelain | grep -q .; then
        git add .
        git commit -m "🔒 Add workflow protection and CODEOWNERS

- Added CODEOWNERS file to protect CI/CD workflows
- Added workflow protection checks
- Requires admin approval for workflow changes

This ensures CI/CD integrity and security."
        
        git push origin "$DEFAULT_BRANCH"
    fi
    
    # Set up branch protection
    create_branch_protection "$org" "$repo" "$DEFAULT_BRANCH"
    
    # Add team if it doesn't exist
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/orgs/$org/teams/$ADMIN_TEAM" \
        -f "name=$ADMIN_TEAM" \
        -f "description=CI/CD Administrators" \
        -f "privacy=closed" \
        2>/dev/null || true
    
    # Add repository to team
    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/orgs/$org/teams/$ADMIN_TEAM/repos/$org/$repo" \
        -f "permission=admin" \
        2>/dev/null || true
    
    cd ..
}

# First, run the setup script to deploy workflows
echo -e "${BLUE}Step 1: Running CI/CD setup script...${NC}"
./setup-org-workflows.sh

# Now implement protection
echo -e "\n${BLUE}Step 2: Implementing workflow protection...${NC}"

# Create working directory
WORK_DIR="cicd-lock-$(date +%s)"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Process each organization
for ORG in "${ORGS[@]}"; do
    echo -e "\n${BLUE}🏢 Organization: $ORG${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    # Create admin team
    echo -e "${YELLOW}Creating $ADMIN_TEAM team...${NC}"
    gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        "/orgs/$ORG/teams" \
        -f "name=$ADMIN_TEAM" \
        -f "description=CI/CD Administrators with workflow approval rights" \
        -f "privacy=closed" \
        2>/dev/null || echo -e "${YELLOW}Team may already exist${NC}"
    
    # Get repositories
    REPOS=$(gh repo list "$ORG" --limit 100 --no-archived --source --json name -q '.[].name')
    
    for REPO in $REPOS; do
        implement_and_lock "$ORG" "$REPO"
    done
done

# Create organization-wide settings
echo -e "\n${BLUE}Step 3: Applying organization-wide settings...${NC}"

for ORG in "${ORGS[@]}"; do
    echo -e "${YELLOW}Configuring $ORG organization settings...${NC}"
    
    # Enable required status checks
    gh api \
        --method PATCH \
        -H "Accept: application/vnd.github+json" \
        "/orgs/$ORG" \
        -f "default_repository_permission=read" \
        -f "members_can_create_repositories=true" \
        2>/dev/null || true
done

echo -e "\n${GREEN}✅ CI/CD Implementation & Lock Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Add team members to @$ADMIN_TEAM teams in each org"
echo -e "2. Review and merge any pending workflow PRs"
echo -e "3. Monitor CI/CD dashboard at https://beacon.cloudeto.com"
echo -e "4. All workflow changes now require admin approval"

# Cleanup
cd ..
rm -rf "$WORK_DIR"