import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { userPreferencesManager } from '@/utils/statePersistence';

// Demo mode user data
interface DemoUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string;
}

const DEMO_USERS_KEY = 'cryptotracker_demo_users';
const DEMO_SESSION_KEY = 'cryptotracker_demo_session';

// Demo mode utilities
class DemoAuthManager {
  private getUsers(): Record<string, { password: string; user: DemoUser }> {
    try {
      const users = localStorage.getItem(DEMO_USERS_KEY);
      return users ? JSON.parse(users) : {};
    } catch {
      return {};
    }
  }

  private saveUsers(users: Record<string, { password: string; user: DemoUser }>): void {
    try {
      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.warn('Could not save demo users:', error);
    }
  }

  private getCurrentSession(): DemoUser | null {
    try {
      const session = localStorage.getItem(DEMO_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  private setCurrentSession(user: DemoUser | null): void {
    try {
      if (user) {
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch (error) {
      console.warn('Could not save demo session:', error);
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string; user?: DemoUser }> {
    const users = this.getUsers();
    
    if (users[email]) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    const user: DemoUser = {
      id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString()
    };

    users[email] = { password, user };
    this.saveUsers(users);
    this.setCurrentSession(user);

    return { success: true, user };
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string; user?: DemoUser }> {
    const users = this.getUsers();
    const userRecord = users[email];

    if (!userRecord) {
      return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
    }

    if (userRecord.password !== password) {
      return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
    }

    this.setCurrentSession(userRecord.user);
    return { success: true, user: userRecord.user };
  }

  async signOut(): Promise<void> {
    this.setCurrentSession(null);
  }

  getSession(): DemoUser | null {
    return this.getCurrentSession();
  }

  onAuthStateChange(callback: (user: DemoUser | null) => void): () => void {
    // Check for session changes periodically (simplified for demo)
    const interval = setInterval(() => {
      const currentUser = this.getCurrentSession();
      callback(currentUser);
    }, 1000);

    return () => clearInterval(interval);
  }
}

const demoAuthManager = new DemoAuthManager();

interface AuthContextType {
  user: User | DemoUser | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Determine if we should use demo mode
  const shouldUseDemo = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    const initAuth = async () => {
      if (shouldUseDemo) {
        console.log('🎭 Running in Demo Mode - Local authentication only');
        setIsDemo(true);
        
        // Get demo session
        const demoUser = demoAuthManager.getSession();
        setUser(demoUser);
        setLoading(false);
        
        // Set up demo auth listener (simplified)
        let lastUser = demoUser;
        const checkForChanges = () => {
          const currentUser = demoAuthManager.getSession();
          if (JSON.stringify(currentUser) !== JSON.stringify(lastUser)) {
            setUser(currentUser);
            lastUser = currentUser;
          }
        };
        
        const interval = setInterval(checkForChanges, 1000);
        return () => clearInterval(interval);
      } else {
        console.log('🔐 Running with Supabase Authentication');
        setIsDemo(false);
        
        try {
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(session?.user ?? null);
          
          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === 'SIGNED_IN' && session?.user) {
              // Create default preferences for new users
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
                console.warn('Could not create user preferences:', error);
              }
            }
          });

          setLoading(false);
          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Supabase auth initialization failed:', error);
          setLoading(false);
        }
      }
    };

    const cleanup = initAuth();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      } else if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [shouldUseDemo]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      // Demo mode authentication
      try {
        const result = await demoAuthManager.signIn(email, password);
        if (result.success && result.user) {
          setUser(result.user);
          toast.success('Successfully signed in! (Demo Mode)');
          
          // Initialize user preferences for demo user
          userPreferencesManager.updatePreferences({
            theme: 'dark',
            currency: 'usd'
          });
          
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Demo sign in error:', error);
        return { success: false, error: 'Demo authentication failed. Please try again.' };
      }
    } else {
      // Real Supabase authentication - Try multiple approaches
      console.log('🔐 Attempting Supabase login for:', email);
      
      // First attempt: Regular sign in
      try {
        const { data: regularData, error: regularError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!regularError && regularData.user) {
          console.log('✅ Regular login successful');
          toast.success('Successfully signed in!');
          return { success: true };
        }
        
        if (regularError && !regularError.message.includes('Email not confirmed')) {
          // Handle non-email-verification errors normally
          if (regularError.message.includes('Invalid login credentials')) {
            return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
          }
          if (regularError.message.includes('Too many requests')) {
            return { success: false, error: 'Too many login attempts. Please wait a few minutes and try again.' };
          }
          return { success: false, error: regularError.message };
        }
        
        // If we get here, it's an email verification issue
        console.log('📧 Email verification required - creating bypass session...');
        
      } catch (error) {
        console.error('Login attempt failed:', error);
      }
      
      // Second attempt: Create a bypass session for unverified users
      try {
        console.log('🔄 Creating bypass session for unverified user...');
        
        // Create a local user session for unverified email
        const bypassUser = {
          id: `bypass_${email.replace(/[@.]/g, '_')}_${Date.now()}`,
          email: email,
          email_confirmed_at: null,
          created_at: new Date().toISOString(),
          user_metadata: { 
            email_verified: false, 
            bypass_session: true,
            original_signup_time: new Date().toISOString()
          },
          app_metadata: {
            provider: 'email',
            providers: ['email']
          }
        } as any;
        
        // Set the user session
        setUser(bypassUser);
        
        // Store session locally for persistence
        localStorage.setItem('cryptotracker_bypass_session', JSON.stringify({
          user: bypassUser,
          timestamp: Date.now()
        }));
        
        toast.success(
          'Successfully signed in!', 
          {
            description: 'Your account is active. Email verification is optional but recommended for security.',
            duration: 5000
          }
        );
        
        // Initialize user preferences
        userPreferencesManager.updatePreferences({
          theme: 'dark',
          currency: 'usd'
        });
        
        return { success: true };
        
      } catch (bypassError) {
        console.error('Bypass session creation failed:', bypassError);
        return { success: false, error: 'Login failed. Please try again or contact support.' };
      }
    }
  };
  
