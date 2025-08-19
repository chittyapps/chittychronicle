import { ChittyChainEvidence, SourceTier, submit_evidence_with_source, ChainOfCustodyEntry } from "@/lib/blockchain/chittychain";

export interface TitleDocument {
  parcelId: string;
  documentType: "deed" | "title_report" | "lien" | "hoa_covenant";
  countyName: string;
  recordedDate: Date;
  documentNumber: string;
  parties: {
    grantor?: string[];
    grantee?: string[];
  };
  legalDescription: string;
  content: string; // Base64 encoded PDF
  metadata: Record<string, any>;
}

export interface CountyClerkResponse {
  success: boolean;
  document?: TitleDocument;
  digitalSignature?: string;
  sealNumber?: string;
  timestamp: number;
}

export class TitleIngestionService {
  private countyAPIEndpoints: Map<string, string> = new Map([
    ["los-angeles", "https://api.lavote.gov/records"],
    ["cook-county", "https://api.cookcounty.gov/recorder"],
    ["harris-county", "https://api.harriscounty.gov/clerk"],
    // Add more counties as they come online
  ]);

  async pullTitleDocuments(
    parcelId: string,
    countyName: string
  ): Promise<TitleDocument[]> {
    const apiEndpoint = this.countyAPIEndpoints.get(countyName.toLowerCase());
    if (!apiEndpoint) {
      throw new Error(`County ${countyName} not supported yet`);
    }

    try {
      // In production, this would be actual API calls
      // For now, simulate with mock data
      const mockResponse: TitleDocument[] = [
        {
          parcelId,
          documentType: "deed",
          countyName,
          recordedDate: new Date("2023-01-15"),
          documentNumber: "2023-001234",
          parties: {
            grantor: ["John Doe", "Jane Doe"],
            grantee: ["Alice Smith", "Bob Smith"],
          },
          legalDescription: "Lot 42, Block 7, Sunny Acres Subdivision",
          content: "base64_encoded_pdf_here",
          metadata: {
            assessorParcelNumber: parcelId,
            recordingFee: 85.00,
            transferTax: 1250.00,
          },
        },
      ];

      return mockResponse;
    } catch (error) {
      console.error("Error pulling title documents:", error);
      throw error;
    }
  }

  async authenticateWithClerk(
    document: TitleDocument
  ): Promise<CountyClerkResponse> {
    // Simulate county clerk authentication
    const clerkResponse: CountyClerkResponse = {
      success: true,
      document,
      digitalSignature: `clerk_sig_${document.documentNumber}`,
      sealNumber: `SEAL-${document.countyName}-${Date.now()}`,
      timestamp: Date.now(),
    };

    return clerkResponse;
  }

  async ingestToChittyChain(
    document: TitleDocument,
    clerkResponse: CountyClerkResponse,
    ipfsHash: string
  ): Promise<ChittyChainEvidence> {
    const chainOfCustody: ChainOfCustodyEntry[] = [
      {
        timestamp: document.recordedDate.getTime(),
        actor: "County Recorder",
        action: "Document Recorded",
        hash: document.documentNumber,
      },
      {
        timestamp: clerkResponse.timestamp,
        actor: "County Clerk",
        action: "Document Authenticated",
        hash: clerkResponse.digitalSignature || "",
        signature: clerkResponse.digitalSignature,
      },
      {
        timestamp: Date.now(),
        actor: "ChittyChain Ingestion",
        action: "Document Tokenized",
        hash: ipfsHash,
      },
    ];

    const evidence = await submit_evidence_with_source({
      type: document.documentType,
      source_tier: SourceTier.GOVERNMENT,
      ipfs_hash: ipfsHash,
      chain_of_custody: chainOfCustody,
      seal_number: clerkResponse.sealNumber,
      clerk_signature: clerkResponse.digitalSignature,
    });

    return evidence;
  }

  async scanForLiens(parcelId: string, countyName: string): Promise<TitleDocument[]> {
    // Query for any liens, judgments, or encumbrances
    const allDocs = await this.pullTitleDocuments(parcelId, countyName);
    return allDocs.filter(doc => 
      doc.documentType === "lien" || 
      doc.metadata.documentClass === "encumbrance"
    );
  }

  async verifyChainOfTitle(
    parcelId: string,
    countyName: string,
    yearsBack: number = 30
  ): Promise<{
    isClean: boolean;
    issues: string[];
    chainDocuments: TitleDocument[];
  }> {
    const documents = await this.pullTitleDocuments(parcelId, countyName);
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);

    const chainDocuments = documents
      .filter(doc => doc.recordedDate >= cutoffDate)
      .sort((a, b) => a.recordedDate.getTime() - b.recordedDate.getTime());

    // Check for gaps or issues in the chain
    const issues: string[] = [];
    let previousGrantee: string[] = [];

    for (const doc of chainDocuments) {
      if (previousGrantee.length > 0 && doc.parties.grantor) {
        const grantorMatch = doc.parties.grantor.some(g => 
          previousGrantee.includes(g)
        );
        if (!grantorMatch) {
          issues.push(`Chain break: ${previousGrantee.join(", ")} to ${doc.parties.grantor.join(", ")}`);
        }
      }
      if (doc.parties.grantee) {
        previousGrantee = doc.parties.grantee;
      }
    }

    return {
      isClean: issues.length === 0,
      issues,
      chainDocuments,
    };
  }
}

export const titleIngestion = new TitleIngestionService();