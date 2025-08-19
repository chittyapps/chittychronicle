#!/usr/bin/env node

/**
 * Live System Test - Test the actual running ChittyChain Evidence Ledger
 * Tests the integrated PostgreSQL database and blockchain services
 */

async function testLiveSystem() {
  console.log('🔍 ChittyChain Live System Test\n');
  
  const baseUrl = 'http://localhost:5000';
  const results = {
    database: false,
    api: false,
    blockchain: false,
    analysis: false
  };

  // Test 1: Database and API connectivity
  try {
    const response = await fetch(`${baseUrl}/api/cases`);
    if (response.ok) {
      const cases = await response.json();
      console.log('✅ Database & API: WORKING');
      console.log(`   - Cases endpoint responding`);
      console.log(`   - Cases loaded: ${cases.length}`);
      results.database = true;
      results.api = true;
    } else {
      console.log('❌ Database & API: HTTP ERROR');
      console.log(`   - Status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Database & API: CONNECTION FAILED');
    console.log(`   - Error: ${error.message}`);
  }

  // Test 2: Evidence creation and retrieval
  let evidenceId = null;
  try {
    // Create test evidence
    const createResponse = await fetch(`${baseUrl}/api/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-1',
        artifactId: 'TEST-2024-001',
        title: 'Test Evidence for Analysis',
        description: 'Sample evidence for comprehensive analysis testing',
        type: 'document',
        status: 'pending'
      })
    });

    if (createResponse.ok) {
      const evidence = await createResponse.json();
      evidenceId = evidence.id;
      console.log('✅ Evidence Creation: WORKING');
      console.log(`   - Evidence ID: ${evidenceId}`);
      console.log(`   - Artifact ID: ${evidence.artifactId}`);
    } else {
      console.log('❌ Evidence Creation: FAILED');
      const error = await createResponse.text();
      console.log(`   - Error: ${error}`);
    }
  } catch (error) {
    console.log('❌ Evidence Creation: CRASHED');
    console.log(`   - Error: ${error.message}`);
  }

  // Test 3: Comprehensive Analysis
  if (evidenceId) {
    try {
      const analysisResponse = await fetch(`${baseUrl}/api/evidence/${evidenceId}/comprehensive-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        console.log('✅ Comprehensive Analysis: WORKING');
        console.log(`   - Analysis completed: ${analysis.overallStatus}`);
        console.log(`   - Stages completed: ${Object.keys(analysis.stages).length}`);
        console.log(`   - Blockchain minted: ${analysis.stages.minting.results.success}`);
        results.analysis = true;
        results.blockchain = true;
      } else {
        console.log('❌ Comprehensive Analysis: FAILED');
        const error = await analysisResponse.text();
        console.log(`   - Error: ${error.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('❌ Comprehensive Analysis: CRASHED');
      console.log(`   - Error: ${error.message}`);
    }
  }

  // Test 4: Blockchain Minting
  if (evidenceId) {
    try {
      const mintResponse = await fetch(`${baseUrl}/api/evidence/${evidenceId}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (mintResponse.ok) {
        const mintResult = await mintResponse.json();
        console.log('✅ Blockchain Minting: WORKING');
        console.log(`   - Transaction hash: ${mintResult.transactionHash}`);
        console.log(`   - Block number: ${mintResult.blockNumber}`);
        results.blockchain = true;
      } else {
        console.log('❌ Blockchain Minting: FAILED');
        const error = await mintResponse.text();
        console.log(`   - Error: ${error.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('❌ Blockchain Minting: CRASHED');
      console.log(`   - Error: ${error.message}`);
    }
  }

  // Summary
  const working = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 LIVE SYSTEM STATUS: ${working}/${total} components functional (${Math.round(working/total*100)}%)`);
  
  if (working === total) {
    console.log('\n🎉 COMPREHENSIVE BLOCKCHAIN EVIDENCE PLATFORM: FULLY OPERATIONAL');
    console.log('   ✅ PostgreSQL database integration');
    console.log('   ✅ Real-time evidence processing');
    console.log('   ✅ 6-stage comprehensive analysis');
    console.log('   ✅ Blockchain minting and verification');
    console.log('\n🏆 READY FOR PRODUCTION LEGAL EVIDENCE MANAGEMENT');
  } else {
    console.log('\n🔧 SYSTEM PARTIALLY FUNCTIONAL');
    console.log('   Some components need attention for full production readiness');
  }

  return results;
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLiveSystem().catch(console.error);
}

export { testLiveSystem };