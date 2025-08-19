#!/usr/bin/env node

/**
 * Core functionality test - no external dependencies
 * Tests what actually works vs what documentation claims
 */

import { ChittyChainV2 } from './client/src/lib/blockchain/chittychain-v2.js';

async function testCoreComponents() {
  console.log('🔍 ChittyChain Core Functionality Test\n');
  
  const results = {
    blockchain: false,
    trustLayer: false,
    dependencyResolver: false,
    verificationService: false
  };

  // Test 1: Core blockchain
  try {
    const chain = new ChittyChainV2();
    const stats = chain.getChainStats();
    
    if (stats.chainValid) {
      console.log('✅ Core blockchain: WORKING');
      console.log(`   - Chain length: ${stats.totalBlocks}`);
      console.log(`   - Total artifacts: ${stats.totalArtifacts}`);
      console.log(`   - Latest hash: ${stats.latestBlockHash.substring(0, 16)}...`);
      results.blockchain = true;
    } else {
      console.log('❌ Core blockchain: BROKEN');
    }
  } catch (error) {
    console.log('❌ Core blockchain: CRASHED');
    console.log(`   - Error: ${error.message}`);
  }

  // Test 2: Database connectivity
  try {
    // Test database connection through the storage layer
    const { storage } = await import('./server/storage.js');
    const testUser = await storage.getUserByUsername('john.doe');
    
    if (testUser) {
      console.log('✅ Database integration: WORKING');
      console.log(`   - Demo user loaded: ${testUser.username}`);
      console.log(`   - Trust score: ${testUser.trustScore}`);
      results.trustLayer = true;
    } else {
      console.log('❌ Database integration: NO DEMO DATA');
    }
  } catch (error) {
    console.log('❌ Database integration: FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Test 3: API endpoints
  try {
    const response = await fetch('http://localhost:5000/api/cases');
    if (response.ok) {
      const cases = await response.json();
      console.log('✅ API endpoints: WORKING');
      console.log(`   - Cases endpoint responding: ${cases.length} cases`);
      results.dependencyResolver = true;
    } else {
      console.log('❌ API endpoints: HTTP ERROR');
      console.log(`   - Status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ API endpoints: CONNECTION FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Test 4: Comprehensive analysis
  try {
    const blockchainService = await import('./client/src/lib/services/blockchain-service.js');
    console.log('✅ Blockchain service: CAN LOAD');
    results.verificationService = true;
  } catch (error) {
    console.log('❌ Blockchain service: IMPORT FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Summary
  const working = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 REALITY CHECK: ${working}/${total} components functional (${Math.round(working/total*100)}%)`);
  
  if (working < total) {
    console.log('\n🚨 DOCUMENTATION vs REALITY GAP DETECTED');
    console.log('   Documentation claims: "Production-ready legal evidence platform"');
    console.log(`   Actual functionality: ${working}/${total} core components working`);
    console.log('   Recommendation: Fix integration issues and update docs');
  } else {
    console.log('\n🎉 ALL CORE COMPONENTS FUNCTIONAL');
    console.log('   System ready for comprehensive evidence analysis');
  }

  return results;
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCoreComponents().catch(console.error);
}

export { testCoreComponents };