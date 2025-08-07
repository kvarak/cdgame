#!/usr/bin/env node

/**
 * Build script to generate version from git describe
 * Run this before build: node scripts/generate-version.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get version from git describe
  const gitDescribe = execSync('git describe --tags --long --dirty', { encoding: 'utf-8' }).trim();
  
  console.log(`Git describe: ${gitDescribe}`);
  
  // Create .env.local file with version
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = `VITE_APP_VERSION=${gitDescribe}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Version written to .env.local: ${gitDescribe}`);
  
} catch (error) {
  console.warn('Could not get git version:', error.message);
  // Create fallback version
  const fallbackVersion = 'v0.1.0-dev';
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = `VITE_APP_VERSION=${fallbackVersion}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log(`Fallback version written: ${fallbackVersion}`);
}