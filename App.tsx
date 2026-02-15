
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Clients } from './pages/Clients';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Chat } from './pages/Chat';
import { Notes } from './pages/Notes';
import { UserRole } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('gestor');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Toggle Theme Effect
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard'); // Reset tab on logout
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userRole={userRole} />;
      case 'tasks':
        return <Tasks />;
      case 'clients':
        return <Clients />;
      case 'chat':
        return <Chat />;
      case 'notes':
        return <Notes />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile userRole={userRole} />;
      case 'notifications':
        return <Notifications />;
      case 'support':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Suporte Técnico</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              Entre em contato conosco pelo e-mail <span className="text-indigo-600 dark:text-indigo-400">suporte@taskaccount.com</span> ou pelo telefone (11) 9999-9999.
            </p>
          </div>
        );
      default:
        return <Dashboard userRole={userRole} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <Auth 
        onLogin={handleLogin} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onLogout={handleLogout}
        userRole={userRole}
      />
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          onProfileClick={() => setActiveTab('profile')}
          onNotificationsClick={() => setActiveTab('notifications')}
          userRole={userRole}
        />
        
        <main className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
