import React, { useEffect } from 'react';
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
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            border: 'border-emerald-200 dark:border-emerald-500/20',
            text: 'text-emerald-800 dark:text-emerald-400',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        },
        error: {
            bg: 'bg-rose-50 dark:bg-rose-500/10',
            border: 'border-rose-200 dark:border-rose-500/20',
            text: 'text-rose-800 dark:text-rose-400',
            icon: <AlertCircle className="w-5 h-5 text-rose-500" />
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-200 dark:border-amber-500/20',
            text: 'text-amber-800 dark:text-amber-400',
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />
        },
        info: {
            bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            border: 'border-indigo-200 dark:border-indigo-500/20',
            text: 'text-indigo-800 dark:text-indigo-400',
            icon: <Info className="w-5 h-5 text-indigo-500" />
        }
    };

    const currentStyle = styles[type];

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`${currentStyle.bg} ${currentStyle.border} border rounded-xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3`}>
                <div className="shrink-0">
                    {currentStyle.icon}
                </div>
                <div className="flex-1 pt-0.5">
                    <p className={`text-sm font-medium ${currentStyle.text}`}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <X className={`w-4 h-4 ${currentStyle.text} opacity-50`} />
                </button>
            </div>
        </div>
    );
};
