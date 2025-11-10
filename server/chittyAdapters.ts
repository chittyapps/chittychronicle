import type { EvidenceEnvelope } from '@shared/schema';

// Adapter interface for Chitty ecosystem targets
export interface IChittyTargetAdapter {
  send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse>;
  getEndpoint(): string;
  getTarget(): string;
}

export interface ChittyDeliveryResponse {
  success: boolean;
  externalId?: string;
  message?: string;
  error?: string;
  statusCode?: number;
  responseData?: any;
}

// Base adapter with common HTTP functionality
abstract class BaseChittyAdapter implements IChittyTargetAdapter {
  protected endpoint: string;
  protected target: string;

  constructor(endpoint: string, target: string) {
    this.endpoint = endpoint;
    this.target = target;
  }

  abstract send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse>;

  getEndpoint(): string {
    return this.endpoint;
  }

  getTarget(): string {
    return this.target;
  }

  protected async sendHttpRequest(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    timeoutMs: number = 30000
  ): Promise<ChittyDeliveryResponse> {
    const url = `${this.endpoint}${path}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Chitty-Source': 'ChittyChronicle',
          'X-Chitty-Version': '1.0.0',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`[${this.target}] HTTP ${response.status} error:`, responseData);
        return {
          success: false,
          error: responseData.message || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseData,
        };
      }

      console.log(`[${this.target}] Successfully delivered to ${url}`, {
        externalId: responseData.id || responseData.transactionId,
        statusCode: response.status,
      });

      return {
        success: true,
        externalId: responseData.id || responseData.transactionId || responseData.externalId,
        message: responseData.message || 'Successfully delivered',
        statusCode: response.status,
        responseData,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[${this.target}] Request failed to ${url}:`, errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        statusCode: 0,
      };
    }
  }

  protected buildPayload(envelope: EvidenceEnvelope): any {
    return {
      envelopeId: envelope.id,
      caseId: envelope.caseId,
      timelineEntryId: envelope.timelineEntryId,
      ownerId: envelope.ownerId,
      title: envelope.title,
      description: envelope.description,
      contentHash: envelope.contentHash,
      sourceMetadata: envelope.sourceMetadata,
      chittyIds: envelope.chittyIds,
      version: envelope.version,
      status: envelope.status,
      visibilityScope: envelope.visibilityScope,
      createdAt: envelope.createdAt,
      createdBy: envelope.createdBy,
    };
  }
}

// ChittyLedger adapter - Immutable record keeping
export class ChittyLedgerAdapter extends BaseChittyAdapter {
  constructor(endpoint?: string) {
    super(
      endpoint || process.env.CHITTY_LEDGER_ENDPOINT || 'https://ledger.chitty.dev/api',
      'chitty_ledger'
    );
  }

  async send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse> {
    const payload = {
      ...this.buildPayload(envelope),
      ledgerType: 'evidence_envelope',
      immutable: true,
      timestamp: new Date().toISOString(),
    };

    return await this.sendHttpRequest('/ledger/entries', 'POST', payload);
  }
}

// ChittyVerify adapter - Verification workflows
export class ChittyVerifyAdapter extends BaseChittyAdapter {
  constructor(endpoint?: string) {
    super(
      endpoint || process.env.CHITTY_VERIFY_ENDPOINT || 'https://verify.chitty.dev/api',
      'chitty_verify'
    );
  }

  async send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse> {
    const payload = {
      ...this.buildPayload(envelope),
      verificationType: 'evidence_authenticity',
      requiresHumanReview: envelope.status === 'submitted',
      priority: envelope.visibilityScope === 'attorney_only' ? 'high' : 'normal',
    };

    return await this.sendHttpRequest('/verify/jobs', 'POST', payload);
  }
}

// ChittyTrust adapter - Trust scoring
export class ChittyTrustAdapter extends BaseChittyAdapter {
  constructor(endpoint?: string) {
    super(
      endpoint || process.env.CHITTY_TRUST_ENDPOINT || 'https://trust.chitty.dev/api',
      'chitty_trust'
    );
  }

  async send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse> {
    const payload = {
      ...this.buildPayload(envelope),
      scoringCriteria: {
        sourceReliability: true,
        temporalConsistency: true,
        crossReferenceValidation: true,
      },
      chittyIds: envelope.chittyIds,
    };

    return await this.sendHttpRequest('/trust/score', 'POST', payload);
  }
}

// ChittyChain adapter - Blockchain notarization
export class ChittyChainAdapter extends BaseChittyAdapter {
  constructor(endpoint?: string) {
    super(
      endpoint || process.env.CHITTY_CHAIN_ENDPOINT || 'https://chain.chitty.dev/api',
      'chitty_chain'
    );
  }

  async send(envelope: EvidenceEnvelope): Promise<ChittyDeliveryResponse> {
    const payload = {
      ...this.buildPayload(envelope),
      notarizationType: 'evidence_hash',
      blockchainNetwork: 'chitty-mainnet',
      hashAlgorithm: 'SHA-256',
      metadata: {
        source: 'ChittyChronicle',
        envelopeVersion: envelope.version,
      },
    };

    return await this.sendHttpRequest('/chain/notarize', 'POST', payload);
  }
}

// Adapter factory
export class ChittyAdapterFactory {
  private static adapters: Map<string, IChittyTargetAdapter> = new Map();

  static getAdapter(target: string): IChittyTargetAdapter {
    if (this.adapters.has(target)) {
      return this.adapters.get(target)!;
    }

    let adapter: IChittyTargetAdapter;

    switch (target) {
      case 'chitty_ledger':
        adapter = new ChittyLedgerAdapter();
        break;
      case 'chitty_verify':
        adapter = new ChittyVerifyAdapter();
        break;
      case 'chitty_trust':
        adapter = new ChittyTrustAdapter();
        break;
      case 'chitty_chain':
        adapter = new ChittyChainAdapter();
        break;
      default:
        throw new Error(`Unknown target: ${target}`);
    }

    this.adapters.set(target, adapter);
    return adapter;
  }

  static clearAdapters(): void {
    this.adapters.clear();
  }
}
