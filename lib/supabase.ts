import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Realtime features will be unavailable.');
}

// Create the Supabase client for browser use
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Helper to subscribe to a team channel
export const subscribeToChannel = (
  channelId: number,
  onMessage: (message: any) => void
) => {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const channel = supabase
    .channel(`channel-${channelId}`)
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      onMessage(payload);
    })
    .subscribe();

  return channel;
};

// Helper to unsubscribe from a channel
export const unsubscribeFromChannel = async (channel: any) => {
  if (channel && supabase) {
    await supabase.removeChannel(channel);
  }
};
