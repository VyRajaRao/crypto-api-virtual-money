import React, { useState, useEffect, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { userPreferencesManager } from '@/utils/statePersistence';

// ---------------------------------------------------------------------------
// Local auth storage (used when Supabase is not configured)
// ---------------------------------------------------------------------------
const USERS_KEY = 'cryptotracker_users';
const SESSION_KEY = 'cryptotracker_user_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PBKDF2_ITERATIONS = 100_000;

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;  // hex-encoded PBKDF2 output
  passwordSalt: string;  // hex-encoded random salt
  name: string;
  createdAt: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from((hex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)));
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(hashBuffer));
}

async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; saltHex: string }> {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return { hash, saltHex: bytesToHex(salt) };
}

function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

function getStoredUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredUser>) : {};
  } catch {
    return {};
  }
}

function saveStoredUser(user: StoredUser): void {
  const users = getStoredUsers();
  users[user.id] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserByEmail(email: string): StoredUser | null {
  const users = getStoredUsers();
  return (
    Object.values(users).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

function updateStoredUser(id: string, updates: Partial<StoredUser>): void {
  const users = getStoredUsers();
  if (users[id]) {
    users[id] = { ...users[id], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

function saveSession(user: User): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ user, timestamp: Date.now() })
  );
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user, timestamp } = JSON.parse(raw) as {
      user: User;
      timestamp: number;
    };
    if (Date.now() - timestamp > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function makeUserFromStored(stored: StoredUser): User {
  return {
    id: stored.id,
    email: stored.email,
    email_confirmed_at: stored.createdAt,
    created_at: stored.createdAt,
    updated_at: stored.createdAt,
    user_metadata: { name: stored.name },
    app_metadata: { provider: 'email', providers: ['email'] },
    aud: 'authenticated',
    role: 'authenticated',
  } as User;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{
    success: boolean;
    error?: string;
    needsVerification?: boolean;
  }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Record<string, unknown>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // isDemo reflects whether Supabase is configured; local auth is fully
  // functional either way — no "demo" limitations.
  const isDemo = !supabaseEnabled;

  // -------------------------------------------------------------------------
  // Initialise auth state
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!supabaseEnabled) {
      // Local auth mode: restore session from localStorage
      const savedUser = loadSession();
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
      }
      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters.',
        };
      }
      const stored = findUserByEmail(email);
      if (!stored) {
        return {
          success: false,
          error: 'No account found with this email. Please sign up first.',
        };
      }
      const { hash } = await hashPassword(password, stored.passwordSalt);
      if (hash !== stored.passwordHash) {
        return { success: false, error: 'Invalid password.' };
      }
      const u = makeUserFromStored(stored);
      saveSession(u);
      setUser(u);
      userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      toast.success('Successfully signed in!');
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { success: false, error: error.message };
      if (data.user) {
        userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
        toast.success('Successfully signed in!');
        return { success: true };
      }
      return { success: false, error: 'Sign in failed. Please try again.' };
    } catch (err) {
      console.error('Login failed:', err);
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
  ): Promise<{
    success: boolean;
    error?: string;
    needsVerification?: boolean;
  }> => {
    if (!supabaseEnabled) {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
      }
      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters.',
        };
      }
      const existing = findUserByEmail(email);
      if (existing) {
        return {
          success: false,
          error: 'An account with this email already exists.',
        };
      }
      const { hash, saltHex } = await hashPassword(password);
      const id = generateId();
      const createdAt = new Date().toISOString();
      const stored: StoredUser = {
        id,
        email,
        passwordHash: hash,
        passwordSalt: saltHex,
        name: name || email.split('@')[0],
        createdAt,
      };
      saveStoredUser(stored);
      const u = makeUserFromStored(stored);
      saveSession(u);
      setUser(u);
      userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
      toast.success('Account created successfully!');
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
        const needsVerification =
          !data.user.email_confirmed_at && !data.session;
        if (needsVerification) {
          toast.success(
            'Account created! Please check your email to verify your account.'
          );
        } else {
          userPreferencesManager.updatePreferences({ theme: 'dark', currency: 'usd' });
          toast.success('Account created successfully!');
        }
        return { success: true, needsVerification };
      }
      return {
        success: false,
        error: 'Account creation failed. Please try again.',
      };
    } catch (err) {
      console.error('Account creation failed:', err);
      return {
        success: false,
        error: 'Account creation failed. Please try again.',
      };
    }
  };

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------
  const signOut = async () => {
    if (!supabaseEnabled) {
      clearSession();
      setUser(null);
      setSession(null);
      toast.success('Signed out successfully');
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (err) {
      console.error('Sign out error:', err);
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
      error:
        'Please use the sign-up form again or contact support to resend your verification email.',
    };
  };

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------
  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseEnabled) {
      // Always return a generic success to prevent email-enumeration attacks.
      toast.info(
        'If an account exists for this email, you will receive reset instructions. Please contact support for further assistance.'
      );
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) return { success: false, error: error.message };
      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (err) {
      console.error('Password reset failed:', err);
      return {
        success: false,
        error: 'Password reset failed. Please try again.',
      };
    }
  };

  // -------------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------------
  const updateProfile = async (
    updates: Record<string, unknown>
  ): Promise<boolean> => {
    if (!supabaseEnabled) {
      if (user) {
        const name =
          typeof updates.name === 'string' ? updates.name : undefined;
        if (name) updateStoredUser(user.id, { name });
        const updated: User = {
          ...user,
          user_metadata: { ...user.user_metadata, ...updates },
          updated_at: new Date().toISOString(),
        };
        setUser(updated);
        saveSession(updated);
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
    } catch (err) {
      console.error('Profile update failed:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
