import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface User {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  strength: number;
  agility: number;
  stamina: number;
  vitality: number;
  total_quests_completed: number;
  total_workouts: number;
  current_streak: number;
  avatar_tier: string;
  getIdToken: () => Promise<string | null>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

// Cross-platform storage utilities
const StorageUtils = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage not available:', error);
        return null;
      }
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('SecureStore not available:', error);
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.warn('SecureStore not available:', error);
      }
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('SecureStore not available:', error);
      }
    }
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await StorageUtils.getItem('auth_token');
      if (token) {
        const userData = await fetchUserProfile(token);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          await StorageUtils.deleteItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await StorageUtils.deleteItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        try {
          const userData = await response.json();
          // Add getIdToken method to user object
          return {
            ...userData,
            getIdToken: async () => {
              return await StorageUtils.getItem('auth_token');
            }
          };
        } catch (jsonError) {
          console.error('Error parsing profile response:', jsonError);
          return null;
        }
      } else {
        // Handle error response
        try {
          const errorData = await response.json();
          console.error('Profile fetch failed:', errorData.detail || 'Failed to fetch profile');
        } catch (jsonError) {
          console.error('Profile fetch failed with status:', response.status);
        }
        return null;
      }
    } catch (error) {
      console.error('Profile fetch network error:', error);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        try {
          const { access_token } = await response.json();
          await StorageUtils.setItem('auth_token', access_token);
          
          const userData = await fetchUserProfile(access_token);
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            return true;
          }
        } catch (jsonError) {
          console.error('Error parsing login response:', jsonError);
          return false;
        }
      } else {
        // Handle error response properly
        try {
          const errorData = await response.json();
          console.error('Login failed:', errorData.detail || 'Invalid credentials');
        } catch (jsonError) {
          console.error('Login failed with status:', response.status);
        }
      }
      return false;
    } catch (error) {
      console.error('Login network error:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        try {
          const { access_token } = await response.json();
          await StorageUtils.setItem('auth_token', access_token);
          
          const userData = await fetchUserProfile(access_token);
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            return true;
          }
        } catch (jsonError) {
          console.error('Error parsing register response:', jsonError);
          return false;
        }
      } else {
        // Handle error response properly
        try {
          const errorData = await response.json();
          console.error('Registration failed:', errorData.detail || 'Registration failed');
        } catch (jsonError) {
          console.error('Registration failed with status:', response.status);
        }
      }
      return false;
    } catch (error) {
      console.error('Registration network error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await StorageUtils.deleteItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await StorageUtils.getItem('auth_token');
      if (token) {
        const userData = await fetchUserProfile(token);
        if (userData) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};