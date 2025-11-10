#!/bin/bash
#
# Quick Setup Script for Google Drive Backups
# Installs rclone and guides through configuration
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================================"
echo "  ChittyChronicle Google Drive Backup Setup"
echo "================================================================"
echo ""

# Step 1: Install rclone
echo -e "${YELLOW}Step 1: Installing rclone...${NC}"
if command -v rclone &> /dev/null; then
    echo -e "${GREEN}✅ rclone is already installed${NC}"
    rclone version | head -1
else
    echo "Installing rclone..."
    curl -s https://rclone.org/install.sh | sudo bash

    if command -v rclone &> /dev/null; then
        echo -e "${GREEN}✅ rclone installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install rclone${NC}"
        exit 1
    fi
fi

echo ""

# Step 2: Configure Google Drive
echo -e "${YELLOW}Step 2: Configuring Google Drive...${NC}"

if rclone listremotes | grep -q "gdrive:"; then
    echo -e "${GREEN}✅ 'gdrive' remote already configured${NC}"
    echo ""
    read -p "Reconfigure? (y/N): " RECONFIG
    if [ "$RECONFIG" != "y" ] && [ "$RECONFIG" != "Y" ]; then
        echo "Skipping configuration..."
    else
        echo "Deleting existing configuration..."
        rclone config delete gdrive
        rclone config
    fi
else
    echo ""
    echo -e "${BLUE}📝 Configure Google Drive Remote${NC}"
    echo "Follow these steps:"
    echo "  1. Choose: n (New remote)"
    echo "  2. Name: gdrive"
    echo "  3. Storage: drive (or the number for Google Drive)"
    echo "  4. Press Enter for all other options (use defaults)"
    echo "  5. Authenticate in browser when it opens"
    echo ""
    read -p "Press Enter to start configuration..."

    rclone config
fi

echo ""

# Step 3: Test connection
echo -e "${YELLOW}Step 3: Testing connection...${NC}"

if rclone lsd gdrive: &> /dev/null; then
    echo -e "${GREEN}✅ Successfully connected to Google Drive${NC}"
    echo ""
    echo "Your Google Drive folders:"
    rclone lsd gdrive: | head -5
else
    echo -e "${RED}❌ Failed to connect to Google Drive${NC}"
    echo "Please run: rclone config"
    exit 1
fi

echo ""

# Step 4: Create backup directories
echo -e "${YELLOW}Step 4: Creating backup directories...${NC}"

rclone mkdir gdrive:backups/chittychronicle 2>/dev/null || true
rclone mkdir gdrive:backups/bundles 2>/dev/null || true

echo -e "${GREEN}✅ Backup directories created${NC}"

echo ""

# Step 5: Run test backup
echo -e "${YELLOW}Step 5: Running test backup (dry-run)...${NC}"
echo ""

cd /home/user/chittychronicle
./scripts/backup-to-gdrive.sh --dry-run

echo ""
echo "================================================================"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "================================================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Run your first backup:"
echo "     cd /home/user/chittychronicle"
echo "     ./scripts/backup-to-gdrive.sh"
echo ""
echo "  2. Check backups in Google Drive:"
echo "     rclone ls gdrive:backups/"
echo ""
echo "  3. Set up automated backups (optional):"
echo "     crontab -e"
echo "     # Add: 0 2 * * * /home/user/chittychronicle/scripts/backup-to-gdrive.sh"
echo ""
echo "  4. Read full documentation:"
echo "     cat docs/BACKUP_SETUP_GUIDE.md"
echo ""
echo "================================================================"
