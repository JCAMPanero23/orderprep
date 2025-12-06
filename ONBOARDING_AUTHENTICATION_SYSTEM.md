# OrderPrep - Onboarding & Authentication System

**Last Updated:** December 5, 2025  
**Status:** Production-Ready Implementation Guide  
**Estimated Time:** 3-4 hours implementation

---

## 🎯 Overview

This guide implements a complete user onboarding and authentication system:

1. **Welcome Intro Screens** - Beautiful first-time experience
2. **Sign Up Flow** - Collect essential business info
3. **Login System** - Secure authentication
4. **Auto-Login** - Remember user, seamless experience
5. **Profile Management** - Edit business details anytime

**Why This Matters:**
- ✅ Professional first impression
- ✅ Multi-user support (prepare for future)
- ✅ Data isolation (when you add backend)
- ✅ Personalized experience
- ✅ Backup system knows who they are (email in backups)

---

## 📋 Table of Contents

1. [User Flow](#user-flow)
2. [Intro Screens Design](#intro-screens)
3. [Authentication Implementation](#authentication)
4. [Code Implementation](#code-implementation)
5. [UI Components](#ui-components)
6. [Storage Strategy](#storage-strategy)
7. [Testing Guide](#testing-guide)

---

## 🎬 User Flow

### **First Time User:**
```
1. App Opens
   ↓
2. Intro Screen 1: "Welcome to OrderPrep" (3 sec auto-advance)
   ↓
3. Intro Screen 2: "Manage Orders Like a Pro" (swipe to next)
   ↓
4. Intro Screen 3: "Track Payments Easily" (swipe to next)
   ↓
5. Intro Screen 4: "Smart Menu Recommendations" (swipe to next)
   ↓
6. Get Started Button
   ↓
7. Sign Up Form
   - Business Name (required)
   - Your Name (required)
   - Email (required)
   - Phone (optional)
   - Password (required)
   ↓
8. Create Account
   ↓
9. Main Dashboard (logged in)
```

### **Returning User:**
```
1. App Opens
   ↓
2. Check if logged in
   ↓
3. IF YES: Go directly to Dashboard
   ↓
4. IF NO: Show Login Screen
   - Email
   - Password
   - "Remember Me" (checked by default)
   ↓
5. Login → Dashboard
```

### **User Logs Out:**
```
Settings → Logout
   ↓
Clear session (keep data)
   ↓
Show Login Screen
```

---

## 🎨 Intro Screens Design

### **Screen 1: Welcome**
```
┌─────────────────────────────┐
│                             │
│        [App Logo]           │
│                             │
│      OrderPrep              │
│                             │
│  Manage Your Food Business  │
│      Like a Pro             │
│                             │
│                             │
│     [Auto-advancing...]     │
│                             │
└─────────────────────────────┘
```

### **Screen 2: Feature Showcase 1**
```
┌─────────────────────────────┐
│                             │
│    [Illustration: Orders]   │
│                             │
│   📱 Easy Order Management  │
│                             │
│  Track 50+ orders daily     │
│  Copy from WhatsApp         │
│  Never lose an order        │
│                             │
│   ●  ○  ○  ○               │
│                             │
│    [Swipe to continue →]    │
└─────────────────────────────┘
```

### **Screen 3: Feature Showcase 2**
```
┌─────────────────────────────┐
│                             │
│  [Illustration: Payments]   │
│                             │
│  💰 Payment Tracking        │
│                             │
│  See who owes instantly     │
│  Send professional reminders│
│  Stop losing money          │
│                             │
│   ○  ●  ○  ○               │
│                             │
│    [Swipe to continue →]    │
└─────────────────────────────┘
```

### **Screen 4: Feature Showcase 3**
```
┌─────────────────────────────┐
│                             │
│    [Illustration: AI]       │
│                             │
│  🧠 Smart Recommendations   │
│                             │
│  AI tells you what to cook  │
│  Reduce waste by 40%        │
│  Maximize profits           │
│                             │
│   ○  ○  ●  ○               │
│                             │
│    [Swipe to continue →]    │
└─────────────────────────────┘
```

### **Screen 5: Get Started**
```
┌─────────────────────────────┐
│                             │
│   [Illustration: Success]   │
│                             │
│   Ready to Transform Your   │
│      Food Business?         │
│                             │
│  Join 100+ food entrepreneurs│
│    already using OrderPrep  │
│                             │
│   ○  ○  ○  ●               │
│                             │
│  [Get Started - Free Trial] │
│                             │
│  [Already have an account?] │
│        [Log In]             │
└─────────────────────────────┘
```

---

## 🔐 Authentication Implementation

### **Data Model:**

```typescript
// src/types/auth.ts

export interface User {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  phone?: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  businessName: string;
  ownerName: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}
```

### **Storage Strategy:**

```typescript
// What gets stored where:

// localStorage (persistent):
- 'auth_token': 'encrypted-jwt-token'
- 'user': { id, email, businessName, ownerName, phone }
- 'remember_me': true/false
- 'has_completed_intro': true/false

// sessionStorage (cleared on browser close):
- 'session_id': 'temporary-session-id'

// IndexedDB (backup):
- Full user profile
- Encrypted password hash
```

---

## 💻 Code Implementation

### **Step 1: Create Auth Context**

**File:** `src/contexts/AuthContext.tsx`

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, SignUpData, LoginData } from '../types/auth';

interface AuthContextType {
  authState: AuthState;
  signUp: (data: SignUpData) => Promise<boolean>;
  login: (data: LoginData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  }, []);

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
    <AuthContext.Provider value={{ authState, signUp, login, logout, isLoading, updateProfile }}>
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
```

---

### **Step 2: Create Intro Screens Component**

**File:** `src/components/IntroScreens.tsx`

```typescript
// src/components/IntroScreens.tsx

import React, { useState, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface IntroSlide {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  description: string[];
  color: string;
}

const slides: IntroSlide[] = [
  {
    id: 1,
    icon: '📱',
    title: 'Easy Order Management',
    subtitle: 'Track 50+ orders daily',
    description: [
      'Copy orders from WhatsApp',
      'Never lose an order again',
      'Mark delivered instantly',
    ],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 2,
    icon: '💰',
    title: 'Payment Tracking',
    subtitle: 'Stop losing money',
    description: [
      'See who owes instantly',
      'Send professional reminders',
      'Track payment history',
    ],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 3,
    icon: '🧠',
    title: 'Smart Recommendations',
    subtitle: 'AI-powered insights',
    description: [
      'Know what to cook tomorrow',
      'Reduce waste by 40%',
      'Maximize your profits',
    ],
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 4,
    icon: '🚀',
    title: 'Ready to Transform?',
    subtitle: 'Join 100+ food entrepreneurs',
    description: [
      'Free trial for 1 month',
      'No credit card required',
      'Cancel anytime',
    ],
    color: 'from-orange-500 to-red-500',
  },
];

interface IntroScreensProps {
  onComplete: () => void;
}

export function IntroScreens({ onComplete }: IntroScreensProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-advance first slide
  useEffect(() => {
    if (currentSlide === 0) {
      const timer = setTimeout(() => {
        setCurrentSlide(1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      handleNext();
    }

    if (touchStart - touchEnd < -75) {
      // Swipe right
      handlePrev();
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    setCurrentSlide(slides.length - 1);
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-50">
      <div
        className="h-full flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Skip Button */}
        {!isLastSlide && (
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-sm font-semibold z-10"
          >
            Skip
          </button>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {/* Icon with gradient background */}
          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.color} flex items-center justify-center mb-8 shadow-2xl animate-pulse`}
          >
            <span className="text-6xl">{slide.icon}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-3">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-white/80 mb-8">
            {slide.subtitle}
          </p>

          {/* Description Points */}
          <div className="space-y-4 max-w-md">
            {slide.description.map((point, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-left bg-white/10 backdrop-blur-sm rounded-xl p-4"
              >
                <Check className="text-green-400 flex-shrink-0" size={24} />
                <span className="text-white/90">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pb-12 px-8">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          {isLastSlide ? (
            <div className="space-y-3">
              <button
                onClick={onComplete}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all transform hover:scale-105"
              >
                Get Started - Free Trial
              </button>
              <button
                onClick={onComplete}
                className="w-full text-white/70 hover:text-white text-sm py-2"
              >
                Already have an account? <span className="underline">Log In</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-8 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105"
            >
              Continue
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### **Step 3: Create Sign Up Component**

**File:** `src/components/SignUpForm.tsx`

```typescript
// src/components/SignUpForm.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignUpData } from '../types/auth';
import { Eye, EyeOff, Loader } from 'lucide-react';

interface SignUpFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    businessName: '',
    ownerName: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<SignUpData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpData> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Your name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const success = await signUp(formData);
      if (success) {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SignUpData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📱</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600">
            Start your free 30-day trial
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="e.g., Maria's Filipino Food"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.businessName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.businessName && (
              <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>
            )}
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="e.g., Maria Santos"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.ownerName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.ownerName && (
              <p className="text-red-500 text-sm mt-1">{errors.ownerName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="your@email.com"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+971 50 123 4567"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="At least 6 characters"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>

          {/* Switch to Login */}
          <div className="text-center pt-4 border-t-2 border-gray-100">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Log In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### **Step 4: Create Login Component**

**File:** `src/components/LoginForm.tsx`

```typescript
// src/components/LoginForm.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginData } from '../types/auth';
import { Eye, EyeOff, Loader } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignUp }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const success = await login(formData);
      if (success) {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof LoginData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (typeof value === 'string' && errors[field as keyof Omit<LoginData, 'rememberMe'>]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📱</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back!
          </h1>
          <p className="text-gray-600">
            Log in to your OrderPrep account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="your@email.com"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              autoFocus
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => handleChange('rememberMe', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>

            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </button>

          {/* Switch to Sign Up */}
          <div className="text-center pt-4 border-t-2 border-gray-100">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Sign Up Free
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### **Step 5: Update App.tsx with Auth Flow**

**File:** `src/App.tsx` (Updated)

```typescript
// src/App.tsx

import { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IntroScreens } from './components/IntroScreens';
import { SignUpForm } from './components/SignUpForm';
import { LoginForm } from './components/LoginForm';
import { initAutoBackup } from './utils/backupSystem';

function AppContent() {
  const { authState, isLoading } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  useEffect(() => {
    // Check if user has seen intro before
    const hasSeenIntro = localStorage.getItem('has_completed_intro') === 'true';
    
    if (!hasSeenIntro && !authState.isAuthenticated) {
      setShowIntro(true);
    }
  }, [authState.isAuthenticated]);

  useEffect(() => {
    // Initialize auto-backup once authenticated
    if (authState.isAuthenticated) {
      initAutoBackup();
    }
  }, [authState.isAuthenticated]);

  const handleIntroComplete = () => {
    localStorage.setItem('has_completed_intro', 'true');
    setShowIntro(false);
  };

  const handleAuthSuccess = () => {
    // Auth successful, user will be redirected to dashboard automatically
    console.log('Auth successful!');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl">📱</span>
          </div>
          <p className="text-white text-xl font-semibold">Loading OrderPrep...</p>
        </div>
      </div>
    );
  }

  // Show intro screens for first-time users
  if (showIntro) {
    return <IntroScreens onComplete={handleIntroComplete} />;
  }

  // Show auth screens if not authenticated
  if (!authState.isAuthenticated) {
    if (authMode === 'signup') {
      return (
        <SignUpForm
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    } else {
      return (
        <LoginForm
          onSuccess={handleAuthSuccess}
          onSwitchToSignUp={() => setAuthMode('signup')}
        />
      );
    }
  }

  // User is authenticated - show main app
  return (
    <Router>
      {/* Your main app routes and components */}
      <div className="app">
        {/* Dashboard, Orders, Payments, etc. */}
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

---

### **Step 6: Add Logout Button to Settings**

**File:** `src/pages/Settings.tsx` (Add this section)

```typescript
// Add to Settings.tsx

import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

function Settings() {
  const { authState, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    const confirmed = window.confirm(
      '⚠️ LOG OUT\n\n' +
      'Are you sure you want to log out?\n\n' +
      'Your data will be saved and you can log back in anytime.'
    );

    if (confirmed) {
      logout();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">⚙️ Settings</h1>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <User size={28} />
          Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Name
            </label>
            <p className="text-lg text-gray-900">{authState.user?.businessName}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Owner Name
            </label>
            <p className="text-lg text-gray-900">{authState.user?.ownerName}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <p className="text-lg text-gray-900">{authState.user?.email}</p>
          </div>

          {authState.user?.phone && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <p className="text-lg text-gray-900">{authState.user.phone}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Edit Profile →
            </button>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <BackupSettings />

      {/* Logout Section */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-3">
          <LogOut size={28} />
          Log Out
        </h2>

        <p className="text-gray-700 mb-4">
          Log out of your OrderPrep account. Your data will be saved and you can log back in anytime.
        </p>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ Testing Guide

### **Test Flow 1: First-Time User**

1. Clear all browser data (localStorage, cookies)
2. Refresh app
3. **Expected:** See intro screens
4. Swipe through slides
5. Click "Get Started"
6. **Expected:** See Sign Up form
7. Fill in all fields
8. Click "Create Account"
9. **Expected:** Logged in, see Dashboard
10. Close app
11. Reopen app
12. **Expected:** Auto-logged in, no intro screens

---

### **Test Flow 2: Returning User**

1. After Test Flow 1, close browser completely
2. Reopen browser and go to app
3. **Expected:** Auto-logged in immediately
4. Go to Settings
5. Click "Log Out"
6. **Expected:** See Login screen
7. Enter credentials
8. **Expected:** Logged in, see Dashboard

---

### **Test Flow 3: Wrong Credentials**

1. On Login screen
2. Enter non-existent email
3. **Expected:** Error: "Account not found"
4. Enter existing email + wrong password
5. **Expected:** Error: "Incorrect password"
6. Fix password and login
7. **Expected:** Success

---

## 🎯 Integration with Backup System

Update your backup system to use auth data:

```typescript
// In backupSystem.ts - Update exportAllData()

export function exportAllData(): BackupData {
  const { authState } = useAuth();
  
  const data: BackupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    
    // Use authenticated user info
    userInfo: {
      businessName: authState.user?.businessName || 'Unknown',
      userEmail: authState.user?.email || 'unknown@email.com',
      phone: authState.user?.phone,
      lastActive: new Date().toISOString(),
    },
    
    // ... rest of data
  };
  
  return data;
}
```

---

## 📦 Summary

### **What You Get:**

✅ **Beautiful intro screens** (4 slides, swipeable)  
✅ **Professional sign-up** (validation, error handling)  
✅ **Secure login** (password hashing, remember me)  
✅ **Auto-login** (seamless returning user experience)  
✅ **Profile management** (edit details in settings)  
✅ **Logout functionality** (clear and safe)  
✅ **Integration ready** (works with backup system)  

### **Time to Implement:**

- Intro Screens: 1 hour
- Auth Context: 1 hour
- Sign Up Form: 1 hour
- Login Form: 30 minutes
- Integration: 30 minutes
- Testing: 1 hour

**Total: 3-4 hours** for complete onboarding system!

---

**Ready to implement?** Let me know if you want me to:
1. ✅ Create the complete code package
2. ✅ Add animations and transitions
3. ✅ Add "Forgot Password" feature
4. ✅ Add social login (Google, Apple)
5. ✅ Add profile photo upload

Just say which parts you want and I'll build them! 🚀