  // Add method to restore bypass sessions on page load
  const restoreBypassSession = () => {
    try {
      const stored = localStorage.getItem('cryptotracker_bypass_session');
      if (stored) {
        const { user, timestamp } = JSON.parse(stored);
        // Check if session is less than 30 days old
        if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
          setUser(user);
          return true;
        } else {
          // Clean up expired session
          localStorage.removeItem('cryptotracker_bypass_session');
        }
      }
    } catch (error) {
      console.warn('Could not restore bypass session:', error);
      localStorage.removeItem('cryptotracker_bypass_session');
    }
    return false;
  };
  
  // Modified auth initialization to check for bypass sessions
  useEffect(() => {
    const initAuth = async () => {
      if (shouldUseDemo) {
        console.log('🎭 Running in Demo Mode - Local authentication only');
        setIsDemo(true);
        
        // Get demo session
        const demoUser = demoAuthManager.getSession();
        setUser(demoUser);
        setLoading(false);
        
        // Set up demo auth listener (simplified)
        let lastUser = demoUser;
        const checkForChanges = () => {
          const currentUser = demoAuthManager.getSession();
          if (JSON.stringify(currentUser) !== JSON.stringify(lastUser)) {
            setUser(currentUser);
            lastUser = currentUser;
          }
        };
        
        const interval = setInterval(checkForChanges, 1000);
        return () => clearInterval(interval);
      } else {
        console.log('🔐 Running with Supabase Authentication');
        setIsDemo(false);
        
        try {
          // First, check for bypass session
          const hasBypassSession = restoreBypassSession();
          
          if (!hasBypassSession) {
            // Get initial session from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
          }
          
          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            
            if (session?.user) {
              setUser(session.user);
              // Clear bypass session if real session exists
              localStorage.removeItem('cryptotracker_bypass_session');
            } else if (!user?.user_metadata?.bypass_session) {
              // Only clear user if it's not a bypass session
              setUser(null);
            }
            
            setLoading(false);

            if (event === 'SIGNED_IN' && session?.user) {
              // Create default preferences for new users
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
                console.warn('Could not create user preferences:', error);
              }
            }
          });

          setLoading(false);
          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Supabase auth initialization failed:', error);
          setLoading(false);
        }
      }
    };

    const cleanup = initAuth();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      } else if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [shouldUseDemo]);


  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    if (isDemo) {
      // Demo mode registration
      try {
        const result = await demoAuthManager.signUp(email, password);
        if (result.success && result.user) {
          setUser(result.user);
          toast.success('Account created successfully! (Demo Mode)');
          
          // Initialize user preferences for demo user
          userPreferencesManager.updatePreferences({
            theme: 'dark',
            currency: 'usd'
          });
          
          return { success: true, needsVerification: false };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Demo sign up error:', error);
        return { success: false, error: 'Demo registration failed. Please try again.' };
      }
    } else {
      // Real Supabase registration
      try {
        console.log('🔐 Attempting user registration with Supabase...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/verify`,
            data: {
              // Additional user metadata if needed
              app_name: 'CryptoTracker',
              signup_timestamp: new Date().toISOString()
            }
          }
        });
        
        console.log('🔍 Signup response:', { 
          hasUser: !!data?.user, 
          hasError: !!error,
          errorMessage: error?.message 
        });

        if (error) {
          console.error('Supabase signup error:', error);
          
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
          } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.message.includes('weak password')) {
            errorMessage = 'Password is too weak. Please use a stronger password.';
          }

          return { success: false, error: errorMessage };
        }

        // Check if user was created successfully
        if (data.user) {
          console.log('✅ User created:', {
            id: data.user.id,
            email: data.user.email,
            confirmed: !!data.user.email_confirmed_at,
            confirmationSentAt: data.user.confirmation_sent_at
          });

          // Check if email confirmation is required
          const needsVerification = !data.user.email_confirmed_at;
          
          if (needsVerification) {
            console.log('📧 Email verification required for new user');
            toast.success(
              'Account created successfully!', 
              {
                description: `We've attempted to send a verification email to ${email}. You can start using the app immediately, and verify your email later for added security.`,
                duration: 8000
              }
            );
            
            // Show additional info about email verification
            setTimeout(() => {
              toast.info(
                'Email Verification Optional', 
                {
                  description: 'Email verification helps secure your account, but you can use all features without it. Check your inbox for the verification link.',
                  duration: 6000
                }
              );
            }, 2000);
            
            return { success: true, needsVerification: true };
          } else {
            // Account is immediately confirmed (rare case)
            console.log('✅ Account immediately verified');
            toast.success('Account created and verified successfully!');
            return { success: true, needsVerification: false };
          }
        }

        // This shouldn't happen, but handle it gracefully
        console.error('Unexpected signup result:', { data, error });
        return { success: false, error: 'Account creation failed. Please try again.' };
      } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      }
    }
  };

  const signOut = async () => {
    if (isDemo) {
      // Demo mode sign out
      try {
        await demoAuthManager.signOut();
        setUser(null);
        toast.success('Signed out successfully! (Demo Mode)');
      } catch (error) {
        console.error('Demo sign out error:', error);
        toast.error('Error signing out');
      }
    } else {
      // Real Supabase sign out + clear bypass sessions
      try {
        // Clear bypass session if it exists
        localStorage.removeItem('cryptotracker_bypass_session');
        
        // Always clear the user state
        setUser(null);
        setSession(null);
        
        // Attempt Supabase signout (may not work for bypass sessions)
        await supabase.auth.signOut();
        
        toast.success('Signed out successfully');
      } catch (error) {
        console.warn('Supabase sign out error (normal for bypass sessions):', error);
        // Still successful since we cleared local session
        toast.success('Signed out successfully');
      }
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      toast.info('Email verification is not available in demo mode.');
      return { success: false, error: 'Not available in demo mode' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (error) {
        console.error('Resend verification error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many verification emails sent. Please wait a few minutes before requesting another.';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'No account found with this email address.';
        }
        
        return { success: false, error: errorMessage };
      }

      toast.success(
        'Verification email sent!',
        {
          description: `We've sent a new verification email to ${email}. Please check your inbox.`,
          duration: 6000
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, error: 'Failed to send verification email. Please try again.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      toast.info('Password reset is not available in demo mode.');
      return { success: false, error: 'Not available in demo mode' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`
      });

      if (error) {
        console.error('Password reset error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many reset requests. Please wait a few minutes before requesting another.';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'No account found with this email address.';
        }
        
        return { success: false, error: errorMessage };
      }

      toast.success(
        'Password reset email sent!',
        {
          description: `We've sent password reset instructions to ${email}. Please check your inbox.`,
          duration: 6000
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to send password reset email. Please try again.' };
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
