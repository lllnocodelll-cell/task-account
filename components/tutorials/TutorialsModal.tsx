import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, SearchableSelect } from '../ui/Input';
import { Plus, Search, FileText, Link as LinkIcon, Download, Trash2, Edit, Star, MonitorPlay, GraduationCap } from 'lucide-react';
import { Tutorial, Client } from '../../types';
import { supabase } from '../../utils/supabaseClient';
import { TutorialForm } from './TutorialForm';

interface TutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  clients: Client[];
}

export const TutorialsModal: React.FC<TutorialsModalProps> = ({
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
      fetchTutorials();
      setView('list');
      setSelectedTutorial(null);
    }
  }, [isOpen, orgId]);

  const handleDelete = async (tutorial: Tutorial) => {
    if (!confirm('Tem certeza que deseja apagar este manual?')) return;
    try {
      if (tutorial.file_path) {
        await supabase.storage.from('tutorials').remove([tutorial.file_path]);
      }
      const { error } = await supabase.from('tutorials').delete().eq('id', tutorial.id);
      if (error) throw error;
      fetchTutorials();
    } catch (error) {
      console.error('Erro ao deletar tutorial:', error);
      alert('Erro ao excluir tutorial');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            {view === 'list' ? (
              <MonitorPlay size={18} className="text-slate-500 dark:text-slate-400" />
            ) : (
              <GraduationCap size={18} className="text-slate-500 dark:text-slate-400" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              {view === 'list' ? 'Tutoriais' : (selectedTutorial ? 'Editar Manual' : 'Adicionar Tutorial')}
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>
      }
      size="6xl"
    >
      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar tutoriais..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-64 z-50">
                <SearchableSelect
                  value={clientFilter}
                  onChange={setClientFilter}
                  options={clientOptions}
                  placeholder="Filtrar por Cliente"
                />
              </div>
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showOnlyFavorites 
                  ? 'bg-amber-50 border-amber-200 text-amber-600' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                }`}
                title="Filtrar Favoritos"
              >
                <Star size={18} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
                <span className="hidden lg:inline font-medium">Favoritos</span>
              </button>
            </div>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setSelectedTutorial(null);
                setView('form');
              }}
            >
              Novo Manual
            </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTutorials.map((tutorial) => (
                <div key={tutorial.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 pr-12">
                      {tutorial.subject}
                    </h3>
                    <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button
                        onClick={() => toggleFavorite(tutorial)}
                        className={`p-1.5 transition-colors rounded shadow-sm border ${
                          tutorial.is_favorite 
                          ? 'text-amber-500 border-amber-200 bg-amber-50' 
                          : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                        }`}
                        title={tutorial.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Star size={14} fill={tutorial.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTutorial(tutorial);
                          setView('form');
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-600"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tutorial)}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-600"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
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
                      <span>
                        Criado por {tutorial.profiles?.full_name} em {new Date(tutorial.created_at).toLocaleDateString()}
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
                          <LinkIcon size={16} /> Assistir Vídeo
                        </a>
                      )}
                      {tutorial.file_path && (
                        <button
                          onClick={() => downloadFile(tutorial.file_path!, tutorial.file_name!)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm font-medium"
                        >
                          <Download size={16} /> Baixar Arquivo
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
    </Modal>
  );
};
