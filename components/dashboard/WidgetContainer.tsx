import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface WidgetContainerProps {
    title: string;
    icon?: React.ReactNode;
    onRemove?: () => void;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    allowZoom?: boolean;
    compactThreshold?: number;
}

const ZOOM_LEVELS = [60, 75, 85, 90, 100, 110, 125, 140, 150];

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon,
    onRemove,
    headerActions,
    children,
    allowZoom = true,
    compactThreshold
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
        <div 
            className="no-drag flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 p-0.5 rounded-md text-[9px] font-bold select-none shrink-0" 
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            <Tooltip content="Reduzir zoom" position="top">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomOut();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    disabled={zoomLevel <= ZOOM_LEVELS[0]}
                    className="h-5 w-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 active:scale-90 disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
                    aria-label="Reduzir zoom"
                >
                    <ZoomOut size={11} strokeWidth={2.4} />
                </button>
            </Tooltip>
            <Tooltip content="Resetar zoom (100%)" position="top">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        resetZoom();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    className={`px-1.5 py-0.5 rounded transition-all text-[9px] font-mono tabular-nums active:scale-95 cursor-pointer touch-manipulation ${
                        zoomLevel !== 100 
                            ? 'bg-indigo-600 text-white dark:bg-indigo-500 font-bold' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700'
                    }`}
                >
                    {zoomLevel}%
                </button>
            </Tooltip>
            <Tooltip content="Aumentar zoom" position="top">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn();
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    disabled={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                    className="h-5 w-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 active:scale-90 disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
                    aria-label="Aumentar zoom"
                >
                    <ZoomIn size={11} strokeWidth={2.4} />
                </button>
            </Tooltip>
        </div>
    ) : null;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const effectiveThreshold = compactThreshold ?? 640;

    const [isCompact, setIsCompact] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < effectiveThreshold;
        }
        return false;
    });

    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                // Quando a largura do widget for menor que o threshold (seja no celular ou ao reduzir pelas setas), adota modo compacto
                setIsCompact(width < effectiveThreshold);
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [effectiveThreshold]);

    const isTwoRows = isCompact;

    return (
        <div ref={containerRef} className="h-full w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden relative group">
            {/* Header Responsivo Dinâmico */}
            <div className={`flex ${isTwoRows && headerActions ? 'flex-col gap-2' : 'flex-row items-center justify-between gap-2.5'} px-2.5 py-2 sm:px-3 sm:py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 select-none`}>
                {/* Linha 1 no modo compacto / Lado Esquerdo no modo desktop amplo */}
                <div className={`flex items-center justify-between ${isTwoRows ? 'w-full' : 'w-full sm:w-auto sm:flex-1'} min-w-0`}>
                    {/* Drag Handle: Apenas na área do título e ícone */}
                    <div className="flex items-center gap-2 sm:gap-2.5 drag-handle cursor-move min-w-0 pr-1.5 flex-1">
                        {/* Ícone */}
                        {icon && (
                            <div className="p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex-shrink-0 shadow-sm pointer-events-none">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center">{icon}</span>
                            </div>
                        )}
                        {/* Título com barra de destaque */}
                        <div className="flex flex-col min-w-0 pointer-events-none">
                            <h3 className="text-[10px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.18em] sm:tracking-[0.25em] uppercase leading-none truncate">
                                {title}
                            </h3>
                            <div className="h-0.5 w-4 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1 rounded-full" />
                        </div>
                    </div>

                    {/* Bloco Direito da Linha 1 no modo celular/compacto: Zoom Compacto + Botão Remover [X] */}
                    {isTwoRows && (zoomControls || onRemove) && (
                        <div className="no-drag flex items-center gap-1.5 shrink-0 ml-1.5">
                            {zoomControls && (
                                <div className="flex items-center shrink-0">
                                    {zoomControls}
                                </div>
                            )}

                            {onRemove && (
                                <Tooltip content="Remover widget" position="top">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove();
                                        }}
                                        onPointerDown={e => e.stopPropagation()}
                                        onTouchStart={e => e.stopPropagation()}
                                        className="h-5.5 w-5.5 flex items-center justify-center rounded-md bg-slate-100/90 hover:bg-rose-50 dark:bg-slate-800/90 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-rose-200 shadow-xs active:scale-90 transition-all cursor-pointer touch-manipulation"
                                        aria-label="Remover widget"
                                    >
                                        <X size={12} strokeWidth={2.4} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>

                {/* Linha 2 no modo compacto (somente se houver headerActions) / Lado Direito no modo amplo */}
                {isTwoRows ? (
                    headerActions && (
                        <div 
                            className="no-drag flex items-center gap-1.5 w-full min-w-0 overflow-x-auto scrollbar-none pt-0.5"
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            onTouchEnd={e => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {headerActions}
                        </div>
                    )
                ) : (
                    /* Modo 1 Linha (Desktop Amplo): Ações + Zoom + Botão Remover tudo alinhado */
                    (headerActions || zoomControls || onRemove) && (
                        <div 
                            className="no-drag flex items-center justify-end gap-2 shrink-0 flex-nowrap"
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            onTouchEnd={e => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {/* Ações customizadas do widget (filtros, paginação, seletores, etc.) */}
                            {headerActions && (
                                <div className="flex items-center gap-1 sm:gap-1.5 shrink min-w-0 overflow-x-auto scrollbar-none">
                                    {headerActions}
                                </div>
                            )}
                            
                            {/* Controles de Zoom Percentual */}
                            {zoomControls && (
                                <div className="flex items-center shrink-0">
                                    {zoomControls}
                                </div>
                            )}

                            {/* Botão de Fechar / Remover no modo 1 linha (desktop amplo): canto direito na mesma linha das ações */}
                            {onRemove && (
                                <div className="flex items-center shrink-0 ml-0.5">
                                    <Tooltip content="Remover widget" position="top">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove();
                                            }}
                                            onPointerDown={e => e.stopPropagation()}
                                            onTouchStart={e => e.stopPropagation()}
                                            className="h-5 w-5 flex items-center justify-center rounded-md bg-slate-100/80 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/60 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-800/60 shadow-xs active:scale-90 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                            aria-label="Remover widget"
                                        >
                                            <X size={12} strokeWidth={2.4} />
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Content com padding adaptável para mobile */}
            <div className="flex-1 p-2.5 sm:p-4 overflow-hidden flex flex-col">
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



