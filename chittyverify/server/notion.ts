import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = process.env.NOTION_INTEGRATION_SECRET 
    ? new Client({ auth: process.env.NOTION_INTEGRATION_SECRET })
    : null;

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    if (!pageUrl) {
        throw Error("Page URL is required");
    }
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }
    throw Error("Failed to extract page ID from URL");
}

export const NOTION_PAGE_ID = process.env.NOTION_PAGE_URL 
    ? extractPageIdFromUrl(process.env.NOTION_PAGE_URL)
    : null;

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 */
export async function getNotionDatabases() {
    if (!notion || !NOTION_PAGE_ID) {
        throw new Error("Notion integration not configured");
    }
    
    const childDatabases = [];
    try {
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            for (const block of response.results) {
                if ('type' in block && block.type === "child_database") {
                    const databaseId = block.id;
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    const databases = await getNotionDatabases();

    for (const db of databases) {
        if ('title' in db && db.title && Array.isArray(db.title) && db.title.length > 0) {
            const dbTitle = db.title[0]?.plain_text?.toLowerCase() || "";
            if (dbTitle === title.toLowerCase()) {
                return db;
            }
        }
    }

    return null;
}

// Create a new database if one with a matching title does not exist
export async function createDatabaseIfNotExists(title: string, properties: any) {
    if (!notion || !NOTION_PAGE_ID) {
        throw new Error("Notion integration not configured");
    }
    
    const existingDb = await findDatabaseByTitle(title);
    if (existingDb) {
        return existingDb;
    }
    return await notion.databases.create({
        parent: {
            type: "page_id",
            page_id: NOTION_PAGE_ID
        },
        title: [
            {
                type: "text",
                text: {
                    content: title
                }
            }
        ],
        properties
    });
}

// ChittyChain Evidence Registry Database
export async function setupEvidenceRegistry() {
    return await createDatabaseIfNotExists("ChittyChain Evidence Registry", {
        Title: { title: {} },
        ArtifactID: { rich_text: {} },
        CaseReference: { rich_text: {} }, // Simplified - no relation for now
        EvidenceType: {
            select: {
                options: [
                    { name: "Document", color: "blue" },
                    { name: "Communication", color: "green" },
                    { name: "Financial", color: "yellow" },
                    { name: "Property Tax", color: "orange" },
                    { name: "Legal Filing", color: "red" },
                    { name: "Image", color: "purple" }
                ]
            }
        },
        Status: {
            select: {
                options: [
                    { name: "Pending", color: "gray" },
                    { name: "Verified", color: "green" },
                    { name: "Minted", color: "blue" },
                    { name: "Failed", color: "red" }
                ]
            }
        },
        TrustScore: { number: {} },
        BlockchainHash: { rich_text: {} },
        UploadedDate: { date: {} },
        VerifiedDate: { date: {} },
        MintedDate: { date: {} },
        Description: { rich_text: {} }
    });
}

// ChittyChain Case Management Database
export async function setupCaseManagement() {
    return await createDatabaseIfNotExists("ChittyChain Case Management", {
        CaseName: { title: {} },
        CaseNumber: { rich_text: {} },
        Description: { rich_text: {} },
        Status: {
            select: {
                options: [
                    { name: "Active", color: "green" },
                    { name: "Closed", color: "gray" },
                    { name: "Archived", color: "default" }
                ]
            }
        },
        TrustScore: { number: {} },
        TotalEvidence: { number: {} },
        VerifiedEvidence: { number: {} },
        PendingEvidence: { number: {} },
        MintedEvidence: { number: {} },
        CreatedDate: { date: {} },
        UpdatedDate: { date: {} },
        AssignedTo: { people: {} }
    });
}

// ChittyChain Atomic Facts Database
export async function setupAtomicFacts() {
    return await createDatabaseIfNotExists("ChittyChain Atomic Facts", {
        Fact: { title: {} },
        FactType: {
            select: {
                options: [
                    { name: "Financial", color: "yellow" },
                    { name: "Property", color: "orange" },
                    { name: "Legal", color: "red" },
                    { name: "Personal", color: "blue" },
                    { name: "Timeline", color: "green" },
                    { name: "Communication", color: "purple" }
                ]
            }
        },
        TrustScore: { number: {} },
        Confidence: { number: {} },
        SupportingEvidence: { rich_text: {} }, // Simplified - no relation for now
        ExtractedFrom: { rich_text: {} },
        VerificationStatus: {
            select: {
                options: [
                    { name: "Verified", color: "green" },
                    { name: "Pending", color: "yellow" },
                    { name: "Disputed", color: "red" },
                    { name: "Contradicted", color: "orange" }
                ]
            }
        },
        ExtractedDate: { date: {} }
    });
}

// ChittyChain Blockchain Transactions Database
export async function setupBlockchainTransactions() {
    return await createDatabaseIfNotExists("ChittyChain Blockchain Transactions", {
        TransactionHash: { title: {} },
        EvidenceReference: { rich_text: {} }, // Simplified - no relation for now
        BlockNumber: { number: {} },
        GasUsed: { number: {} },
        GasPrice: { rich_text: {} },
        Status: {
            select: {
                options: [
                    { name: "Pending", color: "yellow" },
                    { name: "Confirmed", color: "green" },
                    { name: "Failed", color: "red" }
                ]
            }
        },
        NetworkStatus: {
            select: {
                options: [
                    { name: "Active", color: "green" },
                    { name: "Finalized", color: "blue" }
                ]
            }
        },
        CreatedDate: { date: {} },
        ConfirmedDate: { date: {} }
    });
}

// Sync evidence from ChittyChain to Notion
export async function syncEvidenceToNotion(evidence: any) {
    try {
        const evidenceDb = await findDatabaseByTitle("ChittyChain Evidence Registry");
        if (!evidenceDb) {
            throw new Error("Evidence Registry database not found");
        }

        await notion.pages.create({
            parent: {
                database_id: evidenceDb.id
            },
            properties: {
                Title: {
                    title: [{ text: { content: evidence.title } }]
                },
                ArtifactID: {
                    rich_text: [{ text: { content: evidence.artifactId } }]
                },
                EvidenceType: {
                    select: { name: evidence.type }
                },
                Status: {
                    select: { name: evidence.status }
                },
                TrustScore: {
                    number: evidence.trustScore
                },
                UploadedDate: {
                    date: { start: evidence.uploadedAt }
                },
                Description: {
                    rich_text: [{ text: { content: evidence.description || "" } }]
                }
            }
        });

        console.log(`Evidence ${evidence.artifactId} synced to Notion`);
    } catch (error) {
        console.error("Error syncing evidence to Notion:", error);
        throw error;
    }
}