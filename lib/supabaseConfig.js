const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseUrl = url
export const supabaseAnonKey = anonKey
export const isSupabaseConfigured = Boolean(url && anonKey)

export const missingSupabaseConfigMessage =
  'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
