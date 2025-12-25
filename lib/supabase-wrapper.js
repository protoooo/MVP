// Local shim to avoid default export resolution issues with @supabase/supabase-js wrapper
import * as supabaseModule from '@supabase/supabase-js/dist/module/index.js'

export * from '@supabase/supabase-js/dist/module/index.js'
export default supabaseModule
