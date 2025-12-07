
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import { IntroScreens } from './components/IntroScreens';
import { SignUpForm } from './components/SignUpForm';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Reserved } from './pages/Reserved';
import { Payments } from './pages/Payments';
import { Kitchen } from './pages/Kitchen';
import { Customers } from './pages/Customers';
import { Settings } from './pages/Settings';

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

  // Auto-backup disabled for privacy concerns
  useEffect(() => {
    if (authState.isAuthenticated) {
      console.log('🚀 OrderPrep app started - user authenticated');
      // Automatic backups removed to protect user privacy
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
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reserved" element={<Reserved />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
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
