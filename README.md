# ChittyChronicle

Legal timeline management system with comprehensive evidence tracking, contradiction detection, and seamless integration with the Chitty ecosystem.

## Features

### Core Functionality
- **Timeline Management**: Create, edit, and track legal events and tasks with ChittyID generation
- **Evidence Tracking**: Link documents with verification status and chain-of-custody
- **Contradiction Detection**: AI-powered analysis to identify conflicting information
- **Deadline Monitoring**: Jurisdiction-specific deadline calculation and alerts
- **Party Management**: Track plaintiffs, defendants, witnesses, and legal representatives
- **Export Capabilities**: Universal Chitty format, JSON, CSV, and PDF exports

### Chitty Ecosystem Integration
- **ChittyID Authentication**: Secure authentication using the Chitty identity system
- **ChittyPM Integration**: Bidirectional sync with project management
- **ChittyLedger Export**: Financial data export for accounting integration
- **ChittyCases Compatibility**: Case data exchange with other legal systems
- **ChittyChain Verification**: Immutable audit trail and verification

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- ChittyID credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/chittytimeline.git
cd chittytimeline

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:push

# Start development server
npm run dev
```

## Deployment

### GitHub Actions CI/CD

The repository includes automated CI/CD pipelines:

1. **Push to main**: Automatically deploys to production
2. **Pull requests**: Creates preview deployments
3. **Security scanning**: Automated vulnerability checks

Required GitHub Secrets:
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
DOCKER_REGISTRY
DOCKER_USERNAME
DOCKER_PASSWORD
CHITTYID_CLIENT_SECRET
DATABASE_URL
```

### Cloudflare Pages/Workers

Deploy to Cloudflare's edge network:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to production
wrangler pages deploy dist/public

# Deploy API functions
wrangler deploy
```

### Docker Deployment

#### Single Container

```bash
# Build image
docker build -t chittytimeline .

# Run container
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e CHITTYID_CLIENT_ID="..." \
  -e CHITTYID_CLIENT_SECRET="..." \
  chittytimeline
```

#### Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloud Deployments

#### AWS ECS/Fargate

```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
docker build -t chittytimeline .
docker tag chittytimeline:latest $ECR_REGISTRY/chittytimeline:latest
docker push $ECR_REGISTRY/chittytimeline:latest

# Deploy with ECS
aws ecs update-service --cluster chitty-cluster --service chittytimeline --force-new-deployment
```

#### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/chittytimeline
gcloud run deploy chittytimeline \
  --image gcr.io/PROJECT-ID/chittytimeline \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure Container Instances

```bash
# Create container instance
az container create \
  --resource-group chitty-rg \
  --name chittytimeline \
  --image chittytimeline:latest \
  --dns-name-label chittytimeline \
  --ports 5000 \
  --environment-variables DATABASE_URL=$DATABASE_URL
```

## API Documentation

### Authentication

All API endpoints require ChittyID authentication:

```bash
# Login
GET /auth/login

# Get current user
GET /api/auth/me

# Refresh token
POST /api/auth/refresh
```

### Timeline Operations

```bash
# Get timeline entries
GET /api/timeline/entries?caseId={caseId}

# Create timeline entry
POST /api/timeline/entries
{
  "caseId": "uuid",
  "entryType": "event|task",
  "date": "2024-01-01",
  "description": "Entry description"
}

# Export timeline
GET /api/timeline/export/{caseId}?format=json|csv|pdf
```

### Universal Export/Import

```bash
# Export to Chitty Universal format
POST /api/export/universal
{
  "caseIds": ["uuid1", "uuid2"],
  "options": {
    "includeDocuments": true,
    "includeChainProof": true
  }
}

# Import from Universal format
POST /api/import/universal
{
  "exportData": {...},
  "options": {
    "mergeStrategy": "overwrite|skip|merge"
  }
}

# Export to ChittyLedger
POST /api/export/chittyledger
{
  "caseId": "uuid"
}

# Export to ChittyCases
POST /api/export/chittycases
{
  "caseIds": ["uuid1", "uuid2"],
  "recipients": ["CID-123", "CID-456"]
}
```

## Development

### Project Structure

```
chittytimeline/
├── client/           # React frontend
├── server/           # Express backend
│   ├── chittyAuth.ts           # ChittyID authentication
│   ├── chittyUniversalExport.ts # Universal export service
│   ├── timelineService.ts      # Timeline operations
│   └── caseService.ts          # Case management
├── shared/           # Shared schemas
├── functions/        # Cloudflare edge functions
└── .github/         # CI/CD workflows
```

### Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run check    # TypeScript type checking
npm run db:push  # Update database schema
npm test         # Run tests
```

## Security

- ChittyID authentication with role-based access control
- Data encryption in transit and at rest
- ChittyChain verification for audit trail
- Rate limiting and DDoS protection
- Regular security scanning via GitHub Actions

## License

Copyright © 2024 Chitty Corporation. All rights reserved.

## Support

For support, documentation, and updates:
- Documentation: https://docs.chitty.com/timeline
- Issues: https://github.com/chittyos/chittytimeline/issues
- ChittyID Support: https://auth.chitty.com/support