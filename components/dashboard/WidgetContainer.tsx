import React from 'react';
import { X } from 'lucide-react';

interface WidgetContainerProps {
    title: string;
    icon?: React.ReactNode;
    onRemove?: () => void;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon,
    onRemove,
    headerActions,
    children
}) => {
    return (
        <div className="h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden relative group">
            {/* Header (Drag Handle) */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 drag-handle cursor-move select-none">
                <div className="flex items-center gap-3">
                    {/* Ícone estilo página */}
                    {icon && (
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex-shrink-0 shadow-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center">{icon}</span>
                        </div>
                    )}
                    {/* Título estilo página */}
                    <div className="flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                            {title}
                        </h3>
                        <div className="h-0.5 w-4 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1 rounded-full" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Header actions (e.g. filters) - always visible */}
                    {headerActions && (
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                            {headerActions}
                        </div>
                    )}
                    {/* Remove button - visible on hover */}
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
