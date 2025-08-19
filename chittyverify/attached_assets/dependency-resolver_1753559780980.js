#!/usr/bin/env node

/**
 * ChittyChain Dependency Resolver
 * 
 * Handles artifact dependencies ensuring that:
 * 1. Parent artifacts are minted before dependent artifacts
 * 2. Referenced documents exist on chain before referencing documents
 * 3. Chronological ordering is maintained for legal validity
 * 4. Missing dependencies are identified and queued
 */

import crypto from 'crypto';

// Optional UI dependency - fallback to plain text if not available
let chalk;
try {
  chalk = (await import('chalk')).default;
} catch {
  chalk = {
    red: (text) => text,
    green: (text) => text,
    yellow: (text) => text,
    blue: (text) => text,
    bold: (text) => text
  };
}

export class ChittyChainDependencyResolver {
  constructor(chain) {
    this.chain = chain;
    this.dependencyGraph = new Map();
    this.resolutionQueue = [];
    this.unmintedArtifacts = new Map();
  }

  /**
   * Analyze artifact for dependencies
   */
  analyzeDependencies(artifact) {
    const dependencies = {
      direct: [],
      inferred: [],
      chronological: [],
      missing: [],
      circular: false
    };

    // 1. Direct dependencies (explicitly declared)
    if (artifact.dependencies && Array.isArray(artifact.dependencies)) {
      dependencies.direct = artifact.dependencies;
    }

    // 2. Extract dependencies from metadata
    if (artifact.metadata) {
      // Parent document references
      if (artifact.metadata.parentDocumentId) {
        dependencies.direct.push({
          artifactId: artifact.metadata.parentDocumentId,
          type: 'PARENT_DOCUMENT',
          required: true
        });
      }

      // Supporting document references
      if (artifact.metadata.supportingDocuments) {
        artifact.metadata.supportingDocuments.forEach(docId => {
          dependencies.direct.push({
            artifactId: docId,
            type: 'SUPPORTING_DOCUMENT',
            required: false
          });
        });
      }

      // Legal case dependencies
      if (artifact.metadata.referencedArtifacts) {
        artifact.metadata.referencedArtifacts.forEach(refId => {
          dependencies.direct.push({
            artifactId: refId,
            type: 'REFERENCED',
            required: true
          });
        });
      }
    }

    // 3. Infer dependencies from statement/content
    if (artifact.statement) {
      // Look for references to other documents
      const docRefPattern = /(?:refers to|references|based on|pursuant to|in accordance with|as per)\s+(?:document|artifact|evidence)\s+(?:ID:|#)?([A-Z0-9_-]+)/gi;
      const matches = artifact.statement.matchAll(docRefPattern);
      
      for (const match of matches) {
        const referencedId = match[1];
        if (referencedId && !dependencies.direct.find(d => d.artifactId === referencedId)) {
          dependencies.inferred.push({
            artifactId: referencedId,
            type: 'INFERRED_REFERENCE',
            required: false,
            source: 'statement'
          });
        }
      }
    }

    // 4. Chronological dependencies
    if (artifact.metadata?.chronology) {
      const { precedes, follows } = artifact.metadata.chronology;
      
      if (follows) {
        dependencies.chronological.push({
          artifactId: follows,
          type: 'CHRONOLOGICAL_AFTER',
          required: true
        });
      }
      
      if (precedes) {
        // This artifact must be minted before the 'precedes' artifact
        dependencies.chronological.push({
          artifactId: precedes,
          type: 'CHRONOLOGICAL_BEFORE',
          required: false
        });
      }
    }

    // 5. Type-specific dependencies
    dependencies.direct.push(...this.getTypeSpecificDependencies(artifact));

    return dependencies;
  }

  /**
   * Get dependencies based on artifact type
   */
  getTypeSpecificDependencies(artifact) {
    const typeDeps = [];

    switch (artifact.type) {
      case 'AMENDMENT':
      case 'ADDENDUM':
        // Must have original document
        if (artifact.metadata?.originalDocumentId) {
          typeDeps.push({
            artifactId: artifact.metadata.originalDocumentId,
            type: 'ORIGINAL_DOCUMENT',
            required: true
          });
        }
        break;

      case 'COURT_ORDER':
        // May reference a motion or petition
        if (artifact.metadata?.motionId) {
          typeDeps.push({
            artifactId: artifact.metadata.motionId,
            type: 'LEGAL_MOTION',
            required: false
          });
        }
        break;

      case 'PROPERTY_TRANSFER':
        // Must have property deed
        if (artifact.metadata?.propertyDeedId) {
          typeDeps.push({
            artifactId: artifact.metadata.propertyDeedId,
            type: 'PROPERTY_DEED',
            required: true
          });
        }
        break;

      case 'RESPONSE':
      case 'REBUTTAL':
        // Must reference what it's responding to
        if (artifact.metadata?.inResponseTo) {
          typeDeps.push({
            artifactId: artifact.metadata.inResponseTo,
            type: 'RESPONSE_TARGET',
            required: true
          });
        }
        break;
    }

    return typeDeps;
  }

  /**
   * Check if dependencies are satisfied
   */
  async checkDependencies(artifact) {
    const dependencies = this.analyzeDependencies(artifact);
    const result = {
      artifact,
      dependencies,
      satisfied: true,
      missing: [],
      warnings: [],
      resolutionOrder: []
    };

    // Check each dependency
    const allDeps = [
      ...dependencies.direct,
      ...dependencies.chronological.filter(d => d.type === 'CHRONOLOGICAL_AFTER')
    ];

    for (const dep of allDeps) {
      // Check if dependency exists on chain
      const exists = await this.artifactExists(dep.artifactId);
      
      if (!exists) {
        if (dep.required) {
          result.satisfied = false;
          result.missing.push(dep);
        } else {
          result.warnings.push({
            dependency: dep,
            message: `Optional dependency ${dep.artifactId} not found`
          });
        }
        
        // Check if it's in unminted queue
        if (this.unmintedArtifacts.has(dep.artifactId)) {
          result.resolutionOrder.push(dep.artifactId);
        }
      }
    }

    // Check for circular dependencies
    if (await this.hasCircularDependency(artifact.id, dependencies)) {
      result.satisfied = false;
      result.warnings.push({
        type: 'CIRCULAR_DEPENDENCY',
        message: 'Circular dependency detected'
      });
    }

    return result;
  }

  /**
   * Check if artifact exists on chain or in pending
   */
  async artifactExists(artifactId) {
    // Check blockchain
    const onChain = this.chain.getArtifact(artifactId);
    if (onChain) return true;

    // Check pending artifacts
    const pending = this.chain.pendingArtifacts.find(a => a.id === artifactId);
    if (pending) return true;

    return false;
  }

  /**
   * Detect circular dependencies
   */
  async hasCircularDependency(artifactId, dependencies, visited = new Set()) {
    if (visited.has(artifactId)) {
      return true;
    }

    visited.add(artifactId);

    for (const dep of dependencies.direct) {
      // Get dependencies of the dependency
      const depArtifact = this.unmintedArtifacts.get(dep.artifactId) || 
                          this.chain.getArtifact(dep.artifactId);
      
      if (depArtifact) {
        const subDeps = this.analyzeDependencies(depArtifact);
        if (await this.hasCircularDependency(dep.artifactId, subDeps, visited)) {
          return true;
        }
      }
    }

    visited.delete(artifactId);
    return false;
  }

  /**
   * Build dependency graph for a set of artifacts
   */
  buildDependencyGraph(artifacts) {
    this.dependencyGraph.clear();
    this.unmintedArtifacts.clear();

    // Store unminted artifacts
    artifacts.forEach(artifact => {
      this.unmintedArtifacts.set(artifact.id, artifact);
    });

    // Build graph
    artifacts.forEach(artifact => {
      const deps = this.analyzeDependencies(artifact);
      this.dependencyGraph.set(artifact.id, {
        artifact,
        dependencies: deps,
        dependents: [],
        depth: 0
      });
    });

    // Add reverse dependencies (dependents)
    for (const [artifactId, node] of this.dependencyGraph) {
      const allDeps = [...node.dependencies.direct, ...node.dependencies.chronological];
      allDeps.forEach(dep => {
        const depNode = this.dependencyGraph.get(dep.artifactId);
        if (depNode) {
          depNode.dependents.push(artifactId);
        }
      });
    }

    // Calculate depth for topological sort
    this.calculateDepths();

    return this.dependencyGraph;
  }

  /**
   * Calculate depth of each node in dependency graph
   */
  calculateDepths() {
    const visited = new Set();
    
    const calculateDepth = (nodeId, currentDepth = 0) => {
      const node = this.dependencyGraph.get(nodeId);
      if (!node || visited.has(nodeId)) return currentDepth;
      
      visited.add(nodeId);
      node.depth = Math.max(node.depth, currentDepth);
      
      node.dependents.forEach(dependentId => {
        calculateDepth(dependentId, currentDepth + 1);
      });
      
      return node.depth;
    };

    // Start from nodes with no dependencies
    for (const [nodeId, node] of this.dependencyGraph) {
      const requiredDeps = node.dependencies.direct.filter(d => d.required);
      if (requiredDeps.length === 0) {
        calculateDepth(nodeId);
      }
    }
  }

  /**
   * Resolve minting order for artifacts
   */
  async resolveMintingOrder(artifacts) {
    this.buildDependencyGraph(artifacts);
    
    const result = {
      valid: true,
      order: [],
      batches: [],
      unresolvable: [],
      warnings: []
    };

    // Topological sort by depth
    const sortedNodes = Array.from(this.dependencyGraph.entries())
      .sort(([, a], [, b]) => a.depth - b.depth);

    // Group by depth (can be minted in parallel)
    const depthGroups = new Map();
    sortedNodes.forEach(([id, node]) => {
      if (!depthGroups.has(node.depth)) {
        depthGroups.set(node.depth, []);
      }
      depthGroups.get(node.depth).push(node.artifact);
    });

    // Check each batch for missing dependencies
    for (const [depth, batch] of depthGroups) {
      const batchResult = {
        depth,
        artifacts: [],
        canMint: true,
        missingDependencies: []
      };

      for (const artifact of batch) {
        const depCheck = await this.checkDependencies(artifact);
        
        if (depCheck.satisfied) {
          batchResult.artifacts.push(artifact);
          result.order.push(artifact.id);
        } else {
          batchResult.canMint = false;
          batchResult.missingDependencies.push({
            artifactId: artifact.id,
            missing: depCheck.missing
          });
          result.unresolvable.push({
            artifact,
            reason: 'Missing required dependencies',
            missing: depCheck.missing
          });
        }

        if (depCheck.warnings.length > 0) {
          result.warnings.push(...depCheck.warnings);
        }
      }

      if (batchResult.canMint && batchResult.artifacts.length > 0) {
        result.batches.push(batchResult);
      }
    }

    // Check if we have unresolvable dependencies
    if (result.unresolvable.length > 0) {
      result.valid = false;
    }

    return result;
  }

  /**
   * Generate dependency report
   */
  generateDependencyReport(artifacts) {
    const graph = this.buildDependencyGraph(artifacts);
    
    const report = {
      timestamp: new Date().toISOString(),
      totalArtifacts: artifacts.length,
      dependencyGraph: {},
      statistics: {
        withDependencies: 0,
        noDependencies: 0,
        maxDepth: 0,
        circularDependencies: []
      }
    };

    for (const [id, node] of graph) {
      const deps = node.dependencies;
      const totalDeps = deps.direct.length + deps.chronological.length;
      
      if (totalDeps > 0) {
        report.statistics.withDependencies++;
      } else {
        report.statistics.noDependencies++;
      }

      report.statistics.maxDepth = Math.max(report.statistics.maxDepth, node.depth);

      report.dependencyGraph[id] = {
        depth: node.depth,
        dependencies: {
          direct: deps.direct.map(d => ({
            id: d.artifactId,
            type: d.type,
            required: d.required
          })),
          inferred: deps.inferred,
          chronological: deps.chronological
        },
        dependents: node.dependents
      };
    }

    return report;
  }

  /**
   * Suggest resolution for missing dependencies
   */
  suggestResolution(missingDependencies) {
    const suggestions = [];

    missingDependencies.forEach(dep => {
      const suggestion = {
        dependency: dep,
        actions: []
      };

      // Check if dependency might be under a different ID
      const similarIds = this.findSimilarArtifactIds(dep.artifactId);
      if (similarIds.length > 0) {
        suggestion.actions.push({
          type: 'POSSIBLE_MATCH',
          message: `Similar artifact IDs found: ${similarIds.join(', ')}`,
          artifacts: similarIds
        });
      }

      // Suggest creating placeholder
      if (dep.type === 'SUPPORTING_DOCUMENT' && !dep.required) {
        suggestion.actions.push({
          type: 'CREATE_PLACEHOLDER',
          message: 'Create placeholder artifact for optional dependency',
          template: this.createPlaceholderTemplate(dep)
        });
      }

      // Suggest fetching from external source
      if (dep.type === 'GOVERNMENT' || dep.type === 'FINANCIAL_INSTITUTION') {
        suggestion.actions.push({
          type: 'FETCH_EXTERNAL',
          message: 'Fetch from external system',
          source: this.getExternalSource(dep.type)
        });
      }

      suggestions.push(suggestion);
    });

    return suggestions;
  }

  /**
   * Find similar artifact IDs (typo detection)
   */
  findSimilarArtifactIds(targetId) {
    const similar = [];
    const threshold = 0.8; // Similarity threshold

    // Check all known artifacts
    const allArtifacts = [
      ...Array.from(this.chain.artifacts.keys()),
      ...this.chain.pendingArtifacts.map(a => a.id)
    ];

    allArtifacts.forEach(id => {
      const similarity = this.calculateSimilarity(targetId, id);
      if (similarity >= threshold && id !== targetId) {
        similar.push(id);
      }
    });

    return similar;
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance implementation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Create placeholder template for missing dependency
   */
  createPlaceholderTemplate(dependency) {
    return {
      id: dependency.artifactId,
      type: 'PLACEHOLDER',
      tier: 'UNCORROBORATED_PERSON',
      weight: 0.1,
      statement: `Placeholder for missing ${dependency.type}: ${dependency.artifactId}`,
      metadata: {
        placeholder: true,
        originalDependency: dependency,
        createdAt: new Date().toISOString(),
        note: 'This is a placeholder artifact to satisfy non-required dependencies'
      }
    };
  }

  /**
   * Get external source for artifact type
   */
  getExternalSource(type) {
    const sources = {
      'GOVERNMENT': {
        name: 'Government Records System',
        endpoint: '/api/gov/documents',
        authentication: 'required'
      },
      'FINANCIAL_INSTITUTION': {
        name: 'Banking Records API',
        endpoint: '/api/bank/statements',
        authentication: 'oauth2'
      },
      'COURT_ORDER': {
        name: 'Court E-Filing System',
        endpoint: '/api/court/orders',
        authentication: 'certificate'
      }
    };

    return sources[type] || null;
  }

  /**
   * Visualize dependency graph (for CLI output)
   */
  visualizeDependencyGraph() {
    console.log(chalk.bold('\n📊 Dependency Graph Visualization\n'));

    const maxDepth = Math.max(...Array.from(this.dependencyGraph.values()).map(n => n.depth));

    for (let depth = 0; depth <= maxDepth; depth++) {
      const nodesAtDepth = Array.from(this.dependencyGraph.entries())
        .filter(([, node]) => node.depth === depth)
        .map(([id]) => id);

      if (nodesAtDepth.length > 0) {
        console.log(chalk.cyan(`Depth ${depth}:`));
        nodesAtDepth.forEach(id => {
          const node = this.dependencyGraph.get(id);
          const deps = node.dependencies.direct.filter(d => d.required);
          const depStr = deps.length > 0 
            ? ` → [${deps.map(d => d.artifactId).join(', ')}]`
            : '';
          console.log(`  ${id}${depStr}`);
        });
        console.log();
      }
    }
  }
}

// Export for use in CLI and MCP
export default ChittyChainDependencyResolver;