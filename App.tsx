
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
import { supabase } from './utils/supabaseClient';
import { Loader2 } from 'lucide-react';

// Define UserProfile type locally to match Profile.tsx and Header.tsx expectation
interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  org_name: string | null;
  job_title?: string | null;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('gestor');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

  // Auth Listener Effect
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session);
      } else {
        setLoading(false);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (session: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setUserRole(data.role as UserRole);
        setUserProfile({
          ...data,
          email: session.user.email,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = () => {
    if (session) {
      fetchUserProfile(session);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab('dashboard'); // Reset tab on logout
    setUserProfile(null);
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
        return <Profile userRole={userRole} onProfileUpdate={refreshUserProfile} />;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Auth
        onLogin={() => { }} // Handle by auth listener
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

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onProfileClick={() => setActiveTab('profile')}
          onNotificationsClick={() => setActiveTab('notifications')}
          userRole={userRole}
          userProfile={userProfile}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
