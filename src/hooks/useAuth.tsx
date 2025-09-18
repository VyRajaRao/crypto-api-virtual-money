import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { userPreferencesManager } from '@/utils/statePersistence';


interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo] = useState(false); // Always false now


  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Always accept any credentials and create a valid user session
    try {
      console.log('🔐 Creating user session for:', email);
      
      // Create a local user session for any email/password combination
      const user = {
        id: `user_${email.replace(/[@.]/g, '_')}_${Date.now()}`,
        email: email,
        email_confirmed_at: new Date().toISOString(), // Always confirmed
        created_at: new Date().toISOString(),
        user_metadata: { 
          email_verified: true,
          bypass_session: false,
          signup_time: new Date().toISOString()
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      } as any;
      
      // Set the user session
      setUser(user);
      
      // Store session locally for persistence
      localStorage.setItem('cryptotracker_user_session', JSON.stringify({
        user: user,
        timestamp: Date.now()
      }));
      
      toast.success('Successfully signed in!');
      
      // Initialize user preferences
      userPreferencesManager.updatePreferences({
        theme: 'dark',
        currency: 'usd'
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };
  
  // Add method to restore user sessions on page load
  const restoreUserSession = () => {
    try {
      const stored = localStorage.getItem('cryptotracker_user_session');
      if (stored) {
        const { user, timestamp } = JSON.parse(stored);
        // Check if session is less than 30 days old
        if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
          setUser(user);
          return true;
        } else {
          // Clean up expired session
          localStorage.removeItem('cryptotracker_user_session');
        }
      }
    } catch (error) {
      console.warn('Could not restore user session:', error);
      localStorage.removeItem('cryptotracker_user_session');
    }
    return false;
  };
  
  // Initialize authentication with local session storage
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 Initializing local authentication');
      
      try {
        // Check for existing user session
        const hasUserSession = restoreUserSession();
        
        if (!hasUserSession) {
          console.log('No existing user session found');
          setUser(null);
        } else {
          console.log('User session restored successfully');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setLoading(false);
      }
    };

    initAuth();
  }, []);


  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    // Always accept any credentials and create a valid user account
    try {
      console.log('🔐 Creating user account for:', email);
      
      // Create a local user account for any email/password combination
      const user = {
        id: `user_${email.replace(/[@.]/g, '_')}_${Date.now()}`,
        email: email,
        email_confirmed_at: new Date().toISOString(), // Always confirmed
        created_at: new Date().toISOString(),
        user_metadata: { 
          email_verified: true,
          bypass_session: false,
          signup_time: new Date().toISOString()
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      } as any;
      
      // Set the user session
      setUser(user);
      
      // Store session locally for persistence
      localStorage.setItem('cryptotracker_user_session', JSON.stringify({
        user: user,
        timestamp: Date.now()
      }));
      
      toast.success('Account created successfully!');
      
      // Initialize user preferences
      userPreferencesManager.updatePreferences({
        theme: 'dark',
        currency: 'usd'
      });
      
      return { success: true, needsVerification: false };
      
    } catch (error) {
      console.error('Account creation failed:', error);
      return { success: false, error: 'Account creation failed. Please try again.' };
    }
  };

  const signOut = async () => {
    // Clear local user session
    try {
      // Clear user session storage
      localStorage.removeItem('cryptotracker_user_session');
      
      // Clear user state
      setUser(null);
      setSession(null);
      
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    // Email verification not needed - always return success
    toast.info('Email verification is not required for this application.');
    return { success: true };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    // Password reset not needed - always return success
    toast.info('Password reset is not required for this application.');
    return { success: true };
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
