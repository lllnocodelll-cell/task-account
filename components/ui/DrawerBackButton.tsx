import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface DrawerBackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
  className?: string;
  title?: string;
}

export const DrawerBackButton: React.FC<DrawerBackButtonProps> = ({
  size = 18,
  className = '',
  title = 'Voltar',
  onClick,
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-xs flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${className}`}
      {...props}
    >
      <ArrowLeft size={size} />
    </button>
  );
};
