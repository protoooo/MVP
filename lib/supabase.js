import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import env from './env';

// Browser client (use in client components)
let browserClient = null;

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserSupabaseClient can only be called in browser');
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'no-rap',
          },
        },
      }
    );
  }

  return browserClient;
}

// Server client (use in server components, API routes, server actions)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This can be called from server components where cookies() is read-only
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This can be called from server components where cookies() is read-only
          }
        },
      },
      auth: {
        persistSession: false, // Server doesn't need to persist sessions
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'no-rap',
        },
      },
    }
  );
}

// Admin client with service role (use ONLY in server-side code)
// WARNING: This has full database access, bypassing RLS
let adminClient = null;

export function createAdminSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client should never be used in browser');
  }

  if (!adminClient) {
    adminClient = createClient(
      env.supabase.url,
      env.supabase.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'no-rap-admin',
          },
        },
      }
    );
  }

  return adminClient;
}

// Helper function to get authenticated user (server-side)
export async function getAuthenticatedUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Helper function to require authentication (server-side)
export async function requireAuth() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Helper function to check if user has active subscription
export async function checkSubscription(userId) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_current_period_end, trial_ends_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking subscription:', error);
      return false;
    }

    const now = new Date();

    // Check if subscription is active
    if (data.subscription_status === 'active' && 
        data.subscription_current_period_end &&
        new Date(data.subscription_current_period_end) > now) {
      return true;
    }

    // Check if trial is active
    if (data.subscription_status === 'trialing' && 
        data.trial_ends_at &&
        new Date(data.trial_ends_at) > now) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkSubscription:', error);
    return false;
  }
}

// Helper function to check rap generation limit
export async function canGenerateRap(userId) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('raps_generated, raps_limit, subscription_status, subscription_current_period_end, trial_ends_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking rap limit:', error);
      return { allowed: false, reason: 'Error checking limit' };
    }

    // Check if user has active subscription (unlimited)
    const hasActiveSubscription = await checkSubscription(userId);
    if (hasActiveSubscription) {
      return { allowed: true, unlimited: true };
    }

    // Check free/trial limit
    if (data.raps_generated >= data.raps_limit) {
      return { 
        allowed: false, 
        reason: 'Limit reached',
        current: data.raps_generated,
        limit: data.raps_limit
      };
    }

    return { 
      allowed: true, 
      unlimited: false,
      current: data.raps_generated,
      limit: data.raps_limit
    };
  } catch (error) {
    console.error('Error in canGenerateRap:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
}

// Helper function to increment rap count
export async function incrementRapCount(userId) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase.rpc('increment_rap_count', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error incrementing rap count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementRapCount:', error);
    return false;
  }
}

// Create the increment function in Supabase if it doesn't exist
// Run this SQL in Supabase SQL Editor:
/*
CREATE OR REPLACE FUNCTION increment_rap_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET raps_generated = raps_generated + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

export default {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createAdminSupabaseClient,
  getAuthenticatedUser,
  requireAuth,
  checkSubscription,
  canGenerateRap,
  incrementRapCount,
};
