import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  username: string;
  isAdmin: boolean;
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

  const logout = async () => {
    try {
      if (authState.token) {
        await apiRequest('POST', '/api/logout', {}, {
          'Authorization': `Bearer ${authState.token}`
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('chat_token');
      localStorage.removeItem('chat_user');
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  return {
    ...authState,
    login,
    logout,
  };
}
