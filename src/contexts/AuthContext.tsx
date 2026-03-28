import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiUrl, getNetworkErrorMessage, parseJsonResponse } from '../lib/api';
import {
  clearSocialProviderSession,
  restoreSocialProviderSession,
  signInWithSocialProvider
} from '../lib/firebaseAuth';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

interface BootstrapStatus {
  requiresAdminSetup: boolean;
  adminCount: number;
  userCount: number;
}

type AuthResult = {
  success: boolean;
  message: string;
  user?: User;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  bootstrapStatus: BootstrapStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  socialLogin: (provider: "google" | "facebook") => Promise<AuthResult>;
  bootstrapAdmin: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthResult>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthResult>;
  logout: () => void;
  refreshBootstrapStatus: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

const loadStoredUser = (): User | null => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE = apiUrl('/api/auth');

  const persistSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const refreshBootstrapStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/bootstrap-status`);
      const data = await parseJsonResponse<{ data?: BootstrapStatus }>(response);

      if (response.ok && data?.data) {
        setBootstrapStatus(data.data);
      }
    } catch (error) {
      console.error('Bootstrap status check failed:', error);
    }
  };

  const restoreSocialSession = async () => {
    try {
      const socialSession = await restoreSocialProviderSession();
      if (!socialSession) {
        return false;
      }

      const response = await fetch(`${API_BASE}/social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: socialSession.provider,
          idToken: socialSession.idToken
        })
      });

      const data = await parseJsonResponse<{ success?: boolean; data?: { user: User; token: string } }>(response);

      if (response.ok && data?.success && data.data?.user && data.data?.token) {
        persistSession(data.data.user, data.data.token);
        void refreshBootstrapStatus();
        return true;
      }

      if (response.status === 401 || response.status === 403) {
        await clearSocialProviderSession();
      }
    } catch (error) {
      console.error('Social session restore failed:', error);
    }

    return false;
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await parseJsonResponse<{ data?: User }>(response);
            if (data?.data) {
              setUser(data.data);
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data));
              setIsLoading(false);
              return;
            }
          } else if (response.status === 401 || response.status === 403) {
            clearSession();
            const restored = await restoreSocialSession();
            if (restored) {
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      } else {
        const restored = await restoreSocialSession();
        if (!restored && user) {
          clearSession();
        }
      }

      setIsLoading(false);
    };

    void checkAuth();
  }, [token]);

  useEffect(() => {
    void refreshBootstrapStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await parseJsonResponse<{ success?: boolean; data?: { user: User; token: string }; error?: string }>(response);

      if (response.ok && data?.success && data.data?.user && data.data?.token) {
        persistSession(data.data.user, data.data.token);
        void refreshBootstrapStatus();
        return { success: true, message: 'Login successful', user: data.data.user };
      } else {
        return { success: false, message: data?.error || `Login failed (${response.status})` };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const socialLogin = async (provider: "google" | "facebook") => {
    try {
      const socialSession = await signInWithSocialProvider(provider);
      const response = await fetch(`${API_BASE}/social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          idToken: socialSession.idToken
        })
      });

      const data = await parseJsonResponse<{ success?: boolean; data?: { user: User; token: string }; error?: string }>(response);

      if (response.ok && data?.success && data.data?.user && data.data?.token) {
        persistSession(data.data.user, data.data.token);
        void refreshBootstrapStatus();
        return {
          success: true,
          message: `${provider === "google" ? "Google" : "Facebook"} login successful`,
          user: data.data.user
        };
      }

      return {
        success: false,
        message: data?.error || `${provider === "google" ? "Google" : "Facebook"} login failed`
      };
    } catch (error) {
      console.error(`${provider} login error:`, error);
      return {
        success: false,
        message: getNetworkErrorMessage(
          error,
          `${provider === "google" ? "Google" : "Facebook"} login failed. Please try again.`
        )
      };
    }
  };

  const bootstrapAdmin = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch(`${API_BASE}/bootstrap-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      const data = await parseJsonResponse<{ success?: boolean; data?: { user: User; token: string }; error?: string }>(
        response
      );

      if (response.ok && data?.success && data.data?.user && data.data?.token) {
        persistSession(data.data.user, data.data.token);
        void refreshBootstrapStatus();
        return { success: true, message: 'Admin account created successfully', user: data.data.user };
      }

      return { success: false, message: data?.error || `Admin setup failed (${response.status})` };
    } catch (error) {
      console.error('Admin bootstrap error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      const data = await parseJsonResponse<{ success?: boolean; data?: { user: User; token: string }; error?: string }>(response);

      if (response.ok && data?.success && data.data?.user && data.data?.token) {
        persistSession(data.data.user, data.data.token);
        void refreshBootstrapStatus();
        return { success: true, message: 'Registration successful', user: data.data.user };
      } else {
        return { success: false, message: data?.error || `Registration failed (${response.status})` };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearSocialProviderSession();
      clearSession();
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.data));
        return { success: true, message: 'Profile updated successfully' };
      } else {
        return { success: false, message: result.error || 'Update failed' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'Password changed successfully' };
      } else {
        return { success: false, message: data.error || 'Password change failed' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'Password reset email sent' };
      } else {
        return { success: false, message: data.error || 'Failed to send reset email' };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: resetToken, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'Password reset successful' };
      } else {
        return { success: false, message: data.error || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verificationToken })
      });

      const data = await response.json();

      if (data.success) {
        // Update user verification status
        if (user) {
          setUser({ ...user, isVerified: true });
        }
        return { success: true, message: 'Email verified successfully' };
      } else {
        return { success: false, message: data.error || 'Email verification failed' };
      }
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: getNetworkErrorMessage(error, 'Network error. Please try again.') };
    }
  };

  const resendVerification = async () => {
    try {
      const response = await fetch(`${API_BASE}/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'Verification email sent' };
      } else {
        return { success: false, message: data.error || 'Failed to send verification email' };
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const value = {
    user,
    token,
    bootstrapStatus,
    isAuthenticated: !!user,
    isLoading,
    login,
    socialLogin,
    bootstrapAdmin,
    register,
    logout,
    refreshBootstrapStatus,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification
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
