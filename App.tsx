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
import { LandingPage } from './pages/LandingPage';
import { LandingPagePro } from './pages/LandingPagePro';
import { UserRole, Client } from './types';
import { supabase } from './utils/supabaseClient';
import { Loader2, ShieldAlert, UserX, KeyRound, MailCheck, ArrowRight } from 'lucide-react';
import { GlobalCallListener } from './components/chat/GlobalCallListener';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { TutorialsDrawer } from './components/tutorials/TutorialsDrawer';
import { ProfileDrawer } from './components/ProfileDrawer';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { updateTabMeta, TAB_CONFIG } from './utils/tabFavicon';

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

const getInitialTab = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && TAB_CONFIG[tabFromUrl]) {
      return tabFromUrl;
    }
    const hashFromUrl = window.location.hash.replace('#', '');
    if (hashFromUrl && TAB_CONFIG[hashFromUrl]) {
      return hashFromUrl;
    }
  } catch (e) {
    console.error('Error parsing initial tab from URL:', e);
  }
  return 'dashboard';
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('gestor');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [initialClientsTabClientId, setInitialClientsTabClientId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isTutorialsOpen, setIsTutorialsOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isDeactivatedModalOpen, setIsDeactivatedModalOpen] = useState(false);
  const [isCredentialsChangedModalOpen, setIsCredentialsChangedModalOpen] = useState(false);
  const [updatedEmailInfo, setUpdatedEmailInfo] = useState<{ oldEmail: string; newEmail: string } | null>(null);

  const handleNavigateToClient = (clientId: string) => {
    setInitialClientsTabClientId(clientId);
    setActiveTab('clients');
  };

  const fetchClients = async (orgId: string) => {
    try {
      let query = supabase
        .from('clients')
        .select('id, company_name, trade_name');

      if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      const { data } = await query.order('company_name');
      if (data) {
        setClientsList(data.map((c: any) => ({
          ...c,
          companyName: c.company_name,
          tradeName: c.trade_name,
        })) as Client[]);
      }
    } catch (e) {
      console.error('Erro ao buscar clientes para tutoriais:', e);
    }
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

  // Dynamic Browser Tab Title & Favicon Synchronization
  useEffect(() => {
    if (!session) {
      updateTabMeta('default');
      return;
    }

    updateTabMeta(activeTab, userRole);

    // Synchronize URL search params (?tab=...) without reloading page
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== activeTab) {
        url.searchParams.set('tab', activeTab);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {
      console.error('Error synchronizing tab in URL:', e);
    }
  }, [activeTab, session, userRole]);

  // Handle browser Back / Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && TAB_CONFIG[tab]) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Demo Mode for Screenshots
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      console.log('--- MODO DEMONSTRAÇÃO ATIVO ---');
      setSession({ user: { id: 'demo-id', email: 'demo@taskaccount.com' } });
      setUserProfile({
        id: 'demo-id',
        full_name: 'Dr. Ricardo Santos',
        role: 'gestor',
        email: 'demo@taskaccount.com',
        phone: '(11) 98888-7777',
        location: 'São Paulo, SP',
        avatar_url: null,
        org_name: 'Santos & Associados Contabilidade',
        job_title: 'Sócio Diretor',
        org_id: 'demo-org'
      });
      setUserRole('gestor');
      setLoading(false);
    }
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
      // Trigger daily expiration check & recurring tasks self-healing cycle
      try {
        await supabase.rpc('check_daily_expirations');
      } catch (err) {
        console.error('Error checking daily expirations:', err);
      }
      try {
        await supabase.rpc('process_recurring_tasks_cycle');
      } catch (err) {
        console.error('Error in recurring tasks self-healing:', err);
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

  // Heartbeat de presença global (a cada 30 segundos)
  useEffect(() => {
    if (!session?.user?.id) return;

    const touchPresence = async () => {
      try {
        const now = new Date();
        const nowStr = now.toISOString();
        const todayStr = now.toLocaleDateString('pt-BR'); // Ex: '30/08/2026'
        
        // Obter status atual para re-iniciar session_start e acumular tempo se necessário
        const { data: profile } = await (supabase
          .from('profiles')
          .select('*, org_id') as any)
          .eq('id', session.user.id)
          .maybeSingle();

        const updates: any = {
          last_active_at: nowStr
        };

        if (profile) {
          if (!profile.current_session_start) {
            updates.current_session_start = nowStr;
          }
          // Se o status no banco for 'offline', reverter para 'disponível' ao estar ativo
          if (profile.chat_status === 'offline') {
            updates.chat_status = 'disponível';
          }

          // Lógica de acumulação do tempo de atividade diária
          let accumulated = profile.accumulated_active_seconds_today || 0;
          const dbLastActiveDay = profile.last_active_day || '';

          if (dbLastActiveDay !== todayStr) {
            // Novo dia começou: reseta a contagem
            accumulated = 0;
            updates.last_active_day = todayStr;
          }

          // Adicionar tempo decorrido desde o último heartbeat
          if (profile.last_active_at) {
            const lastActiveMs = new Date(profile.last_active_at).getTime();
            const diffMs = now.getTime() - lastActiveMs;

            // Se o tempo decorrido for menor que 2 minutos (indicando sessão de heartbeat contínua),
            // nós acumulamos esse tempo.
            if (diffMs > 0 && diffMs < 120 * 1000) {
              accumulated += Math.floor(diffMs / 1000);
            }
          }

          updates.accumulated_active_seconds_today = accumulated;

          // Verificar se e-mail de acesso foi alterado pela administração
          if (profile.email && session.user.email) {
            const currentSessionEmail = session.user.email.trim().toLowerCase();
            const dbProfileEmail = profile.email.trim().toLowerCase();

            if (dbProfileEmail !== currentSessionEmail) {
              setUpdatedEmailInfo({
                oldEmail: currentSessionEmail,
                newEmail: dbProfileEmail
              });
              setIsCredentialsChangedModalOpen(true);
              await supabase.auth.signOut();
              setSession(null);
              setUserProfile(null);
              setShowAuth(true);
              return;
            }
          }
        }

        // Verificar se usuário foi excluído ou inativado em tempo de execução
        if (session.user.email) {
          const isGestorOrOwner = profile?.role === 'gestor';

          if (!isGestorOrOwner) {
            const { data: memberData } = await supabase
              .from('members')
              .select('status')
              .eq('email', session.user.email)
              .maybeSingle();

            if (!memberData || memberData.status === 'Inativo') {
              setIsDeactivatedModalOpen(true);
              await supabase.auth.signOut();
              setSession(null);
              setUserProfile(null);
              setShowAuth(true);
              return;
            }
          }
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', session.user.id);
      } catch (e) {
        console.error('Error updating presence heartbeat:', e);
      }
    };

    touchPresence();
    const interval = setInterval(touchPresence, 30 * 1000);

    return () => clearInterval(interval);
  }, [session?.user?.id, session?.user?.email]);

  // Realtime Watcher para detectar alterações de credenciais e inativação/exclusão instantaneamente
  useEffect(() => {
    if (!session?.user?.id || !session?.user?.email) return;

    const currentEmail = session.user.email.trim().toLowerCase();

    // 1. Escutar alterações no próprio profile
    const profileChannel = supabase
      .channel(`profile-credentials-watch-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        },
        async (payload) => {
          const newProfile = payload.new as any;
          const newEmail = newProfile?.email?.trim().toLowerCase();

          if (newEmail && newEmail !== currentEmail) {
            setUpdatedEmailInfo({
              oldEmail: currentEmail,
              newEmail: newEmail
            });
            setIsCredentialsChangedModalOpen(true);
            await supabase.auth.signOut();
            setSession(null);
            setUserProfile(null);
            setShowAuth(true);
          }
        }
      )
      .subscribe();

    // 2. Escutar alterações e exclusões na tabela members
    const memberChannel = supabase
      .channel(`member-credentials-watch-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members'
        },
        async (payload) => {
          if (userRole === 'gestor') return; // Gestor master nunca é afetado

          if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as any;
            if (oldRecord && oldRecord.email && oldRecord.email.toLowerCase() === currentEmail) {
              setIsDeactivatedModalOpen(true);
              await supabase.auth.signOut();
              setSession(null);
              setUserProfile(null);
              setShowAuth(true);
            }
          } else {
            const newMember = payload.new as any;
            if (newMember && newMember.email?.toLowerCase() === currentEmail) {
              if (newMember.status === 'Inativo') {
                setIsDeactivatedModalOpen(true);
                await supabase.auth.signOut();
                setSession(null);
                setUserProfile(null);
                setShowAuth(true);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [session?.user?.id, session?.user?.email, userRole]);

  const fetchUserProfile = async (session: any) => {
    try {
      // 1. Fetch do perfil do usuário em profiles
      const { data: profileData, error: profileError } = await (supabase
        .from('profiles')
        .select('*, org_id')
        .eq('id', session.user.id) as any)
        .maybeSingle();

      if (!profileData || profileError) {
        // Usuário não possui mais profile cadastrado (foi excluído do sistema)
        setIsDeactivatedModalOpen(true);
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        setUserProfile(null);
        setShowAuth(true);
        return;
      }

      // Verificar se este usuário é o Gestor / Administrador
      const isGestorOrOwner = profileData.role === 'gestor';

      // 2. Verificar restrição de acesso na tabela members
      const { data: memberData } = await (supabase
        .from('members')
        .select('status, client_ids, sector_id, sector_ids') as any)
        .eq('email', session.user.email)
        .maybeSingle();

      // Se for membro convidado (colaborador ou cliente), deve obrigatoriamente existir em members e estar ativo
      if (!isGestorOrOwner) {
        if (!memberData || memberData.status === 'Inativo') {
          setIsDeactivatedModalOpen(true);
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          setUserProfile(null);
          setShowAuth(true);
          return; // Bloqueia login de usuário inativo ou excluído da equipe
        }
      }

      let finalProfile = {
        ...(profileData as any),
        email: session.user.email,
        client_ids: memberData?.client_ids || profileData.client_ids || []
      };

      if (memberData) {
        finalProfile.sector_id = memberData.sector_id;
        finalProfile.sector_ids = memberData.sector_ids || [];
      }

      // Auto-fix for NULL org_id (Owner Migration Fallback)
      if (!profileData.org_id && profileData.role === 'gestor') {
        console.log('Self-healing: Assigning org_id to gestor');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ org_id: session.user.id })
          .eq('id', session.user.id);

        if (!updateError) {
          finalProfile.org_id = session.user.id;
        }
      }

      setUserRole(profileData.role as UserRole);
      setUserProfile(finalProfile);

      // Buscar clientes para o TutorialsModal
      const effectiveOrgId = finalProfile.org_id || session.user.id;
      fetchClients(effectiveOrgId);
      
      if (profileData.role === 'cliente') {
        setActiveTab(prev => prev === 'dashboard' ? 'client-portal' : prev);
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
          .update({
            current_session_start: null,
            last_active_at: '1970-01-01T00:00:00Z',
            chat_status: 'offline'
          } as any)
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
      case 'settings':
        return <Settings userProfile={userProfile} />;
      case 'profile':
        return <Profile userProfile={userProfile} onProfileUpdate={refreshUserProfile} />;
      case 'notifications':
        return <Notifications />;
      case 'client-portal':
        return <ClientPortal userProfile={userProfile} onNavigateToChat={() => setActiveTab('chat')} />;
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

  const renderDeactivatedModal = () => (
    <Modal
      isOpen={isDeactivatedModalOpen}
      onClose={() => setIsDeactivatedModalOpen(false)}
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={22} className="shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white">Acesso Desativado</span>
        </div>
      }
      size="md"
      footer={
        <Button
          variant="primary"
          onClick={() => setIsDeactivatedModalOpen(false)}
          className="w-full sm:w-auto px-6 bg-slate-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 font-semibold"
        >
          Entendi
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <div className="flex items-start gap-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-xl">
          <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
            <UserX size={20} />
          </div>
          <div className="text-sm space-y-1">
            <p className="font-bold text-rose-950 dark:text-rose-200">
              Seu acesso foi desativado.
            </p>
            <p className="text-xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
              O acesso a esta conta foi suspenso pela administração do escritório.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Caso precise reativar seu usuário ou acreditar que isto ocorreu por engano, entre em contato diretamente com o administrador responsável pelo seu escritório.
        </p>
      </div>
    </Modal>
  );

  const renderCredentialsChangedModal = () => (
    <Modal
      isOpen={isCredentialsChangedModalOpen}
      onClose={() => {
        setIsCredentialsChangedModalOpen(false);
        setShowAuth(true);
      }}
      title={
        <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
          <KeyRound size={22} className="shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white">Credenciais Atualizadas</span>
        </div>
      }
      size="md"
      footer={
        <Button
          variant="primary"
          onClick={() => {
            setIsCredentialsChangedModalOpen(false);
            setShowAuth(true);
          }}
          className="w-full sm:w-auto px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2"
        >
          <span>Fazer Login com Novo E-mail</span>
          <ArrowRight size={16} />
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <div className="flex items-start gap-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4 rounded-xl">
          <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
            <MailCheck size={20} />
          </div>
          <div className="text-sm space-y-1">
            <p className="font-bold text-amber-950 dark:text-amber-200">
              Seu e-mail de acesso foi alterado.
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Por motivos de segurança, sua sessão anterior foi encerrada e é necessário realizar login com o novo endereço.
            </p>
          </div>
        </div>

        {updatedEmailInfo && (
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">E-mail anterior:</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 line-through">{updatedEmailInfo.oldEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Novo e-mail de acesso:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">{updatedEmailInfo.newEmail}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Utilize a sua senha atual para entrar no sistema com o novo e-mail informado acima.
        </p>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (showAuth) {
      return (
        <div className="relative">
          <button 
            onClick={() => setShowAuth(false)}
            className="fixed top-6 left-6 z-[60] px-4 py-2 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            ← Voltar para Início
          </button>
          <Auth
            onLogin={() => { }} // Handle by auth listener
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
          {renderDeactivatedModal()}
          {renderCredentialsChangedModal()}
        </div>
      );
    }
    return (
      <>
        <LandingPagePro
          onLoginClick={() => setShowAuth(true)}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
        {renderDeactivatedModal()}
        {renderCredentialsChangedModal()}
      </>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false); // Close menu on navigation
        }}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        userRole={userRole}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      <div className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header
          activeTab={activeTab}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onProfileClick={() => setIsProfileDrawerOpen(true)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenTutorials={() => setIsTutorialsOpen(true)}
          userRole={userRole}
          userProfile={userProfile}
        />

        <main className={`flex-1 overflow-x-hidden ${activeTab === 'tasks' ? 'px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-4' : 'p-4 md:p-8'}`}>
          <div className="max-w-[1600px] mx-auto w-full">
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

      {userProfile && (
        <TutorialsDrawer
          isOpen={isTutorialsOpen}
          onClose={() => setIsTutorialsOpen(false)}
          orgId={userProfile.org_id || userProfile.id}
          userId={userProfile.id}
          clients={clientsList}
        />
      )}

      <ToastContainer />

      <ProfileDrawer 
        isOpen={isProfileDrawerOpen} 
        onClose={() => setIsProfileDrawerOpen(false)} 
        userProfile={userProfile} 
        onEditProfile={() => setActiveTab('profile')}
      />

      {renderDeactivatedModal()}
      {renderCredentialsChangedModal()}
      </div>
    </ToastProvider>
  );
}

export default App;
