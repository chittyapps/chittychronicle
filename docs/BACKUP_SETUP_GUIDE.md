# Google Drive Backup Setup Guide

**Quick Start**: Get automated backups to Google Drive in 10 minutes

## Step 1: Install rclone

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version
```

## Step 2: Configure Google Drive

```bash
# Start configuration wizard
rclone config

# Follow these prompts:
# n) New remote
# name> gdrive
# Storage> drive (or type number for Google Drive)
# client_id> [press Enter to use defaults]
# client_secret> [press Enter to use defaults]
# scope> 1 (Full access)
# root_folder_id> [press Enter]
# service_account_file> [press Enter]
# Edit advanced config? n
# Use auto config? y (this will open a browser)
#
# [Authenticate in browser when it opens]
#
# Configure this as a team drive? n
# y) Yes this is OK
# q) Quit config
```

**Important**: The browser window will open for Google OAuth authentication. Sign in with the Google account where you want backups stored.

## Step 3: Test the Connection

```bash
# List your Google Drive files
rclone ls gdrive:

# Create a test file
echo "test" > /tmp/test.txt
rclone copy /tmp/test.txt gdrive:test/

# Verify it was uploaded
rclone ls gdrive:test/

# Clean up
rclone delete gdrive:test/test.txt
rclone rmdir gdrive:test/
rm /tmp/test.txt
```

## Step 4: Run Your First Backup

```bash
# Navigate to the repo
cd /home/user/chittychronicle

# Test backup (dry run - won't actually copy anything)
./scripts/backup-to-gdrive.sh --dry-run

# Run actual backup
./scripts/backup-to-gdrive.sh
```

**What gets backed up:**
- ✅ All source code
- ✅ Full git history
- ✅ Documentation
- ✅ Configuration files
- ❌ node_modules (excluded - can be reinstalled)
- ❌ dist/ build artifacts (excluded)
- ❌ .env files (excluded for security)
- ❌ Log files (excluded)

## Step 5: Verify Backup in Google Drive

```bash
# List backups
rclone ls gdrive:backups/

# You should see:
# - backups/chittychronicle/ (full repository sync)
# - backups/bundles/chittychronicle-YYYYMMDD.bundle (daily bundles)
```

Or check in your Google Drive web interface:
- Visit https://drive.google.com
- Look for `backups/` folder

## Step 6: Automate Daily Backups (Optional)

```bash
# Open crontab editor
crontab -e

# Add this line (backup daily at 2 AM):
0 2 * * * /home/user/chittychronicle/scripts/backup-to-gdrive.sh >> /home/user/backup-cron.log 2>&1

# Or weekly on Sundays at 3 AM:
0 3 * * 0 /home/user/chittychronicle/scripts/backup-to-gdrive.sh >> /home/user/backup-cron.log 2>&1

# Save and exit
```

## Restoring from Backup

### Option A: Restore from Live Sync

```bash
# Download entire repo
rclone sync gdrive:backups/chittychronicle/ /home/user/chittychronicle-restored/

# This gives you a complete working copy
cd /home/user/chittychronicle-restored
git status  # Should show a clean working tree
```

### Option B: Restore from Bundle

```bash
# List available bundles
rclone ls gdrive:backups/bundles/

# Download specific bundle
rclone copy gdrive:backups/bundles/chittychronicle-20251102.bundle ./

# Clone from bundle
git clone chittychronicle-20251102.bundle chittychronicle-restored

# You now have a complete repo with full history
cd chittychronicle-restored
git log  # See all commits
```

### Option C: Restore Specific Files

```bash
# Copy just the docs folder
rclone copy gdrive:backups/chittychronicle/docs/ ./docs-backup/

# Copy a specific file
rclone copy gdrive:backups/chittychronicle/package.json ./
```

## Manual Backup Commands

### Full Sync
```bash
rclone sync /home/user/chittychronicle/ gdrive:backups/chittychronicle/ \
    --exclude='node_modules/**' \
    --exclude='dist/**' \
    --progress
```

### Create Bundle Backup
```bash
cd /home/user/chittychronicle
git bundle create /tmp/backup.bundle --all
rclone copy /tmp/backup.bundle gdrive:backups/bundles/
rm /tmp/backup.bundle
```

### Check Backup Status
```bash
# Compare local vs remote
rclone check /home/user/chittychronicle/ gdrive:backups/chittychronicle/ \
    --exclude='node_modules/**' \
    --exclude='dist/**'
```

## Troubleshooting

### Error: "gdrive remote not found"
```bash
# List configured remotes
rclone listremotes

# If 'gdrive:' is not listed, reconfigure:
rclone config
```

### Error: "Failed to authenticate"
```bash
# Delete existing config and reconfigure
rclone config delete gdrive
rclone config
# Follow setup prompts again
```

### Slow uploads
```bash
# Use --transfers flag to upload multiple files simultaneously
rclone sync /home/user/chittychronicle/ gdrive:backups/chittychronicle/ \
    --transfers=8 \
    --exclude='node_modules/**'
```

### Too many small files
```bash
# Use --fast-list for directories with many files
rclone sync /home/user/chittychronicle/ gdrive:backups/chittychronicle/ \
    --fast-list \
    --exclude='node_modules/**'
```

## Advanced: Encryption

To encrypt backups before uploading to Google Drive:

```bash
# Configure encrypted remote
rclone config

# n) New remote
# name> gdrive-crypt
# Storage> crypt
# remote> gdrive:backups/chittychronicle-encrypted
# filename_encryption> standard
# directory_name_encryption> true
# password> [enter a strong password]
# confirm password> [confirm]
# salt password> [enter or press Enter to generate]

# Now sync to encrypted remote
rclone sync /home/user/chittychronicle/ gdrive-crypt: \
    --exclude='node_modules/**'
```

**Files will be encrypted before upload. Only you can decrypt them with your password.**

## Cost Considerations

**Google Drive Free Tier**: 15 GB
- ChittyChronicle repo: ~50-200 MB (without node_modules)
- Daily bundles: ~50 MB each
- **You can store 30-90 days of daily bundles within free tier**

**Google Drive Paid** ($1.99/month for 100 GB):
- Plenty of space for years of backups
- Can keep unlimited bundle history

## Backup Strategy Recommendation

**Daily**:
- Full sync with `rclone sync` (keeps live copy up-to-date)

**Weekly**:
- Create git bundle snapshot (timestamped, easy to restore specific dates)

**Monthly**:
- Download one bundle locally as extra safety backup
- Delete bundles older than 90 days to save space

**Result**:
- Always have latest code in Google Drive
- Can restore to any point in the last 90 days
- Complete git history preserved
- Costs nothing (or $1.99/month for peace of mind)

## Security Best Practices

1. **Never commit `.env` files** - Already excluded in backup script
2. **Use encrypted remotes** for extra security (see Advanced section)
3. **Use strong Google account password** + 2FA
4. **Don't share rclone config** - Contains OAuth tokens
5. **Regularly test restores** - Backups are useless if you can't restore

## Next Steps

After setting up backups, consider:

1. **Test a restore** - Make sure you can actually recover your code
2. **Set up monitoring** - Check `backup.log` weekly
3. **Automate cleanup** - Delete old bundles after 90 days
4. **Document recovery procedures** - So anyone on the team can restore

---

**Questions?**
- rclone docs: https://rclone.org/docs/
- rclone forum: https://forum.rclone.org/
