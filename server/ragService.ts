/**
 * RAG (Retrieval-Augmented Generation) Service
 * Phase 1: SOTA Upgrade - Semantic Search Foundation
 *
 * Enables natural language Q&A over legal documents using:
 * - Hybrid search for retrieval
 * - Claude Sonnet 4 for generation
 * - Citation tracking for auditability
 */

import Anthropic from '@anthropic-ai/sdk';
import { searchService, type SearchResult } from './hybridSearchService';

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RAGQueryOptions {
  caseId: string;
  question: string;
  topK?: number; // Number of documents to retrieve
  alpha?: number; // Search algorithm balance
  includeMetadata?: boolean;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    entryId: string;
    description: string;
    date: string;
    entryType: string;
    relevanceScore: number;
    citation: string; // e.g., "[1]", "[2]"
  }>;
  confidence: number; // 0-1 based on source relevance
  metadata?: {
    model: string;
    retrievalTimeMs: number;
    generationTimeMs: number;
    tokensUsed: number;
  };
}

/**
 * Query documents using RAG
 */
export async function queryDocuments(
  options: RAGQueryOptions
): Promise<RAGResponse> {

  const {
    caseId,
    question,
    topK = 5,
    alpha = 0.6,
    includeMetadata = false,
  } = options;

  const startTime = Date.now();

  // Step 1: Retrieve relevant documents using hybrid search
  console.log(`RAG: Retrieving documents for question: "${question}"`);
  const searchResponse = await searchService.hybridSearch({
    caseId,
    query: question,
    topK,
    alpha,
  });

  const retrievalTime = Date.now() - startTime;

  if (searchResponse.results.length === 0) {
    return {
      answer: "I couldn't find any relevant timeline entries to answer your question. Please try rephrasing or asking about different aspects of the case.",
      sources: [],
      confidence: 0,
      metadata: includeMetadata ? {
        model: DEFAULT_MODEL_STR,
        retrievalTimeMs: retrievalTime,
        generationTimeMs: 0,
        tokensUsed: 0,
      } : undefined,
    };
  }

  // Step 2: Format context from retrieved documents
  const context = formatContext(searchResponse.results);
  const sources = searchResponse.results.map((result, idx) => ({
    entryId: result.entry.id,
    description: result.entry.description,
    date: result.entry.date,
    entryType: result.entry.entryType,
    relevanceScore: result.score,
    citation: `[${idx + 1}]`,
  }));

  // Step 3: Generate answer using Claude
  const generationStartTime = Date.now();
  const answer = await generateAnswer(question, context, searchResponse.results);
  const generationTime = Date.now() - generationStartTime;

  // Step 4: Calculate confidence based on source relevance
  const avgRelevance = searchResponse.results.reduce(
    (sum, r) => sum + r.score,
    0
  ) / searchResponse.results.length;
  const confidence = Math.min(avgRelevance * 1.2, 1.0); // Boost slightly, cap at 1.0

  return {
    answer,
    sources,
    confidence,
    metadata: includeMetadata ? {
      model: DEFAULT_MODEL_STR,
      retrievalTimeMs: retrievalTime,
      generationTimeMs: generationTime,
      tokensUsed: 0, // Anthropic doesn't return token count in same format
    } : undefined,
  };
}

/**
 * Format retrieved documents as context for the LLM
 */
function formatContext(results: SearchResult[]): string {
  return results
    .map((result, idx) => {
      const entry = result.entry;
      return `
[${idx + 1}] Timeline Entry
Date: ${entry.date}
Type: ${entry.entryType}${entry.eventSubtype ? ` (${entry.eventSubtype})` : ''}${entry.taskSubtype ? ` (${entry.taskSubtype})` : ''}
Description: ${entry.description}
${entry.detailedNotes ? `Details: ${entry.detailedNotes}` : ''}
${entry.tags && entry.tags.length > 0 ? `Tags: ${entry.tags.join(', ')}` : ''}
${result.similarity !== undefined ? `Relevance: ${(result.similarity * 100).toFixed(1)}%` : ''}
`.trim();
    })
    .join('\n\n---\n\n');
}

