/**
 * Setup script for F1 API development server
 * This installs the required dependencies and starts the server
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up F1 API Development Server...\n');

try {
  // Check if package-dev.json exists
  if (!fs.existsSync('package-dev.json')) {
    console.error('❌ package-dev.json not found!');
    process.exit(1);
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install express cors', { stdio: 'inherit' });
  
  console.log('✅ Dependencies installed successfully!');
  console.log('\n🎯 Next steps:');
  console.log('1. Start the F1 API server:');
  console.log('   node server.js');
  console.log('\n2. In another terminal, start your React app:');
  console.log('   npm start');
  console.log('\n3. Test the API:');
  console.log('   node test-serverless-f1.js');
  console.log('\n🚀 Your F1 component should now work!');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
