/**
 * Email Validation Tests
 * 
 * This file demonstrates that the email validation works correctly
 * and prevents the "string did not match expected pattern" error.
 */

// Email validation function (matching backend implementation)
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Additional validation: no consecutive dots
  if (email.includes('..')) {
    return false;
  }
  
  return emailRegex.test(email);
}

// Test cases
const testCases = [
  // Valid emails
  { email: 'test@example.com', expected: true, description: 'Standard email' },
  { email: 'user.name@domain.co.uk', expected: true, description: 'Email with dot in local part and multi-level TLD' },
  { email: 'user+tag@example.org', expected: true, description: 'Email with plus sign' },
  { email: 'user_name@example.com', expected: true, description: 'Email with underscore' },
  { email: 'user%test@example.com', expected: true, description: 'Email with percent sign' },
  { email: 'test@sub.domain.com', expected: true, description: 'Email with subdomain' },
  { email: 'First.Last@company.co', expected: true, description: 'Email with capitalization' },
  
  // Invalid emails
  { email: 'invalid@', expected: false, description: 'Missing domain' },
  { email: '@invalid.com', expected: false, description: 'Missing local part' },
  { email: 'invalid', expected: false, description: 'No @ symbol' },
  { email: 'test@com', expected: false, description: 'Missing TLD separator' },
  { email: 'test@domain.c', expected: false, description: 'TLD too short (1 character)' },
  { email: 'test with space@example.com', expected: false, description: 'Contains space' },
  { email: 'test@@example.com', expected: false, description: 'Double @ symbol' },
  { email: 'test@example..com', expected: false, description: 'Consecutive dots in domain' },
  { email: 'test..name@example.com', expected: false, description: 'Consecutive dots in local part' },
  { email: 'test@', expected: false, description: 'Only @ symbol' },
];

// Run tests
console.log('\n📧 Email Validation Test Results\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((testCase) => {
  const result = validateEmail(testCase.email);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✓ PASS: ${testCase.description}`);
    console.log(`  Email: "${testCase.email}" -> ${result ? 'Valid' : 'Invalid'}`);
  } else {
    failed++;
    console.log(`✗ FAIL: ${testCase.description}`);
    console.log(`  Email: "${testCase.email}"`);
    console.log(`  Expected: ${testCase.expected ? 'Valid' : 'Invalid'}, Got: ${result ? 'Valid' : 'Invalid'}`);
  }
  console.log('');
});

console.log('='.repeat(70));
console.log(`\nTotal Tests: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`\n${failed === 0 ? '✓ All tests passed!' : '✗ Some tests failed'}\n`);

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
