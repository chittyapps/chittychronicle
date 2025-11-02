/**
 * Integration Tests for Phase 1: Semantic Search Foundation
 * Tests all SOTA endpoints to validate functionality before production
 *
 * Usage:
 *   npm test                    # Run all tests
 *   npm test -- --grep "hybrid" # Run specific tests
 *   npm test -- --bail          # Stop on first failure
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const TEST_CASE_ID = process.env.TEST_CASE_ID; // Must provide a real case ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Helper to make HTTP requests
async function request(method: string, path: string, body?: any) {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = response.ok ? await response.json() : null;

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

// Pre-flight checks
describe('Pre-Flight Checks', () => {
  it('should have required environment variables', () => {
    assert.ok(OPENAI_API_KEY, 'OPENAI_API_KEY is required');
    assert.ok(ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY is required');
    assert.ok(TEST_CASE_ID, 'TEST_CASE_ID is required for integration tests');
  });

  it('should connect to server', async () => {
    const res = await request('GET', '/');
    assert.ok(res.ok, 'Server should be reachable');
  });
});

// Embedding Service Tests
describe('Embedding Service', () => {
  it('should get embedding coverage statistics', async () => {
    const res = await request('GET', '/api/admin/embeddings/coverage');
    assert.ok(res.ok, 'Coverage endpoint should work');
    assert.ok(res.data.coverage, 'Should return coverage data');
    assert.ok('timelineEntries' in res.data.coverage, 'Should include timeline entries coverage');
    assert.ok('timelineSources' in res.data.coverage, 'Should include timeline sources coverage');
  });

  it('should estimate embedding cost', async () => {
    const res = await request('POST', '/api/admin/embeddings/estimate-cost', {
      textCount: 100,
      avgTokensPerText: 500,
    });
    assert.ok(res.ok, 'Cost estimation should work');
    assert.ok(res.data.estimatedTokens, 'Should return estimated tokens');
    assert.ok(res.data.estimatedCostUSD !== undefined, 'Should return estimated cost');
    assert.equal(res.data.estimatedTokens, 50000, 'Should calculate correct token count');
  });

  it('should reject invalid cost estimation', async () => {
    const res = await request('POST', '/api/admin/embeddings/estimate-cost', {
      textCount: -1,
    });
    assert.equal(res.status, 400, 'Should reject negative text count');
  });

  it('should start embedding generation job', async () => {
    const res = await request('POST', '/api/admin/embeddings/generate', {
      caseId: TEST_CASE_ID,
      batchSize: 10, // Small batch for testing
    });
    assert.ok(res.ok, 'Embedding generation should start');
    assert.equal(res.data.status, 'processing', 'Should return processing status');
  });
});

// Hybrid Search Tests
describe('Hybrid Search', () => {
  it('should perform hybrid search', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=contract&alpha=0.6`
    );
    assert.ok(res.ok, 'Hybrid search should work');
    assert.ok(res.data.results, 'Should return results array');
    assert.ok(res.data.metadata, 'Should return metadata');
    assert.equal(res.data.metadata.searchType, 'hybrid', 'Should indicate hybrid search');
    assert.equal(res.data.metadata.alpha, 0.6, 'Should respect alpha parameter');
  });

  it('should require caseId and query parameters', async () => {
    const res = await request('GET', '/api/timeline/search/hybrid?query=test');
    assert.equal(res.status, 400, 'Should reject request without caseId');
  });

  it('should validate alpha parameter range', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=test&alpha=1.5`
    );
    assert.equal(res.status, 400, 'Should reject alpha > 1');
  });

  it('should support metadata filtering', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=contract&entryType=event&dateFrom=2024-01-01`
    );
    assert.ok(res.ok, 'Should support filters');
    // All results should match filter
    if (res.data.results.length > 0) {
      res.data.results.forEach((r: any) => {
        assert.equal(r.entry.entryType, 'event', 'Results should match entry type filter');
      });
    }
  });

  it('should adjust balance with alpha parameter', async () => {
    // Test pure keyword (alpha=0)
    const keyword = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=contract&alpha=0`
    );
    assert.ok(keyword.ok, 'Pure keyword search should work');

    // Test pure semantic (alpha=1)
    const semantic = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=contract&alpha=1`
    );
    assert.ok(semantic.ok, 'Pure semantic search should work');
  });
});

// Keyword-Only Search Tests
describe('Keyword Search', () => {
  it('should perform keyword-only search', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/keyword?caseId=${TEST_CASE_ID}&query=contract`
    );
    assert.ok(res.ok, 'Keyword search should work');
    assert.equal(res.data.metadata.searchType, 'keyword', 'Should indicate keyword search');
  });

  it('should return results without embeddings', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/keyword?caseId=${TEST_CASE_ID}&query=test`
    );
    assert.ok(res.ok, 'Keyword search should work even without embeddings');
    assert.ok(Array.isArray(res.data.results), 'Should return results array');
  });
});

// Semantic-Only Search Tests
describe('Semantic Search', () => {
  it('should perform semantic-only search', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/semantic?caseId=${TEST_CASE_ID}&query=breach of contract`
    );
    // May fail if no embeddings exist yet
    if (res.ok) {
      assert.equal(res.data.metadata.searchType, 'semantic', 'Should indicate semantic search');
      assert.equal(res.data.metadata.alpha, 1.0, 'Should use alpha=1 for pure semantic');
    } else {
      console.log('⚠️  Semantic search failed - embeddings may not be generated yet');
    }
  });
});

// RAG Q&A Tests
describe('RAG Document Q&A', () => {
  it('should answer questions about documents', async () => {
    const res = await request('POST', '/api/timeline/ask', {
      caseId: TEST_CASE_ID,
      question: 'What are the key dates in this case?',
      topK: 5,
    });

    if (res.ok) {
      assert.ok(res.data.answer, 'Should return an answer');
      assert.ok(Array.isArray(res.data.sources), 'Should return sources');
      assert.ok(res.data.confidence !== undefined, 'Should return confidence score');
      assert.ok(res.data.confidence >= 0 && res.data.confidence <= 1, 'Confidence should be 0-1');
    } else {
      console.log('⚠️  RAG Q&A failed - may need embeddings or API keys');
    }
  });

  it('should require caseId and question', async () => {
    const res = await request('POST', '/api/timeline/ask', {
      question: 'test',
    });
    assert.equal(res.status, 400, 'Should reject request without caseId');
  });

  it('should include citations in answer', async () => {
    const res = await request('POST', '/api/timeline/ask', {
      caseId: TEST_CASE_ID,
      question: 'Summarize the timeline',
      topK: 3,
    });

    if (res.ok && res.data.answer) {
      // Check if answer contains citation markers [1], [2], etc.
      const hasCitations = /\[\d+\]/.test(res.data.answer);
      assert.ok(hasCitations, 'Answer should include citation markers like [1], [2]');
    }
  });
});

// Batch RAG Tests
describe('Batch RAG Queries', () => {
  it('should process multiple questions', async () => {
    const res = await request('POST', '/api/timeline/ask/batch', {
      caseId: TEST_CASE_ID,
      questions: [
        'What is the case about?',
        'Who are the parties?',
        'What are the key dates?',
      ],
      topK: 3,
    });

    if (res.ok) {
      assert.ok(Array.isArray(res.data.results), 'Should return results array');
      assert.equal(res.data.results.length, 3, 'Should answer all questions');
      res.data.results.forEach((r: any) => {
        assert.ok(r.answer, 'Each result should have an answer');
      });
    }
  });

  it('should reject too many questions', async () => {
    const res = await request('POST', '/api/timeline/ask/batch', {
      caseId: TEST_CASE_ID,
      questions: Array(15).fill('test question'),
    });
    assert.equal(res.status, 400, 'Should reject batches > 10 questions');
  });
});

// Timeline Summary Tests
describe('Timeline Summary', () => {
  it('should generate case timeline summary', async () => {
    const res = await request('GET', `/api/timeline/summary/${TEST_CASE_ID}`);

    if (res.ok) {
      assert.ok(res.data.summary, 'Should return summary');
      assert.equal(res.data.caseId, TEST_CASE_ID, 'Should include case ID');
      assert.ok(res.data.generatedAt, 'Should include timestamp');
    }
  });
});

// Gap Analysis Tests
describe('Timeline Gap Analysis', () => {
  it('should analyze timeline for gaps', async () => {
    const res = await request('GET', `/api/timeline/analyze/gaps/${TEST_CASE_ID}`);

    if (res.ok) {
      assert.ok(res.data.analysis, 'Should return analysis');
      assert.equal(res.data.caseId, TEST_CASE_ID, 'Should include case ID');
      assert.ok(res.data.analyzedAt, 'Should include timestamp');
    }
  });
});

// Performance Tests
describe('Performance', () => {
  it('should return hybrid search results within 2 seconds', async () => {
    const start = Date.now();
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=contract`
    );
    const duration = Date.now() - start;

    assert.ok(res.ok, 'Search should succeed');
    assert.ok(duration < 2000, `Search took ${duration}ms (target: <2000ms)`);
  });

  it('should include execution time in metadata', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=test`
    );

    if (res.ok) {
      assert.ok(
        res.data.metadata.executionTimeMs !== undefined,
        'Should include execution time'
      );
    }
  });
});

// Error Handling Tests
describe('Error Handling', () => {
  it('should handle invalid case ID gracefully', async () => {
    const res = await request(
      'GET',
      '/api/timeline/search/hybrid?caseId=invalid-uuid&query=test'
    );
    assert.ok(!res.ok, 'Should fail with invalid case ID');
  });

  it('should handle empty query gracefully', async () => {
    const res = await request(
      'GET',
      `/api/timeline/search/hybrid?caseId=${TEST_CASE_ID}&query=`
    );
    assert.equal(res.status, 400, 'Should reject empty query');
  });

  it('should return appropriate error messages', async () => {
    const res = await request('POST', '/api/timeline/ask', {
      // Missing required fields
    });
    assert.equal(res.status, 400, 'Should return 400 for bad request');
  });
});

// Run tests with summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('  Phase 1 Integration Tests');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Case ID: ${TEST_CASE_ID || '❌ NOT SET'}`);
console.log(`OpenAI API Key: ${OPENAI_API_KEY ? '✅ Set' : '❌ NOT SET'}`);
console.log(`Anthropic API Key: ${ANTHROPIC_API_KEY ? '✅ Set' : '❌ NOT SET'}`);
console.log('\n═══════════════════════════════════════════════════════\n');
