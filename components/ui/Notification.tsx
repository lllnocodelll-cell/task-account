import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
    show: boolean;
    message: string;
    type?: NotificationType;
    onClose: () => void;
    duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
    show,
    message,
    type = 'info',
    onClose,
    duration = 5000
}) => {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const styles = {
        success: {
            bg: 'bg-emerald-50 dark:bg-slate-900',
            border: 'border-emerald-500/30',
            text: 'text-emerald-800 dark:text-emerald-300',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        },
        error: {
            bg: 'bg-rose-50 dark:bg-slate-900',
            border: 'border-rose-500/30',
            text: 'text-rose-800 dark:text-rose-300',
            icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-slate-900',
            border: 'border-amber-500/30',
            text: 'text-amber-800 dark:text-amber-300',
            icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        },
        info: {
            bg: 'bg-indigo-50 dark:bg-slate-900',
            border: 'border-indigo-500/30',
            text: 'text-indigo-800 dark:text-indigo-300',
            icon: <Info className="w-5 h-5 text-indigo-500 shrink-0" />
        }
    };

    const currentStyle = styles[type];

    return createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-md px-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`${currentStyle.bg} ${currentStyle.border} border-2 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-start gap-3.5`}>
                {currentStyle.icon}
                <div className="flex-1 pt-0.5 min-w-0">
                    <p className={`text-xs font-bold leading-relaxed ${currentStyle.text}`}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>,
        document.body
    );
};
