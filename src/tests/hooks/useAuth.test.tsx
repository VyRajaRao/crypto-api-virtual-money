import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { createMockUser } from '../setup';

// supabase is mocked in setup.ts via jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('should throw when used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });

  it('should initialise with loading state then settle', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  // In the Jest environment supabaseEnabled === false, so the hook runs
  // in local-auth mode (real credential-based auth using localStorage).
  describe('Local auth mode (no Supabase credentials — default in tests)', () => {
    it('should expose isDemo = true when Supabase is not configured', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isDemo).toBe(true);
    });

    it('should reject sign-in when the user has not registered', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signIn('unknown@example.com', 'password123');
      });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/no account/i);
    });

    it('should reject sign-in when password is shorter than 6 characters', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'abc');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('should reject sign-in with empty email', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signIn('', 'password123');
      });

      expect(response.success).toBe(false);
    });

    it('should sign up a new user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string; needsVerification?: boolean } = { success: false };
      await act(async () => {
        response = await result.current.signUp('new@example.com', 'password123', 'Alice');
      });

      expect(response.success).toBe(true);
      expect(response.needsVerification).toBe(false);
      expect(result.current.user?.email).toBe('new@example.com');
    });

    it('should reject sign-up with password shorter than 6 characters', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signUp('new@example.com', 'abc');
      });

      expect(response.success).toBe(false);
    });

    it('should reject duplicate sign-up for the same email', async () => {
      // Mock getItem to return an existing user registry
      const existingUsers = {
        'abc123': {
          id: 'abc123',
          email: 'existing@example.com',
          passwordHash: 'fakehash',
          name: 'Existing',
          createdAt: new Date().toISOString(),
        },
      };
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        if (key === 'cryptotracker_users') return JSON.stringify(existingUsers);
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signUp('existing@example.com', 'password123');
      });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/already exists/i);
      jest.spyOn(Storage.prototype, 'getItem').mockRestore();
    });

    it('should sign in successfully after sign-up', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Sign up first
      await act(async () => {
        await result.current.signUp('user@example.com', 'mypassword', 'User');
      });
      expect(result.current.user?.email).toBe('user@example.com');

      // Sign out
      await act(async () => {
        await result.current.signOut();
      });
      expect(result.current.user).toBeNull();

      // Sign in with the same credentials
      let response: { success: boolean; error?: string } = { success: false };
      await act(async () => {
        response = await result.current.signIn('user@example.com', 'mypassword');
      });
      expect(response.success).toBe(true);
      expect(result.current.user?.email).toBe('user@example.com');
    });

    it('should reject sign-in with wrong password', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('user2@example.com', 'correctpassword');
      });
      await act(async () => {
        await result.current.signOut();
      });

      let response: { success: boolean; error?: string } = { success: true };
      await act(async () => {
        response = await result.current.signIn('user2@example.com', 'wrongpassword');
      });
      expect(response.success).toBe(false);
      expect(response.error).toMatch(/invalid password/i);
    });

    it('should sign out and clear user state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });
      expect(result.current.user).not.toBeNull();

      await act(async () => {
        await result.current.signOut();
      });
      expect(result.current.user).toBeNull();
    });

    it('should update user profile', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });

      let ok = false;
      await act(async () => {
        ok = await result.current.updateProfile({ name: 'Alice' });
      });

      expect(ok).toBe(true);
    });

    it('should not call Supabase signInWithPassword when in local auth mode', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should restore a saved session on mount', async () => {
      const savedUser = { ...mockUser, email: 'saved@example.com' };
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        if (key === 'cryptotracker_user_session') {
          return JSON.stringify({ user: savedUser, timestamp: Date.now() });
        }
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user?.email).toBe('saved@example.com');
      spy.mockRestore();
    });

    it('should discard an expired session on mount', async () => {
      const savedUser = { ...mockUser };
      const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        if (key === 'cryptotracker_user_session') {
          return JSON.stringify({ user: savedUser, timestamp: expiredTimestamp });
        }
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user).toBeNull();
      spy.mockRestore();
    });
  });
});
