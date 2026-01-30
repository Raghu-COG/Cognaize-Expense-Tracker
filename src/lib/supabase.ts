import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

/** Test the Supabase connection by querying the users table. Returns null on success, error message on failure. */
export async function testSupabaseConnection(): Promise<string | null> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message)
      return `Database error: ${error.message}`
    }
    console.log('[Supabase] Connection verified successfully')
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Supabase] Connection test exception:', msg)
    return `Connection failed: ${msg}`
  }
}
