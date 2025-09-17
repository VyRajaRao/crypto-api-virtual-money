import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Log configuration for debugging
if (import.meta.env.DEV) {
  console.log('Supabase Config:', {
    url: supabaseUrl ? '✅ Found' : '❌ Missing',
    key: supabaseAnonKey ? '✅ Found' : '❌ Missing'
  });
}

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
    console.warn('⚠️  Supabase credentials not found - using demo mode');
    return createMockSupabase();
  }
  
  console.log('✅ Initializing Supabase client with email verification support');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Using API Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Missing');
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Allow sign-in without email confirmation
      debug: import.meta.env.DEV,
      // These settings help with email verification issues
      storage: window.localStorage,
      storageKey: 'supabase.auth.token'
    },
    global: {
      headers: {
        'x-client-info': 'cryptotracker-web'
      }
    }
  });
};

export const supabase = createSupabaseClient();

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    console.log('📧 Testing Supabase email configuration...');
    
    // Check if we have proper credentials
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      console.warn('⚠️  Missing Supabase credentials - emails will not work');
      return { canSendEmails: false, reason: 'Missing credentials' };
    }
    
    // Test with a dummy email signup to check if the service responds
    const testEmail = 'test-config@example.com';
    console.log('🔍 Testing email service with dummy email...');
    
    // This will tell us if the email service is configured
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test-password-123',
      options: {
        data: {
          test_signup: true
        }
      }
    });
    
    if (error) {
      console.error('❌ Email service test failed:', error.message);
      return { 
        canSendEmails: false, 
        reason: error.message,
        suggestion: 'Check your Supabase project settings'
      };
    }
    
    console.log('✅ Email service appears to be configured correctly');
    return { 
      canSendEmails: true, 
      reason: 'Service responded successfully'
    };
  } catch (error) {
    console.error('❌ Email configuration test error:', error);
    return { 
      canSendEmails: false, 
      reason: 'Network or service error',
      error: error
    };
  }
};
