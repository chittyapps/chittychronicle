import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// LangChain models
const openAIChat = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0.7,
});

const anthropicChat = new ChatAnthropic({
  modelName: "claude-3-opus-20240229",
  temperature: 0.7,
});

export interface LegalAnalysisRequest {
  caseDetails: string;
  analysisType: "risk" | "strategy" | "summary" | "precedent";
  provider?: "openai" | "anthropic";
}

export async function analyzeLegalCase(request: LegalAnalysisRequest) {
  const { caseDetails, analysisType, provider = "openai" } = request;

  const prompts = {
    risk: `Analyze the following legal case and identify potential risks:

Case Details: {caseDetails}

Provide a comprehensive risk assessment including:
1. Legal risks
2. Financial risks
3. Reputational risks
4. Mitigation strategies`,
    
    strategy: `Develop a legal strategy for the following case:

Case Details: {caseDetails}

Provide:
1. Recommended approach
2. Key arguments
3. Potential challenges
4. Timeline and milestones`,
    
    summary: `Provide a concise summary of the following legal case:

Case Details: {caseDetails}

Include:
1. Key parties involved
2. Main legal issues
3. Current status
4. Next steps`,
    
    precedent: `Identify relevant legal precedents for the following case:

Case Details: {caseDetails}

Provide:
1. Similar cases
2. Key rulings
3. Applicable laws
4. How precedents apply to this case`,
  };

  const prompt = ChatPromptTemplate.fromTemplate(prompts[analysisType]);
  const model = provider === "anthropic" ? anthropicChat : openAIChat;
  const outputParser = new StringOutputParser();

  const chain = prompt.pipe(model).pipe(outputParser);

  try {
    const result = await chain.invoke({ caseDetails });
    return {
      analysis: result,
      provider,
      analysisType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in legal analysis:", error);
    throw error;
  }
}

export async function generateCaseDocument(caseData: any, documentType: string) {
  const prompt = `Generate a ${documentType} document for the following case:

Case Name: ${caseData.name}
Type: ${caseData.type}
Parties: ${caseData.entities?.join(", ") || "N/A"}
Claim: ${caseData.claim}
Status: ${caseData.status}
Notes: ${caseData.notes}

Format the document professionally and include all relevant sections.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a legal document generator. Create professional, well-structured legal documents.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating document:", error);
    throw error;
  }
}