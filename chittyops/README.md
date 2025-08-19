# ChittyOS CI/CD Templates 🚀

Standardized CI/CD workflows for all ChittyOS, ChittyCorp, and nevershitty organization repositories.

## Features

- **Automated Testing**: Run tests on every push and PR
- **ChittyBeacon Integration**: Automatic app tracking in all deployments
- **Security Scanning**: CodeQL, Trivy, OWASP dependency checks
- **Automated Deployments**: Support for Vercel, Cloudflare Workers, and more
- **Dependency Updates**: Weekly automated dependency updates with PRs
- **Multi-language Support**: Node.js, Python, Rust, Go

## Quick Start

Run the setup script to add workflows to all organization repositories:

```bash
./setup-org-workflows.sh
```

This will:
1. Clone/update all repositories
2. Detect project type
3. Add appropriate workflows
4. Install ChittyBeacon
5. Create PRs with the changes

## Workflows

### Node.js CI/CD (`node-ci.yml`)
- Runs on Node 16.x, 18.x, and 20.x
- Installs ChittyBeacon automatically
- Runs linting, tests, and builds
- Security audit with npm audit and Snyk
- Deploys to production on main branch

### Cloudflare Workers Deploy (`cloudflare-deploy.yml`)
- Deploys to Cloudflare Workers
- Adds ChittyBeacon to worker entry point
- Supports multiple environments
- Automatic cache purging

### Vercel Deploy (`vercel-deploy.yml`)
- Preview deployments for PRs
- Production deployments from main
- Automatic ChittyBeacon integration
- Comments PR with preview URL

### Python CI/CD (`python-ci.yml`)
- Tests on Python 3.8-3.11
- Includes custom ChittyBeacon module
- Runs pytest, flake8, black, isort
- Security scanning with Bandit and Safety

### Dependency Updates (`dependency-update.yml`)
- Weekly automated updates
- Creates PRs with changes
- Security vulnerability scanning
- Ensures ChittyBeacon stays updated

## Required Secrets

Add these secrets to your repository settings:

### For All Repos
- `BEACON_ENDPOINT` (optional): Custom beacon endpoint (defaults to https://beacon.cloudeto.com)

### For Cloudflare Deployments
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_ZONE_ID`: Your zone ID (for cache purging)

### For Vercel Deployments
- `VERCEL_TOKEN`: Your Vercel token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### For Security Scanning
- `SNYK_TOKEN`: Snyk authentication token
- `SONAR_TOKEN`: SonarCloud token

## ChittyBeacon Integration

All workflows automatically add ChittyBeacon to track:
- Application startups/shutdowns
- Periodic heartbeats (every 5 minutes)
- Platform detection
- Deployment events

### Manual Installation

If you need to add ChittyBeacon manually:

```bash
npm install @chittycorp/app-beacon --save
```

Then add to your entry point:
```javascript
require('@chittycorp/app-beacon');
// or
import '@chittycorp/app-beacon';
```

## Customization

### Environment Variables

ChittyBeacon supports these environment variables:
- `BEACON_ENDPOINT`: Custom tracking endpoint
- `BEACON_INTERVAL`: Heartbeat interval in ms (default: 300000)
- `BEACON_DISABLED`: Set to 'true' to disable
- `BEACON_VERBOSE`: Set to 'true' for debug output

### Workflow Customization

Modify workflows by editing the `.yml` files and running the setup script again.

## Organization Standards

All repositories should follow these standards:
1. Include ChittyBeacon for monitoring
2. Have CI/CD workflows for testing and deployment
3. Run security scans on dependencies
4. Include a LICENSE file (MIT by default)
5. No secrets in code (checked automatically)

## Support

- Issues: Create an issue in this repository
- Beacon Dashboard: https://beacon.cloudeto.com
- Documentation: https://docs.chitty.cc

## License

MIT License - see LICENSE file