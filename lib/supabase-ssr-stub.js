export function createBrowserClient() {
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    refreshSession: async () => ({ data: {}, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }

  const noopQuery = async () => ({ data: null, error: null })
  const rpc = async () => ({ data: null, error: null })

  return {
    auth,
    from: () => ({ select: noopQuery, insert: noopQuery, update: noopQuery, eq: () => ({ select: noopQuery }) }),
    rpc,
  }
}

export function createServerClient() {
  return createBrowserClient()
}
