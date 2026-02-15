
import React from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { UserRole } from '../types';

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

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onProfileClick: () => void;
  onNotificationsClick: () => void;
  userRole: UserRole;
  userProfile: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  toggleTheme,
  onProfileClick,
  onNotificationsClick,
  userRole,
  userProfile
}) => {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-end px-8 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center justify-center transition-colors"
          title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          onClick={onNotificationsClick}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center justify-center transition-colors relative"
          title="Notificações"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-slate-100 dark:border-slate-800"></span>
        </button>

        <button
          onClick={onProfileClick}
          className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
          title="Ver Perfil"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {userProfile?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-slate-500 capitalize">{userProfile?.role || userRole}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} className="w-full h-full object-cover" />
            ) : (
              (userProfile?.full_name || 'U').substring(0, 2).toUpperCase()
            )}
          </div>
        </button>
      </div>
    </header>
  );
};
