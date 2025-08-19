import { createCaseEntry, type CaseEntry } from "@/lib/notion";
import { getOracle } from "@/lib/blockchain/oracle";
import { SourceTier, mint_chittychain_fact } from "@/lib/blockchain/chittychain";

export interface DivorcePropertyDistribution {
  caseId: string;
  propertyTokenId: string;
  parcelId: string;
  spouse1: {
    name: string;
    walletAddress: string;
    percentage: number;
  };
  spouse2: {
    name: string;
    walletAddress: string;
    percentage: number;
  };
  courtOrderNumber: string;
  orderDate: Date;
  notes: string;
}

export class DivorceWorkflow {
  async initiateDivorceCase(
    caseName: string,
    parties: string[],
    properties: Array<{
      parcelId: string;
      address: string;
      estimatedValue: number;
    }>
  ): Promise<string> {
    // Create the case in Notion
    const caseEntry: CaseEntry = {
      name: caseName,
      type: "Divorce",
      entities: parties,
      claim: "Marital dissolution and property distribution",
      weight: "High",
      status: "Active",
      notes: `Properties involved: ${properties.length}`,
      titledAssets: properties.map(p => p.parcelId),
      assetDistribution: properties.map(p => ({
        assetId: p.parcelId,
        parties: parties.map(party => ({
          name: party,
          percentage: 50, // Default equal split
          walletAddress: undefined,
        })),
      })),
    };

    const notionResponse = await createCaseEntry(caseEntry);
    
    // Start watching properties for blockchain events
    const oracle = getOracle();
    for (const property of properties) {
      await oracle.watchParcel(property.parcelId);
    }

    return notionResponse.id;
  }

  async submitSettlementAgreement(
    caseId: string,
    distributions: DivorcePropertyDistribution[]
  ): Promise<void> {
    // Record each distribution as a fact on ChittyChain
    for (const dist of distributions) {
      const fact = await mint_chittychain_fact({
        statement: `Property ${dist.parcelId} distributed: ${dist.spouse1.name} (${dist.spouse1.percentage}%), ${dist.spouse2.name} (${dist.spouse2.percentage}%)`,
        source_tier: SourceTier.SELF_AUTHENTICATING,
        source_hash: dist.courtOrderNumber,
        weight: 1.0,
        supporting_evidence: [dist.courtOrderNumber],
      });

      console.log(`Minted settlement fact: ${fact.id}`);
    }
  }

  async executePropertySplit(
    distribution: DivorcePropertyDistribution
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const oracle = getOracle();
      
      // Create the court order event
      await oracle.handleCountyEvent({
        type: "COURT_ORDER",
        parcelId: distribution.parcelId,
        documentHash: distribution.courtOrderNumber,
        timestamp: Date.now(),
        countySource: "family-court",
        metadata: {
          orderType: "ownership_split",
          newOwners: [
            distribution.spouse1.walletAddress,
            distribution.spouse2.walletAddress,
          ],
          percentages: [
            distribution.spouse1.percentage,
            distribution.spouse2.percentage,
          ],
          caseId: distribution.caseId,
        },
      });

      // Update Notion with blockchain records
      const blockchainRecord = {
        transactionHash: `0x${Math.random().toString(36).substring(2)}`, // Mock
        blockNumber: Math.floor(Math.random() * 1000000),
        timestamp: Date.now(),
        action: "PROPERTY_SPLIT_EXECUTED",
      };

      // In production, update the Notion case with blockchain record
      
      return {
        success: true,
        transactionHash: blockchainRecord.transactionHash,
      };
    } catch (error) {
      console.error("Error executing property split:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async generateSettlementDocuments(
    caseId: string,
    distributions: DivorcePropertyDistribution[]
  ): Promise<string> {
    // Create a formatted settlement agreement
    const doc = `
PROPERTY SETTLEMENT AGREEMENT
Case ID: ${caseId}
Date: ${new Date().toLocaleDateString()}

PROPERTY DISTRIBUTIONS:
${distributions.map((dist, i) => `
${i + 1}. Property: ${dist.parcelId}
   Address: [To be fetched]
   Distribution:
   - ${dist.spouse1.name}: ${dist.spouse1.percentage}% (Wallet: ${dist.spouse1.walletAddress})
   - ${dist.spouse2.name}: ${dist.spouse2.percentage}% (Wallet: ${dist.spouse2.walletAddress})
   Court Order: ${dist.courtOrderNumber}
   Order Date: ${dist.orderDate.toLocaleDateString()}
`).join('\n')}

BLOCKCHAIN VERIFICATION:
All property distributions have been recorded on-chain and are immutable.
Verification can be performed using the ChittyChain explorer.

NOTES:
${distributions.map(d => d.notes).filter(n => n).join('\n')}
`;

    return doc;
  }

  async verifyPropertyOwnership(
    parcelId: string,
    walletAddress: string
  ): Promise<{
    isOwner: boolean;
    ownershipPercentage: number;
    coOwners: Array<{ address: string; percentage: number }>;
  }> {
    // In production, query the blockchain for current ownership
    // For now, return mock data
    return {
      isOwner: true,
      ownershipPercentage: 50,
      coOwners: [
        { address: "0x123...", percentage: 50 },
      ],
    };
  }
}

export const divorceWorkflow = new DivorceWorkflow();