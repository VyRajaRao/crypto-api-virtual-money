import React, { useState, useEffect, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { userPreferencesManager } from '@/utils/statePersistence';

const LOCAL_SESSION_KEY = 'cryptotracker_user_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Demo-mode helpers (used when no Supabase project is configured)
// ---------------------------------------------------------------------------
function makeDemoUser(email: string): User {
  return {
    id: `demo_${email.replace(/[^a-z0-9]/gi, '_')}`,
    email,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: { name: email.split('@')[0] },
    app_metadata: { provider: 'email', providers: ['email'] },
    aud: 'authenticated',
    role: 'authenticated',
  } as User;
}

function saveDemoSession(user: User) {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user, timestamp: Date.now() }));
}

function loadDemoSession(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const { user, timestamp } = JSON.parse(raw) as { user: User; timestamp: number };
    if (Date.now() - timestamp > SESSION_TTL_MS) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    return null;
  }
}

function clearDemoSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
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
  // isDemo is the inverse of supabaseEnabled — exported so UI can show a banner
  const isDemo = !supabaseEnabled;

  // -------------------------------------------------------------------------
  // Initialise auth state
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!supabaseEnabled) {
      // Demo mode: restore from localStorage
      const savedUser = loadDemoSession();
      if (savedUser) {
        setUser(savedUser);
        userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      }
      setLoading(false);
      return;
    }

    // Supabase mode
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseEnabled) {
      // Demo mode: accept any credentials with minimal validation
      if (!email || !password || password.length < 6) {
        return { success: false, error: 'Invalid credentials. Password must be at least 6 characters.' };
      }
      const demoUser = makeDemoUser(email);
      saveDemoSession(demoUser);
      setUser(demoUser);
      userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      toast.success('Signed in (demo mode)');
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
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

  // -------------------------------------------------------------------------
  // signUp
  // -------------------------------------------------------------------------
  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    if (!supabaseEnabled) {
      // Demo mode: create account immediately
      if (!email || !password || password.length < 6) {
        return { success: false, error: 'Invalid details. Password must be at least 6 characters.' };
      }
      const demoUser = makeDemoUser(email);
      if (name) (demoUser.user_metadata as Record<string, unknown>).name = name;
      saveDemoSession(demoUser);
      setUser(demoUser);
      userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      toast.success('Account created (demo mode)');
      return { success: true, needsVerification: false };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || 'User' } },
      });
      if (error) return { success: false, error: error.message };
      if (data.user) {
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

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------
  const signOut = async () => {
    if (!supabaseEnabled) {
      clearDemoSession();
      setUser(null);
      setSession(null);
      toast.success('Signed out successfully');
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  // -------------------------------------------------------------------------
  // resendVerificationEmail
  // -------------------------------------------------------------------------
  const resendVerificationEmail = async (
    _email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseEnabled) return { success: true };
    return {
      success: false,
      error: 'Please use the sign-up form again or contact support to resend your verification email.',
    };
  };

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------
  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseEnabled) {
      toast.info('Password reset is only available when Supabase is configured.');
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) return { success: false, error: error.message };
      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: 'Password reset failed. Please try again.' };
    }
  };

  // -------------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------------
  const updateProfile = async (updates: Record<string, unknown>): Promise<boolean> => {
    if (!supabaseEnabled) {
      if (user) {
        const updated = { ...user, user_metadata: { ...user.user_metadata, ...updates } };
        setUser(updated);
        saveDemoSession(updated);
        toast.success('Profile updated');
      }
      return true;
    }
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
