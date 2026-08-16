import React, { useState, useEffect } from 'react';
import { 
  StickyNote, 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Pencil, 
  Check, 
  X,
  Loader2
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { ConfirmModal } from '../../ui/ConfirmModal';

type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'slate';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
}

const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; dot: string; header: string; tag: string }> = {
  yellow: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700/60',
    dot: 'bg-amber-400',
    header: 'text-amber-950 dark:text-amber-200',
    tag: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  },
  blue: {
    bg: 'bg-sky-50/90 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700/60',
    dot: 'bg-sky-400',
    header: 'text-sky-950 dark:text-sky-200',
    tag: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
  },
  green: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700/60',
    dot: 'bg-emerald-400',
    header: 'text-emerald-950 dark:text-emerald-200',
    tag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  },
  pink: {
    bg: 'bg-rose-50/90 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700/60',
    dot: 'bg-rose-400',
    header: 'text-rose-950 dark:text-rose-200',
    tag: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
  },
  purple: {
    bg: 'bg-purple-50/90 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700/60',
    dot: 'bg-purple-400',
    header: 'text-purple-950 dark:text-purple-200',
    tag: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
  },
  slate: {
    bg: 'bg-slate-50/90 dark:bg-slate-900/60',
    border: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
    dot: 'bg-slate-400',
    header: 'text-slate-900 dark:text-slate-200',
    tag: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
};

