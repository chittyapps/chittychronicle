#!/usr/bin/env node

/**
 * ChittyChain MCP Server - Model Context Protocol Server for Legal Evidence Management
 * 
 * Enhanced with Evidence Ledger Schema for legal proceedings:
 * - Immutable chain of custody tracking
 * - Evidence hierarchy and weighting system  
 * - Contradiction detection and resolution
 * - Blockchain-backed audit trails
 * - Legal-grade artifact management
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

// Dynamic path resolution for ChittyChain components
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find ChittyChain implementation paths (same as CLI)
function findChittyChainPath() {
  const possiblePaths = [
    // From gh/ChittyChain repository (current/new structure)
    path.join(__dirname, '..'),
    // From agent smith location (legacy)
    path.join(__dirname, '..', '..', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
    // From MAIN root (legacy)
    path.join(__dirname, '..', '..', '..', 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
    // Direct gh/ChittyChain path
    path.join(__dirname, '..', '..', '..', 'gh', 'ChittyChain'),
    // Environment variable override
    process.env.CHITTYCHAIN_PATH
  ].filter(Boolean);
  
  for (const basePath of possiblePaths) {
    try {
      if (fs.existsSync(path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
        return basePath;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  // Legacy fallback - try to find by walking up directories
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const legacyPath = path.join(currentDir, 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain');
    const ghPath = path.join(currentDir, 'gh', 'ChittyChain');
    
    if (fs.existsSync(path.join(legacyPath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
      return legacyPath;
    }
    if (fs.existsSync(path.join(ghPath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
      return ghPath;
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('ChittyChain implementation not found. Please ensure the blockchain files are available or set CHITTYCHAIN_PATH environment variable.');
}

// Dynamic imports based on discovered path
let ChittyChainV2, BlockchainValidationService, BlockchainRecoveryService, ArtifactMintingService;
let ChittyChainTrustLayer, ChittyChainVerificationService, ChittyChainConsentLayer;

try {
  const basePath = findChittyChainPath();
  const { ChittyChainV2: CC2 } = await import(path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'));
  const { BlockchainValidationService: BVS } = await import(path.join(basePath, 'lib', 'blockchain', 'validation-service.js'));
  const { BlockchainRecoveryService: BRS } = await import(path.join(basePath, 'lib', 'blockchain', 'error-recovery-service.js'));
  const { ArtifactMintingService: AMS } = await import(path.join(basePath, 'lib', 'blockchain', 'artifact-minting-service.js'));
  
  ChittyChainV2 = CC2;
  BlockchainValidationService = BVS;
  BlockchainRecoveryService = BRS;
  ArtifactMintingService = AMS;
  
  // Try to import trust and verification layers
  try {
    const { ChittyChainTrustLayer: CCTL } = await import(path.join(basePath, 'lib', 'blockchain', 'trust-layer.js'));
    const { ChittyChainVerificationService: CCVS } = await import(path.join(basePath, 'lib', 'blockchain', 'verification-service.js'));
    const { ChittyChainConsentLayer: CCCL } = await import(path.join(basePath, 'lib', 'blockchain', 'consent-layer.js'));
    
    ChittyChainTrustLayer = CCTL;
    ChittyChainVerificationService = CCVS;
    ChittyChainConsentLayer = CCCL;
  } catch (trustError) {
    console.warn('Trust/verification layers not available:', trustError.message);
  }
} catch (error) {
  console.error('Failed to load ChittyChain components:', error.message);
  console.error('Please ensure ChittyChain is properly installed or set CHITTYCHAIN_PATH environment variable.');
  process.exit(1);
}

// Initialize blockchain instance
const chain = new ChittyChainV2();
const mintingService = new ArtifactMintingService();

// Initialize trust and verification services if available
const trustLayer = ChittyChainTrustLayer ? new ChittyChainTrustLayer(chain) : null;
const verificationService = ChittyChainVerificationService ? new ChittyChainVerificationService() : null;
const consentLayer = ChittyChainConsentLayer ? new ChittyChainConsentLayer() : null;

// Initialize dependency resolver
let ChittyChainDependencyResolver;
try {
  const basePath = findChittyChainPath();
  const depModule = await import(path.join(basePath, 'lib', 'blockchain', 'dependency-resolver.js'));
  ChittyChainDependencyResolver = depModule.ChittyChainDependencyResolver || depModule.default;
} catch (error) {
  // Try local path as fallback
  try {
    const depModule = await import('./chittychain-dependency-resolver.js');
    ChittyChainDependencyResolver = depModule.ChittyChainDependencyResolver || depModule.default;
  } catch (localError) {
    console.warn('Dependency resolver not available:', localError.message);
  }
}

const dependencyResolver = ChittyChainDependencyResolver ? new ChittyChainDependencyResolver(chain) : null;

// Create MCP server
const server = new MCPServer({
  capabilities: {
    tools: true,
    resources: true
  }
});

// Define blockchain-specific tools
const tools = [
  {
    name: 'chittychain_mine_block',
    description: 'Mine a new block with pending artifacts',
    inputSchema: {
      type: 'object',
      properties: {
        minerEmail: {
          type: 'string',
          description: 'Email address of the miner',
          default: 'system@chittychain.local'
        }
      }
    }
  },
  {
    name: 'chittychain_validate_chain',
    description: 'Validate the entire blockchain for integrity',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed validation results',
          default: false
        }
      }
    }
  },
  {
    name: 'chittychain_get_block',
    description: 'Retrieve a specific block by index or hash',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Block index (number) or hash'
        }
      },
      required: ['identifier']
    }
  },
  {
    name: 'chittychain_query_blocks',
    description: 'Query blocks based on various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        startIndex: {
          type: 'number',
          description: 'Starting block index'
        },
        endIndex: {
          type: 'number',
          description: 'Ending block index'
        },
        minerEmail: {
          type: 'string',
          description: 'Filter by miner email'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of blocks to return',
          default: 10
        }
      }
    }
  },
  {
    name: 'chittychain_get_merkle_proof',
    description: 'Get Merkle proof for an artifact in a block',
    inputSchema: {
      type: 'object',
      properties: {
        artifactId: {
          type: 'string',
          description: 'ID of the artifact'
        }
      },
      required: ['artifactId']
    }
  },
  {
    name: 'chittychain_verify_merkle_proof',
    description: 'Verify a Merkle proof for an artifact',
    inputSchema: {
      type: 'object',
      properties: {
        artifactId: {
          type: 'string',
          description: 'ID of the artifact'
        },
        proof: {
          type: 'array',
          description: 'Merkle proof path',
          items: {
            type: 'object',
            properties: {
              hash: { type: 'string' },
              position: { type: 'string', enum: ['left', 'right'] }
            }
          }
        },
        root: {
          type: 'string',
          description: 'Expected Merkle root'
        }
      },
      required: ['artifactId', 'proof', 'root']
    }
  },
  // 🦈 AI AUTOMATION TOOLS - BABY SHARK'S BLOCKCHAIN CHAOS! 🦈
  {
    name: 'chittychain_auto_mint_ai_decision',
    description: 'Automatically mint AI executive decisions to blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        decisionType: {
          type: 'string',
          description: 'Type of AI decision (executive_decision, legal_analysis, etc.)',
          enum: ['executive_decision', 'legal_analysis', 'financial_decision', 'chaos_experiment', 'cross_executive_insight']
        },
        decisionData: {
          type: 'object',
          description: 'The AI decision data to mint'
        },
        executiveId: {
          type: 'string',
          description: 'ID of the executive making the decision',
          enum: ['CAO', 'CFO', 'GC', 'CIO', 'CMO', 'CHAOS']
        },
        trustTier: {
          type: 'string',
          description: 'Trust tier for the evidence',
          enum: ['GOVERNMENT', 'ATTORNEY_CLIENT', 'FINANCIAL', 'EXECUTIVE', 'SYSTEM'],
          default: 'EXECUTIVE'
        },
        requiresConsent: {
          type: 'boolean',
          description: 'Whether consent is required before minting',
          default: false
        }
      },
      required: ['decisionType', 'decisionData']
    }
  },
  {
    name: 'chittychain_queue_evidence_approval',
    description: 'Queue evidence for manual approval before minting',
    inputSchema: {
      type: 'object',
      properties: {
        evidenceData: {
          type: 'object',
          description: 'Evidence data requiring approval'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },
        reason: {
          type: 'string',
          description: 'Reason for requiring approval'
        }
      },
      required: ['evidenceData']
    }
  },
  {
    name: 'chittychain_get_automation_stats',
    description: 'Get statistics about AI automation activities',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          description: 'Time range for statistics',
          enum: ['1h', '24h', '7d', '30d'],
          default: '24h'
        }
      }
    }
  },
  {
    name: 'chittychain_analyze_performance',
    description: 'Analyze blockchain performance and statistics',
    inputSchema: {
      type: 'object',
      properties: {
        includeDistributions: {
          type: 'boolean',
          description: 'Include tier and type distributions',
          default: true
        }
      }
    }
  },
  {
    name: 'chittychain_backup',
    description: 'Create a backup of the blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        backupDir: {
          type: 'string',
          description: 'Directory to store backup',
          default: './backups'
        }
      }
    }
  },
  {
    name: 'chittychain_recover',
    description: 'Recover blockchain from errors or corruption',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          description: 'Recovery strategy',
          enum: ['safe', 'aggressive', 'rebuild'],
          default: 'safe'
        },
        backupPath: {
          type: 'string',
          description: 'Optional path to specific backup file'
        }
      }
    }
  },
  {
    name: 'chittychain_mint_batch',
    description: 'Mint multiple artifacts as a batch in a single block',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts to mint',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              contentHash: { type: 'string' },
              statement: { type: 'string' },
              weight: { type: 'number' },
              tier: { type: 'string' },
              type: { type: 'string' },
              caseId: { type: 'string' },
              metadata: { type: 'object' }
            },
            required: ['id', 'contentHash', 'statement', 'weight', 'tier', 'type']
          }
        },
        minerEmail: {
          type: 'string',
          description: 'Miner email address',
          default: 'system@chittychain.local'
        }
      },
      required: ['artifacts']
    }
  },
  {
    name: 'chittychain_export_chain',
    description: 'Export blockchain data in various formats',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Export format',
          enum: ['json', 'summary'],
          default: 'summary'
        },
        includeArtifacts: {
          type: 'boolean',
          description: 'Include full artifact details',
          default: false
        },
        startBlock: {
          type: 'number',
          description: 'Starting block index',
          default: 0
        },
        endBlock: {
          type: 'number',
          description: 'Ending block index (defaults to latest)'
        }
      }
    }
  },
  {
    name: 'chittychain_calculate_hash',
    description: 'Calculate SHA3-256 hash of content (utility function)',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to hash'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'chittychain_verified_mint',
    description: 'Mint artifacts with trust analysis, verification, and user consent',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts to mint with verification',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              contentHash: { type: 'string' },
              statement: { type: 'string' },
              weight: { type: 'number' },
              tier: { type: 'string' },
              type: { type: 'string' },
              caseId: { type: 'string' },
              metadata: { type: 'object' },
              authenticationMethod: { type: 'string' },
              chainOfCustody: { type: 'array' }
            },
            required: ['id', 'contentHash', 'statement', 'weight', 'tier', 'type']
          }
        },
        verificationLevel: {
          type: 'string',
          description: 'Verification level',
          enum: ['basic', 'standard', 'enhanced', 'legal'],
          default: 'legal'
        },
        requireConsent: {
          type: 'boolean',
          description: 'Require user consent (false allows auto-approval for high-trust)',
          default: true
        },
        minerEmail: {
          type: 'string',
          description: 'Miner email address',
          default: 'verified@chittychain.local'
        }
      },
      required: ['artifacts']
    }
  },
  {
    name: 'chittychain_trust_analysis',
    description: 'Analyze artifacts for trust score without minting',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts to analyze',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              contentHash: { type: 'string' },
              statement: { type: 'string' },
              weight: { type: 'number' },
              tier: { type: 'string' },
              type: { type: 'string' },
              metadata: { type: 'object' }
            },
            required: ['id', 'tier', 'weight']
          }
        },
        checkContradictions: {
          type: 'boolean',
          description: 'Check for contradictions with existing artifacts',
          default: true
        }
      },
      required: ['artifacts']
    }
  },
  {
    name: 'chittychain_verify_only',
    description: 'Verify artifacts and generate trust report WITHOUT minting to blockchain',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts to verify',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              contentHash: { type: 'string' },
              statement: { type: 'string' },
              weight: { type: 'number' },
              tier: { type: 'string' },
              type: { type: 'string' },
              metadata: { type: 'object' }
            },
            required: ['id', 'contentHash', 'statement', 'weight', 'tier', 'type']
          }
        },
        verificationLevel: {
          type: 'string',
          description: 'Level of verification',
          enum: ['basic', 'standard', 'enhanced', 'legal'],
          default: 'legal'
        },
        createSnapshot: {
          type: 'boolean',
          description: 'Create auditable snapshot for legal proceedings',
          default: true
        }
      },
      required: ['artifacts']
    }
  },
  {
    name: 'chittychain_verify_from_snapshot',
    description: 'Fast-track minting using a previous verification snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        snapshotId: {
          type: 'string',
          description: 'ID of the verification snapshot to use'
        },
        snapshot: {
          type: 'object',
          description: 'Full snapshot object (alternative to snapshotId)'
        },
        requireConsent: {
          type: 'boolean',
          description: 'Require user consent before minting',
          default: true
        },
        minerEmail: {
          type: 'string',
          description: 'Miner email address',
          default: 'system@chittychain.local'
        }
      }
    }
  },
  {
    name: 'chittychain_check_dependencies',
    description: 'Check if artifact dependencies are satisfied before minting',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts to check dependencies for',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              dependencies: { type: 'array' },
              metadata: { type: 'object' }
            },
            required: ['id']
          }
        },
        resolveMintingOrder: {
          type: 'boolean',
          description: 'Calculate optimal minting order',
          default: true
        },
        includeSuggestions: {
          type: 'boolean',
          description: 'Include suggestions for missing dependencies',
          default: true
        }
      },
      required: ['artifacts']
    }
  },
  {
    name: 'chittychain_resolve_dependencies',
    description: 'Resolve artifact dependencies and return minting order',
    inputSchema: {
      type: 'object',
      properties: {
        artifacts: {
          type: 'array',
          description: 'Array of artifacts with potential dependencies',
          items: { type: 'object' }
        },
        allowPartialMinting: {
          type: 'boolean',
          description: 'Allow minting of artifacts with satisfied dependencies',
          default: false
        },
        createPlaceholders: {
          type: 'boolean',
          description: 'Create placeholder artifacts for missing optional dependencies',
          default: false
        }
      },
      required: ['artifacts']
    }
  },
  
  // === EVIDENCE LEDGER MANAGEMENT TOOLS ===
  
  {
    name: 'chittychain_create_evidence',
    description: 'Create new evidence record in the ledger with automatic weight calculation',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'Case ID this evidence belongs to'
        },
        userId: {
          type: 'string',
          description: 'User ID submitting the evidence'
        },
        evidenceType: {
          type: 'string',
          enum: ['Document', 'Image', 'Communication', 'Financial Record', 'Legal Filing', 'Physical Evidence'],
          description: 'Type of evidence'
        },
        evidenceTier: {
          type: 'string',
          enum: ['SELF_AUTHENTICATING', 'GOVERNMENT', 'FINANCIAL_INSTITUTION', 'INDEPENDENT_THIRD_PARTY', 'BUSINESS_RECORDS', 'FIRST_PARTY_ADVERSE', 'FIRST_PARTY_FRIENDLY', 'UNCORROBORATED_PERSON'],
          description: 'Evidence tier for weight calculation'
        },
        originalFilename: {
          type: 'string',
          description: 'Original filename of the evidence'
        },
        contentHash: {
          type: 'string',
          description: 'SHA-256 hash of the content'
        },
        authenticationMethod: {
          type: 'string',
          enum: ['Seal', 'Stamp', 'Certification', 'Notarization', 'Digital Signature', 'Metadata', 'Witness', 'None'],
          description: 'Method used to authenticate the evidence'
        }
      },
      required: ['caseId', 'userId', 'evidenceType', 'evidenceTier', 'contentHash']
    }
  },
  
  {
    name: 'chittychain_add_atomic_fact',
    description: 'Extract and add atomic fact from evidence with classification',
    inputSchema: {
      type: 'object',
      properties: {
        parentDocumentId: {
          type: 'string',
          description: 'ID of the parent evidence document'
        },
        factText: {
          type: 'string',
          description: 'The extracted fact text'
        },
        factType: {
          type: 'string',
          enum: ['DATE', 'AMOUNT', 'ADMISSION', 'IDENTITY', 'LOCATION', 'RELATIONSHIP', 'ACTION', 'STATUS'],
          description: 'Type of fact'
        },
        classificationLevel: {
          type: 'string',
          enum: ['FACT', 'SUPPORTED_CLAIM', 'ASSERTION', 'ALLEGATION', 'CONTRADICTION'],
          description: 'Classification level of the fact'
        },
        locationInDocument: {
          type: 'string',
          description: 'Location in document (p./¶/l.)'
        },
        credibilityFactors: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['Against Interest', 'Contemporaneous', 'Business Duty', 'Official Duty']
          },
          description: 'Credibility enhancing factors'
        }
      },
      required: ['parentDocumentId', 'factText', 'factType', 'classificationLevel']
    }
  },
  
  {
    name: 'chittychain_detect_contradictions',
    description: 'Analyze facts for contradictions and logical inconsistencies',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'Case ID to analyze for contradictions'
        },
        conflictTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['DIRECT_CONTRADICTION', 'TEMPORAL_IMPOSSIBILITY', 'LOGICAL_INCONSISTENCY', 'PARTIAL_CONFLICT']
          },
          description: 'Types of conflicts to detect',
          default: ['DIRECT_CONTRADICTION', 'TEMPORAL_IMPOSSIBILITY', 'LOGICAL_INCONSISTENCY', 'PARTIAL_CONFLICT']
        }
      },
      required: ['caseId']
    }
  },
  
  {
    name: 'chittychain_resolve_contradiction',
    description: 'Resolve identified contradiction using hierarchy rules',
    inputSchema: {
      type: 'object',
      properties: {
        contradictionId: {
          type: 'string',
          description: 'ID of the contradiction to resolve'
        },
        winningFactId: {
          type: 'string',
          description: 'ID of the fact that wins the contradiction'
        },
        resolutionMethod: {
          type: 'string',
          enum: ['HIERARCHY_RULE', 'TEMPORAL_PRIORITY', 'AUTHENTICATION_SUPERIORITY', 'ADVERSE_ADMISSION', 'CONTEMPORANEOUS_RECORD'],
          description: 'Method used to resolve the contradiction'
        },
        impactOnCase: {
          type: 'string',
          description: 'Analysis of how this resolution impacts the case'
        }
      },
      required: ['contradictionId', 'winningFactId', 'resolutionMethod']
    }
  },
  
  {
    name: 'chittychain_chain_of_custody',
    description: 'Add chain of custody entry for evidence transfer',
    inputSchema: {
      type: 'object',
      properties: {
        evidenceId: {
          type: 'string',
          description: 'ID of the evidence being transferred'
        },
        custodianId: {
          type: 'string',
          description: 'ID of the receiving custodian'
        },
        transferMethod: {
          type: 'string',
          enum: ['SEALED_ENVELOPE', 'CERTIFIED_MAIL', 'SECURE_DIGITAL', 'COURT_FILING', 'NOTARY_TRANSFER', 'DIRECT_HANDOFF'],
          description: 'Method of transfer'
        },
        integrityCheckMethod: {
          type: 'string',
          enum: ['HASH_VERIFICATION', 'SEAL_INTACT', 'WITNESS_CONFIRMATION', 'METADATA_MATCH'],
          description: 'Method used to verify integrity'
        },
        integrityVerified: {
          type: 'boolean',
          description: 'Whether integrity was verified',
          default: true
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the transfer'
        }
      },
      required: ['evidenceId', 'custodianId', 'transferMethod', 'integrityCheckMethod']
    }
  },
  
  {
    name: 'chittychain_evidence_dashboard',
    description: 'Get comprehensive evidence dashboard for a case',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'Case ID to generate dashboard for'
        },
        includeContradictions: {
          type: 'boolean',
          description: 'Include contradiction analysis',
          default: true
        },
        includeTimeline: {
          type: 'boolean',
          description: 'Include fact timeline',
          default: true
        }
      },
      required: ['caseId']
    }
  },
  
  {
    name: 'chittychain_audit_report',
    description: 'Generate audit trail report for evidence handling',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'Case ID for audit report'
        },
        userId: {
          type: 'string',
          description: 'Specific user ID to audit (optional)'
        },
        actionTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['Upload', 'Verify', 'Mint', 'Reject', 'Query', 'Modify', 'Access']
          },
          description: 'Action types to include in report'
        },
        startDate: {
          type: 'string',
          description: 'Start date for audit period (ISO format)'
        },
        endDate: {
          type: 'string',
          description: 'End date for audit period (ISO format)'
        }
      },
      required: ['caseId']
    }
  }
];

// Tool handlers
const toolHandlers = {
  chittychain_mine_block: async ({ minerEmail = 'system@chittychain.local' }) => {
    try {
      if (chain.pendingArtifacts.length === 0) {
        return {
          success: false,
          message: 'No pending artifacts to mine'
        };
      }

      const startTime = Date.now();
      const block = await chain.minePendingArtifacts(minerEmail);
      const miningTime = Date.now() - startTime;

      return {
        success: true,
        block: {
          index: block.index,
          hash: block.hash,
          previousHash: block.previousHash,
          timestamp: block.timestamp,
          nonce: block.nonce,
          artifactCount: block.artifacts.length,
          miningTime: `${miningTime}ms`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_validate_chain: async ({ detailed = false }) => {
    try {
      const validator = new BlockchainValidationService(chain);
      const validation = await validator.validateBlockchain();

      const result = {
        valid: validation.valid,
        chainHeight: chain.getLatestBlock().index,
        totalArtifacts: chain.artifacts.size,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      };

      if (detailed || !validation.valid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        result.recommendations = validation.recommendations;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_get_block: async ({ identifier }) => {
    try {
      let block;
      
      // Check if identifier is a number (index) or string (hash)
      if (!isNaN(identifier)) {
        const index = parseInt(identifier);
        block = chain.chain[index];
      } else {
        block = chain.chain.find(b => b.hash === identifier);
      }

      if (!block) {
        return {
          success: false,
          error: 'Block not found'
        };
      }

      return {
        success: true,
        block: {
          index: block.index,
          hash: block.hash,
          previousHash: block.previousHash,
          timestamp: block.timestamp,
          nonce: block.nonce,
          merkleRoot: block.merkleRoot,
          artifacts: block.artifacts.map(a => ({
            id: a.id,
            type: a.type,
            tier: a.tier,
            weight: a.weight
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_query_blocks: async ({ startIndex, endIndex, minerEmail, limit = 10 }) => {
    try {
      let blocks = [...chain.chain];

      // Apply filters
      if (startIndex !== undefined) {
        blocks = blocks.filter(b => b.index >= startIndex);
      }
      if (endIndex !== undefined) {
        blocks = blocks.filter(b => b.index <= endIndex);
      }
      if (minerEmail) {
        blocks = blocks.filter(b => b.miner === minerEmail);
      }

      // Apply limit
      blocks = blocks.slice(0, limit);

      return {
        success: true,
        count: blocks.length,
        blocks: blocks.map(b => ({
          index: b.index,
          hash: b.hash,
          timestamp: b.timestamp,
          artifactCount: b.artifacts.length,
          miner: b.miner
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_get_merkle_proof: async ({ artifactId }) => {
    try {
      // Find the block containing the artifact
      const block = chain.chain.find(b => 
        b.artifacts.some(a => a.id === artifactId)
      );

      if (!block) {
        return {
          success: false,
          error: 'Artifact not found in any block'
        };
      }

      const proof = block.getMerkleProof(artifactId);
      
      return {
        success: true,
        artifactId,
        blockIndex: block.index,
        blockHash: block.hash,
        merkleRoot: block.merkleRoot,
        proof: proof || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_verify_merkle_proof: async ({ artifactId, proof, root }) => {
    try {
      // Calculate leaf hash
      let currentHash = crypto.createHash('sha3-256')
        .update(artifactId)
        .digest('hex');

      // Follow the proof path
      for (const step of proof) {
        const combinedData = step.position === 'left' 
          ? step.hash + currentHash 
          : currentHash + step.hash;
        
        currentHash = crypto.createHash('sha3-256')
          .update(combinedData)
          .digest('hex');
      }

      const valid = currentHash === root;

      return {
        success: true,
        valid,
        calculatedRoot: currentHash,
        expectedRoot: root
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_analyze_performance: async ({ includeDistributions = true }) => {
    try {
      const stats = {
        totalBlocks: chain.chain.length,
        totalArtifacts: chain.artifacts.size,
        avgBlockTime: 0,
        avgArtifactsPerBlock: 0,
        miningTimes: []
      };

      // Calculate block times
      let prevTimestamp = chain.chain[0].timestamp;
      chain.chain.forEach((block, index) => {
        if (index > 0) {
          const blockTime = block.timestamp - prevTimestamp;
          stats.miningTimes.push(blockTime);
          prevTimestamp = block.timestamp;
        }
      });

      stats.avgBlockTime = stats.miningTimes.length > 0 
        ? stats.miningTimes.reduce((a, b) => a + b, 0) / stats.miningTimes.length 
        : 0;
      stats.avgArtifactsPerBlock = stats.totalArtifacts / (stats.totalBlocks - 1);

      if (includeDistributions) {
        stats.tierDistribution = {};
        stats.typeDistribution = {};

        chain.chain.forEach(block => {
          block.artifacts.forEach(artifact => {
            stats.tierDistribution[artifact.tier] = (stats.tierDistribution[artifact.tier] || 0) + 1;
            stats.typeDistribution[artifact.type] = (stats.typeDistribution[artifact.type] || 0) + 1;
          });
        });
      }

      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_backup: async ({ backupDir = './backups' }) => {
    try {
      const recovery = new BlockchainRecoveryService(chain);
      const backupPath = await recovery.createBackup(backupDir);

      return {
        success: true,
        backupPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_recover: async ({ strategy = 'safe', backupPath }) => {
    try {
      const recovery = new BlockchainRecoveryService(chain);
      
      let result;
      if (backupPath) {
        result = await recovery.restoreFromBackup(backupPath);
      } else {
        result = await recovery.autoRecover(strategy);
      }

      return {
        success: result.success,
        message: result.message,
        details: result.details
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_mint_batch: async ({ artifacts, minerEmail = 'system@chittychain.local' }) => {
    try {
      const result = await chain.mintArtifacts(artifacts, minerEmail);

      return {
        success: true,
        minted: result.minted.length,
        rejected: result.rejected.length,
        block: {
          index: result.block.index,
          hash: result.block.hash,
          timestamp: result.block.timestamp
        },
        artifacts: result.minted.map(a => ({
          id: a.id,
          tier: a.tier,
          type: a.type,
          weight: a.weight
        })),
        rejectedDetails: result.rejected
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_export_chain: async ({ format = 'summary', includeArtifacts = false, startBlock = 0, endBlock }) => {
    try {
      const latestIndex = chain.getLatestBlock().index;
      endBlock = endBlock ?? latestIndex;

      const blocks = chain.chain.filter(b => b.index >= startBlock && b.index <= endBlock);

      if (format === 'json') {
        return {
          success: true,
          data: {
            metadata: {
              version: '2.0.0',
              exportDate: new Date().toISOString(),
              chainHeight: latestIndex,
              totalArtifacts: chain.artifacts.size,
              exportRange: { start: startBlock, end: endBlock }
            },
            blocks: blocks.map(block => ({
              index: block.index,
              hash: block.hash,
              previousHash: block.previousHash,
              timestamp: block.timestamp,
              nonce: block.nonce,
              merkleRoot: block.merkleRoot,
              artifactCount: block.artifacts.length,
              artifacts: includeArtifacts ? block.artifacts : undefined
            }))
          }
        };
      } else {
        // Summary format
        return {
          success: true,
          summary: {
            chainHeight: latestIndex,
            totalBlocks: chain.chain.length,
            totalArtifacts: chain.artifacts.size,
            exportedBlocks: blocks.length,
            dateRange: {
              start: new Date(blocks[0]?.timestamp).toISOString(),
              end: new Date(blocks[blocks.length - 1]?.timestamp).toISOString()
            }
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_calculate_hash: async ({ content }) => {
    try {
      const hash = crypto.createHash('sha3-256')
        .update(content)
        .digest('hex');

      return {
        success: true,
        hash,
        algorithm: 'SHA3-256'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_verified_mint: async ({ artifacts, verificationLevel = 'legal', requireConsent = true, minerEmail = 'verified@chittychain.local' }) => {
    try {
      if (!trustLayer || !verificationService) {
        return {
          success: false,
          error: 'Trust and verification services not available. Please ensure all components are installed.'
        };
      }

      // Check dependencies first if resolver is available
      if (dependencyResolver) {
        const depCheck = await toolHandlers.chittychain_check_dependencies({ 
          artifacts, 
          resolveMintingOrder: true,
          includeSuggestions: true 
        });
        
        if (!depCheck.results.satisfied) {
          return {
            success: false,
            error: 'Cannot mint artifacts with unsatisfied dependencies',
            missingDependencies: depCheck.results.missingDependencies,
            suggestions: depCheck.results.suggestions,
            mintingOrder: depCheck.results.mintingOrder
          };
        }
        
        // If dependencies are satisfied, use the resolved minting order
        if (depCheck.results.mintingOrder && depCheck.results.mintingOrder.valid) {
          // Reorder artifacts according to dependency resolution
          const orderedIds = depCheck.results.mintingOrder.order;
          artifacts = orderedIds.map(id => artifacts.find(a => a.id === id)).filter(Boolean);
        }
      }

      const results = {
        analyzed: [],
        approved: [],
        rejected: [],
        minted: false,
        block: null
      };

      // Analyze each artifact through trust layer
      for (const artifact of artifacts) {
        const analysis = await trustLayer.analyzeEvidence(artifact);
        results.analyzed.push({
          id: artifact.id,
          trustScore: analysis.trustScore,
          verifications: analysis.verifications,
          warnings: analysis.warnings,
          contradictions: analysis.contradictions,
          recommendations: analysis.recommendations
        });

        // Process through trust layer with consent
        const processResult = await trustLayer.processEvidence(artifact, { requireConsent });
        
        if (processResult.approved) {
          results.approved.push(artifact);
        } else {
          results.rejected.push({
            id: artifact.id,
            reason: processResult.consent?.reason || 'Failed verification'
          });
        }
      }

      // If any artifacts were approved, mint them
      if (results.approved.length > 0) {
        const mintResult = await chain.mintArtifacts(results.approved, minerEmail);
        results.minted = true;
        results.block = {
          index: mintResult.block.index,
          hash: mintResult.block.hash,
          timestamp: mintResult.block.timestamp,
          artifactCount: mintResult.block.artifacts.length
        };
      }

      return {
        success: true,
        summary: {
          total: artifacts.length,
          analyzed: results.analyzed.length,
          approved: results.approved.length,
          rejected: results.rejected.length,
          minted: results.minted
        },
        analysis: results.analyzed,
        approved: results.approved.map(a => a.id),
        rejected: results.rejected,
        block: results.block
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_trust_analysis: async ({ artifacts, checkContradictions = true }) => {
    try {
      if (!trustLayer) {
        return {
          success: false,
          error: 'Trust layer service not available.'
        };
      }

      const analyses = [];
      
      for (const artifact of artifacts) {
        const analysis = await trustLayer.analyzeEvidence(artifact);
        analyses.push({
          artifactId: artifact.id,
          tier: artifact.tier,
          weight: artifact.weight,
          trustScore: analysis.trustScore,
          verifications: analysis.verifications,
          warnings: analysis.warnings,
          contradictions: checkContradictions ? analysis.contradictions : [],
          recommendations: analysis.recommendations,
          autoMintEligible: analysis.trustScore >= 0.95
        });
      }

      // Generate summary
      const summary = {
        totalArtifacts: artifacts.length,
        averageTrustScore: analyses.reduce((sum, a) => sum + a.trustScore, 0) / analyses.length,
        autoMintEligible: analyses.filter(a => a.autoMintEligible).length,
        hasWarnings: analyses.filter(a => a.warnings.length > 0).length,
        hasContradictions: analyses.filter(a => a.contradictions.length > 0).length,
        tierBreakdown: {}
      };

      // Calculate tier breakdown
      analyses.forEach(a => {
        summary.tierBreakdown[a.tier] = (summary.tierBreakdown[a.tier] || 0) + 1;
      });

      return {
        success: true,
        summary,
        analyses,
        trustReport: trustLayer.exportTrustReport()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_verify_only: async ({ artifacts, verificationLevel = 'legal', createSnapshot = true }) => {
    try {
      // Check if verification service is available
      if (!verificationService) {
        // Fallback to basic verification
        const basicVerification = {
          reportId: crypto.randomUUID(),
          reportType: 'TRUST_VERIFICATION_ONLY',
          timestamp: new Date().toISOString(),
          verificationLevel: 'basic',
          artifacts: artifacts.map(artifact => ({
            ...artifact,
            trustScore: artifact.weight,
            status: artifact.weight >= 0.5 ? 'passed' : 'warning',
            issues: [],
            warnings: artifact.weight < 0.5 ? ['Low weight evidence'] : []
          })),
          summary: {
            totalArtifacts: artifacts.length,
            passedVerification: artifacts.filter(a => a.weight >= 0.5).length,
            failedVerification: 0,
            warnings: artifacts.filter(a => a.weight < 0.5).length,
            averageTrustScore: artifacts.reduce((sum, a) => sum + a.weight, 0) / artifacts.length,
            recommendedForMinting: true
          },
          legal: {
            disclaimer: 'This is a verification report only. No data has been written to the blockchain.',
            purpose: 'This report can be used for legal review and decision-making before permanent blockchain storage.',
            validity: '24 hours from timestamp',
            verificationStandard: 'ChittyChain Basic Verification v2.0'
          }
        };

        if (createSnapshot) {
          basicVerification.snapshot = {
            created: new Date().toISOString(),
            cryptographicProof: {
              reportHash: crypto.createHash('sha256').update(JSON.stringify(basicVerification)).digest('hex'),
              artifactHashes: artifacts.map(a => ({
                id: a.id,
                contentHash: a.contentHash
              }))
            },
            legal: {
              statement: 'This snapshot represents the state of evidence at the time of verification.',
              admissibility: 'This snapshot may be admitted as evidence of the verification process.',
              retention: 'This snapshot should be retained for legal proceedings.',
              warning: 'This is NOT a blockchain record. For permanent storage, use verified-mint command.'
            }
          };
        }

        return {
          success: true,
          report: basicVerification,
          snapshotId: createSnapshot ? basicVerification.reportId : null
        };
      }

      // Full verification with verification service
      const verificationResult = await verificationService.verifyArtifactsForMinting(
        artifacts,
        { level: verificationLevel, requireUserConsent: false }
      );

      const report = verificationService.generateVerificationReport(verificationResult);
      
      if (createSnapshot) {
        report.snapshot = {
          created: new Date().toISOString(),
          cryptographicProof: {
            reportHash: crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex'),
            artifactHashes: artifacts.map(a => ({
              id: a.id,
              contentHash: a.contentHash,
              verificationHash: crypto.createHash('sha256')
                .update(JSON.stringify(verificationResult.artifacts.find(v => v.artifactId === a.id)))
                .digest('hex')
            }))
          },
          legal: {
            statement: 'This snapshot represents the state of evidence at the time of verification.',
            admissibility: 'This snapshot may be admitted as evidence of the verification process.',
            retention: 'This snapshot should be retained for legal proceedings.',
            warning: 'This is NOT a blockchain record. For permanent storage, use verified-mint command.'
          }
        };
      }

      return {
        success: true,
        report,
        snapshotId: createSnapshot ? report.id : null,
        fastTrackToken: createSnapshot ? crypto.randomUUID() : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_verify_from_snapshot: async ({ snapshotId, snapshot, requireConsent = true, minerEmail = 'system@chittychain.local' }) => {
    try {
      // Validate snapshot
      const verificationReport = snapshot || await loadSnapshot(snapshotId);
      if (!verificationReport) {
        return {
          success: false,
          error: 'Snapshot not found or invalid'
        };
      }

      // Extract artifacts from snapshot
      const artifacts = verificationReport.artifacts || verificationReport.details?.artifacts;
      if (!artifacts || artifacts.length === 0) {
        return {
          success: false,
          error: 'No artifacts found in snapshot'
        };
      }

      // Check if snapshot is still valid (24 hours)
      const snapshotAge = Date.now() - new Date(verificationReport.timestamp).getTime();
      if (snapshotAge > 24 * 60 * 60 * 1000) {
        return {
          success: false,
          error: 'Snapshot has expired (>24 hours old). Please create a new verification.'
        };
      }

      // Check if all artifacts passed verification
      const failedArtifacts = artifacts.filter(a => 
        a.status === 'failed' || (a.verification && a.verification.status === 'failed')
      );
      
      if (failedArtifacts.length > 0) {
        return {
          success: false,
          error: `Cannot mint: ${failedArtifacts.length} artifacts failed verification`,
          failedArtifacts: failedArtifacts.map(a => a.id)
        };
      }

      // Get consent if required
      if (requireConsent && consentLayer) {
        const consentResult = await consentLayer.requestMintingConsent(artifacts, {
          fromSnapshot: true,
          snapshotId: verificationReport.id || verificationReport.reportId
        });

        if (!consentResult.approved) {
          return {
            success: false,
            error: 'User consent denied',
            reason: consentResult.reason
          };
        }
      }

      // Mint the verified artifacts
      const result = await chain.mintArtifacts(artifacts, minerEmail);

      return {
        success: true,
        message: 'Successfully minted artifacts from verified snapshot',
        minted: result.minted.length,
        rejected: result.rejected.length,
        block: {
          index: result.block.index,
          hash: result.block.hash,
          timestamp: result.block.timestamp
        },
        fromSnapshot: {
          id: verificationReport.id || verificationReport.reportId,
          created: verificationReport.timestamp,
          verificationLevel: verificationReport.verificationLevel
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_check_dependencies: async ({ artifacts, resolveMintingOrder = true, includeSuggestions = true }) => {
    try {
      if (!dependencyResolver) {
        return {
          success: false,
          error: 'Dependency resolver not available.'
        };
      }

      const results = {
        artifacts: [],
        satisfied: true,
        missingDependencies: [],
        suggestions: [],
        mintingOrder: null
      };

      // Check each artifact's dependencies
      for (const artifact of artifacts) {
        const depCheck = await dependencyResolver.checkDependencies(artifact);
        results.artifacts.push({
          artifactId: artifact.id,
          satisfied: depCheck.satisfied,
          dependencies: depCheck.dependencies,
          missing: depCheck.missing,
          warnings: depCheck.warnings
        });

        if (!depCheck.satisfied) {
          results.satisfied = false;
          results.missingDependencies.push(...depCheck.missing);
        }
      }

      // Resolve minting order if requested
      if (resolveMintingOrder) {
        const orderResult = await dependencyResolver.resolveMintingOrder(artifacts);
        results.mintingOrder = {
          valid: orderResult.valid,
          order: orderResult.order,
          batches: orderResult.batches.map(batch => ({
            depth: batch.depth,
            artifactIds: batch.artifacts.map(a => a.id),
            canMintTogether: true
          })),
          unresolvable: orderResult.unresolvable
        };
      }

      // Get suggestions for missing dependencies
      if (includeSuggestions && results.missingDependencies.length > 0) {
        results.suggestions = dependencyResolver.suggestResolution(results.missingDependencies);
      }

      // Generate dependency report
      results.report = dependencyResolver.generateDependencyReport(artifacts);

      return {
        success: true,
        allDependenciesSatisfied: results.satisfied,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_resolve_dependencies: async ({ artifacts, allowPartialMinting = false, createPlaceholders = false }) => {
    try {
      if (!dependencyResolver) {
        return {
          success: false,
          error: 'Dependency resolver not available.'
        };
      }

      // Build dependency graph
      dependencyResolver.buildDependencyGraph(artifacts);

      // Resolve minting order
      const resolution = await dependencyResolver.resolveMintingOrder(artifacts);

      const result = {
        valid: resolution.valid,
        totalArtifacts: artifacts.length,
        resolvableArtifacts: resolution.order.length,
        unresolvableArtifacts: resolution.unresolvable.length,
        mintingBatches: resolution.batches,
        unresolvable: resolution.unresolvable
      };

      // Create placeholders if requested
      if (createPlaceholders && resolution.unresolvable.length > 0) {
        const placeholders = [];
        
        for (const unresolved of resolution.unresolvable) {
          for (const missing of unresolved.missing) {
            if (!missing.required) {
              const placeholder = dependencyResolver.createPlaceholderTemplate(missing);
              placeholders.push(placeholder);
            }
          }
        }

        if (placeholders.length > 0) {
          result.placeholdersCreated = placeholders;
          result.message = `Created ${placeholders.length} placeholder artifacts for optional dependencies`;
        }
      }

      // Handle partial minting
      if (allowPartialMinting && resolution.batches.length > 0) {
        result.partialMintingPossible = true;
        result.artifactsReadyToMint = resolution.order;
      } else if (!resolution.valid) {
        result.error = 'Cannot resolve all dependencies. Some artifacts have missing required dependencies.';
      }

      // Add visualization for debugging
      result.dependencyGraph = dependencyResolver.generateDependencyReport(artifacts).dependencyGraph;

      return {
        success: true,
        resolution: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // === EVIDENCE LEDGER MANAGEMENT TOOL HANDLERS ===
  
  chittychain_create_evidence: async ({ caseId, userId, evidenceType, evidenceTier, originalFilename, contentHash, authenticationMethod = 'None' }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      // Calculate evidence weight based on tier
      const weightQuery = `SELECT calculate_evidence_weight($1::evidence_tier, $2) as weight`;
      const weightResult = await sql(weightQuery, [evidenceTier, authenticationMethod]);
      const evidenceWeight = weightResult[0].weight;
      
      // Create evidence record
      const insertQuery = `
        INSERT INTO master_evidence (
          case_id, user_id, evidence_type, evidence_tier, evidence_weight,
          content_hash, original_filename, authentication_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING artifact_id, evidence_weight, created_at
      `;
      
      const result = await sql(insertQuery, [
        caseId, userId, evidenceType, evidenceTier, evidenceWeight,
        contentHash, originalFilename, authenticationMethod
      ]);
      
      return {
        success: true,
        artifactId: result[0].artifact_id,
        evidenceWeight: result[0].evidence_weight,
        createdAt: result[0].created_at,
        message: `Evidence created with weight ${evidenceWeight}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_add_atomic_fact: async ({ parentDocumentId, factText, factType, classificationLevel, locationInDocument, credibilityFactors = [] }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      // Calculate weight based on classification level
      const baseWeights = {
        'FACT': 0.9,
        'SUPPORTED_CLAIM': 0.8,
        'ASSERTION': 0.6,
        'ALLEGATION': 0.4,
        'CONTRADICTION': 0.2
      };
      
      let weight = baseWeights[classificationLevel] || 0.5;
      
      // Adjust weight based on credibility factors
      const credibilityBonus = credibilityFactors.length * 0.05;
      weight = Math.min(1.0, weight + credibilityBonus);
      
      const insertQuery = `
        INSERT INTO atomic_facts (
          parent_document_id, fact_text, fact_type, classification_level,
          location_in_document, credibility_factors, weight
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING fact_id, weight, created_at
      `;
      
      const result = await sql(insertQuery, [
        parentDocumentId, factText, factType, classificationLevel,
        locationInDocument, credibilityFactors, weight
      ]);
      
      return {
        success: true,
        factId: result[0].fact_id,
        weight: result[0].weight,
        createdAt: result[0].created_at,
        message: `Atomic fact extracted with weight ${weight}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_detect_contradictions: async ({ caseId, conflictTypes = ['DIRECT_CONTRADICTION', 'TEMPORAL_IMPOSSIBILITY', 'LOGICAL_INCONSISTENCY', 'PARTIAL_CONFLICT'] }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      // Get all facts for the case
      const factsQuery = `
        SELECT af.fact_id, af.fact_text, af.fact_type, af.classification_level, af.weight
        FROM atomic_facts af
        JOIN master_evidence me ON af.parent_document_id = me.id
        WHERE me.case_id = $1
        ORDER BY af.created_at
      `;
      
      const facts = await sql(factsQuery, [caseId]);
      const contradictions = [];
      
      // Simple contradiction detection (in production, this would use AI)
      for (let i = 0; i < facts.length; i++) {
        for (let j = i + 1; j < facts.length; j++) {
          const fact1 = facts[i];
          const fact2 = facts[j];
          
          // Check for direct contradictions in amount or date facts
          if (fact1.fact_type === fact2.fact_type && 
              fact1.fact_type === 'AMOUNT' &&
              fact1.fact_text !== fact2.fact_text) {
            
            const contradictionId = `CONFLICT-${Date.now()}-${i}-${j}`;
            
            // Create contradiction record
            const insertQuery = `
              INSERT INTO contradiction_tracking (
                contradiction_id, conflict_type
              ) VALUES ($1, $2)
              RETURNING id
            `;
            
            const contradictionResult = await sql(insertQuery, [contradictionId, 'DIRECT_CONTRADICTION']);
            
            // Link conflicting facts
            await sql(`
              INSERT INTO contradiction_facts (contradiction_id, fact_id)
              VALUES ($1, $2), ($1, $3)
            `, [contradictionResult[0].id, fact1.fact_id, fact2.fact_id]);
            
            contradictions.push({
              contradictionId,
              type: 'DIRECT_CONTRADICTION',
              facts: [fact1, fact2],
              severity: 'HIGH'
            });
          }
        }
      }
      
      return {
        success: true,
        contradictionsFound: contradictions.length,
        contradictions,
        message: `Detected ${contradictions.length} contradictions`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_resolve_contradiction: async ({ contradictionId, winningFactId, resolutionMethod, impactOnCase }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      const updateQuery = `
        UPDATE contradiction_tracking
        SET winning_fact_id = $1,
            resolution_method = $2,
            resolution_date = CURRENT_DATE,
            impact_on_case = $3
        WHERE contradiction_id = $4
        RETURNING id, resolution_date
      `;
      
      const result = await sql(updateQuery, [
        winningFactId, resolutionMethod, impactOnCase, contradictionId
      ]);
      
      return {
        success: true,
        contradictionId,
        resolutionMethod,
        resolutionDate: result[0].resolution_date,
        message: `Contradiction resolved using ${resolutionMethod}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_chain_of_custody: async ({ evidenceId, custodianId, transferMethod, integrityCheckMethod, integrityVerified = true, notes }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      const insertQuery = `
        INSERT INTO chain_of_custody_log (
          evidence_id, custodian_id, date_received, transfer_method,
          integrity_check_method, integrity_verified, notes
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
        RETURNING id, date_received
      `;
      
      const result = await sql(insertQuery, [
        evidenceId, custodianId, transferMethod, integrityCheckMethod, integrityVerified, notes
      ]);
      
      return {
        success: true,
        custodyLogId: result[0].id,
        dateReceived: result[0].date_received,
        integrityVerified,
        message: `Chain of custody entry created`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_evidence_dashboard: async ({ caseId, includeContradictions = true, includeTimeline = true }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      // Get case summary
      const caseQuery = `
        SELECT * FROM case_summary WHERE id = $1
      `;
      const caseInfo = await sql(caseQuery, [caseId]);
      
      // Get evidence summary
      const evidenceQuery = `
        SELECT 
          evidence_type,
          evidence_tier,
          COUNT(*) as count,
          AVG(evidence_weight) as avg_weight
        FROM master_evidence
        WHERE case_id = $1
        GROUP BY evidence_type, evidence_tier
        ORDER BY evidence_tier, evidence_type
      `;
      const evidenceSummary = await sql(evidenceQuery, [caseId]);
      
      let contradictions = [];
      if (includeContradictions) {
        const contradictionsQuery = `
          SELECT 
            ct.contradiction_id,
            ct.conflict_type,
            ct.resolution_method,
            ct.resolution_date,
            COUNT(cf.fact_id) as fact_count
          FROM contradiction_tracking ct
          LEFT JOIN contradiction_facts cf ON ct.id = cf.contradiction_id
          LEFT JOIN atomic_facts af ON cf.fact_id = af.fact_id
          LEFT JOIN master_evidence me ON af.parent_document_id = me.id
          WHERE me.case_id = $1
          GROUP BY ct.id, ct.contradiction_id, ct.conflict_type, ct.resolution_method, ct.resolution_date
        `;
        contradictions = await sql(contradictionsQuery, [caseId]);
      }
      
      let timeline = [];
      if (includeTimeline) {
        const timelineQuery = `
          SELECT 
            af.fact_text,
            af.fact_type,
            af.classification_level,
            af.weight,
            af.created_at
          FROM atomic_facts af
          JOIN master_evidence me ON af.parent_document_id = me.id
          WHERE me.case_id = $1
          ORDER BY af.created_at DESC
          LIMIT 50
        `;
        timeline = await sql(timelineQuery, [caseId]);
      }
      
      return {
        success: true,
        caseInfo: caseInfo[0],
        evidenceSummary,
        contradictions,
        timeline,
        message: `Dashboard generated for case ${caseId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  chittychain_audit_report: async ({ caseId, userId, actionTypes, startDate, endDate }) => {
    try {
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      let auditQuery = `
        SELECT 
          at.timestamp,
          at.action_type,
          at.success_failure,
          at.details,
          u.full_name as user_name,
          me.artifact_id
        FROM audit_trail at
        LEFT JOIN users u ON at.user_id = u.id
        LEFT JOIN master_evidence me ON at.target_artifact_id = me.id
        WHERE me.case_id = $1
      `;
      
      const params = [caseId];
      let paramIndex = 2;
      
      if (userId) {
        auditQuery += ` AND at.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }
      
      if (actionTypes && actionTypes.length > 0) {
        auditQuery += ` AND at.action_type = ANY($${paramIndex})`;
        params.push(actionTypes);
        paramIndex++;
      }
      
      if (startDate) {
        auditQuery += ` AND at.timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        auditQuery += ` AND at.timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      auditQuery += ` ORDER BY at.timestamp DESC`;
      
      const auditEntries = await sql(auditQuery, params);
      
      // Generate summary statistics
      const summaryQuery = `
        SELECT 
          at.action_type,
          COUNT(*) as count,
          COUNT(CASE WHEN at.success_failure = 'Success' THEN 1 END) as success_count,
          COUNT(CASE WHEN at.success_failure = 'Failure' THEN 1 END) as failure_count
        FROM audit_trail at
        LEFT JOIN master_evidence me ON at.target_artifact_id = me.id
        WHERE me.case_id = $1
        GROUP BY at.action_type
        ORDER BY count DESC
      `;
      
      const summary = await sql(summaryQuery, [caseId]);
      
      return {
        success: true,
        auditEntries,
        summary,
        totalEntries: auditEntries.length,
        message: `Audit report generated for case ${caseId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Database connection initialization
const initializeDatabase = async () => {
  try {
    if (!process.env.NEON_DATABASE_URL) {
      console.warn('NEON_DATABASE_URL not found - evidence management features will be disabled');
      return false;
    }
    
    const sql = neon(process.env.NEON_DATABASE_URL);
    await sql`SELECT 1`;
    console.log('✅ Evidence database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Helper function to load snapshot (placeholder - would integrate with storage)
async function loadSnapshot(snapshotId) {
  // In production, this would load from a database or file system
  // For now, return null to indicate not found
  return null;
}

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      error: `Unknown tool: ${name}`
    };
  }

  try {
    const result = await handler(args);
    return result;
  } catch (error) {
    return {
      error: error.message
    };
  }
});

// Define resources (blockchain state)
server.setRequestHandler('resources/list', async () => ({
  resources: [
    {
      uri: 'chittychain://status',
      name: 'Blockchain Status',
      mimeType: 'application/json'
    },
    {
      uri: 'chittychain://latest-block',
      name: 'Latest Block',
      mimeType: 'application/json'
    }
  ]
}));

// Handle resource requests
server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'chittychain://status':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            chainHeight: chain.getLatestBlock().index,
            totalArtifacts: chain.artifacts.size,
            pendingArtifacts: chain.pendingArtifacts.length,
            difficulty: chain.difficulty,
            isValid: await (async () => {
              try {
                const validator = new BlockchainValidationService(chain);
                const result = await validator.validateBlockchain();
                return result.valid;
              } catch {
                return false;
              }
            })()
          }, null, 2)
        }]
      };

    case 'chittychain://latest-block':
      const latest = chain.getLatestBlock();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            index: latest.index,
            hash: latest.hash,
            previousHash: latest.previousHash,
            timestamp: latest.timestamp,
            nonce: latest.nonce,
            merkleRoot: latest.merkleRoot,
            artifactCount: latest.artifacts.length
          }, null, 2)
        }]
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  // Initialize database connection
  await initializeDatabase();
  
  await server.connect(transport);
  
  console.error('ChittyChain MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});