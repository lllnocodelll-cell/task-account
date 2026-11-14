import React, { useEffect, useState } from 'react';
import { Check, Loader2, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { BackgroundWallpaper } from './ui/BackgroundWallpaper';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../constants/backgroundThemes';
import { useToast } from '../contexts/ToastContext';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: BackgroundThemeId;
  isDarkMode: boolean;
  onSelectTheme?: (themeId: BackgroundThemeId) => Promise<{ ok: boolean; error?: string }>;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  isDarkMode,
  onSelectTheme,
}) => {
  const { addToast } = useToast();
  const [savingThemeId, setSavingThemeId] = useState<BackgroundThemeId | null>(null);
  const [previewDarkMode, setPreviewDarkMode] = useState<boolean>(isDarkMode);

  useEffect(() => {
    if (isOpen) {
      setPreviewDarkMode(isDarkMode);
    }
  }, [isOpen, isDarkMode]);

  const handleChoose = async (themeId: BackgroundThemeId) => {
    if (!onSelectTheme || savingThemeId) return;
    if (themeId === currentThemeId) return;

    setSavingThemeId(themeId);
    try {
      const result = await onSelectTheme(themeId);
      if (result.ok) {
        const chosen = BACKGROUND_THEMES.find((t) => t.id === themeId);
        addToast(
          'success',
          'Tema atualizado',
          chosen ? `O tema "${chosen.name}" foi salvo na sua conta.` : 'Preferência salva na sua conta.'
        );
      } else {
        addToast(
          'error',
          'Não foi possível salvar o tema',
          result.error || 'Tente novamente em alguns instantes.'
        );
      }
    } finally {
      setSavingThemeId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <Palette size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Temas de Fundo
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles size={14} className="text-indigo-500 shrink-0" />
            <span>Todos os temas se adaptam automaticamente entre o Modo Claro e o Modo Escuro.</span>
          </div>
          <Button variant="primary" size="md" onClick={onClose} className="shrink-0">
            Concluir
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize sua área de trabalho. Cada usuário mantém sua própria escolha salva na conta.
        </p>

        {/* Barra de controle da prévia Light / Dark */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Pré-visualizar miniaturas no modo:
          </span>
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 gap-1">
            <Tooltip content="Prévia no Modo Claro" position="top">
              <button
                type="button"
                onClick={() => setPreviewDarkMode(false)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  !previewDarkMode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun size={13} />
                Claro
              </button>
            </Tooltip>
            <Tooltip content="Prévia no Modo Escuro" position="top">
              <button
                type="button"
                onClick={() => setPreviewDarkMode(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewDarkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon size={13} />
                Escuro
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Grade unificada com os 6 temas visuais + Modo Clássico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BACKGROUND_THEMES.map((theme) => {
            const isSelected = currentThemeId === theme.id;
            const isSaving = savingThemeId === theme.id;
            const isClassic = theme.id === 'none';

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleChoose(theme.id)}
                disabled={Boolean(savingThemeId)}
                className={`group text-left rounded-xl border p-2.5 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10 ring-2 ring-indigo-500/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Miniatura ao vivo simulando Sidebar + Header (translúcidos ou sólidos no Clássico) */}
                <div
                  className={`relative h-32 w-full rounded-lg overflow-hidden border border-slate-200/80 dark:border-white/10 ${
                    isClassic
                      ? previewDarkMode
                        ? 'bg-slate-950'
                        : 'bg-slate-100'
                      : 'bg-slate-100 dark:bg-slate-950'
                  }`}
                >
                  {!isClassic && (
                    <BackgroundWallpaper
                      themeId={theme.id}
                      isDarkMode={previewDarkMode}
                      className="w-full h-full object-cover object-left-top group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  )}

                  {/* Miniatura da Sidebar, Header e área de conteúdo */}
                  <div className="absolute inset-0 p-2 flex gap-2 pointer-events-none">
                    <div
                      className={`w-10 h-full rounded-md border flex flex-col items-center py-2 gap-1.5 ${
                        isClassic
                          ? previewDarkMode
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-white border-slate-200'
                          : previewDarkMode
                            ? 'backdrop-blur-sm bg-slate-900/50 border-white/20'
                            : 'backdrop-blur-sm bg-white/60 border-white/85'
                      }`}
                    >
                      <span className="w-4 h-4 rounded bg-amber-400/90 shrink-0" />
                      <span
                        className={`w-5 h-1.5 rounded-full ${
                          previewDarkMode ? 'bg-indigo-400/70' : 'bg-indigo-500/70'
                        }`}
                      />
                      <span
                        className={`w-5 h-1.5 rounded-full ${
                          previewDarkMode ? 'bg-white/25' : 'bg-slate-500/30'
                        }`}
                      />
                      <span
                        className={`w-5 h-1.5 rounded-full ${
                          previewDarkMode ? 'bg-white/25' : 'bg-slate-500/30'
                        }`}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div
                        className={`h-5 w-full rounded-md border flex items-center justify-between px-2 ${
                          isClassic
                            ? previewDarkMode
                              ? 'bg-slate-900 border-slate-800'
                              : 'bg-white border-slate-200'
                            : previewDarkMode
                              ? 'backdrop-blur-sm bg-slate-900/50 border-white/20'
                              : 'backdrop-blur-sm bg-white/60 border-white/85'
                        }`}
                      >
                        <span
                          className={`w-10 h-1.5 rounded-full ${
                            previewDarkMode ? 'bg-white/40' : 'bg-slate-700/40'
                          }`}
                        />
                        <span
                          className={`w-3 h-3 rounded-full ${
                            previewDarkMode ? 'bg-white/25' : 'bg-slate-700/20'
                          }`}
                        />
                      </div>
                      {isClassic ? (
                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                          <div
                            className={`rounded-md border p-1.5 flex flex-col justify-between ${
                              previewDarkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-7 h-1.5 rounded-full ${
                                previewDarkMode ? 'bg-slate-700' : 'bg-slate-300'
                              }`}
                            />
                            <span
                              className={`w-10 h-2 rounded ${
                                previewDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                              }`}
                            />
                          </div>
                          <div
                            className={`rounded-md border p-1.5 flex flex-col justify-between ${
                              previewDarkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-6 h-1.5 rounded-full ${
                                previewDarkMode ? 'bg-indigo-400/50' : 'bg-indigo-500/40'
                              }`}
                            />
                            <span
                              className={`w-9 h-2 rounded ${
                                previewDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                              }`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 rounded-md border border-dashed border-transparent" />
                      )}
                    </div>
                  </div>

                  {/* Indicador de selecionado / salvando */}
                  {(isSelected || isSaving) && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}
                    </div>
                  )}
                </div>

                {/* Informações do tema */}
                <div className="pt-2.5 px-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {theme.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
