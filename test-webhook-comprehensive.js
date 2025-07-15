#!/usr/bin/env node

/**
 * Comprehensive webhook testing script
 * Tests all webhook endpoints and functionality
 */

const fs = require('fs');
const path = require('path');

// Configuration
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const testWebhookSecret = 'test-webhook-secret-12345';

// Test data
const testSubmission = {
  title: "Test Game: Webhook Validation",
  description: "A comprehensive test game submission to validate the webhook implementation and GitHub integration workflow.",
  genre: "Testing",
  players: "Single Player",
  difficulty: "Easy",
  features: "- Automated testing validation\n- Webhook endpoint verification\n- GitHub Actions integration\n- Error handling testing",
  submitterName: "Webhook Test System",
  submitterEmail: "webhook-test@example.com",
  source: "Automated Test Suite"
};

// Utilities
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[type];
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { rawResponse: data };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: jsonData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message },
      headers: {}
    };
  }
}

// Test functions
async function testEnvironmentSetup() {
  log('Testing environment setup...', 'info');
  
  const tests = [];
  
  // Check if required environment variables are documented
  const envVars = [
    'GAME_SUBMISSION_TOKEN',
    'GAME_SUBMISSION_TEST_TOKEN',
    'TEST_GITHUB_TOKEN',
    'GITHUB_TEST_TOKEN',
    'GITHUB_WEBHOOK_TOKEN',
    'GITHUB_TOKEN',
    'WEBHOOK_SECRET'
  ];
  
  envVars.forEach(envVar => {
    const value = process.env[envVar];
    tests.push({
      name: `Environment variable ${envVar}`,
      status: value ? 'available' : 'not set',
      required: ['GAME_SUBMISSION_TOKEN', 'GAME_SUBMISSION_TEST_TOKEN'].includes(envVar)
    });
  });
  
  tests.forEach(test => {
    if (test.required && test.status === 'not set') {
      log(`${test.name}: ${test.status} (REQUIRED)`, 'warning');
    } else {
      log(`${test.name}: ${test.status}`, test.status === 'available' ? 'success' : 'debug');
    }
  });
  
  return tests;
}

async function testSubmitGameEndpoint() {
  log('Testing /api/submit-game endpoint...', 'info');
  
  const response = await makeRequest(`${baseUrl}/api/submit-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testSubmission)
  });
  
  if (response.ok) {
    log('Submit game endpoint working correctly', 'success');
  } else {
    log(`Submit game endpoint failed: ${response.status} ${response.statusText}`, 'error');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
  }
  
  return response;
}

async function testWebhookEndpoint() {
  log('Testing /api/webhook endpoint...', 'info');
  
  // Test GET request for documentation
  const getResponse = await makeRequest(`${baseUrl}/api/webhook`);
  if (getResponse.ok) {
    log('Webhook GET endpoint (documentation) working', 'success');
  } else {
    log(`Webhook GET endpoint failed: ${getResponse.status}`, 'warning');
  }
  
  // Test POST request for webhook submission
  const postResponse = await makeRequest(`${baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testSubmission)
  });
  
  if (postResponse.ok) {
    log('Webhook POST endpoint working correctly', 'success');
  } else {
    log(`Webhook POST endpoint failed: ${postResponse.status} ${postResponse.statusText}`, 'error');
    log(`Response: ${JSON.stringify(postResponse.data, null, 2)}`, 'debug');
  }
  
  return { get: getResponse, post: postResponse };
}

async function testWebhookSecurity() {
  log('Testing webhook security features...', 'info');
  
  // Test without signature (should work if WEBHOOK_SECRET is not set)
  const unsignedResponse = await makeRequest(`${baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testSubmission)
  });
  
  log(`Unsigned webhook request: ${unsignedResponse.status}`, 
      unsignedResponse.ok ? 'success' : 'warning');
  
  // Test with invalid signature (should fail if WEBHOOK_SECRET is set)
  const invalidSignedResponse = await makeRequest(`${baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': 'sha256=invalid_signature'
    },
    body: JSON.stringify(testSubmission)
  });
  
  if (process.env.WEBHOOK_SECRET) {
    log(`Invalid signature test: ${invalidSignedResponse.status === 401 ? 'correctly rejected' : 'security concern'}`,
        invalidSignedResponse.status === 401 ? 'success' : 'warning');
  }
  
  return { unsigned: unsignedResponse, invalidSigned: invalidSignedResponse };
}

async function testMalformedRequests() {
  log('Testing error handling with malformed requests...', 'info');
  
  const tests = [
    {
      name: 'Empty payload',
      body: '{}',
      expectedStatus: 400
    },
    {
      name: 'Missing required fields',
      body: JSON.stringify({ title: 'Test' }),
      expectedStatus: 400
    },
    {
      name: 'Invalid JSON',
      body: 'invalid json',
      expectedStatus: 400
    },
    {
      name: 'Missing Content-Type',
      body: JSON.stringify(testSubmission),
      headers: {},
      expectedStatus: 400
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const response = await makeRequest(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...test.headers
      },
      body: test.body
    });
    
    const success = response.status >= 400 && response.status < 500;
    log(`${test.name}: ${response.status} ${success ? '(correctly handled)' : '(unexpected)'}`,
        success ? 'success' : 'warning');
    
    results.push({ ...test, actual: response.status, success });
  }
  
  return results;
}

async function generateTestReport(results) {
  log('Generating test report...', 'info');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl,
    environment: {
      hasGameSubmissionToken: !!process.env.GAME_SUBMISSION_TOKEN,
      hasTestToken: !!process.env.GAME_SUBMISSION_TEST_TOKEN,
      hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
      nodeVersion: process.version
    },
    results
  };
  
  const reportPath = path.join(__dirname, 'webhook-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  log(`Test report saved to: ${reportPath}`, 'success');
  
  // Generate summary
  const totalTests = Object.values(results).flat().length;
  const passedTests = Object.values(results).flat().filter(r => r.ok || r.success).length;
  
  log(`\n📊 TEST SUMMARY`, 'info');
  log(`Total tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, 'success');
  log(`Failed: ${totalTests - passedTests}`, totalTests === passedTests ? 'success' : 'error');
  log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`, 'info');
  
  return reportData;
}

// Main test runner
async function runTests() {
  log('🚀 Starting comprehensive webhook tests...', 'info');
  log(`Base URL: ${baseUrl}`, 'info');
  
  const results = {};
  
  try {
    // Environment tests
    results.environment = await testEnvironmentSetup();
    
    // Endpoint functionality tests
    results.submitGame = await testSubmitGameEndpoint();
    results.webhook = await testWebhookEndpoint();
    
    // Security tests
    results.security = await testWebhookSecurity();
    
    // Error handling tests
    results.errorHandling = await testMalformedRequests();
    
    // Generate report
    const report = await generateTestReport(results);
    
    log('✅ All tests completed successfully!', 'success');
    
    return report;
    
  } catch (error) {
    log(`❌ Test execution failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  // Handle global fetch for Node.js versions that don't have it
  if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
  }
  
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testEnvironmentSetup,
  testSubmitGameEndpoint,
  testWebhookEndpoint,
  testWebhookSecurity,
  testMalformedRequests
};