#!/usr/bin/env node

/**
 * Core functionality test - no external dependencies
 * Tests what actually works vs what documentation claims
 */

import { ChittyChainV2 } from './src/blockchain/ChittyChainV2.js';

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
    const status = chain.validateChain();
    
    if (status.valid) {
      console.log('✅ Core blockchain: WORKING');
      console.log(`   - Chain length: ${status.chainLength}`);
      console.log(`   - Total artifacts: ${status.totalArtifacts}`);
      results.blockchain = true;
    } else {
      console.log('❌ Core blockchain: BROKEN');
      console.log(`   - Errors: ${status.errors.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Core blockchain: CRASHED');
    console.log(`   - Error: ${error.message}`);
  }

  // Test 2: Trust layer (with dependencies)
  try {
    const { ChittyChainTrustLayer } = await import('./lib/blockchain/trust-layer.js');
    console.log('✅ Trust layer: CAN LOAD');
    results.trustLayer = true;
  } catch (error) {
    console.log('❌ Trust layer: IMPORT FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Test 3: Dependency resolver
  try {
    const { ChittyChainDependencyResolver } = await import('./lib/blockchain/dependency-resolver.js');
    console.log('✅ Dependency resolver: CAN LOAD');
    results.dependencyResolver = true;
  } catch (error) {
    console.log('❌ Dependency resolver: IMPORT FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Test 4: Verification service
  try {
    const { ChittyChainVerificationService } = await import('./lib/blockchain/verification-service.js');
    console.log('✅ Verification service: CAN LOAD');
    results.verificationService = true;
  } catch (error) {
    console.log('❌ Verification service: IMPORT FAILED');
    console.log(`   - Error: ${error.message.split('\n')[0]}`);
  }

  // Summary
  const working = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 REALITY CHECK: ${working}/${total} components functional (${Math.round(working/total*100)}%)`);
  
  if (working < total) {
    console.log('\n🚨 DOCUMENTATION vs REALITY GAP DETECTED');
    console.log('   Documentation claims: "Enhanced ChittyChain with 15+ tools ready for use"');
    console.log(`   Actual functionality: ${working}/${total} core components working`);
    console.log('   Recommendation: Update docs to reflect actual capabilities');
  }

  return results;
}

testCoreComponents().catch(console.error);