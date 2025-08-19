import { 
    setupEvidenceRegistry,
    setupCaseManagement,
    setupAtomicFacts,
    setupBlockchainTransactions,
    findDatabaseByTitle,
    notion
} from "./notion";

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    throw new Error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
}

if (!process.env.NOTION_PAGE_URL) {
    throw new Error("NOTION_PAGE_URL is not defined. Please add it to your environment variables.");
}

async function setupChittyChainNotionDatabases() {
    console.log("🔗 Setting up ChittyChain Notion Integration...");
    
    try {
        // Create all databases
        console.log("📊 Creating Evidence Registry database...");
        const evidenceDb = await setupEvidenceRegistry();
        
        console.log("📁 Creating Case Management database...");
        const caseDb = await setupCaseManagement();
        
        console.log("🧠 Creating Atomic Facts database...");
        const factsDb = await setupAtomicFacts();
        
        console.log("⛓️ Creating Blockchain Transactions database...");
        const blockchainDb = await setupBlockchainTransactions();

        console.log("✅ All ChittyChain databases created successfully!");
        
        // Create sample data to demonstrate the integration
        await createSampleData(evidenceDb, caseDb, factsDb, blockchainDb);
        
    } catch (error) {
        console.error("❌ Error setting up Notion databases:", error);
        throw error;
    }
}

async function createSampleData(evidenceDb: any, caseDb: any, factsDb: any, blockchainDb: any) {
    try {
        console.log("📝 Creating sample case...");
        
        // Create sample case
        const sampleCase = await notion.pages.create({
            parent: { database_id: caseDb.id },
            properties: {
                CaseName: {
                    title: [{ text: { content: "Chicago Property Tax Dispute - 541 W Addison St" } }]
                },
                CaseNumber: {
                    rich_text: [{ text: { content: "CASE-2024-001" } }]
                },
                Description: {
                    rich_text: [{ text: { content: "Property tax assessment dispute for commercial property in Wrigleyville" } }]
                },
                Status: { select: { name: "Active" } },
                TrustScore: { number: 75 },
                TotalEvidence: { number: 3 },
                VerifiedEvidence: { number: 2 },
                PendingEvidence: { number: 1 },
                MintedEvidence: { number: 1 },
                CreatedDate: { date: { start: new Date().toISOString() } },
                UpdatedDate: { date: { start: new Date().toISOString() } }
            }
        });

        console.log("📄 Creating sample evidence...");
        
        // Create sample evidence
        const sampleEvidence = await notion.pages.create({
            parent: { database_id: evidenceDb.id },
            properties: {
                Title: {
                    title: [{ text: { content: "Cook County Property Tax Assessment 2024" } }]
                },
                ArtifactID: {
                    rich_text: [{ text: { content: "PROP-2024-001" } }]
                },
                EvidenceType: { select: { name: "Property Tax" } },
                Status: { select: { name: "Verified" } },
                TrustScore: { number: 85 },
                UploadedDate: { date: { start: new Date().toISOString() } },
                VerifiedDate: { date: { start: new Date().toISOString() } },
                Description: {
                    rich_text: [{ text: { content: "Official property tax assessment document from Cook County Assessor's office showing disputed valuation" } }]
                }
            }
        });

        console.log("🧠 Creating sample atomic facts...");
        
        // Create sample atomic facts
        await notion.pages.create({
            parent: { database_id: factsDb.id },
            properties: {
                Fact: {
                    title: [{ text: { content: "Property assessed at $285,000 for tax year 2024" } }]
                },
                FactType: { select: { name: "Property" } },
                TrustScore: { number: 95 },
                Confidence: { number: 0.95 },
                ExtractedFrom: {
                    rich_text: [{ text: { content: "Cook County Assessor Database" } }]
                },
                VerificationStatus: { select: { name: "Verified" } },
                ExtractedDate: { date: { start: new Date().toISOString() } }
            }
        });

        await notion.pages.create({
            parent: { database_id: factsDb.id },
            properties: {
                Fact: {
                    title: [{ text: { content: "Property tax payment of $8,925 due in two installments" } }]
                },
                FactType: { select: { name: "Financial" } },
                TrustScore: { number: 90 },
                Confidence: { number: 0.92 },
                ExtractedFrom: {
                    rich_text: [{ text: { content: "Cook County Treasurer Records" } }]
                },
                VerificationStatus: { select: { name: "Verified" } },
                ExtractedDate: { date: { start: new Date().toISOString() } }
            }
        });

        console.log("⛓️ Creating sample blockchain transaction...");
        
        // Create sample blockchain transaction
        await notion.pages.create({
            parent: { database_id: blockchainDb.id },
            properties: {
                TransactionHash: {
                    title: [{ text: { content: "0x1a2b3c4d5e6f7890abcdef1234567890" } }]
                },
                BlockNumber: { number: 2847123 },
                GasUsed: { number: 45000 },
                GasPrice: { rich_text: [{ text: { content: "20 gwei" } }] },
                Status: { select: { name: "Confirmed" } },
                NetworkStatus: { select: { name: "Finalized" } },
                CreatedDate: { date: { start: new Date().toISOString() } },
                ConfirmedDate: { date: { start: new Date().toISOString() } }
            }
        });

        console.log("✅ Sample data created successfully!");
        console.log("\n🎉 ChittyChain Notion Integration Complete!");
        console.log("📊 Your evidence, cases, facts, and blockchain data will now sync with Notion");
        console.log("🔗 Access your data at your Notion workspace");
        
    } catch (error) {
        console.error("Error creating sample data:", error);
    }
}

// Run the setup
setupChittyChainNotionDatabases()
    .then(() => {
        console.log("🚀 Setup complete! ChittyChain is now integrated with Notion.");
        process.exit(0);
    })
    .catch(error => {
        console.error("💥 Setup failed:", error);
        process.exit(1);
    });