interface NotesWidgetProps {
  userId?: string;
  onRemove?: () => void;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ userId, onRemove }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  // Estado para criar/editar anotação
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({
    color: 'yellow',
    is_pinned: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(userId || null);

  // Modal de Exclusão Padronizado
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const init = async () => {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          setActiveUserId(user.id);
        }
      }
      if (uid) {
        fetchNotes(uid);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  const fetchNotes = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', uid)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar notas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setCurrentNote({
      title: '',
      content: '',
      color: 'yellow',
      is_pinned: false
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (note: Note) => {
    setCurrentNote(note);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if ((!currentNote.title?.trim() && !currentNote.content?.trim()) || !activeUserId) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      if (currentNote.id) {
        // Atualizar nota existente
        const { error } = await supabase
          .from('notes')
          .update({
            title: currentNote.title?.trim() || 'Sem título',
            content: currentNote.content?.trim() || '',
            color: currentNote.color || 'yellow',
            is_pinned: currentNote.is_pinned || false
          })
          .eq('id', currentNote.id);

        if (error) throw error;
      } else {
        // Inserir nova nota
        const { error } = await supabase
          .from('notes')
          .insert([{
            user_id: activeUserId,
            title: currentNote.title?.trim() || 'Sem título',
            content: currentNote.content?.trim() || '',
            color: currentNote.color || 'yellow',
            is_pinned: currentNote.is_pinned || false,
            is_archived: false
          }]);

        if (error) throw error;
      }

      await fetchNotes(activeUserId);
      setIsEditing(false);
      setCurrentNote({ color: 'yellow', is_pinned: false });
    } catch (error: any) {
      console.error('Erro ao salvar anotação:', error);
      alert('Erro ao salvar: ' + (error.message || 'Erro inesperado'));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePin = async (id: string, currentPin: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    // Atualização otimista
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !currentPin } : n)
      .sort((a, b) => (b.is_pinned === a.is_pinned) ? 0 : b.is_pinned ? 1 : -1)
    );

    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !currentPin })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      if (activeUserId) fetchNotes(activeUserId);
    }
  };

  const toggleArchive = async (id: string, currentArchived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_archived: !currentArchived, is_pinned: false } : n));

    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_archived: !currentArchived, is_pinned: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      if (activeUserId) fetchNotes(activeUserId);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete || !activeUserId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteToDelete);
      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      if (currentNote.id === noteToDelete) setIsEditing(false);
      setNoteToDelete(null);
    } catch (error: any) {
      alert('Erro ao excluir anotação: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const isArchived = Boolean(n.is_archived);
    const matchesMode = viewMode === 'archived' ? isArchived : !isArchived;
    const matchesSearch = !searchTerm || 
      (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMode && matchesSearch;
  });

  const headerActions = (
    <div className="flex items-center gap-1">
      {/* Busca Rápida */}
      {showSearch ? (
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-0.5 shadow-sm animate-in fade-in zoom-in-95 duration-150">
          <Search size={12} className="text-slate-400 mr-1 shrink-0" />
          <input
            type="text"
            placeholder="Buscar nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-24 sm:w-32 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
            autoFocus
          />
          <button 
            onClick={() => { setShowSearch(false); setSearchTerm(''); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <Tooltip content="Buscar anotações" position="top">
          <button
            onClick={() => setShowSearch(true)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Search size={13} />
          </button>
        </Tooltip>
      )}

      {/* Toggle Ativas / Arquivadas */}
      <Tooltip content={viewMode === 'active' ? 'Ver arquivadas' : 'Ver ativas'} position="top">
        <button
          onClick={() => setViewMode(prev => prev === 'active' ? 'archived' : 'active')}
          className={`p-1 rounded-md transition-colors ${
            viewMode === 'archived' 
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Archive size={13} />
        </button>
      </Tooltip>

      {/* Botão Nova Nota */}
      <Tooltip content="Criar nova anotação" position="top">
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all ml-0.5"
        >
          <Plus size={12} strokeWidth={2.5} />
          <span className="hidden sm:inline">Nova</span>
        </button>
      </Tooltip>
    </div>
  );

  return (
    <WidgetContainer
      title={viewMode === 'archived' ? 'Anotações (Arquivadas)' : 'Anotações'}
      icon={<StickyNote size={14} />}
      headerActions={headerActions}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        {/* Formulário Inline de Criação/Edição */}
        {isEditing && (
          <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-md animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Título da anotação..."
                value={currentNote.title || ''}
                onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
                className="flex-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                autoFocus
              />
              <Tooltip content={currentNote.is_pinned ? "Desafixar do topo" : "Fixar no topo"} position="top">
                <button
                  type="button"
                  onClick={() => setCurrentNote(prev => ({ ...prev, is_pinned: !prev.is_pinned }))}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    currentNote.is_pinned 
                      ? 'bg-amber-500 border-amber-500 text-white' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Pin size={12} className={currentNote.is_pinned ? "fill-white" : ""} />
                </button>
              </Tooltip>
            </div>

            <textarea
              placeholder="Escreva sua anotação ou lembrete..."
              value={currentNote.content || ''}
              onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 min-h-[60px] max-h-[120px] resize-y custom-scrollbar"
              rows={2}
            />

            <div className="flex items-center justify-between pt-1">
              {/* Paleta de Cores */}
              <div className="flex items-center gap-1.5">
                {(Object.keys(NOTE_COLORS) as NoteColor[]).map((colorKey) => (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setCurrentNote(prev => ({ ...prev, color: colorKey }))}
                    className={`w-5 h-5 rounded-full ${NOTE_COLORS[colorKey].dot} transition-transform flex items-center justify-center ${
                      (currentNote.color || 'yellow') === colorKey ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105 opacity-80'
                    }`}
                  >
                    {(currentNote.color || 'yellow') === colorKey && <Check size={10} className="text-slate-900" />}
                  </button>
                ))}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Notas com Quebra Automática e Responsiva */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 min-h-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-8">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs text-slate-400 font-medium">Carregando anotações...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <StickyNote size={20} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {searchTerm ? 'Nenhuma anotação encontrada' : (viewMode === 'archived' ? 'Nenhuma anotação arquivada' : 'Nenhuma anotação cadastrada')}
              </p>
              <p className="text-[11px] text-slate-400 max-w-[220px]">
                {searchTerm ? 'Tente buscar com outro termo' : 'Clique no botão acima para criar lembretes e anotações rápidas.'}
              </p>
              {!searchTerm && viewMode === 'active' && (
                <button
                  onClick={handleOpenNew}
                  className="mt-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  + Nova Anotação
                </button>
              )}
            </div>
          ) : (
            <div 
              className="pb-2"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.625rem'
              }}
            >
              {filteredNotes.map((note) => {
                const colorConfig = NOTE_COLORS[(note.color as NoteColor) || 'yellow'] || NOTE_COLORS.yellow;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleOpenEdit(note)}
                    className={`${colorConfig.bg} ${colorConfig.border} border rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer relative min-h-[110px] select-none`}
                  >
                    {/* Topo do Card: Título + Botões Fixos */}
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {note.is_pinned && (
                            <Pin size={11} className="text-amber-500 shrink-0 fill-amber-500 rotate-45" />
                          )}
                          <h4 className={`text-xs font-black truncate ${colorConfig.header}`}>
                            {note.title || 'Sem título'}
                          </h4>
                        </div>

                        {/* Botões de Ação Fixos e Sempre Visíveis */}
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <Tooltip content={note.is_pinned ? "Desafixar do topo" : "Fixar no topo"} position="top">
                            <button
                              onClick={(e) => togglePin(note.id, note.is_pinned, e)}
                              className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                                note.is_pinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                              }`}
                            >
                              <Pin size={11} className={note.is_pinned ? "fill-amber-500" : ""} />
                            </button>
                          </Tooltip>

                          <Tooltip content="Editar anotação" position="top">
                            <button
                              onClick={() => handleOpenEdit(note)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                          </Tooltip>

                          <Tooltip content={note.is_archived ? "Desarquivar anotação" : "Arquivar anotação"} position="top">
                            <button
                              onClick={(e) => toggleArchive(note.id, note.is_archived, e)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              {note.is_archived ? <RotateCcw size={11} /> : <Archive size={11} />}
                            </button>
                          </Tooltip>

                          <Tooltip content="Excluir anotação" position="top">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNoteToDelete(note.id);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Conteúdo da Anotação */}
                      {note.content && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-normal">
                          {note.content}
                        </p>
                      )}
                    </div>

                    {/* Rodapé: Data */}
                    <div className="mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                      <span>
                        {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão Padronizado */}
      <ConfirmModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDeleteNote}
        title="Excluir Anotação"
        message="Tem certeza que deseja excluir permanentemente esta anotação? Esta ação não poderá ser desfeita."
        confirmText="Excluir Anotação"
        cancelText="Cancelar"
        type="danger"
        loading={isDeleting}
      />
    </WidgetContainer>
  );
};
