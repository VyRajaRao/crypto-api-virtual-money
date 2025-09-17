import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(error => {
        console.log('Demo mode: Supabase auth not available');
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Create default preferences for new users
          if (session?.user) {
            try {
              const { data: existingPrefs } = await supabase
                .from('preferences')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              if (!existingPrefs) {
                await supabase.from('preferences').insert({
                  user_id: session.user.id,
                  theme: 'dark',
                  currency: 'usd'
                });
              }
            } catch (error) {
              console.log('Demo mode: Could not create preferences');
            }
          }
        }
      });

      return () => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.log('Demo mode: Subscription cleanup not needed');
        }
      };
    } catch (error) {
      console.log('Demo mode: Auth state change listener not available');
      return () => {};
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error types
        let errorMessage = error.message;

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        }

        return { success: false, error: errorMessage };
      }

      if (data.user) {
        toast.success('Successfully signed in!');
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        // Handle specific error types
        let errorMessage = error.message;

        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('Unable to validate email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Account registration is currently disabled. Please contact support.';
        }

        return { success: false, error: errorMessage };
      }

      if (data.user) {
        if (data.user.email_confirmed_at) {
          toast.success('Account created successfully!');
        } else {
          toast.success('Account created! Please check your inbox to confirm your email address.');
        }
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
