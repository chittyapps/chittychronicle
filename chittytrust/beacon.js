// ChittyBeacon initialization for ChittyTrust application
// This script enables telemetry tracking for the ChittyOS ecosystem

// Simply require the beacon module - it auto-initializes
require('@chittycorp/app-beacon');

console.log('ChittyBeacon telemetry initialized for ChittyTrust application');

// Keep the process alive to continue sending heartbeats
// The beacon will automatically send heartbeats every 5 minutes
process.stdin.resume();