import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export interface CaseEntry {
  name: string;
  type: string;
  entities: string[];
  claim: string;
  weight: string;
  status: string;
  notes: string;
  // New property-related fields
  titledAssets?: string[]; // Array of property token IDs or parcel IDs
  assetDistribution?: {
    assetId: string;
    parties: Array<{
      name: string;
      percentage: number;
      walletAddress?: string;
    }>;
  }[];
  blockchainRecords?: {
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
    action: string;
  }[];
}

export async function createCaseEntry(entry: CaseEntry) {
  const databaseId = process.env.NOTION_DATABASE_ID;
  
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not configured");
  }

  try {
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: entry.name,
              },
            },
          ],
        },
        Type: {
          select: {
            name: entry.type,
          },
        },
        Entity: {
          multi_select: entry.entities.map((entity) => ({ name: entity })),
        },
        Claim: {
          rich_text: [
            {
              text: {
                content: entry.claim,
              },
            },
          ],
        },
        Weight: {
          select: {
            name: entry.weight,
          },
        },
        Status: {
          select: {
            name: entry.status,
          },
        },
        Notes: {
          rich_text: [
            {
              text: {
                content: entry.notes,
              },
            },
          ],
        },
        // Add property-related fields if provided
        ...(entry.titledAssets && {
          "Titled Assets": {
            multi_select: entry.titledAssets.map((asset) => ({ name: asset })),
          },
        }),
        ...(entry.assetDistribution && {
          "Asset Distribution": {
            rich_text: [
              {
                text: {
                  content: JSON.stringify(entry.assetDistribution, null, 2),
                },
              },
            ],
          },
        }),
        ...(entry.blockchainRecords && {
          "Blockchain Records": {
            rich_text: [
              {
                text: {
                  content: JSON.stringify(entry.blockchainRecords, null, 2),
                },
              },
            ],
          },
        }),
      },
    });

    return response;
  } catch (error) {
    console.error("Error creating Notion entry:", error);
    throw error;
  }
}

export async function getCases() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not configured");
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    return response.results;
  } catch (error) {
    console.error("Error fetching cases from Notion:", error);
    throw error;
  }
}