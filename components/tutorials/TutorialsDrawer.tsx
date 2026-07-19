import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/Input';
import { Plus, Search, FileText, Trash2, Edit, Star, MonitorPlay, GraduationCap, X, TvMinimalPlay, CloudDownload } from 'lucide-react';
import { Tutorial, Client } from '../../types';
import { supabase } from '../../utils/supabaseClient';
import { TutorialForm } from './TutorialForm';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Tooltip } from '../ui/Tooltip';

interface TutorialsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  clients: Client[];
}

export const TutorialsDrawer: React.FC<TutorialsDrawerProps> = ({
  isOpen,
  onClose,
  orgId,
  userId,
  clients
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [tutorialToDelete, setTutorialToDelete] = useState<Tutorial | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Drawer animations
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const fetchTutorials = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('tutorials')
        .select(`
          *,
          clients (company_name, trade_name),
          profiles (full_name, avatar_url),
          tutorial_favorites (user_id)
        `) as any)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedTutorials = (data as any[]).map(t => ({
        ...t,
        is_favorite: (t.tutorial_favorites as any[] || []).some(f => f.user_id === userId)
      }));

      setTutorials(mappedTutorials);
    } catch (error) {
      console.error('Erro ao buscar tutoriais:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (tutorial: Tutorial) => {
    try {
      if (tutorial.is_favorite) {
        const { error } = await (supabase as any)
          .from('tutorial_favorites')
          .delete()
          .eq('tutorial_id', tutorial.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('tutorial_favorites')
          .insert({
            tutorial_id: tutorial.id,
            user_id: userId
          });
        if (error) throw error;
      }
      
      // Update local state for immediate feedback
      setTutorials(prev => prev.map(t => 
        t.id === tutorial.id ? { ...t, is_favorite: !t.is_favorite } : t
      ));
    } catch (error) {
      console.error('Erro ao favoritar/desfavoritar:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      fetchTutorials();
      setView('list');
      setSelectedTutorial(null);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, orgId]);

  const handleTransitionEnd = () => {
    if (!isVisible) setShouldRender(false);
  };

  const handleDeleteClick = (tutorial: Tutorial) => {
    setTutorialToDelete(tutorial);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tutorialToDelete) return;
    setDeleting(true);
    try {
      if (tutorialToDelete.file_path) {
        await supabase.storage.from('tutorials').remove([tutorialToDelete.file_path]);
      }
      const { error } = await supabase.from('tutorials').delete().eq('id', tutorialToDelete.id);
      if (error) throw error;
      fetchTutorials();
    } catch (error) {
      console.error('Erro ao deletar tutorial:', error);
      alert('Erro ao excluir tutorial');
    } finally {
      setDeleting(false);
      setIsConfirmOpen(false);
      setTutorialToDelete(null);
    }
  };

  const downloadFile = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('tutorials').createSignedUrl(path, 60);
      if (error) throw error;
      if (data) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Não foi possível baixar o arquivo.');
    }
  };

  const filteredTutorials = tutorials.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || 
                          (t.description?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesClient = clientFilter ? t.client_id === clientFilter : true;
    const matchesFavorite = showOnlyFavorites ? t.is_favorite : true;
    return matchesSearch && matchesClient && matchesFavorite;
  });

  const clientOptions = [
    { value: '', label: 'Todos os Clientes (Geral)' },
    ...clients.map(c => ({
      value: c.id,
      label: `${c.companyName} ${c.tradeName ? `(${c.tradeName})` : ''}`
    }))
  ];

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[650px] lg:w-[750px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg flex-shrink-0 shadow-sm">
              {view === 'list' ? (
                <MonitorPlay size={18} className="text-indigo-600 dark:text-indigo-400" />
              ) : (
                <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                {view === 'list' ? 'Tutoriais' : (selectedTutorial ? 'Editar Manual' : 'Adicionar Tutorial')}
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {view === 'list' ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setSelectedTutorial(null);
                  setView('form');
                }}
                className="rounded-full shadow-lg active:scale-95 text-xs font-bold"
              >
                Novo Manual
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setView('list')}
                className="rounded-full text-xs font-bold"
              >
                Voltar à Lista
              </Button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {view === 'list' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar tutoriais..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="z-50">
                  <SearchableSelect
                    value={clientFilter}
                    onChange={setClientFilter}
                    options={clientOptions}
                    placeholder="Filtrar por Cliente"
                  />
                </div>
                <button
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors w-full ${
                    showOnlyFavorites 
                    ? 'bg-amber-50 border-amber-200 text-amber-600' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                  }`}
                  title="Filtrar Favoritos"
                >
                  <Star size={18} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
                  <span className="font-medium text-sm">Favoritos</span>
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredTutorials.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileText size={48} className="mb-4 text-slate-400 dark:text-slate-600" />
                  <p className="text-lg font-medium">Nenhum tutorial encontrado</p>
                  <p className="text-sm">Clique em "Novo Manual" para adicionar um.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTutorials.map((tutorial) => (
                    <div key={tutorial.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 pr-24">
                          {tutorial.subject}
                        </h3>
                        <div className="absolute top-4 right-4 flex gap-1 z-20">
                          <Tooltip content={tutorial.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                            <button
                              onClick={() => toggleFavorite(tutorial)}
                              className={`p-1.5 transition-colors rounded shadow-sm border ${
                                tutorial.is_favorite 
                                ? 'text-amber-500 border-amber-200 bg-amber-50' 
                                : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              <Star size={14} fill={tutorial.is_favorite ? 'currentColor' : 'none'} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Editar">
                            <button
                              onClick={() => {
                                setSelectedTutorial(tutorial);
                                setView('form');
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-600"
                            >
                              <Edit size={14} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Excluir">
                            <button
                              onClick={() => handleDeleteClick(tutorial)}
                              className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                      
                      {tutorial.client_id && tutorial.clients && (
                        <div className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] rounded font-medium mb-2 self-start uppercase">
                          Cliente: {tutorial.clients.company_name || tutorial.clients.trade_name}
                        </div>
                      )}

                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-1 mt-1">
                        {tutorial.description || 'Nenhuma descrição fornecida.'}
                      </p>

                      <div className="mt-auto space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {tutorial.profiles?.avatar_url ? (
                            <img src={tutorial.profiles.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <span className="text-[10px] font-bold">{tutorial.profiles?.full_name?.[0]}</span>
                            </div>
                          )}
                          <span className="truncate text-slate-500">
                            Por {tutorial.profiles?.full_name} em {new Date(tutorial.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {tutorial.url && (
                            <a
                              href={tutorial.url.startsWith('http') ? tutorial.url : `https://${tutorial.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
                            >
                              <TvMinimalPlay size={16} />
                              <span className="hidden sm:inline">Assistir Vídeo</span>
                            </a>
                          )}
                          {tutorial.file_path && (
                            <button
                              onClick={() => downloadFile(tutorial.file_path!, tutorial.file_name!)}
                              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm font-medium"
                            >
                              <CloudDownload size={16} />
                              <span className="hidden sm:inline">Baixar Arquivo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'form' && (
            <TutorialForm
              tutorial={selectedTutorial}
              clients={clients}
              orgId={orgId}
              userId={userId}
              onSuccess={() => {
                setView('list');
                fetchTutorials();
              }}
              onCancel={() => setView('list')}
            />
          )}
        </div>
      </div>

      {isConfirmOpen && (
        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setTutorialToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Excluir Manual"
          message="Tem certeza que deseja apagar este manual? Esta ação não poderá ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
          loading={deleting}
        />
      )}
    </>,
    document.body
  );
};
