#!/usr/bin/env node

/**
 * ChittyChain Evidence Ledger Schema Deployment Script
 * Deploys the Evidence Ledger schema to Neon PostgreSQL database
 */

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploySchema() {
    try {
        // Get database URL from environment
        const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is required');
        }

        console.log('🔗 Connecting to Neon database...');
        const sql = neon(databaseUrl);

        // Read the schema file
        const schemaPath = path.join(__dirname, 'database', 'evidence-ledger-schema.sql');
        const schemaSQL = readFileSync(schemaPath, 'utf8');

        console.log('📄 Deploying Evidence Ledger schema...');
        
        // Split the schema into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let successCount = 0;
        let totalStatements = statements.length;

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await sql(statement);
                    successCount++;
                    console.log(`✅ Executed statement ${successCount}/${totalStatements}`);
                } catch (error) {
                    // Ignore "already exists" errors for extensions and types
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate key') ||
                        error.message.includes('relation') && error.message.includes('already exists')) {
                        console.log(`⚠️  Skipped existing object: ${error.message.split('\n')[0]}`);
                        successCount++;
                    } else {
                        console.error(`❌ Error executing statement: ${error.message}`);
                        console.error(`Statement: ${statement.substring(0, 100)}...`);
                        throw error;
                    }
                }
            }
        }

        console.log('\n🎉 Schema deployment completed successfully!');
        console.log(`📊 Executed ${successCount}/${totalStatements} statements`);

        // Validate deployment by checking for key tables
        console.log('\n🔍 Validating deployment...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('master_evidence', 'atomic_facts', 'legal_cases', 'users', 'contradiction_tracking', 'chain_of_custody_log', 'audit_trail')
            ORDER BY table_name
        `;

        console.log('✅ Created tables:', tables.map(t => t.table_name).join(', '));

        // Check for custom types
        const types = await sql`
            SELECT typname 
            FROM pg_type 
            WHERE typname IN ('evidence_tier', 'evidence_type', 'user_type', 'case_type', 'fact_type')
            ORDER BY typname
        `;

        console.log('✅ Created types:', types.map(t => t.typname).join(', '));

        // Check for functions
        const functions = await sql`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name LIKE '%evidence%'
            ORDER BY routine_name
        `;

        console.log('✅ Created functions:', functions.map(f => f.routine_name).join(', '));

        console.log('\n🏆 Evidence Ledger schema is ready for production use!');
        
    } catch (error) {
        console.error('💥 Schema deployment failed:', error.message);
        process.exit(1);
    }
}

// Run the deployment
deploySchema();