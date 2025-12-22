import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Integration Test Suite Setup...\n');

const checks = {
  testFile: false,
  packageJson: false,
  jestConfig: false,
  dependencies: false,
};

// Check 1: Test file exists
const testFilePath = path.join(__dirname, '../tests/integration.test.js');
if (fs.existsSync(testFilePath)) {
  checks.testFile = true;
  console.log('✅ Integration test file exists');
  
  const content = fs.readFileSync(testFilePath, 'utf8');
  const testSuites = content.match(/describe\(/g)?.length || 0;
  const tests = content.match(/test\(/g)?.length || 0;
  console.log(`   - ${testSuites} test suites`);
  console.log(`   - ${tests} individual tests`);
} else {
  console.log('❌ Integration test file NOT found');
}

// Check 2: Package.json has test script
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.scripts['test:integration']) {
    checks.packageJson = true;
    console.log('✅ test:integration script configured');
    console.log(`   - Command: ${packageJson.scripts['test:integration']}`);
  } else {
    console.log('❌ test:integration script NOT found in package.json');
  }
  
  // Check dependencies
  const requiredDeps = ['jest', 'supertest', 'cross-env'];
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );
  
  if (missingDeps.length === 0) {
    checks.dependencies = true;
    console.log('✅ All required dependencies installed');
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  }
}

// Check 3: Jest config exists
const jestConfigPath = path.join(__dirname, '../jest.config.js');
if (fs.existsSync(jestConfigPath)) {
  checks.jestConfig = true;
  console.log('✅ Jest configuration exists');
} else {
  console.log('❌ Jest configuration NOT found');
}

// Summary
console.log('\n📊 Verification Summary:');
console.log('========================');

const allPassed = Object.values(checks).every(check => check === true);

Object.entries(checks).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const label = key.replace(/([A-Z])/g, ' $1').trim();
  console.log(`${status} ${label}`);
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ ALL CHECKS PASSED - Integration tests ready to run!');
  console.log('\nRun tests with:');
  console.log('  npm run test:integration');
  console.log('\nOr run all tests:');
  console.log('  npm run test:all');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED - Please review above');
  process.exit(1);
}
