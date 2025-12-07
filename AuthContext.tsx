import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, SignUpData, LoginData } from './types';

interface AuthContextType {
  authState: AuthState;
  signUp: (data: SignUpData) => Promise<boolean>;
  login: (data: LoginData) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google OAuth configuration
declare global {
  interface Window {
    google?: any;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
    loadGoogleScript();
  }, []);

  const loadGoogleScript = () => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Initialize Google Sign-In
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleCallback,
          auto_select: false,
        });
      }
    };
  };

  const handleGoogleCallback = async (response: any) => {
    try {
      // Decode the JWT token from Google
      const credential = response.credential;
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const googleUser = JSON.parse(jsonPayload);

      // Check if user exists
      const existingUsers: User[] = JSON.parse(localStorage.getItem('all_users') || '[]');
      let user = existingUsers.find(u => u.googleId === googleUser.sub || u.email === googleUser.email);

      if (user) {
        // Existing user - log them in
        user.lastLogin = new Date().toISOString();
        const updatedUsers = existingUsers.map(u => u.id === user!.id ? user! : u);
        localStorage.setItem('all_users', JSON.stringify(updatedUsers));
      } else {
        // New user - create account
        user = {
          id: generateUserId(),
          email: googleUser.email,
          businessName: googleUser.name + "'s Business", // Default, they can change later
          ownerName: googleUser.name,
          phone: '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          authProvider: 'google',
          googleId: googleUser.sub,
          photoURL: googleUser.picture,
        };

        const allUsers = [...existingUsers, user];
        localStorage.setItem('all_users', JSON.stringify(allUsers));
      }

      // Generate auth token
      const token = generateAuthToken(user);

      // Save auth state
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('remember_me', 'true');

      // Update state
      setAuthState({
        isAuthenticated: true,
        user,
        token,
      });
    } catch (error) {
      console.error('Google sign-in failed:', error);
      alert('Google sign-in failed. Please try again.');
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);

        // Update last login time
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('user', JSON.stringify(user));

        setAuthState({
          isAuthenticated: true,
          user,
          token,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: SignUpData): Promise<boolean> => {
    try {
      // Validate email format
      if (!isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const existingUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      if (existingUsers.some((u: User) => u.email === data.email)) {
        throw new Error('Email already registered');
      }

      // Create user
      const user: User = {
        id: generateUserId(),
        email: data.email,
        businessName: data.businessName,
        ownerName: data.ownerName,
        phone: data.phone,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        authProvider: 'email',
      };

      // Hash password (simple client-side for now)
      const hashedPassword = await hashPassword(data.password);

      // Save user credentials
      const allUsers = [...existingUsers, user];
      localStorage.setItem('all_users', JSON.stringify(allUsers));

      // Save password separately (in production, this would be backend)
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      credentials[user.email] = hashedPassword;
      localStorage.setItem('credentials', JSON.stringify(credentials));

      // Generate auth token
      const token = generateAuthToken(user);

      // Save auth state
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('remember_me', 'true');

      // Update state
      setAuthState({
        isAuthenticated: true,
        user,
        token,
      });

      return true;
    } catch (error) {
      console.error('Sign up failed:', error);
      alert(error instanceof Error ? error.message : 'Sign up failed');
      return false;
    }
  };

  const login = async (data: LoginData): Promise<boolean> => {
    try {
      // Get stored credentials
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      const allUsers: User[] = JSON.parse(localStorage.getItem('all_users') || '[]');

      // Find user
      const user = allUsers.find(u => u.email === data.email);
      if (!user) {
        throw new Error('Account not found. Please sign up first.');
      }

      // Check if user signed up with Google
      if (user.authProvider === 'google') {
        throw new Error('This account uses Google Sign-In. Please use the "Sign in with Google" button.');
      }

      // Verify password
      const hashedPassword = await hashPassword(data.password);
      if (credentials[data.email] !== hashedPassword) {
        throw new Error('Incorrect password');
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      const updatedUsers = allUsers.map(u => u.id === user.id ? user : u);
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));

      // Generate auth token
      const token = generateAuthToken(user);

      // Save auth state
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('remember_me', data.rememberMe ? 'true' : 'false');

      // Update state
      setAuthState({
        isAuthenticated: true,
        user,
        token,
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      alert(error instanceof Error ? error.message : 'Login failed');
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      if (window.google) {
        window.google.accounts.id.prompt();
        return true;
      } else {
        throw new Error('Google Sign-In not loaded yet. Please try again in a moment.');
      }
    } catch (error) {
      console.error('Google login failed:', error);
      alert(error instanceof Error ? error.message : 'Google login failed');
      return false;
    }
  };

  const logout = () => {
    // Clear auth state (but keep user data for recovery)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!authState.user) return false;

      const updatedUser = { ...authState.user, ...updates };
      const allUsers: User[] = JSON.parse(localStorage.getItem('all_users') || '[]');
      const newAllUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);

      localStorage.setItem('all_users', JSON.stringify(newAllUsers));
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ authState, signUp, login, loginWithGoogle, logout, isLoading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function hashPassword(password: string): Promise<string> {
  // Simple client-side hashing (in production, use backend)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'orderprep_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function generateAuthToken(user: User): string {
  // Simple JWT-like token (in production, use real JWT from backend)
  const payload = {
    userId: user.id,
    email: user.email,
    iat: Date.now(),
  };
  return btoa(JSON.stringify(payload));
}