/**
 * Generate answer using Claude Sonnet 4
 */
async function generateAnswer(
  question: string,
  context: string,
  results: SearchResult[]
): Promise<string> {

  const systemPrompt = `You are a legal analyst assistant for ChittyChronicle, a legal timeline management system. Your role is to answer questions about case timelines based ONLY on the provided timeline entries.

CRITICAL INSTRUCTIONS:
- Answer based ONLY on the provided timeline entries
- If the answer cannot be found in the timeline entries, explicitly state this
- ALWAYS cite specific timeline entry numbers [1], [2], etc. in your answer
- If information is missing, unclear, or contradictory, state that explicitly
- Do not make assumptions beyond what's in the timeline entries
- Highlight any contradictions or uncertainties you notice
- Be concise but thorough
- Use legal terminology appropriately`;

  const userPrompt = `Timeline Entries:
${context}

Question: ${question}

Please provide a clear, concise answer based on the timeline entries above. Remember to cite specific entries using [1], [2], etc.`;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for factual accuracy
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt,
      }],
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return textContent.text;

  } catch (error) {
    console.error('Error generating RAG answer:', error);

    // Fallback: return a summary of the sources
    return `I encountered an error generating a detailed answer, but here are the relevant timeline entries I found:\n\n` +
      results.map((r, idx) => `[${idx + 1}] ${r.entry.date}: ${r.entry.description}`).join('\n');
  }
}

/**
 * Multi-turn RAG conversation (maintains context)
 */
export class RAGConversation {
  private caseId: string;
  private conversationHistory: Array<{
    question: string;
    answer: string;
    sources: RAGResponse['sources'];
  }> = [];

  constructor(caseId: string) {
    this.caseId = caseId;
  }

  async ask(question: string, topK: number = 5): Promise<RAGResponse> {
    const response = await queryDocuments({
      caseId: this.caseId,
      question,
      topK,
      includeMetadata: true,
    });

    // Add to conversation history
    this.conversationHistory.push({
      question,
      answer: response.answer,
      sources: response.sources,
    });

    return response;
  }

  getHistory() {
    return this.conversationHistory;
  }

  clear() {
    this.conversationHistory = [];
  }
}

/**
 * Batch query multiple questions (useful for case analysis)
 */
export async function batchQuery(
  caseId: string,
  questions: string[],
  topK: number = 5
): Promise<RAGResponse[]> {

  const responses: RAGResponse[] = [];

  for (const question of questions) {
    try {
      const response = await queryDocuments({
        caseId,
        question,
        topK,
      });
      responses.push(response);

      // Rate limiting: wait 1 second between questions
      if (responses.length < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing question "${question}":`, error);
      responses.push({
        answer: `Error processing question: ${error.message}`,
        sources: [],
        confidence: 0,
      });
    }
  }

  return responses;
}

/**
 * Generate timeline summary for a case
 */
export async function generateTimelineSummary(
  caseId: string
): Promise<string> {

  const response = await queryDocuments({
    caseId,
    question: "Provide a comprehensive chronological summary of all key events and tasks in this case.",
    topK: 20, // Get more entries for comprehensive summary
    alpha: 0.5, // Balanced search
  });

  return response.answer;
}

/**
 * Identify potential issues or gaps in the timeline
 */
export async function analyzeTimelineGaps(
  caseId: string
): Promise<string> {

  const response = await queryDocuments({
    caseId,
    question: "Identify any gaps, missing information, or potential issues in the timeline that should be addressed.",
    topK: 20,
    alpha: 0.6,
  });

  return response.answer;
}

export const ragService = {
  queryDocuments,
  batchQuery,
  generateTimelineSummary,
  analyzeTimelineGaps,
  RAGConversation,
};
