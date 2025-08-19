import { ChittyBlock } from './ChittyBlock.js';
import crypto from 'crypto';

export class ChittyChain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingFacts = [];
    this.miningReward = 1;
    this.validators = new Map();
  }

  createGenesisBlock() {
    const genesisData = {
      facts: [{
        id: 'GENESIS',
        statement: 'ChittyChain Genesis Block',
        weight: 1.0,
        timestamp: new Date('2024-01-01').toISOString(),
        type: 'SYSTEM'
      }]
    };
    return new ChittyBlock(0, '2024-01-01', genesisData, '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  createFactBlock(facts, minterAddress) {
    const blockData = {
      facts: facts.map(fact => ({
        ...fact,
        id: this.generateFactId(fact),
        blockNumber: this.chain.length,
        mintedBy: minterAddress,
        mintedAt: new Date().toISOString()
      })),
      minter: minterAddress,
      factCount: facts.length
    };

    const block = new ChittyBlock(
      this.chain.length,
      Date.now(),
      blockData,
      this.getLatestBlock().hash
    );

    block.mineBlock(this.difficulty);
    this.chain.push(block);

    return {
      blockId: `BLOCK_${String(block.index).padStart(6, '0')}_${block.hash.substring(0, 8)}`,
      facts: blockData.facts,
      hash: block.hash,
      minedAt: block.timestamp
    };
  }

  generateFactId(fact) {
    const content = JSON.stringify({
      statement: fact.statement,
      caseId: fact.caseId,
      timestamp: Date.now()
    });
    
    return `FACT_${crypto.createHash('sha256').update(content).digest('hex').substring(0, 12).toUpperCase()}`;
  }

  validateFact(fact) {
    // Check if fact meets minting criteria
    const validationResult = {
      canMint: false,
      reason: '',
      requiredActions: []
    };

    if (fact.weight >= 0.9) {
      validationResult.canMint = true;
      validationResult.reason = 'Weight exceeds direct minting threshold';
    } else if (fact.weight >= 0.7) {
      validationResult.canMint = false;
      validationResult.reason = 'Requires corroboration';
      validationResult.requiredActions.push('Need 1 corroborating source');
    } else if (fact.weight >= 0.5) {
      validationResult.canMint = false;
      validationResult.reason = 'Requires multiple corroborations';
      validationResult.requiredActions.push('Need 2 corroborating sources');
    } else {
      validationResult.canMint = false;
      validationResult.reason = 'Insufficient weight for minting';
      validationResult.requiredActions.push('Cannot mint without independent verification');
    }

    return validationResult;
  }

  findContradictions(newFact) {
    const contradictions = [];

    for (const block of this.chain) {
      if (block.data.facts) {
        for (const existingFact of block.data.facts) {
          if (this.factsContradict(newFact, existingFact)) {
            contradictions.push({
              blockId: `BLOCK_${String(block.index).padStart(6, '0')}`,
              existingFact: existingFact,
              contradiction: this.describeContradiction(newFact, existingFact)
            });
          }
        }
      }
    }

    return contradictions;
  }

  factsContradict(fact1, fact2) {
    // Implement contradiction detection logic
    if (!fact1.caseId || !fact2.caseId || fact1.caseId !== fact2.caseId) {
      return false; // Facts from different cases don't contradict
    }

    // Check for temporal impossibilities
    if (fact1.type === 'DATE' && fact2.type === 'DATE') {
      return this.checkTemporalContradiction(fact1, fact2);
    }

    // Check for logical contradictions
    if (fact1.contradicts && fact1.contradicts.includes(fact2.id)) {
      return true;
    }

    return false;
  }

  checkTemporalContradiction(fact1, fact2) {
    // Example: "formed during marriage" vs "formed before marriage"
    if (fact1.subject === fact2.subject) {
      const date1 = new Date(fact1.value);
      const date2 = new Date(fact2.value);
      
      // If facts claim different dates for same event
      if (fact1.eventType === fact2.eventType && Math.abs(date1 - date2) > 86400000) {
        return true;
      }
    }
    return false;
  }

  describeContradiction(newFact, existingFact) {
    return {
      type: 'TEMPORAL_IMPOSSIBILITY',
      description: `New claim "${newFact.statement}" contradicts existing fact "${existingFact.statement}"`,
      resolution: 'Existing blockchain fact takes precedence'
    };
  }

  queryChain(queryParams) {
    const results = [];

    for (const block of this.chain) {
      if (block.data.facts) {
        const matchingFacts = block.data.facts.filter(fact => {
          if (queryParams.caseId && fact.caseId !== queryParams.caseId) {
            return false;
          }
          if (queryParams.type && fact.type !== queryParams.type) {
            return false;
          }
          if (queryParams.minWeight && fact.weight < queryParams.minWeight) {
            return false;
          }
          if (queryParams.searchTerms) {
            const statement = fact.statement.toLowerCase();
            return queryParams.searchTerms.some(term => 
              statement.includes(term.toLowerCase())
            );
          }
          return true;
        });

        if (matchingFacts.length > 0) {
          results.push({
            blockIndex: block.index,
            blockHash: block.hash,
            facts: matchingFacts
          });
        }
      }
    }

    return results;
  }

  validateChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Validate block structure
      const blockValidation = currentBlock.validate();
      if (!blockValidation.valid) {
        return {
          valid: false,
          error: `Block ${i} invalid: ${blockValidation.errors.join(', ')}`
        };
      }

      // Check hash continuity
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          error: `Block ${i} has invalid previous hash`
        };
      }

      // Verify hash calculation
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return {
          valid: false,
          error: `Block ${i} has invalid hash`
        };
      }
    }

    return { valid: true };
  }

  getChainStats() {
    let totalFacts = 0;
    const factsByType = {};
    const factsByCase = {};

    for (const block of this.chain) {
      if (block.data.facts) {
        totalFacts += block.data.facts.length;
        
        block.data.facts.forEach(fact => {
          // Count by type
          factsByType[fact.type] = (factsByType[fact.type] || 0) + 1;
          
          // Count by case
          if (fact.caseId) {
            factsByCase[fact.caseId] = (factsByCase[fact.caseId] || 0) + 1;
          }
        });
      }
    }

    return {
      totalBlocks: this.chain.length,
      totalFacts,
      factsByType,
      factsByCase,
      chainValid: this.validateChain().valid
    };
  }
}