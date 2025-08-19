import crypto from 'crypto';

export class ChittyBlock {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
    this.merkleRoot = this.calculateMerkleRoot();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonce +
        this.merkleRoot
      )
      .digest('hex');
  }

  calculateMerkleRoot() {
    if (!this.data || !this.data.facts || this.data.facts.length === 0) {
      return '';
    }

    const leaves = this.data.facts.map(fact =>
      crypto.createHash('sha256').update(JSON.stringify(fact)).digest('hex')
    );

    return this.buildMerkleTree(leaves);
  }

  buildMerkleTree(leaves) {
    if (leaves.length === 1) return leaves[0];

    const newLevel = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = leaves[i + 1] || left;
      const combined = crypto
        .createHash('sha256')
        .update(left + right)
        .digest('hex');
      newLevel.push(combined);
    }

    return this.buildMerkleTree(newLevel);
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  validate() {
    const validationRules = {
      hasRequiredFields: () => {
        return this.index !== undefined &&
               this.timestamp &&
               this.data &&
               this.hash &&
               this.previousHash !== undefined;
      },
      hashIsValid: () => {
        return this.hash === this.calculateHash();
      },
      dataStructureValid: () => {
        return this.data.facts &&
               Array.isArray(this.data.facts) &&
               this.data.facts.every(fact => fact.id && fact.statement && fact.weight);
      },
      timestampReasonable: () => {
        const blockTime = new Date(this.timestamp).getTime();
        const now = Date.now();
        return blockTime <= now && blockTime > 0;
      }
    };

    const errors = [];
    Object.entries(validationRules).forEach(([rule, validator]) => {
      if (!validator()) {
        errors.push(`Validation failed: ${rule}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}