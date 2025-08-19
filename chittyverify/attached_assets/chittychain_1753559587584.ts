export enum SourceTier {
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  NEWS_OUTLET = "NEWS_OUTLET",
  DIRECT_TESTIMONY = "DIRECT_TESTIMONY",
  EXPERT_WITNESS = "EXPERT_WITNESS",
  GOVERNMENT = "GOVERNMENT",
  SELF_AUTHENTICATING = "SELF_AUTHENTICATING", // Court orders, sealed docs
}

export const SOURCE_WEIGHTS: Record<SourceTier, number> = {
  [SourceTier.SOCIAL_MEDIA]: 0.2,
  [SourceTier.NEWS_OUTLET]: 0.4,
  [SourceTier.DIRECT_TESTIMONY]: 0.6,
  [SourceTier.EXPERT_WITNESS]: 0.8,
  [SourceTier.GOVERNMENT]: 1.0,
  [SourceTier.SELF_AUTHENTICATING]: 1.0,
};

export interface ChittyChainFact {
  id: string;
  statement: string;
  source_tier: SourceTier;
  source_hash: string;
  weight: number;
  timestamp: number;
  block_number?: number;
  transaction_hash?: string;
  supporting_evidence: string[]; // IPFS hashes
  contradicting_facts?: string[]; // Fact IDs
}

export interface ChittyChainEvidence {
  id: string;
  type: "deed" | "title_report" | "court_order" | "lien" | "hoa_covenant";
  source_tier: SourceTier;
  ipfs_hash: string;
  chain_of_custody: ChainOfCustodyEntry[];
  seal_number?: string;
  notary_id?: string;
  clerk_signature?: string;
  combined_weight: number;
}

export interface ChainOfCustodyEntry {
  timestamp: number;
  actor: string;
  action: string;
  hash: string;
  signature?: string;
}

export async function submit_evidence_with_source(
  evidence: Omit<ChittyChainEvidence, "id" | "combined_weight">
): Promise<ChittyChainEvidence> {
  // Calculate combined weight based on source tier and chain of custody
  const baseWeight = SOURCE_WEIGHTS[evidence.source_tier];
  const custodyBonus = evidence.chain_of_custody.length * 0.05;
  const sealBonus = evidence.seal_number ? 0.1 : 0;
  const notaryBonus = evidence.notary_id ? 0.1 : 0;
  const clerkBonus = evidence.clerk_signature ? 0.2 : 0;
  
  const combined_weight = Math.min(
    1.0,
    baseWeight + custodyBonus + sealBonus + notaryBonus + clerkBonus
  );
  
  const fullEvidence: ChittyChainEvidence = {
    id: generateId(),
    ...evidence,
    combined_weight,
  };
  
  // Auto-mint if weight >= 0.9
  if (combined_weight >= 0.9) {
    await mint_chittychain_fact({
      statement: `Property evidence ${fullEvidence.id} verified`,
      source_tier: evidence.source_tier,
      source_hash: evidence.ipfs_hash,
      weight: combined_weight,
      supporting_evidence: [evidence.ipfs_hash],
    });
  }
  
  return fullEvidence;
}

export async function verify_chain_of_custody(
  evidence: ChittyChainEvidence
): Promise<boolean> {
  // Verify each hash in the chain matches
  for (let i = 1; i < evidence.chain_of_custody.length; i++) {
    const prev = evidence.chain_of_custody[i - 1];
    const curr = evidence.chain_of_custody[i];
    
    // In production, verify cryptographic signatures
    if (curr.signature && !await verifySignature(curr)) {
      return false;
    }
  }
  
  return true;
}

export async function mint_chittychain_fact(
  fact: Omit<ChittyChainFact, "id" | "timestamp" | "block_number" | "transaction_hash">
): Promise<ChittyChainFact> {
  const fullFact: ChittyChainFact = {
    id: generateId(),
    ...fact,
    timestamp: Date.now(),
  };
  
  // In production, this would submit to blockchain
  // For now, we'll simulate with a mock transaction
  fullFact.block_number = Math.floor(Math.random() * 1000000);
  fullFact.transaction_hash = `0x${generateId()}`;
  
  return fullFact;
}

export async function resolve_source_conflicts(
  facts: ChittyChainFact[]
): Promise<ChittyChainFact> {
  // Weight cascade: court order > government > expert > testimony > news > social
  const sorted = facts.sort((a, b) => {
    // Self-authenticating sources always win
    if (a.source_tier === SourceTier.SELF_AUTHENTICATING) return -1;
    if (b.source_tier === SourceTier.SELF_AUTHENTICATING) return 1;
    
    // Otherwise sort by weight
    return b.weight - a.weight;
  });
  
  return sorted[0];
}

export async function check_chittychain(
  parcelId: string
): Promise<ChittyChainFact[]> {
  // In production, query blockchain for all facts about this parcel
  // For now, return mock data
  return [];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

async function verifySignature(entry: ChainOfCustodyEntry): Promise<boolean> {
  // In production, implement actual signature verification
  return true;
}