import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300 ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          {title && <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber';
  onClick?: () => void;
}> = ({ title, value, icon, trend, color = 'indigo', onClick }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  const borderTopClasses = {
    indigo: 'border-t-4 border-t-indigo-500',
    emerald: 'border-t-4 border-t-emerald-500',
    rose: 'border-t-4 border-t-rose-500',
    amber: 'border-t-4 border-t-amber-500',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-start justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 ${borderTopClasses[color]} ${onClick
          ? 'cursor-pointer active:scale-[0.98]'
          : ''
        }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h4>
        {trend && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
    </div>
  );
};