
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import VideoFeed from './components/VideoFeed';
import Settings from './components/Settings';
import { AuthData } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [view, setView] = useState<'feed' | 'settings'>('feed');

  useEffect(() => {
    const savedAuth = localStorage.getItem('emby_tok_auth');
    if (savedAuth) {
      try {
        setAuth(JSON.parse(savedAuth));
      } catch (e) {
        localStorage.removeItem('emby_tok_auth');
      }
    }
  }, []);

  const handleLogin = (data: AuthData) => {
    setAuth(data);
    localStorage.setItem('emby_tok_auth', JSON.stringify(data));
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('emby_tok_auth');
  };

  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden select-none">
      {view === 'feed' ? (
        <VideoFeed 
          auth={auth} 
          onOpenSettings={() => setView('settings')} 
        />
      ) : (
        <Settings 
          auth={auth} 
          onBack={() => setView('feed')} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
