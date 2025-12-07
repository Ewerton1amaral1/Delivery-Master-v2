
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { StoreApp } from './components/StoreApp';
import { DigitalMenu } from './components/DigitalMenu';
import { StoreSelector } from './components/StoreSelector';
import { UserSession } from './types';

function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App View State
  const [viewMode, setViewMode] = useState<'LOGIN' | 'CLIENT_SELECTOR' | 'CLIENT_MENU'>('LOGIN');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check URL for Direct Menu Access (Deep Link)
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const storeIdParam = params.get('store');

    if (mode === 'menu' && storeIdParam) {
      setSelectedStoreId(storeIdParam);
      setViewMode('CLIENT_MENU');
      setLoading(false);
      return;
    }

    // 2. Check Local Storage for Admin/Store Session
    const savedSession = localStorage.getItem('dm_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
    setLoading(false);
  }, []);

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('dm_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('dm_session');
    setViewMode('LOGIN');
  };
  
  // Client Flow Handlers
  const handleEnterClientMode = () => {
      setViewMode('CLIENT_SELECTOR');
  };

  const handleSelectStore = (storeId: string) => {
      setSelectedStoreId(storeId);
      setViewMode('CLIENT_MENU');
  };

  const handleSwitchStore = () => {
      // Clear URL params without refreshing to ensure we go back to the selector cleanly
      window.history.pushState({}, '', window.location.pathname);
      setSelectedStoreId(null);
      setViewMode('CLIENT_SELECTOR');
  };

  const handleBackToLogin = () => {
      setViewMode('LOGIN');
  };

  if (loading) return null;

  // --- ROUTING LOGIC ---

  // 1. Logged In User (Admin or Manager)
  if (session) {
    if (session.role === 'admin') {
        return <AdminPanel onLogout={handleLogout} />;
    }
    if (session.role === 'store' && session.storeId) {
        return <StoreApp storeId={session.storeId} onLogout={handleLogout} />;
    }
  }

  // 2. Client Mode: Menu View
  if (viewMode === 'CLIENT_MENU' && selectedStoreId) {
      return (
        <DigitalMenu 
            storeId={selectedStoreId} 
            onSwitchStore={handleSwitchStore}
        />
      );
  }

  // 3. Client Mode: Store Selector
  if (viewMode === 'CLIENT_SELECTOR') {
      return <StoreSelector onSelectStore={handleSelectStore} onBackToLogin={handleBackToLogin} />;
  }

  // 4. Default: Login Screen (Portal)
  return <LoginScreen onLogin={handleLogin} onEnterClientMode={handleEnterClientMode} />;
}

export default App;
