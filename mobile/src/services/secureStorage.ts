import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'pr_tracker_access_token';
const REFRESH_TOKEN_KEY = 'pr_tracker_refresh_token';
const AUTH_DATA_KEY = 'pr_tracker_auth_data';

export interface StoredAuthData {
  type: 'admin' | 'guest';
  id?: string;
  username?: string;
  email?: string;
}

class SecureStorageService {
  private async isKeychainAvailable(): Promise<boolean> {
    try {
      // Test if keychain is working
      await Keychain.getSupportedBiometryType();
      return true;
    } catch (error) {
      console.warn('Keychain not available, falling back to AsyncStorage');
      return false;
    }
  }

  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        await Promise.all([
          Keychain.setInternetCredentials(ACCESS_TOKEN_KEY, ACCESS_TOKEN_KEY, accessToken),
          Keychain.setInternetCredentials(REFRESH_TOKEN_KEY, REFRESH_TOKEN_KEY, refreshToken),
        ]);
      } else {
        // Fallback to AsyncStorage
        await Promise.all([
          AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
          AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        ]);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      // Try AsyncStorage as last resort
      try {
        await Promise.all([
          AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
          AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        ]);
      } catch (fallbackError) {
        throw new Error('Failed to store authentication tokens');
      }
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        const credentials = await Keychain.getInternetCredentials(ACCESS_TOKEN_KEY);
        return credentials ? credentials.password : null;
      } else {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error retrieving access token:', error);
      // Try AsyncStorage as fallback
      try {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      } catch (fallbackError) {
        return null;
      }
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        const credentials = await Keychain.getInternetCredentials(REFRESH_TOKEN_KEY);
        return credentials ? credentials.password : null;
      } else {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      // Try AsyncStorage as fallback
      try {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      } catch (fallbackError) {
        return null;
      }
    }
  }

  async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
      ]);

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }

      return null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        await Promise.all([
          Keychain.resetInternetCredentials(ACCESS_TOKEN_KEY),
          Keychain.resetInternetCredentials(REFRESH_TOKEN_KEY),
        ]);
      }

      // Always clear AsyncStorage as well (fallback)
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async storeAuthData(authData: StoredAuthData): Promise<void> {
    try {
      const jsonData = JSON.stringify(authData);
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        await Keychain.setInternetCredentials(AUTH_DATA_KEY, AUTH_DATA_KEY, jsonData);
      } else {
        await AsyncStorage.setItem(AUTH_DATA_KEY, jsonData);
      }
    } catch (error) {
      console.error('Error storing auth data:', error);
      // Try AsyncStorage as fallback
      try {
        await AsyncStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));
      } catch (fallbackError) {
        throw new Error('Failed to store authentication data');
      }
    }
  }

  async getAuthData(): Promise<StoredAuthData | null> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        const credentials = await Keychain.getInternetCredentials(AUTH_DATA_KEY);
        if (credentials) {
          return JSON.parse(credentials.password);
        }
      } else {
        const data = await AsyncStorage.getItem(AUTH_DATA_KEY);
        if (data) {
          return JSON.parse(data);
        }
      }
      return null;
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      // Try AsyncStorage as fallback
      try {
        const data = await AsyncStorage.getItem(AUTH_DATA_KEY);
        return data ? JSON.parse(data) : null;
      } catch (fallbackError) {
        return null;
      }
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      const useKeychain = await this.isKeychainAvailable();

      if (useKeychain) {
        await Keychain.resetInternetCredentials(AUTH_DATA_KEY);
      }

      // Always clear AsyncStorage as well (fallback)
      await AsyncStorage.removeItem(AUTH_DATA_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.clearTokens(),
      this.clearAuthData(),
    ]);
  }

  async hasBiometricSupport(): Promise<boolean> {
    try {
      const useKeychain = await this.isKeychainAvailable();
      if (!useKeychain) return false;

      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  async getBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      const useKeychain = await this.isKeychainAvailable();
      if (!useKeychain) return null;

      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      console.error('Error getting biometry type:', error);
      return null;
    }
  }
}

export const secureStorage = new SecureStorageService();