import { ethers } from "ethers";
import { check_chittychain, ChittyChainFact } from "./chittychain";

export interface OracleEvent {
  type: "DEED_RECORDED" | "LIEN_FILED" | "COURT_ORDER" | "TITLE_TRANSFER";
  parcelId: string;
  documentHash: string;
  timestamp: number;
  countySource: string;
  metadata: Record<string, any>;
}

export class ChittyChainOracle {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  private propertyContract: ethers.Contract;
  private watchedParcels: Set<string> = new Set();
  private countyWebhooks: Map<string, string> = new Map();

  constructor(
    rpcUrl: string,
    privateKey: string,
    propertyContractAddress: string,
    propertyContractABI: any[]
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.propertyContract = new ethers.Contract(
      propertyContractAddress,
      propertyContractABI,
      this.signer
    );
  }

  // Register webhook endpoints for county clerk APIs
  registerCountyWebhook(countyName: string, webhookUrl: string) {
    this.countyWebhooks.set(countyName, webhookUrl);
  }

  // Start watching a parcel for county events
  async watchParcel(parcelId: string) {
    this.watchedParcels.add(parcelId);
    
    // Check existing on-chain facts
    const existingFacts = await check_chittychain(parcelId);
    console.log(`Found ${existingFacts.length} existing facts for parcel ${parcelId}`);
  }

  // Handle incoming county clerk event
  async handleCountyEvent(event: OracleEvent): Promise<void> {
    console.log(`Oracle received event: ${event.type} for parcel ${event.parcelId}`);

    // Verify the parcel is being watched
    if (!this.watchedParcels.has(event.parcelId)) {
      console.log(`Parcel ${event.parcelId} not being watched, ignoring event`);
      return;
    }

    // Verify event authenticity (in production, check signatures)
    const isAuthentic = await this.verifyCountySignature(event);
    if (!isAuthentic) {
      console.error(`Event failed authentication: ${JSON.stringify(event)}`);
      return;
    }

    // Process based on event type
    switch (event.type) {
      case "DEED_RECORDED":
        await this.processDeedRecording(event);
        break;
      
      case "LIEN_FILED":
        await this.processLienFiling(event);
        break;
      
      case "COURT_ORDER":
        await this.processCourtOrder(event);
        break;
      
      case "TITLE_TRANSFER":
        await this.processTitleTransfer(event);
        break;
    }
  }

  private async processDeedRecording(event: OracleEvent) {
    try {
      // Get the token ID for this parcel
      const tokenId = await this.propertyContract.parcelToTokenId(event.parcelId);
      
      if (tokenId.toString() === "0") {
        console.log(`Property not yet tokenized, minting...`);
        // Mint new property token
        const tx = await this.propertyContract.mintProperty(
          event.parcelId,
          event.metadata.legalDescription || "",
          event.metadata.gpsPolygon || "",
          event.metadata.vestingType || "Fee Simple",
          event.documentHash,
          event.metadata.owner || ethers.ZeroAddress
        );
        await tx.wait();
        console.log(`Minted property token in tx: ${tx.hash}`);
      } else {
        // Add document to existing token
        const tx = await this.propertyContract.addDocument(
          tokenId,
          event.documentHash
        );
        await tx.wait();
        console.log(`Added document to token ${tokenId} in tx: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Error processing deed recording:", error);
      throw error;
    }
  }

  private async processLienFiling(event: OracleEvent) {
    try {
      const tokenId = await this.propertyContract.parcelToTokenId(event.parcelId);
      
      if (tokenId.toString() !== "0") {
        // Lock the property due to lien
        const tx = await this.propertyContract.lockProperty(
          tokenId,
          `Lien filed: ${event.documentHash}`
        );
        await tx.wait();
        console.log(`Locked property ${tokenId} due to lien in tx: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Error processing lien filing:", error);
      throw error;
    }
  }

  private async processCourtOrder(event: OracleEvent) {
    try {
      const tokenId = await this.propertyContract.parcelToTokenId(event.parcelId);
      
      if (tokenId.toString() !== "0" && event.metadata.orderType === "ownership_split") {
        // Process ownership split from divorce decree
        const newOwners = event.metadata.newOwners as string[];
        const percentages = event.metadata.percentages as number[];
        
        const tx = await this.propertyContract.splitOwnership(
          tokenId,
          newOwners,
          percentages
        );
        await tx.wait();
        console.log(`Split ownership of property ${tokenId} in tx: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Error processing court order:", error);
      throw error;
    }
  }

  private async processTitleTransfer(event: OracleEvent) {
    try {
      const tokenId = await this.propertyContract.parcelToTokenId(event.parcelId);
      
      if (tokenId.toString() !== "0") {
        // First unlock if locked
        const propertyData = await this.propertyContract.properties(tokenId);
        if (propertyData.isLocked) {
          const unlockTx = await this.propertyContract.unlockProperty(tokenId);
          await unlockTx.wait();
        }
        
        // Note: Actual transfer happens through standard ERC721 transfer
        // This just records the deed hash
        const tx = await this.propertyContract.addDocument(
          tokenId,
          event.documentHash
        );
        await tx.wait();
        console.log(`Recorded title transfer for token ${tokenId} in tx: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Error processing title transfer:", error);
      throw error;
    }
  }

  private async verifyCountySignature(event: OracleEvent): Promise<boolean> {
    // In production, verify cryptographic signature from county
    // For now, check if county source is registered
    return this.countyWebhooks.has(event.countySource);
  }

  // Webhook endpoint for counties to call
  async receiveCountyWebhook(payload: any, countyName: string): Promise<void> {
    const event: OracleEvent = {
      type: payload.eventType,
      parcelId: payload.parcelId,
      documentHash: payload.documentHash,
      timestamp: Date.now(),
      countySource: countyName,
      metadata: payload.metadata || {},
    };

    await this.handleCountyEvent(event);
  }
}

// Singleton instance
let oracleInstance: ChittyChainOracle | null = null;

export function getOracle(): ChittyChainOracle {
  if (!oracleInstance) {
    // In production, load from environment variables
    oracleInstance = new ChittyChainOracle(
      process.env.RPC_URL || "http://localhost:8545",
      process.env.ORACLE_PRIVATE_KEY || "",
      process.env.PROPERTY_CONTRACT_ADDRESS || "",
      [] // Load ABI from file
    );
  }
  return oracleInstance;
}