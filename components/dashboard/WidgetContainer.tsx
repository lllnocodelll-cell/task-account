import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface WidgetContainerProps {
    title: string;
    icon?: React.ReactNode;
    onRemove?: () => void;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    allowZoom?: boolean;
}

const ZOOM_LEVELS = [60, 75, 85, 90, 100, 110, 125, 140, 150];

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon,
    onRemove,
    headerActions,
    children,
    allowZoom = true
}) => {
    const storageKey = `widget_zoom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const [zoomLevel, setZoomLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsed = parseInt(saved, 10);
                    if (!isNaN(parsed) && ZOOM_LEVELS.includes(parsed)) return parsed;
                }
            } catch (e) {
                console.error("Error reading zoom level from localStorage", e);
            }
        }
        return 100;
    });

    useEffect(() => {
        try {
            if (zoomLevel === 100) {
                localStorage.removeItem(storageKey);
            } else {
                localStorage.setItem(storageKey, zoomLevel.toString());
            }
        } catch (e) {
            console.error("Error saving zoom level to localStorage", e);
        }
    }, [storageKey, zoomLevel]);


    const handleZoomOut = () => {
        const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
        if (currentIndex > 0) {
            setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
        } else if (currentIndex === -1) {
            const lower = ZOOM_LEVELS.filter(l => l < zoomLevel);
            if (lower.length > 0) setZoomLevel(lower[lower.length - 1]);
        }
    };

    const handleZoomIn = () => {
        const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
        if (currentIndex !== -1 && currentIndex < ZOOM_LEVELS.length - 1) {
            setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
        } else if (currentIndex === -1) {
            const higher = ZOOM_LEVELS.filter(l => l > zoomLevel);
            if (higher.length > 0) setZoomLevel(higher[0]);
        }
    };

    const resetZoom = () => setZoomLevel(100);

    const zoomControls = allowZoom ? (
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold" onMouseDown={e => e.stopPropagation()}>
            <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= ZOOM_LEVELS[0]}
                className="h-5 w-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 dark:hover:text-white disabled:opacity-30 transition-colors"
                title="Reduzir conteúdo (Zoom Out)"
            >
                <ZoomOut size={11} />
            </button>
            <button
                onClick={resetZoom}
                className={`px-1.5 py-0.5 rounded transition-colors text-[9px] font-mono tabular-nums ${
                    zoomLevel !== 100 
                        ? 'bg-indigo-600 text-white dark:bg-indigo-500' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Clique para resetar para 100%"
            >
                {zoomLevel}%
            </button>
            <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                className="h-5 w-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 dark:hover:text-white disabled:opacity-30 transition-colors"
                title="Aumentar conteúdo (Zoom In)"
            >
                <ZoomIn size={11} />
            </button>
        </div>
    ) : null;

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
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {/* Header actions (e.g. filters) - always visible */}
                    {headerActions && (
                        <div className="flex items-center">
                            {headerActions}
                        </div>
                    )}
                    
                    {/* Controles de Zoom Percentual */}
                    {zoomControls}

                    {/* Remove button - visible on hover */}
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover Widget"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <div 
                    className="w-full h-full flex flex-col min-h-0 transition-transform duration-200"
                    style={{ zoom: `${zoomLevel}%` }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};



