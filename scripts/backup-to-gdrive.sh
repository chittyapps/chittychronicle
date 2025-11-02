#!/bin/bash
#
# ChittyChronicle Automated Backup Script
# Syncs git repository to Google Drive using rclone
#
# Usage:
#   ./backup-to-gdrive.sh          # Full sync
#   ./backup-to-gdrive.sh --dry-run # Test without actually syncing
#

set -e  # Exit on error

# Configuration
REPO_PATH="/home/user/chittychronicle"
BACKUP_DEST="gdrive:backups/chittychronicle"
BUNDLE_DEST="gdrive:backups/bundles"
LOG_FILE="/home/user/chittychronicle-backup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
DATE_SHORT=$(date +%Y%m%d)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo -e "${RED}❌ Error: rclone is not installed${NC}"
    echo "Install with: curl https://rclone.org/install.sh | sudo bash"
    exit 1
fi

# Check if gdrive remote is configured
if ! rclone listremotes | grep -q "gdrive:"; then
    echo -e "${RED}❌ Error: 'gdrive' remote not configured${NC}"
    echo "Configure with: rclone config"
    echo "Name it 'gdrive' when prompted"
    exit 1
fi

# Check if repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}❌ Error: Repo not found at $REPO_PATH${NC}"
    exit 1
fi

# Parse arguments
DRY_RUN=""
if [ "$1" == "--dry-run" ]; then
    DRY_RUN="--dry-run"
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be modified${NC}"
fi

echo "================================================================"
echo "  ChittyChronicle Backup to Google Drive"
echo "================================================================"
echo "Started: $DATE"
echo "Repo: $REPO_PATH"
echo "Destination: $BACKUP_DEST"
echo "================================================================"
echo ""

# Log start
echo "[$DATE] Backup started" >> "$LOG_FILE"

# Step 1: Sync full repository with rclone
echo -e "${YELLOW}📦 Step 1: Syncing repository files...${NC}"

rclone sync "$REPO_PATH/" "$BACKUP_DEST/" \
    --exclude='node_modules/**' \
    --exclude='dist/**' \
    --exclude='.next/**' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.env.local' \
    --progress \
    --log-file="$LOG_FILE" \
    --log-level=INFO \
    $DRY_RUN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Repository sync completed${NC}"
else
    echo -e "${RED}❌ Repository sync failed${NC}"
    exit 1
fi

echo ""

# Step 2: Create and upload git bundle (single-file backup)
echo -e "${YELLOW}📚 Step 2: Creating git bundle...${NC}"

cd "$REPO_PATH"

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
    echo "   Bundle will only include committed changes"
fi

BUNDLE_NAME="chittychronicle-$DATE_SHORT.bundle"
BUNDLE_PATH="/tmp/$BUNDLE_NAME"

git bundle create "$BUNDLE_PATH" --all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git bundle created: $BUNDLE_NAME${NC}"

    # Upload bundle
    if [ -z "$DRY_RUN" ]; then
        rclone copy "$BUNDLE_PATH" "$BUNDLE_DEST/" --progress

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Bundle uploaded to Google Drive${NC}"
            rm "$BUNDLE_PATH"
        else
            echo -e "${RED}❌ Bundle upload failed${NC}"
            rm "$BUNDLE_PATH"
            exit 1
        fi
    else
        echo "   [DRY RUN] Would upload: $BUNDLE_NAME"
        rm "$BUNDLE_PATH"
    fi
else
    echo -e "${RED}❌ Git bundle creation failed${NC}"
    exit 1
fi

echo ""

# Step 3: Show backup info
echo -e "${YELLOW}📊 Step 3: Backup summary${NC}"

# Get current git info
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
COMMIT_COUNT=$(git rev-list --count HEAD)

echo "   Current branch: $CURRENT_BRANCH"
echo "   Latest commit: $CURRENT_COMMIT"
echo "   Total commits: $COMMIT_COUNT"
echo ""

# List recent backups
echo "   Recent bundles in Google Drive:"
rclone ls "$BUNDLE_DEST/" 2>/dev/null | tail -5 || echo "   (Unable to list)"

echo ""
echo "================================================================"
echo -e "${GREEN}✅ BACKUP COMPLETED SUCCESSFULLY${NC}"
echo "================================================================"
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Backup locations:"
echo "  • Live sync: $BACKUP_DEST/"
echo "  • Bundle: $BUNDLE_DEST/$BUNDLE_NAME"
echo ""
echo "To restore from bundle:"
echo "  rclone copy $BUNDLE_DEST/$BUNDLE_NAME ./"
echo "  git clone $BUNDLE_NAME chittychronicle-restored"
echo "================================================================"

# Log completion
echo "[$DATE] Backup completed successfully" >> "$LOG_FILE"

exit 0
