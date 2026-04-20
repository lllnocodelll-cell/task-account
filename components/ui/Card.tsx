import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
  action?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, titleClassName = 'text-base font-bold text-slate-900 dark:text-white tracking-tight', action, collapsible = false, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300 ${className}`}>
      {(title || action || collapsible) && (
        <div 
          className={`px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center ${collapsible ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none group' : ''}`}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
            {title && <h3 className={titleClassName}>{title}</h3>}
          </div>
          <div className="flex items-center gap-3">
            {action && <div onClick={(e) => collapsible && e.stopPropagation()}>{action}</div>}
            {collapsible && (
               <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 shadow-sm transition-all duration-300">
                 {isCollapsed ? <ChevronDown size={18} strokeWidth={2.5} /> : <ChevronUp size={18} strokeWidth={2.5} />}
               </span>
            )}
          </div>
        </div>
      )}
      {!isCollapsed && (
        <div className="p-6 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>
      )}
    </div>
  );
};

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
  progress?: number;
  onClick?: () => void;
  variant?: 'vertical' | 'horizontal';
}> = ({ title, value, icon, trend, color = 'indigo', progress, onClick, variant = 'vertical' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  const borderTopClasses = {
    indigo: 'border-t-4 border-t-indigo-500',
    emerald: 'border-t-4 border-t-emerald-500',
    rose: 'border-t-4 border-t-rose-500',
    amber: 'border-t-4 border-t-amber-500',
    slate: 'border-t-4 border-t-slate-500',
  };
  
  const progressColorClasses = {
    indigo: 'bg-indigo-500 dark:bg-indigo-400',
    emerald: 'bg-emerald-500 dark:bg-emerald-400',
    rose: 'bg-rose-500 dark:bg-rose-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
    slate: 'bg-slate-500 dark:bg-slate-400',
  };

  if (variant === 'horizontal') {
    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 ${borderTopClasses[color]} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
             <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</span>
             {progress !== undefined && (
               <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400">{progress.toFixed(0)}%</span>
             )}
          </div>
          {trend && (
            <div className="flex items-center mt-0.5">
              <span className={`text-[9px] font-bold ${trend.startsWith('+') ? 'text-emerald-500' : trend.startsWith('-') ? 'text-rose-500' : 'text-slate-400'}`}>
                {trend}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{value}</span>
          <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 ${borderTopClasses[color]} ${onClick
          ? 'cursor-pointer active:scale-[0.98]'
          : ''
        }`}
    >
      <div className="flex items-start justify-between w-full">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h4>
          {trend && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="w-full mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Percentual</span>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${progressColorClasses[color]} transition-all duration-500 ease-out`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};