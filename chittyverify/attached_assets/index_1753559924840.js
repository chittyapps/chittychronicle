import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Core components
import { AuthenticationGateway } from './core/AuthenticationGateway.js';
import { EvidenceIntakeAssistant } from './core/EvidenceIntake.js';
import { ForensicAnalysisEngine } from './core/ForensicAnalysis.js';
import { ChittyBlockchain } from './blockchain/index.js';

// Initialize environment
config();

// Initialize components
const authGateway = new AuthenticationGateway();
const intakeAssistant = new EvidenceIntakeAssistant();
const forensicEngine = new ForensicAnalysisEngine();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Authentication middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const session = await authGateway.verifySession(token);
  if (!session.valid) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = session.user;
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    blockchain: ChittyBlockchain.validateChain(),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await authGateway.registerUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authGateway.authenticateUser({
      ...req.body,
      ipAddress: req.ip,
      deviceFingerprint: req.headers['user-agent']
    });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Evidence submission
app.post('/api/evidence/submit', authenticate, async (req, res) => {
  try {
    // Check case access
    if (!authGateway.checkCaseAccess(req.user.regNumber, req.body.caseId)) {
      return res.status(403).json({ error: 'Not authorized for this case' });
    }

    // Process evidence intake
    const intakeResult = await intakeAssistant.intakeEvidence({
      ...req.body,
      userId: req.user.regNumber
    });

    // Run forensic analysis
    const analysisResult = await forensicEngine.analyzeEvidence(intakeResult);

    // Mint verified facts to blockchain
    const mintedFacts = [];
    for (const verifiedClaim of analysisResult.verifiedClaims) {
      if (verifiedClaim.confidence >= 0.9) {
        const mintResult = ChittyBlockchain.mintFact(
          [{
            statement: verifiedClaim.text,
            type: verifiedClaim.type,
            caseId: req.body.caseId,
            weight: verifiedClaim.confidence,
            evidenceId: intakeResult.intakeId,
            supportingEvidence: verifiedClaim.supportingEvidence
          }],
          req.user.regNumber
        );
        mintedFacts.push(mintResult);
      }
    }

    res.json({
      intakeId: intakeResult.intakeId,
      receipt: intakeResult.receipt,
      analysis: analysisResult.report,
      mintedFacts,
      status: 'processed'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query blockchain
app.post('/api/blockchain/query', authenticate, async (req, res) => {
  try {
    const { caseId, type, searchTerms, minWeight } = req.body;

    // Verify case access
    if (!authGateway.checkCaseAccess(req.user.regNumber, caseId)) {
      return res.status(403).json({ error: 'Not authorized for this case' });
    }

    const results = ChittyBlockchain.query({
      caseId,
      type,
      searchTerms,
      minWeight
    });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for contradictions
app.post('/api/blockchain/check-contradictions', authenticate, async (req, res) => {
  try {
    const { statement, type, caseId } = req.body;

    if (!authGateway.checkCaseAccess(req.user.regNumber, caseId)) {
      return res.status(403).json({ error: 'Not authorized for this case' });
    }

    const contradictions = ChittyBlockchain.findContradictions({
      statement,
      type,
      caseId
    });

    res.json({ contradictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blockchain statistics
app.get('/api/blockchain/stats', authenticate, async (req, res) => {
  try {
    const stats = ChittyBlockchain.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate evidence weight
app.post('/api/evidence/calculate-weight', authenticate, async (req, res) => {
  try {
    const { sourceTier, credibilityFactors } = req.body;

    const weight = ChittyBlockchain.calculateWeight(sourceTier, credibilityFactors);

    res.json({ 
      sourceTier,
      credibilityFactors,
      calculatedWeight: weight
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's submitted evidence
app.get('/api/evidence/my-submissions', authenticate, async (req, res) => {
  try {
    const submissions = [];
    
    // In production, would query database
    for (const [intakeId, record] of intakeAssistant.processedEvidence) {
      if (record.submitterId === req.user.regNumber) {
        submissions.push({
          intakeId,
          timestamp: record.timestamp,
          type: record.evidenceType,
          status: record.status,
          claimCount: record.extractedClaims.length,
          weight: record.evidenceWeight
        });
      }
    }

    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
app.get('/api/admin/security-metrics', authenticate, async (req, res) => {
  try {
    // Check admin role
    if (req.user.securityLevel < 3) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const metrics = authGateway.getSecurityMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`ChittyChain server running on port ${PORT}`);
  console.log('Blockchain initialized:', ChittyBlockchain.validateChain());
});