import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

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

export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? createMockSupabase()
  : createClient<Database>(supabaseUrl, supabaseAnonKey)
