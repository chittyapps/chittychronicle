export { ChittyBlock } from './ChittyBlock.js';
export { ChittyChain } from './ChittyChain.js';
export { ChittySmartContracts } from './SmartContracts.js';

// Initialize blockchain instance
import { ChittyChain } from './ChittyChain.js';
import { ChittySmartContracts } from './SmartContracts.js';

export const blockchain = new ChittyChain();
export const smartContracts = new ChittySmartContracts(blockchain);

// Export blockchain interface
export const ChittyBlockchain = {
  // Core blockchain operations
  mintFact: (facts, minterAddress) => blockchain.createFactBlock(facts, minterAddress),
  validateFact: (fact) => blockchain.validateFact(fact),
  findContradictions: (fact) => blockchain.findContradictions(fact),
  query: (params) => blockchain.queryChain(params),
  getStats: () => blockchain.getChainStats(),
  validateChain: () => blockchain.validateChain(),

  // Smart contract operations
  calculateWeight: (sourceTier, factors) => 
    smartContracts.executeContract('SourceCredibility', 'calculateWeight', sourceTier, factors),
  
  validateEvidence: (evidence) =>
    smartContracts.executeContract('EvidenceValidator', 'validateEvidence', evidence),
  
  resolveConflict: (sources) =>
    smartContracts.executeContract('ConflictResolver', 'resolveConflict', sources),
  
  checkAccess: (userId, caseId, artifactId, action) =>
    smartContracts.executeContract('AccessControl', 'checkAccess', userId, caseId, artifactId, action),
  
  validateSubmission: (submission) =>
    smartContracts.executeContract('AntiSpam', 'validateSubmission', submission),
  
  createServiceContract: (details) =>
    smartContracts.createServiceContract(details)
};