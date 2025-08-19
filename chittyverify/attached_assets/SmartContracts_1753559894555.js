import crypto from 'crypto';

export class ChittySmartContracts {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contracts = new Map();
    this.deploySystemContracts();
  }

  deploySystemContracts() {
    // Evidence Validation Contract
    this.deployContract('EvidenceValidator', {
      validateEvidence: (evidence) => {
        const rules = {
          hasRequiredFields: evidence.type && evidence.content && evidence.sourceId,
          hasValidWeight: evidence.weight >= 0 && evidence.weight <= 1,
          hasAuthentication: evidence.authentication && evidence.authentication.method,
          hasCaseBinding: evidence.caseId && evidence.userId
        };

        const violations = Object.entries(rules)
          .filter(([_, valid]) => !valid)
          .map(([rule]) => rule);

        return {
          valid: violations.length === 0,
          violations
        };
      }
    });

    // Source Credibility Contract
    this.deployContract('SourceCredibility', {
      calculateWeight: (sourceTier, credibilityFactors) => {
        const baseWeights = {
          'SELF_AUTHENTICATING': 1.0,
          'GOVERNMENT': 0.9,
          'FINANCIAL_INSTITUTION': 0.85,
          'INDEPENDENT_THIRD_PARTY': 0.75,
          'BUSINESS_RECORDS': 0.6,
          'FIRST_PARTY_ADVERSE': 0.7,
          'FIRST_PARTY_FRIENDLY': 0.4,
          'UNCORROBORATED_PERSON': 0.1
        };

        let weight = baseWeights[sourceTier] || 0;

        // Apply credibility boosts
        if (credibilityFactors.against_interest) weight += 0.2;
        if (credibilityFactors.contemporaneous) weight += 0.1;
        if (credibilityFactors.business_duty) weight += 0.1;
        if (credibilityFactors.official_duty) weight += 0.15;

        return Math.min(weight, 1.0);
      }
    });

    // Conflict Resolution Contract
    this.deployContract('ConflictResolver', {
      resolveConflict: (sources) => {
        const tierRanking = {
          'SELF_AUTHENTICATING': 1,
          'GOVERNMENT': 2,
          'FINANCIAL_INSTITUTION': 3,
          'INDEPENDENT_THIRD_PARTY': 4,
          'BUSINESS_RECORDS': 5,
          'FIRST_PARTY_ADVERSE': 6,
          'FIRST_PARTY_FRIENDLY': 7,
          'UNCORROBORATED_PERSON': 8
        };

        // Sort sources by tier ranking
        const sortedSources = sources.sort((a, b) => 
          tierRanking[a.tier] - tierRanking[b.tier]
        );

        return {
          winner: sortedSources[0],
          ranking: sortedSources,
          reason: this.getResolutionReason(sortedSources[0], sortedSources[1])
        };
      }
    });

    // Access Control Contract
    this.deployContract('AccessControl', {
      checkAccess: (userId, caseId, artifactId, action) => {
        // Verify user is authorized for case
        const userCase = `${userId}-${caseId}`;
        const artifactCase = `${artifactId}-${caseId}`;

        const rules = {
          userAuthorized: this.verifyUserCaseAccess(userId, caseId),
          artifactBelongsToCase: artifactCase.includes(caseId),
          actionAllowed: this.checkActionPermission(userId, action)
        };

        return {
          allowed: Object.values(rules).every(v => v),
          rules
        };
      }
    });

    // Anti-Spam Contract
    this.deployContract('AntiSpam', {
      validateSubmission: (submission) => {
        const checks = {
          hasValidRegistration: submission.userId && submission.userId.startsWith('REG'),
          hasCaseConnection: submission.caseId && this.verifyCaseExists(submission.caseId),
          withinRateLimit: this.checkRateLimit(submission.userId),
          contentValid: this.validateContent(submission.content)
        };

        const spamScore = Object.values(checks).filter(v => !v).length * 25;

        return {
          allowed: spamScore === 0,
          spamScore,
          failedChecks: Object.entries(checks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => check)
        };
      }
    });
  }

  deployContract(name, methods) {
    const contract = {
      address: this.generateContractAddress(name),
      name,
      methods,
      deployedAt: Date.now(),
      deployedBy: 'SYSTEM'
    };

    this.contracts.set(name, contract);
    return contract.address;
  }

  executeContract(contractName, methodName, ...args) {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const method = contract.methods[methodName];
    if (!method) {
      throw new Error(`Method ${methodName} not found in contract ${contractName}`);
    }

    // Log contract execution for audit
    const execution = {
      contract: contractName,
      method: methodName,
      args,
      timestamp: Date.now(),
      result: null,
      error: null
    };

    try {
      execution.result = method(...args);
      this.logExecution(execution);
      return execution.result;
    } catch (error) {
      execution.error = error.message;
      this.logExecution(execution);
      throw error;
    }
  }

  generateContractAddress(name) {
    return `0x${crypto.createHash('sha256')
      .update(name + Date.now())
      .digest('hex')
      .substring(0, 40)}`;
  }

  getResolutionReason(winner, loser) {
    if (!loser) return 'No conflict';

    const reasons = {
      'SELF_AUTHENTICATING': 'Self-authenticating documents cannot be overruled',
      'GOVERNMENT': 'Government sources take precedence',
      'FINANCIAL_INSTITUTION': 'Financial institution records are highly trusted'
    };

    return reasons[winner.tier] || 'Higher tier source takes precedence';
  }

  verifyUserCaseAccess(userId, caseId) {
    // In production, this would check against a database
    return true;
  }

  verifyCaseExists(caseId) {
    // In production, this would verify against court database
    return /^[A-Z]+-\d{4}-[A-Z]-\d{6}$/.test(caseId);
  }

  checkRateLimit(userId) {
    // In production, this would check Redis or similar
    return true;
  }

  validateContent(content) {
    // Check for spam patterns
    const spamPatterns = [
      /viagra/i,
      /lottery/i,
      /inheritance/i,
      /click here/i
    ];

    return !spamPatterns.some(pattern => pattern.test(content));
  }

  checkActionPermission(userId, action) {
    const permissions = {
      'READ': true,
      'WRITE': true,
      'DELETE': false,
      'ADMIN': false
    };

    return permissions[action] || false;
  }

  logExecution(execution) {
    // In production, this would write to audit log
    console.log('Contract execution:', execution);
  }

  // Service Contract Methods
  createServiceContract(serviceDetails) {
    const serviceContract = {
      id: crypto.randomUUID(),
      type: 'LEGAL_SERVICE',
      parties: serviceDetails.parties,
      document: serviceDetails.document,
      serviceRequirements: serviceDetails.requirements,
      timestamp: Date.now(),
      status: 'PENDING'
    };

    // Execute service validation
    const validation = this.executeContract('EvidenceValidator', 'validateEvidence', {
      type: 'SERVICE_DOCUMENT',
      content: serviceContract.document,
      sourceId: serviceContract.parties.serving,
      caseId: serviceDetails.caseId,
      userId: serviceDetails.userId,
      weight: 1.0,
      authentication: { method: 'DIGITAL_SIGNATURE' }
    });

    if (validation.valid) {
      serviceContract.status = 'VALIDATED';
      return {
        success: true,
        contractId: serviceContract.id,
        serviceBlock: this.blockchain.createFactBlock([{
          statement: `Legal service executed: ${serviceDetails.document.type}`,
          type: 'SERVICE',
          caseId: serviceDetails.caseId,
          weight: 1.0,
          serviceContract: serviceContract.id
        }], 'SERVICE_SYSTEM')
      };
    }

    return {
      success: false,
      errors: validation.violations
    };
  }
}