
import React from 'react';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';

interface DashboardProps {
  userProfile?: any;
  userRole?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userProfile, userRole }) => {
  const role = userProfile?.role || userRole || 'gestor';
  const userId = userProfile?.id;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Escalonável</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {role === 'gestor' ? 'Visão Geral do Escritório' : 'Minhas Atividades'}
          </p>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
          Você pode arrastar e redimensionar os widgets.
        </div>
      </div>

      {userId ? (
        <DashboardGrid userId={userId} />
      ) : (
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">Carregando painéis...</p>
        </div>
      )}
    </div>
  );
};
