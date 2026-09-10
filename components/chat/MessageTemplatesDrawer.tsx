import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Zap,
  Star,
  Copy,
  Check,
  CornerDownLeft,
  Sparkles,
  Layers,
  Clock,
  Send,
  SlidersHorizontal,
  FolderHeart,
  Globe,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useToast } from '../../contexts/ToastContext';

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  header_image_url?: string | null;
  is_automated?: boolean;
  target_audience?: 'internal' | 'external';
  trigger_type?: string;
  trigger_value?: number;
  trigger_time?: string;
  schedules?: Array<{
    id?: string;
    trigger_type: string;
    trigger_value: number;
    trigger_time: string;
  }>;
  target_sectors?: string[];
  target_segments?: string[];
  target_tax_regimes?: string[];
  target_client_ids?: string[];
  reference_task_type_id?: string;
  created_at?: string;
}

interface MessageTemplatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  userId: string | null;
  onSelectTemplate: (template: MessageTemplate) => void;
  sectors?: { id: string; name: string }[];
  audienceScope?: 'internal' | 'external' | 'all';
}

export const MessageTemplatesDrawer: React.FC<MessageTemplatesDrawerProps> = ({
  isOpen,
  onClose,
  templates,
  userId,
  onSelectTemplate,
  sectors = [],
  audienceScope = 'all'
}) => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'external' | 'internal' | 'manual' | 'automated'>('all');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Animação de montagem/desmontagem do Drawer
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Favoritos persistidos no localStorage por usuário
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const storageKey = `chat_template_favorites_${userId || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!userId) return;
    try {
      const storageKey = `chat_template_favorites_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFavoriteIds(JSON.parse(saved));
      }
    } catch {
      // Silent ignore
    }
  }, [userId]);

  // Resetar filtro ativo ao alternar o escopo ou reabrir
  useEffect(() => {
    if (isOpen) {
      setActiveFilter('all');
      setSearchTerm('');
    }
  }, [audienceScope, isOpen]);

  // Controle de transição do Drawer
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 15);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (!isOpen && e.propertyName === 'transform') {
      setShouldRender(false);
    }
  };

  // Toggle de Favorito
  const toggleFavorite = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds(prev => {
      const isFav = prev.includes(templateId);
      const next = isFav ? prev.filter(id => id !== templateId) : [...prev, templateId];
      if (userId) {
        localStorage.setItem(`chat_template_favorites_${userId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Copiar conteúdo para a área de transferência
  const handleCopyContent = async (template: MessageTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(template.content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = template.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedTemplateId(template.id);
      addToast('success', 'Modelo copiado', 'O texto foi copiado para a área de transferência.');
      setTimeout(() => {
        setCopiedTemplateId(prev => (prev === template.id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Erro ao copiar texto do modelo:', err);
      addToast('error', 'Erro ao copiar', 'Não foi possível copiar o texto do modelo.');
    }
  };

  // Restringe o conjunto base de acordo com o escopo solicitado (ex: apenas equipe no chat interno)
  const scopedTemplates = useMemo(() => {
    if (audienceScope === 'internal') {
      return templates.filter(t => t.target_audience === 'internal');
    }
    if (audienceScope === 'external') {
      return templates.filter(t => !t.target_audience || t.target_audience === 'external');
    }
    return templates;
  }, [templates, audienceScope]);

  // Filtragem e ordenação dos modelos (favoritos no topo na visualização geral)
  const filteredTemplates = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return scopedTemplates
      .filter(t => {
        const matchesSearch =
          t.title.toLowerCase().includes(term) ||
          t.content.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (activeFilter === 'favorites') {
          return favoriteIds.includes(t.id);
        }
        if (activeFilter === 'external') {
          return !t.target_audience || t.target_audience === 'external';
        }
        if (activeFilter === 'internal') {
          return t.target_audience === 'internal';
        }
        if (activeFilter === 'automated') {
          return !!t.is_automated;
        }
        if (activeFilter === 'manual') {
          return !t.is_automated;
        }
        return true;
      })
      .sort((a, b) => {
        const aFav = favoriteIds.includes(a.id);
        const bFav = favoriteIds.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.title.localeCompare(b.title);
      });
  }, [scopedTemplates, searchTerm, activeFilter, favoriteIds]);

  const favoritesCount = useMemo(() => {
    return scopedTemplates.filter(t => favoriteIds.includes(t.id)).length;
  }, [scopedTemplates, favoriteIds]);

  // Função para destacar visualmente os placeholders no preview do texto
  const renderFormattedPreview = (content: string) => {
    const parts = content.split(/(\{[a-zA-Z0-9_]+\})/g);

    return (
      <span className="leading-relaxed text-xs text-slate-600 dark:text-slate-300 select-text">
        {parts.map((part, i) => {
          if (part.startsWith('{') && part.endsWith('}')) {
            return (
              <span
                key={i}
                className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-semibold border border-indigo-200/60 dark:border-indigo-800/50 select-all"
              >
                {part}
              </span>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </span>
    );
  };

  if (!shouldRender && !isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop com transição suave */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[540px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header com Design Contextual por Escopo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex-shrink-0 shadow-sm border ${
              audienceScope === 'internal'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-300'
                : audienceScope === 'external'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
            }`}>
              {audienceScope === 'internal' ? (
                <Users size={18} />
              ) : audienceScope === 'external' ? (
                <Globe size={18} />
              ) : (
                <Zap size={18} />
              )}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 tracking-[0.2em] uppercase leading-none">
                  Modelos de Mensagem
                </h1>
                {audienceScope === 'internal' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <Users size={10} />
                    Equipe
                  </span>
                )}
                {audienceScope === 'external' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <Globe size={10} />
                    Clientes
                  </span>
                )}
              </div>
              <div className={`h-0.5 w-10 mt-1.5 rounded-full ${
                audienceScope === 'internal'
                  ? 'bg-purple-500/50'
                  : audienceScope === 'external'
                  ? 'bg-blue-500/50'
                  : 'bg-indigo-500/30'
              }`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 space-y-3.5">
          {/* Input de Busca */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder={
                audienceScope === 'internal'
                  ? "Pesquisar modelos da equipe..."
                  : "Pesquisar por título, mensagem ou variável..."
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Abas / Filtros Rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? audienceScope === 'internal'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                    : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Todos</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {scopedTemplates.length}
              </span>
            </button>

            {/* Abas específicas exibidas apenas quando não há restrição de escopo fixa */}
            {audienceScope === 'all' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilter('external')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'external'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Globe size={13} />
                  <span>Clientes (Externo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('internal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'internal'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Users size={13} />
                  <span>Equipe (Interno)</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveFilter('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'favorites'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Star size={13} className={activeFilter === 'favorites' ? 'fill-white' : 'text-amber-500 fill-amber-500'} />
              <span>Favoritos</span>
              {favoritesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === 'favorites' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            {audienceScope !== 'internal' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilter('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'manual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Envio Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('automated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'automated'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Clock size={13} />
                  <span>Automáticos</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lista de Modelos */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar bg-slate-50/40 dark:bg-slate-950/20">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                {activeFilter === 'favorites' ? (
                  <FolderHeart size={24} className="text-amber-500" />
                ) : audienceScope === 'internal' ? (
                  <Users size={24} className="text-purple-400" />
                ) : (
                  <Search size={24} />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                {activeFilter === 'favorites'
                  ? 'Nenhum modelo favoritado'
                  : scopedTemplates.length === 0 && audienceScope === 'internal'
                  ? 'Nenhum modelo interno cadastrado'
                  : 'Nenhum modelo encontrado'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                {activeFilter === 'favorites'
                  ? 'Clique na estrela (⭐) de qualquer modelo para acessá-lo rapidamente por esta aba.'
                  : scopedTemplates.length === 0 && audienceScope === 'internal'
                  ? 'Cadastre modelos com destino "Interna (Equipe)" em Configurações > Modelos de Mensagens para usá-los no chat do escritório.'
                  : 'Tente ajustar os termos da busca ou mudar a categoria selecionada acima.'}
              </p>
            </div>
          ) : (
            filteredTemplates.map(template => {
              const isFavorited = favoriteIds.includes(template.id);
              const isCopied = copiedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 relative"
                >
                  {/* Linha Superior: Título, Badges e Botão Favorito */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-wide truncate">
                          {template.title}
                        </h4>
                        {template.target_audience === 'internal' ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 flex items-center gap-1">
                            <Users size={10} />
                            Equipe (Interno)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 flex items-center gap-1">
                            <Globe size={10} />
                            Cliente (Externo)
                          </span>
                        )}
                        {template.is_automated && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50 flex items-center gap-1">
                            <Clock size={10} />
                            Automático
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão de Favoritar */}
                    <Tooltip
                      content={isFavorited ? 'Remover dos favoritos' : 'Favoritar este modelo'}
                      position="left"
                    >
                      <button
                        type="button"
                        onClick={e => toggleFavorite(template.id, e)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isFavorited
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 scale-105'
                            : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Star
                          size={16}
                          className={isFavorited ? 'fill-amber-500 text-amber-500' : ''}
                        />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Preview de Imagem de Cabeçalho (se cadastrada) */}
                  {template.header_image_url && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 max-h-36 bg-slate-100 dark:bg-slate-950 group/img">
                      <img
                        src={template.header_image_url}
                        alt="Cabeçalho do Modelo"
                        className="w-full h-24 object-cover transition-transform duration-300 group-hover/img:scale-105"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white flex items-center gap-1 shadow-sm">
                        <ImageIcon size={10} />
                        Imagem de Cabeçalho
                      </div>
                    </div>
                  )}

                  {/* Conteúdo com visualização dos marcadores */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/60 max-h-48 overflow-y-auto custom-scrollbar">
                    {renderFormattedPreview(template.content)}
                  </div>

                  {/* Rodapé do Card: Ações Enviar e Copiar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {template.content.length} caracteres
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão Copiar */}
                      <Tooltip content="Copiar texto bruto" position="top">
                        <button
                          type="button"
                          onClick={e => handleCopyContent(template, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check size={14} className="text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </Tooltip>

                      {/* Botão Enviar Diretamente no Chat */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                        className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 ${
                          audienceScope === 'internal'
                            ? 'bg-purple-600 hover:bg-purple-700 group-hover:shadow-purple-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-700 group-hover:shadow-indigo-500/20'
                        }`}
                      >
                        <span>Enviar no Chat</span>
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-center">
          {audienceScope === 'internal' ? (
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center gap-1.5">
              <Users size={13} />
              <span>Exibindo apenas modelos de uso interno da equipe para evitar envios externos indevidos.</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              💡 As variáveis em tags (como <span className="font-mono text-indigo-500">{'{nome_contato}'}</span> e <span className="font-mono text-indigo-500">{'{razao_social}'}</span>) são substituídas pelos dados do cliente atual.
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

