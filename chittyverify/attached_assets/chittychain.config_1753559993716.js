/**
 * ChittyChain Configuration
 * 
 * This configuration file ensures the ChittyChain system works from any location
 * and maintains compatibility with legacy paths and new installations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChittyChainConfig {
  constructor() {
    this.basePath = this.findChittyChainPath();
    this.config = this.loadConfig();
  }

  /**
   * Find ChittyChain implementation paths with comprehensive fallback
   */
  findChittyChainPath() {
    // Check environment variable first
    if (process.env.CHITTYCHAIN_PATH && fs.existsSync(process.env.CHITTYCHAIN_PATH)) {
      const envPath = process.env.CHITTYCHAIN_PATH;
      if (this.validateChittyChainPath(envPath)) {
        return envPath;
      }
    }

    const possiblePaths = [
      // From gh/ChittyChain repository (current/new structure)
      path.join(__dirname, '..'),
      path.join(__dirname),
      
      // From agent smith location (legacy)
      path.join(__dirname, '..', '..', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
      
      // From MAIN root (legacy)
      path.join(__dirname, '..', '..', '..', 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
      
      // Direct gh/ChittyChain path
      path.join(__dirname, '..', '..', '..', 'gh', 'ChittyChain'),
      
      // Additional legacy paths for scripts/memories
      path.join(__dirname, '..', '..', '..', '..', 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
      path.join(__dirname, '..', '..', '..', '..', 'gh', 'ChittyChain')
    ];
    
    // Test each possible path
    for (const basePath of possiblePaths) {
      if (this.validateChittyChainPath(basePath)) {
        return basePath;
      }
    }
    
    // Legacy fallback - walk up directories
    let currentDir = __dirname;
    for (let i = 0; i < 6; i++) {
      const candidates = [
        path.join(currentDir, 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
        path.join(currentDir, 'gh', 'ChittyChain'),
        path.join(currentDir, 'ChittyChain'),
        path.join(currentDir, 'chittychain')
      ];
      
      for (const candidate of candidates) {
        if (this.validateChittyChainPath(candidate)) {
          return candidate;
        }
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    throw new Error('ChittyChain implementation not found. Please ensure the blockchain files are available or set CHITTYCHAIN_PATH environment variable.');
  }

  /**
   * Validate that a path contains ChittyChain implementation
   */
  validateChittyChainPath(basePath) {
    if (!fs.existsSync(basePath)) return false;
    
    // Check for required files
    const requiredFiles = [
      path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'),
      path.join(basePath, 'lib', 'blockchain', 'validation-service.js'),
      path.join(basePath, 'lib', 'blockchain', 'error-recovery-service.js'),
      path.join(basePath, 'lib', 'blockchain', 'artifact-minting-service.js')
    ];
    
    return requiredFiles.every(file => fs.existsSync(file));
  }

  /**
   * Load configuration with defaults
   */
  loadConfig() {
    const defaultConfig = {
      blockchain: {
        difficulty: 4,
        miningReward: 50,
        genesisBlock: {
          data: 'ChittyChain Genesis Block',
          previousHash: '0'
        }
      },
      evidence: {
        tiers: {
          SELF_AUTHENTICATING: 1.0,
          GOVERNMENT: 0.95,
          FINANCIAL_INSTITUTION: 0.90,
          INDEPENDENT_THIRD_PARTY: 0.85,
          BUSINESS_RECORDS: 0.80,
          FIRST_PARTY_ADVERSE: 0.75,
          FIRST_PARTY_FRIENDLY: 0.60,
          UNCORROBORATED_PERSON: 0.40
        },
        autoMintThreshold: 0.95
      },
      paths: {
        blockchain: path.join(this.basePath, 'src', 'blockchain'),
        services: path.join(this.basePath, 'lib', 'blockchain'),
        contracts: path.join(this.basePath, 'contracts'),
        storage: path.join(this.basePath, 'storage'),
        backups: path.join(this.basePath, 'backups')
      },
      mcp: {
        serverPort: 3100,
        tools: [
          'chittychain_mine_block',
          'chittychain_validate_chain',
          'chittychain_get_block',
          'chittychain_query_blocks',
          'chittychain_get_merkle_proof',
          'chittychain_verify_merkle_proof',
          'chittychain_analyze_performance',
          'chittychain_backup',
          'chittychain_recover',
          'chittychain_mint_batch',
          'chittychain_export_chain',
          'chittychain_calculate_hash'
        ]
      }
    };

    // Try to load local config file
    const configPath = path.join(this.basePath, 'chittychain.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...localConfig };
      } catch (error) {
        console.warn('Failed to load local config, using defaults:', error.message);
      }
    }

    return defaultConfig;
  }

  /**
   * Get absolute path for a component
   */
  getPath(component) {
    return this.config.paths[component] || path.join(this.basePath, component);
  }

  /**
   * Get blockchain component with dynamic import
   */
  async getComponent(componentName) {
    const componentPaths = {
      'ChittyChainV2': path.join(this.getPath('blockchain'), 'ChittyChainV2.js'),
      'ChittyBlockV2': path.join(this.getPath('blockchain'), 'ChittyBlockV2.js'),
      'BlockchainValidationService': path.join(this.getPath('services'), 'validation-service.js'),
      'BlockchainRecoveryService': path.join(this.getPath('services'), 'error-recovery-service.js'),
      'ArtifactMintingService': path.join(this.getPath('services'), 'artifact-minting-service.js')
    };

    const componentPath = componentPaths[componentName];
    if (!componentPath || !fs.existsSync(componentPath)) {
      throw new Error(`Component ${componentName} not found at ${componentPath}`);
    }

    try {
      const module = await import(componentPath);
      return module[componentName];
    } catch (error) {
      throw new Error(`Failed to import ${componentName}: ${error.message}`);
    }
  }

  /**
   * Create necessary directories
   */
  initializeDirectories() {
    const dirs = ['storage', 'backups', 'logs'];
    dirs.forEach(dir => {
      const dirPath = this.getPath(dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      basePath: this.basePath,
      configPath: path.join(this.basePath, 'chittychain.config.json'),
      version: '2.0.0',
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

// Export singleton instance
export const chittyChainConfig = new ChittyChainConfig();
export default chittyChainConfig;