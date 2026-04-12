
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
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <LayoutDashboard size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Dashboard
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
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
