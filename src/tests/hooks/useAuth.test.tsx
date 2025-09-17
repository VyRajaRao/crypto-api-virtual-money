import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { createMockUser } from '../setup';

// Mock the supabase client
jest.mock('@/lib/supabase');

describe('useAuth', () => {
  const mockUser = createMockUser();
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle successful sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signUp('test@example.com', 'password123');
      expect(success).toBe(true);
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle sign up error', async () => {
    const mockError = { message: 'Email already exists' };
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signUp('test@example.com', 'password123');
      expect(success).toBe(false);
    });
  });

  it('should handle successful sign in', async () => {
    const mockSession = { user: mockUser, access_token: 'mock-token' };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signIn('test@example.com', 'password123');
      expect(success).toBe(true);
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle sign in error', async () => {
    const mockError = { message: 'Invalid credentials' };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.signIn('test@example.com', 'wrongpassword');
      expect(success).toBe(false);
    });
  });

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should update user profile', async () => {
    const updates = { display_name: 'John Doe' };
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: { ...mockUser, user_metadata: updates } },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.updateProfile(updates);
      expect(success).toBe(true);
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: updates
    });
  });

  it('should handle profile update error', async () => {
    const mockError = { message: 'Update failed' };
    const updates = { display_name: 'John Doe' };
    
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: mockError
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.updateProfile(updates);
      expect(success).toBe(false);
    });
  });

  it('should reset password', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.resetPassword('test@example.com');
      expect(success).toBe(true);
    });

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should handle password reset error', async () => {
    const mockError = { message: 'Email not found' };
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: mockError
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.resetPassword('nonexistent@example.com');
      expect(success).toBe(false);
    });
  });

  it('should initialize session on mount', async () => {
    const mockSession = { user: mockUser, access_token: 'mock-token' };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });

  it('should set up auth state change listener', () => {
    const mockUnsubscribe = jest.fn();
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    });

    const { unmount } = renderHook(() => useAuth());

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
