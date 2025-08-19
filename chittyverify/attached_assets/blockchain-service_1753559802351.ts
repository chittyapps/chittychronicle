/**
 * ChittyChain Blockchain Service
 * Handles evidence minting and verification on blockchain
 */

import { ethers } from "ethers";
import { secretsManager } from "@/lib/security/secrets-manager";

interface MintEvidenceParams {
  artifactId: string;
  contentHash: string;
  caseId: string;
  evidenceWeight: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface MintingResult {
  transactionHash: string;
  blockNumber: string;
  gasUsed: string;
  networkFee: string;
  network: string;
  explorerBaseUrl: string;
}

export class BlockchainService {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  private contractAddress: string;
  private contract: ethers.Contract;
  private network: string;

  constructor() {
    this.network = process.env.NETWORK || "sepolia";
    this.contractAddress = process.env.CHITTYCHAIN_CONTRACT_ADDRESS || "";
  }

  async initialize(): Promise<void> {
    try {
      // Get blockchain credentials from 1Password or env
      const rpcUrl = await secretsManager.getSecret(
        secretsManager.constructor.SECRETS.BLOCKCHAIN_PRIVATE_KEY
      ) || process.env.RPC_URL;
      
      const privateKey = await secretsManager.getSecret(
        secretsManager.constructor.SECRETS.BLOCKCHAIN_PRIVATE_KEY
      ) || process.env.ORACLE_PRIVATE_KEY;

      if (!rpcUrl || !privateKey) {
        throw new Error("Missing blockchain configuration");
      }

      // Initialize provider and signer
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Initialize contract with ABI
      const contractABI = this.getContractABI();
      this.contract = new ethers.Contract(
        this.contractAddress,
        contractABI,
        this.signer
      );

      console.log('✅ Blockchain service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async mintEvidence(params: MintEvidenceParams): Promise<MintingResult> {
    await this.initialize();

    try {
      // Prepare evidence data for blockchain
      const evidenceData = {
        artifactId: params.artifactId,
        contentHash: params.contentHash,
        caseId: params.caseId,
        weight: Math.floor(params.evidenceWeight * 100), // Convert to integer
        timestamp: Math.floor(params.timestamp.getTime() / 1000),
        metadata: JSON.stringify(params.metadata || {})
      };

      // Estimate gas
      const gasEstimate = await this.contract.mintEvidence.estimateGas(
        evidenceData.artifactId,
        evidenceData.contentHash,
        evidenceData.caseId,
        evidenceData.weight,
        evidenceData.timestamp,
        evidenceData.metadata
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      // Submit transaction
      const transaction = await this.contract.mintEvidence(
        evidenceData.artifactId,
        evidenceData.contentHash,
        evidenceData.caseId,
        evidenceData.weight,
        evidenceData.timestamp,
        evidenceData.metadata,
        {
          gasLimit,
          gasPrice
        }
      );

      // Wait for confirmation
      const receipt = await transaction.wait();

      // Calculate network fee
      const networkFee = gasPrice ? 
        ethers.formatEther(gasPrice * BigInt(receipt.gasUsed)) :
        "0";

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        networkFee: `${networkFee} ETH`,
        network: this.network,
        explorerBaseUrl: this.getExplorerUrl()
      };

    } catch (error) {
      console.error('Blockchain minting error:', error);
      
      // Handle specific error types
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for blockchain transaction');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Blockchain network error - please try again');
      }
      if (error.message?.includes('already minted')) {
        throw new Error('Evidence already exists on blockchain');
      }
      
      throw new Error(`Blockchain minting failed: ${error.message}`);
    }
  }

  async verifyEvidence(contentHash: string): Promise<{
    exists: boolean;
    artifactId?: string;
    blockNumber?: string;
    timestamp?: Date;
    weight?: number;
  }> {
    await this.initialize();

    try {
      const result = await this.contract.getEvidenceByHash(contentHash);
      
      if (result.artifactId === "") {
        return { exists: false };
      }

      return {
        exists: true,
        artifactId: result.artifactId,
        blockNumber: result.blockNumber.toString(),
        timestamp: new Date(Number(result.timestamp) * 1000),
        weight: Number(result.weight) / 100 // Convert back from integer
      };
    } catch (error) {
      console.error('Blockchain verification error:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  async getEvidenceHistory(artifactId: string): Promise<Array<{
    action: string;
    blockNumber: string;
    timestamp: Date;
    transactionHash: string;
  }>> {
    await this.initialize();

    try {
      // Query events related to this artifact
      const filter = this.contract.filters.EvidenceMinted(artifactId);
      const events = await this.contract.queryFilter(filter);

      return events.map(event => ({
        action: 'Minted',
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.args.timestamp) * 1000),
        transactionHash: event.transactionHash
      }));
    } catch (error) {
      console.error('Error getting evidence history:', error);
      return [];
    }
  }

  async batchMintEvidence(evidenceList: MintEvidenceParams[]): Promise<{
    successful: MintingResult[];
    failed: Array<{ evidence: MintEvidenceParams; error: string }>;
  }> {
    const successful: MintingResult[] = [];
    const failed: Array<{ evidence: MintEvidenceParams; error: string }> = [];

    // Process in chunks to avoid rate limits
    const chunkSize = 5;
    for (let i = 0; i < evidenceList.length; i += chunkSize) {
      const chunk = evidenceList.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (evidence) => {
        try {
          const result = await this.mintEvidence(evidence);
          successful.push(result);
        } catch (error) {
          failed.push({
            evidence,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(promises);
      
      // Small delay between chunks
      if (i + chunkSize < evidenceList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed };
  }

  private getContractABI(): any[] {
    // In production, load from file or environment
    return [
      {
        "inputs": [
          { "name": "artifactId", "type": "string" },
          { "name": "contentHash", "type": "string" },
          { "name": "caseId", "type": "string" },
          { "name": "weight", "type": "uint256" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "metadata", "type": "string" }
        ],
        "name": "mintEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "name": "contentHash", "type": "string" }
        ],
        "name": "getEvidenceByHash",
        "outputs": [
          { "name": "artifactId", "type": "string" },
          { "name": "blockNumber", "type": "uint256" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "weight", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "name": "artifactId", "type": "string" },
          { "indexed": false, "name": "contentHash", "type": "string" },
          { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "EvidenceMinted",
        "type": "event"
      }
    ];
  }

  private getExplorerUrl(): string {
    const explorerUrls: Record<string, string> = {
      'mainnet': 'https://etherscan.io',
      'sepolia': 'https://sepolia.etherscan.io',
      'goerli': 'https://goerli.etherscan.io',
      'polygon': 'https://polygonscan.com',
      'arbitrum': 'https://arbiscan.io'
    };

    return explorerUrls[this.network] || 'https://etherscan.io';
  }

  async getNetworkStatus(): Promise<{
    network: string;
    blockNumber: number;
    gasPrice: string;
    balance: string;
  }> {
    await this.initialize();

    try {
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();
      const balance = await this.provider.getBalance(this.signer.address);

      return {
        network: this.network,
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'unknown',
        balance: ethers.formatEther(balance) + ' ETH'
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      throw error;
    }
  }
}