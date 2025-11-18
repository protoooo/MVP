console.log('🔍 Validating Environment Configuration...\n');

const errors = [];
const warnings = [];
const info = [];

// Required variables
const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

// Optional but recommended
const recommended = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Optional for paid features
const optional = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
  STRIPE_PRICE_ID_ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

// Check required
console.log('✅ Required Variables:');
for (const [key, value] of Object.entries(required)) {
  if (!value) {
    errors.push(`Missing required variable: ${key}`);
    console.log(`  ❌ ${key}: NOT SET`);
  } else {
    // Validate format
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !value.includes('supabase.co')) {
      errors.push(`${key} doesn't look like a valid Supabase URL`);
      console.log(`  ⚠️  ${key}: SET (but format looks wrong)`);
    } else if (key === 'GEMINI_API_KEY' && !value.startsWith('AIza')) {
      warnings.push(`${key} doesn't look like a typical Gemini API key (should start with AIza)`);
      console.log(`  ⚠️  ${key}: SET (but format looks unusual)`);
    } else {
      console.log(`  ✅ ${key}: SET`);
    }
  }
}

// Check recommended
console.log('\n⚠️  Recommended Variables:');
for (const [key, value] of Object.entries(recommended)) {
  if (!value) {
    warnings.push(`Missing recommended variable: ${key}`);
    console.log(`  ⚠️  ${key}: NOT SET`);
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      info.push('Without SUPABASE_SERVICE_ROLE_KEY: Usage limits and API logging will be disabled');
    }
  } else {
    console.log(`  ✅ ${key}: SET`);
  }
}

// Check optional
console.log('\nℹ️  Optional Variables (for paid subscriptions):');
const stripeConfigured = optional.STRIPE_SECRET_KEY && 
                         optional.STRIPE_SECRET_KEY.startsWith('sk_');
for (const [key, value] of Object.entries(optional)) {
  if (!value) {
    console.log(`  ⚪ ${key}: NOT SET`);
  } else {
    if (key === 'STRIPE_SECRET_KEY' && !value.startsWith('sk_')) {
      warnings.push(`${key} doesn't look like a valid Stripe key`);
      console.log(`  ⚠️  ${key}: SET (but format looks wrong)`);
    } else {
      console.log(`  ✅ ${key}: SET`);
    }
  }
}

if (!stripeConfigured) {
  info.push('Stripe not configured - Only free tier will be available');
  info.push('To enable paid subscriptions, set all STRIPE_* variables');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY:');
console.log('='.repeat(50));

if (errors.length > 0) {
  console.log('\n❌ ERRORS (must fix):');
  errors.forEach(err => console.log(`  • ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (should fix for production):');
  warnings.forEach(warn => console.log(`  • ${warn}`));
}

if (info.length > 0) {
  console.log('\nℹ️  INFO:');
  info.forEach(i => console.log(`  • ${i}`));
}

if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
  console.log('\n✅ Perfect! All configurations are set correctly.');
}

console.log('\n' + '='.repeat(50));

// Exit with error if critical issues
if (errors.length > 0) {
  console.log('\n🚫 Cannot start - fix errors above first!');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  App will start but some features may be limited');
  console.log('Consider fixing warnings for production use.\n');
} else {
  console.log('\n✅ Ready to deploy!\n');
}

// Test connections (optional)
if (process.argv.includes('--test-connections')) {
  console.log('🔌 Testing connections...\n');
  testConnections();
}

async function testConnections() {
  // Test Supabase
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    });
    console.log(`  ${response.ok ? '✅' : '❌'} Supabase: ${response.ok ? 'Connected' : 'Failed'}`);
  } catch (err) {
    console.log(`  ❌ Supabase: Failed - ${err.message}`);
  }

  // Test Gemini API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'test' }]
          }]
        })
      }
    );
    console.log(`  ${response.ok ? '✅' : '❌'} Gemini API: ${response.ok ? 'Connected' : 'Failed'}`);
    if (!response.ok) {
      const error = await response.json();
      console.log(`     Error: ${error.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`  ❌ Gemini API: Failed - ${err.message}`);
  }

  console.log('');
}
