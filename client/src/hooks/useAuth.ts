import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  id: number;
  username: string;
  password: string;
  isAdmin: boolean;
  isOnline: boolean;
  lastSeen: Date | null;
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('chat_token');
    const user = localStorage.getItem('chat_user');
    
    if (token && user) {
      setAuthState({
        user: JSON.parse(user),
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiRequest('POST', '/api/login', { username, password });
      const data = await response.json();

      localStorage.setItem('chat_token', data.token);
      localStorage.setItem('chat_user', JSON.stringify(data.user));

      setAuthState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const logout = useCallback(async () => {
    if (authState.token) {
      try {
        await apiRequest('POST', '/api/logout', undefined, { 'Authorization': `Bearer ${authState.token}` });
      } catch (error) {
        console.error("Logout API call failed:", error);
        // Still proceed with client-side logout
      }
    }
    setAuthState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    }));
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    queryClient.clear(); // Clear react-query cache
    console.log("User logged out, redirecting to /login with a full page reload.");
    window.location.replace('/login'); // Redirect to login page
  }, [authState.token, queryClient]);

  return {
    ...authState,
    login,
    logout,
  };
}
