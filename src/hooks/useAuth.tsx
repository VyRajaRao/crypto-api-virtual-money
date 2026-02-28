import React, { useState, useEffect, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { userPreferencesManager } from '@/utils/statePersistence';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Record<string, unknown>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
        toast.success('Successfully signed in!');
        return { success: true };
      }

      return { success: false, error: 'Sign in failed. Please try again.' };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || 'User' },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Check if email confirmation is required
        const needsVerification = !data.user.email_confirmed_at && !data.session;
        if (needsVerification) {
          toast.success('Account created! Please check your email to verify your account.');
        } else {
          userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
          toast.success('Account created successfully!');
        }
        return { success: true, needsVerification };
      }

      return { success: false, error: 'Account creation failed. Please try again.' };
    } catch (error) {
      console.error('Account creation failed:', error);
      return { success: false, error: 'Account creation failed. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const resendVerificationEmail = async (_email: string): Promise<{ success: boolean; error?: string }> => {
    // Supabase client SDK does not expose a direct resend-verification-email endpoint.
    // Users should check their inbox or use the Supabase Auth dashboard to resend.
    return { success: false, error: 'Please use the sign-up form again or contact support to resend your verification email.' };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: 'Password reset failed. Please try again.' };
    }
  };

  const updateProfile = async (updates: Record<string, unknown>): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({ data: updates });
      if (error) {
        toast.error('Failed to update profile');
        return false;
      }
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isDemo,
      signIn,
      signUp,
      signOut,
      resendVerificationEmail,
      resetPassword,
      updateProfile,
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
