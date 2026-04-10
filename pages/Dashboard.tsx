
import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';

interface DashboardProps {
  userProfile?: any;
  userRole?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userProfile, userRole }) => {
  const role = userProfile?.role || userRole || 'gestor';
  const userId = userProfile?.id;
  const orgId = userProfile?.org_id;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 mb-2 md:mb-0">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">
              Gestão de Tarefas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-2">
              Controle operacional e acompanhamento de prazos
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
          Você pode arrastar e redimensionar os widgets.
        </div>
      </div>

      {userId ? (
        <DashboardGrid userId={userId} role={role} orgId={orgId} />
      ) : (
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">Carregando painéis...</p>
        </div>
      )}
    </div>
  );
};
