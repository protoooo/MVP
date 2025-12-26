import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl, missingSupabaseConfigMessage } from './supabaseConfig'

let hasWarned = false

function createMissingQueryBuilder(error) {
  const result = { data: null, error }
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    single: () => builder,
    then: (resolve) => Promise.resolve(result).then(resolve),
    catch: (reject) => Promise.resolve(result).catch(reject),
    finally: (onFinally) => Promise.resolve(result).finally(onFinally),
  }
  return builder
}

const missingSupabaseError = new Error(missingSupabaseConfigMessage)
const missingQueryBuilder = createMissingQueryBuilder(missingSupabaseError)

const missingSupabaseClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: missingSupabaseError }),
    getUser: async () => ({ data: { user: null }, error: missingSupabaseError }),
    refreshSession: async () => ({ error: missingSupabaseError }),
    signOut: async () => ({ error: missingSupabaseError }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  from: () => missingQueryBuilder,
}

export const createClient = () => {
  if (!isSupabaseConfigured) {
    if (!hasWarned) {
      console.error(`[Supabase] ${missingSupabaseConfigMessage}`)
      hasWarned = true
    }
    return missingSupabaseClient
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
