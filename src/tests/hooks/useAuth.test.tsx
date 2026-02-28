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

  // In the Jest environment there are no VITE_* env vars, so SUPABASE_CONFIGURED
  // is always false — i.e. the hook runs in demo/local mode.
  describe('Demo mode (no Supabase credentials — default in tests)', () => {
    it('should expose isDemo = true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isDemo).toBe(true);
    });

    it('should sign in with any valid email and password', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: false };
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'password123');
      });

      expect(response.success).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('test@example.com');
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

    it('should sign out and clear user state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });
      expect(result.current.user).not.toBeNull();

      // Sign out
      await act(async () => {
        await result.current.signOut();
      });
      expect(result.current.user).toBeNull();
    });

    it('should update user profile', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      let ok = false;
      await act(async () => {
        ok = await result.current.updateProfile({ name: 'Alice' });
      });

      expect(ok).toBe(true);
    });

    it('should return success from resetPassword (info-only in demo mode)', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let response: { success: boolean; error?: string } = { success: false };
      await act(async () => {
        response = await result.current.resetPassword('test@example.com');
      });
      expect(response.success).toBe(true);
    });

    it('should not call Supabase signInWithPassword in demo mode', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should restore a saved demo session on mount', async () => {
      const savedUser = { ...mockUser, email: 'saved@example.com' };
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(
        JSON.stringify({ user: savedUser, timestamp: Date.now() })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user?.email).toBe('saved@example.com');
      spy.mockRestore();
    });

    it('should discard an expired demo session on mount', async () => {
      const savedUser = { ...mockUser };
      const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(
        JSON.stringify({ user: savedUser, timestamp: expiredTimestamp })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user).toBeNull();
      spy.mockRestore();
    });
  });
});
