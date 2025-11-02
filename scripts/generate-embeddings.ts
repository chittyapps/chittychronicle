#!/usr/bin/env tsx
/**
 * Batch Embedding Generation CLI Tool
 * Phase 1: SOTA Upgrade
 *
 * Usage:
 *   npm run embeddings:generate              # Generate for all cases
 *   npm run embeddings:generate <caseId>     # Generate for specific case
 *   npm run embeddings:coverage              # Check embedding coverage
 *
 * Example:
 *   tsx scripts/generate-embeddings.ts
 *   tsx scripts/generate-embeddings.ts --case-id=abc-123
 *   tsx scripts/generate-embeddings.ts --coverage
 */

import { embeddingService } from "../server/embeddingService";

// Parse command line arguments
const args = process.argv.slice(2);
const caseIdArg = args.find(arg => arg.startsWith('--case-id='));
const coverageFlag = args.includes('--coverage');
const helpFlag = args.includes('--help') || args.includes('-h');

// Display help
if (helpFlag) {
  console.log(`
📊 ChittyChronicle Embedding Generation Tool
===========================================

Usage:
  tsx scripts/generate-embeddings.ts [options]

Options:
  --case-id=<uuid>    Generate embeddings for specific case only
  --coverage          Show embedding coverage statistics
  --help, -h          Show this help message

Examples:
  # Generate embeddings for all timeline entries
  tsx scripts/generate-embeddings.ts

  # Generate embeddings for a specific case
  tsx scripts/generate-embeddings.ts --case-id=550e8400-e29b-41d4-a716-446655440000

  # Check current embedding coverage
  tsx scripts/generate-embeddings.ts --coverage

Environment Variables:
  OPENAI_API_KEY               Required for embedding generation
  EMBEDDING_MODEL              Model to use (default: text-embedding-3-small)
  EMBEDDING_DIMENSIONS         Embedding dimensions (default: 1536)

Cost Estimation:
  OpenAI text-embedding-3-small: $0.02 per 1M tokens
  Average legal document: ~500 tokens
  1000 documents ≈ 500K tokens ≈ $0.01
`);
  process.exit(0);
}

async function main() {
  console.log("🚀 ChittyChronicle Embedding Generation Tool\n");

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable is required");
    console.error("   Please set it in your .env file or environment");
    process.exit(1);
  }

  try {
    // Show coverage if requested
    if (coverageFlag) {
      await showCoverage();
      return;
    }

    // Extract case ID if provided
    const caseId = caseIdArg ? caseIdArg.split('=')[1] : undefined;

    if (caseId) {
      console.log(`📁 Generating embeddings for case: ${caseId}\n`);
    } else {
      console.log("📁 Generating embeddings for ALL cases\n");
    }

    // Get initial coverage
    console.log("📊 Initial Coverage:");
    await showCoverage();
    console.log();

    // Confirm before proceeding
    if (!caseId) {
      console.log("⚠️  This will generate embeddings for ALL timeline entries without embeddings");
      console.log("   This may take time and incur API costs");
      console.log();

      // In production, you might want to add a confirmation prompt here
      // For now, we'll proceed automatically
    }

    // Generate embeddings
    console.log("🔄 Starting embedding generation...\n");
    const startTime = Date.now();

    const stats = await embeddingService.embedAllMissingEntries(caseId, 100);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ Embedding generation complete!");
    console.log(`   Processed: ${stats.processed} entries`);
    console.log(`   Errors: ${stats.errors} entries`);
    console.log(`   Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`   Duration: ${duration}s`);

    // Estimate cost
    const costPer1MTokens = 0.02; // OpenAI pricing
    const estimatedCost = (stats.totalTokens / 1000000) * costPer1MTokens;
    console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Show final coverage
    console.log("\n📊 Final Coverage:");
    await showCoverage();

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

async function showCoverage() {
  const coverage = await embeddingService.getEmbeddingCoverage();

  console.log("   Timeline Entries:");
  console.log(`     Total: ${coverage.timelineEntries.total}`);
  console.log(`     Embedded: ${coverage.timelineEntries.embedded}`);
  console.log(`     Coverage: ${coverage.timelineEntries.percentage.toFixed(1)}%`);

  console.log("\n   Timeline Sources:");
  console.log(`     Total: ${coverage.timelineSources.total}`);
  console.log(`     Embedded: ${coverage.timelineSources.embedded}`);
  console.log(`     Coverage: ${coverage.timelineSources.percentage.toFixed(1)}%`);
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
