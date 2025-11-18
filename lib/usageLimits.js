import { createClient } from '@supabase/supabase-js';

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Simple check - no limits, just return success
export async function checkUsageLimits(userId) {
  if (!supabase) {
    console.warn('Service role key not configured - allowing unlimited access');
    return {
      can_use_api: true,
      can_add_document: true,
      api_calls_used: 0,
      api_calls_limit: -1,
      documents_used: 0,
      documents_limit: -1,
      conversations_used: 0,
      conversations_limit: -1
    };
  }

  try {
    // Get user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking limits:', error);
      // Allow access on error
      return {
        can_use_api: true,
        can_add_document: true,
        api_calls_used: 0,
        api_calls_limit: -1,
        documents_used: 0,
        documents_limit: -1,
        conversations_used: 0,
        conversations_limit: -1
      };
    }

    // If paid user, unlimited access
    if (profile.subscription_status === 'active') {
      return {
        can_use_api: true,
        can_add_document: true,
        api_calls_used: 0,
        api_calls_limit: -1,
        documents_used: 0,
        documents_limit: -1,
        conversations_used: 0,
        conversations_limit: -1
      };
    }

    // Free users also get unlimited for now
    // You can add limits later if needed
    return {
      can_use_api: true,
      can_add_document: true,
      api_calls_used: 0,
      api_calls_limit: -1,
      documents_used: 0,
      documents_limit: -1,
      conversations_used: 0,
      conversations_limit: -1
    };

  } catch (error) {
    console.error('Exception checking limits:', error);
    // Allow access on error
    return {
      can_use_api: true,
      can_add_document: true,
      api_calls_used: 0,
      api_calls_limit: -1,
      documents_used: 0,
      documents_limit: -1,
      conversations_used: 0,
      conversations_limit: -1
    };
  }
}

// No-op function for incrementing API calls
export async function incrementApiCall(userId) {
  // Do nothing - no limits enforced
  return true;
}

// Simple logging function
export async function logApiUsage(userId, businessId, endpoint, tokensUsed, responseTimeMs, statusCode) {
  if (!supabase) return;

  try {
    const costPer1kTokens = 0.003;
    const costUsd = (tokensUsed / 1000) * costPer1kTokens;

    await supabase
      .from('api_usage_log')
      .insert({
        user_id: userId,
        business_id: businessId,
        endpoint,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        response_time_ms: responseTimeMs,
        status_code: statusCode
      });
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Don't throw - logging shouldn't break the app
  }
}

// Check user access (for paid features)
export async function checkUserAccess(userId) {
  if (!supabase) {
    console.warn('Service role key not configured - allowing access');
    return { hasAccess: true, isPaid: false };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking access:', error);
      return { hasAccess: true, isPaid: false }; // Allow access on error
    }

    const hasAccess = data.subscription_status === 'active';
    
    return { 
      hasAccess, 
      isPaid: hasAccess,
      status: data.subscription_status 
    };
  } catch (error) {
    console.error('Exception checking access:', error);
    return { hasAccess: true, isPaid: false };
  }
}
