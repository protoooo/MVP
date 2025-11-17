import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check environment variables
  checks.checks.environment = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anthropicKey: !!process.env.ANTHROPIC_API_KEY,
    status: 'pass'
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      !process.env.ANTHROPIC_API_KEY) {
    checks.checks.environment.status = 'fail';
    checks.status = 'unhealthy';
  }

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { error } = await supabase.from('businesses').select('count').limit(1);
    
    checks.checks.database = {
      status: error ? 'fail' : 'pass',
      message: error ? error.message : 'Connected'
    };

    if (error) {
      checks.status = 'unhealthy';
    }
  } catch (error) {
    checks.checks.database = {
      status: 'fail',
      message: error.message
    };
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(checks, { status: statusCode });
}
