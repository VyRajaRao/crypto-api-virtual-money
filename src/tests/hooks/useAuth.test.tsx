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
    // Default: no session
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('should initialize with loading state then settle', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should throw when used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });

  it('should handle successful sign in', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser, access_token: 'tok' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      response = await result.current.signIn('test@example.com', 'password123');
    });

    expect(response.success).toBe(true);
    expect(response.error).toBeUndefined();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle sign in error', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { success: boolean; error?: string } = { success: true };
    await act(async () => {
      response = await result.current.signIn('test@example.com', 'wrongpassword');
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid credentials');
  });

  it('should handle successful sign up', async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { ...mockUser, email_confirmed_at: new Date().toISOString() },
        session: { user: mockUser, access_token: 'tok' },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { success: boolean; error?: string; needsVerification?: boolean } = { success: false };
    await act(async () => {
      response = await result.current.signUp('test@example.com', 'password123');
    });

    expect(response.success).toBe(true);
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', password: 'password123' })
    );
  });

  it('should handle sign up error', async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email already exists' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { success: boolean; error?: string } = { success: true };
    await act(async () => {
      response = await result.current.signUp('test@example.com', 'password123');
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Email already exists');
  });

  it('should handle sign out', async () => {
    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should update user profile', async () => {
    (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: { ...mockUser, user_metadata: { name: 'John Doe' } } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.updateProfile({ name: 'John Doe' });
    });

    expect(success).toBe(true);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { name: 'John Doe' },
    });
  });

  it('should handle profile update error', async () => {
    (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Update failed' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.updateProfile({ name: 'John Doe' });
    });

    expect(success).toBe(false);
  });

  it('should reset password', async () => {
    (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      response = await result.current.resetPassword('test@example.com');
    });

    expect(response.success).toBe(true);
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(Object)
    );
  });

  it('should restore session on mount', async () => {
    const mockSession = { user: mockUser, access_token: 'mock-token' };
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });

  it('should set up auth state change listener and clean up on unmount', () => {
    const mockUnsubscribe = jest.fn();
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
