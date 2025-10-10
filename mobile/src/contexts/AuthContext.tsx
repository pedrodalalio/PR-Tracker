import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserType = 'admin' | 'guest';

interface User {
  type: UserType;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (type: UserType, credentials?: { username: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

const AUTH_STORAGE_KEY = '@pr_tracker_auth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        setUser(authData);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (type: UserType, credentials?: { username: string; password: string }): Promise<boolean> => {
    try {
      setIsLoading(true);

      if (type === 'admin') {
        if (!credentials) {
          return false;
        }

        if (credentials.username !== ADMIN_CREDENTIALS.username ||
            credentials.password !== ADMIN_CREDENTIALS.password) {
          return false;
        }

        const userData: User = {
          type: 'admin',
          username: credentials.username,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        return true;
      } else if (type === 'guest') {
        const userData: User = {
          type: 'guest',
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout process');

      // Reset demo data if user was in guest mode
      if (user?.type === 'guest') {
        console.log('AuthContext: Resetting demo data for guest user');
        try {
          const { MockDataService } = await import('../services/mockDataService');
          const mockService = MockDataService.getInstance();
          await mockService.resetToDefaults();
          console.log('AuthContext: Demo data reset completed');
        } catch (error) {
          console.warn('AuthContext: Failed to reset demo data:', error);
        }
      }

      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('AuthContext: Removed auth data from storage');
      setUser(null);
      console.log('AuthContext: Set user to null');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.type === 'admin',
    isGuest: user?.type === 'guest',
  };

  return (
    <AuthContext.Provider value={value}>
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