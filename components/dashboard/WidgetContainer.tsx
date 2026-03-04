import React from 'react';
import { X } from 'lucide-react';

interface WidgetContainerProps {
    title: string;
    icon?: React.ReactNode;
    onRemove?: () => void;
    children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon,
    onRemove,
    children
}) => {
    return (
        <div className="h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden relative group">
            {/* Header (Drag Handle) */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 drag-handle cursor-move select-none">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                            title="Remover Widget"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                {children}
            </div>
        </div>
    );
};
