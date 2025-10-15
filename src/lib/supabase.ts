import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Create a mock Supabase client for demo mode
const createMockSupabase = () => {
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: new Error('Demo mode - authentication disabled') }),
      signUp: async () => ({ data: { user: null }, error: new Error('Demo mode - authentication disabled') }),
      signOut: async () => ({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null })
        })
      }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: () => ({
          select: () => ({ data: null, error: null })
        })
      }),
      delete: () => ({
        eq: () => ({ data: null, error: null })
      })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
    })
  }
  
  return mockClient as any
}

// Create Supabase client with proper configuration
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Supabase credentials not found - using demo mode')
    return createMockSupabase()
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: window.localStorage,
      storageKey: 'supabase.auth.token'
    },
    global: {
      headers: {
        'x-client-info': 'cryptotracker-web'
      }
    }
  })
}

export const supabase = createSupabaseClient()
