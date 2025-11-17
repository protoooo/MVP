import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkUsageLimits } from '../../../lib/usageLimits';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limits = await checkUsageLimits(user.id);

    // Get subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      subscription: {
        tier: profile.subscription_tier,
        status: profile.subscription_status
      },
      usage: {
        apiCalls: {
          used: limits.api_calls_used,
          limit: limits.api_calls_limit,
          unlimited: limits.api_calls_limit === -1
        },
        documents: {
          used: limits.documents_used,
          limit: limits.documents_limit,
          unlimited: limits.documents_limit === -1
        },
        conversations: {
          used: limits.conversations_used,
          limit: limits.conversations_limit,
          unlimited: limits.conversations_limit === -1
        }
      }
    });

  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}
