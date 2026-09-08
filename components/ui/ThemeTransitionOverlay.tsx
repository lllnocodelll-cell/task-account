import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Sparkles } from 'lucide-react';

interface ThemeTransitionOverlayProps {
  isVisible: boolean;
  targetTheme: 'light' | 'dark';
}

export const ThemeTransitionOverlay: React.FC<ThemeTransitionOverlayProps> = ({
  isVisible,
  targetTheme
}) => {
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let timer1: any;
    let timer2: any;
    let timer3: any;

    if (isVisible) {
      setShouldRender(true);
      setIsFadingOut(false);
      setProgress(15);

      timer1 = setTimeout(() => {
        setProgress(70);
      }, 80);

      timer2 = setTimeout(() => {
        setProgress(100);
      }, 250);

      timer3 = setTimeout(() => {
        setIsFadingOut(true);
      }, 380);
    } else if (shouldRender) {
      setIsFadingOut(true);
      const closeTimer = setTimeout(() => {
        setShouldRender(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(closeTimer);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible]);

  if (!shouldRender || typeof document === 'undefined') return null;

  const isDark = targetTheme === 'dark';

  return createPortal(
    <div
      className={`fixed inset-0 z-[999999] pointer-events-none flex flex-col items-center justify-center transition-opacity duration-200 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Barra de Progresso Superior */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden z-[1000000]">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isDark
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]'
              : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Backdrop Suave com Blur */}
      <div className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[2px] transition-opacity" />

      {/* Card Central Flutuante */}
      <div className="relative z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform duration-300 ${
            isDark
              ? 'bg-indigo-600 text-white shadow-indigo-500/30'
              : 'bg-amber-400 text-slate-950 shadow-amber-400/30'
          }`}
        >
          {isDark ? (
            <Moon size={20} className="animate-pulse" />
          ) : (
            <Sun size={20} className="animate-spin-slow" />
          )}
        </div>

        <div className="flex flex-col min-w-[190px]">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {isDark ? 'Ativando Modo Escuro' : 'Ativando Modo Claro'}
            </span>
            <Sparkles size={12} className={isDark ? 'text-indigo-400' : 'text-amber-500'} />
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Atualizando visual do sistema...
          </span>

          {/* Micro Barra de Progresso Interna */}
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isDark ? 'bg-indigo-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
