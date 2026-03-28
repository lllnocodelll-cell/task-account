
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
import { ClientPortal } from './pages/ClientPortal';
import { Chat } from './pages/Chat';
import { Notes } from './pages/Notes';
import { UserRole } from './types';
import { supabase } from './utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { GlobalCallListener } from './components/chat/GlobalCallListener';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';

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
  org_id: string | null;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('gestor');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialClientsTabClientId, setInitialClientsTabClientId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleNavigateToClient = (clientId: string) => {
    setInitialClientsTabClientId(clientId);
    setActiveTab('clients');
  };

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

  // User Activity Tracker
  useEffect(() => {
    if (!session?.user?.id) return;

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

    const updateActivity = async (initialCheck = false) => {
      const now = Date.now();

      // Allow forced initial check or check if interval passed
      if (initialCheck || now - lastUpdateTime > UPDATE_INTERVAL) {
        lastUpdateTime = now;
        try {
          // Fetch current profile to check last_active_at and current_session_start
          const { data: profile } = await supabase
            .from('profiles')
            .select('last_active_at, current_session_start')
            .eq('id', session.user.id)
            .single();

          const updates: any = {
            last_active_at: new Date().toISOString()
          };

          // If no session start, or if inactive for > 30 mins
          if (profile) {
            const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
            const thirtyMins = 30 * 60 * 1000;

            if (!profile.current_session_start || (now - lastActive > thirtyMins)) {
              updates.current_session_start = new Date().toISOString();
            }
          }

          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id);

          if (error) console.error('Error auto-updating active state:', error);
        } catch (error) {
          // Silent ignore
        }
      }
    };

    // Initial update forced to check session state
    const initSessionAsync = async () => {
      await updateActivity(true);
      // Trigger the daily expiration check (tasks due soon, licenses expiring)
      try {
        await supabase.rpc('check_daily_expirations');
      } catch (err) {
        console.error('Error checking daily expirations:', err);
      }
    };
    initSessionAsync();

    // Listeners for window events
    window.addEventListener('mousemove', () => updateActivity(), { passive: true });
    window.addEventListener('keydown', () => updateActivity(), { passive: true });
    window.addEventListener('click', () => updateActivity(), { passive: true });
    window.addEventListener('scroll', () => updateActivity(), { passive: true });

    return () => {
      window.removeEventListener('mousemove', () => updateActivity());
      window.removeEventListener('keydown', () => updateActivity());
      window.removeEventListener('click', () => updateActivity());
      window.removeEventListener('scroll', () => updateActivity());
    };
  }, [session]);

  const fetchUserProfile = async (session: any) => {
    try {
      // 1. Verificar restrição de acesso por inatividade na tabela members
      const { data: memberData } = await supabase
        .from('members')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle();

      if (memberData && memberData.status === 'Inativo') {
        alert('Seu acesso foi desativado. Entre em contato com o administrador.');
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        setUserProfile(null);
        return; // Break login flow
      }

      // 2. Fetch normal do perfil do usuário
      const { data, error } = await supabase
        .from('profiles')
        .select('*, org_id')
        .eq('id', session.user.id)
        .single();

      if (data) {
        let finalProfile = {
          ...(data as any),
          email: session.user.email,
        };

        // Auto-fix for NULL org_id (Owner Migration Fallback)
        if (!data.org_id && data.role === 'gestor') {
          console.log('Self-healing: Assigning org_id to gestor');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ org_id: session.user.id })
            .eq('id', session.user.id);

          if (!updateError) {
            finalProfile.org_id = session.user.id;
          }
        }

        setUserRole(data.role as UserRole);
        setUserProfile(finalProfile);
        
        // Redirecionar cliente para a área do cliente se ele logar
        if (data.role === 'cliente') {
          setActiveTab('client-portal');
        }
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
    if (session?.user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ current_session_start: null })
          .eq('id', session.user.id);
      } catch (e) {
        console.error('Error clearing session start on logout', e);
      }
    }
    await supabase.auth.signOut();
    setActiveTab('dashboard'); // Reset tab on logout
    setUserProfile(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userProfile={userProfile} />;
      case 'tasks':
        return <Tasks userProfile={userProfile} onNavigateToClient={handleNavigateToClient} />;
      case 'clients':
        return (
          <Clients
            userProfile={userProfile}
            initialClientId={initialClientsTabClientId}
            onClearInitialClientId={() => setInitialClientsTabClientId(null)}
          />
        );
      case 'chat':
        return <Chat />;
      case 'notes':
        return <Notes />;
      case 'settings':
        return <Settings userProfile={userProfile} />;
      case 'profile':
        return <Profile userProfile={userProfile} onProfileUpdate={refreshUserProfile} />;
      case 'notifications':
        return <Notifications />;
      case 'client-portal':
        return <ClientPortal userProfile={userProfile} />;
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
    <ToastProvider>
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
          onNavigateToTab={(tab) => setActiveTab(tab)}
          userRole={userRole}
          userProfile={userProfile}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {session?.user && (
        <GlobalCallListener
          userId={session.user.id}
          userName={userProfile?.full_name || 'Usuário Local'}
        />
      )}
      <ToastContainer />
      </div>
    </ToastProvider>
  );
}

export default App;
