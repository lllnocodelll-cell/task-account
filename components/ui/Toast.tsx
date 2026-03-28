import React from 'react';
import { useToast, ToastMessage } from '../../contexts/ToastContext';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastProps {
  toast: ToastMessage;
  onRemove: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
  };

  const bgColors = {
    success: 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10',
    error: 'border-red-500/20 bg-red-50 dark:bg-red-500/10',
    info: 'border-blue-500/20 bg-blue-50 dark:bg-blue-500/10',
    warning: 'border-amber-500/20 bg-amber-50 dark:bg-amber-500/10',
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md
        animate-in fade-in slide-in-from-right-10 duration-300
        ${bgColors[toast.type]}
      `}
    >
      <div className="mt-0.5 shrink-0">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mt-1 -mr-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};
