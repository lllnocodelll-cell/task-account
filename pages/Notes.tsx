import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Pin, Calendar, Save, Loader2, StickyNote, Sticker } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../utils/supabaseClient';

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

const NOTE_COLORS: Record<NoteColor, { bg: string, border: string, borderTop: string, dot: string }> = {
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-700/50',
    borderTop: 'border-t-4 border-t-yellow-400 dark:border-t-yellow-500',
    dot: 'bg-yellow-400'
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-200 dark:border-sky-700/50',
    borderTop: 'border-t-4 border-t-sky-400 dark:border-t-sky-500',
    dot: 'bg-sky-400'
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700/50',
    borderTop: 'border-t-4 border-t-emerald-400 dark:border-t-emerald-500',
    dot: 'bg-emerald-400'
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-700/50',
    borderTop: 'border-t-4 border-t-pink-400 dark:border-t-pink-500',
    dot: 'bg-pink-400'
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-700/50',
    borderTop: 'border-t-4 border-t-violet-400 dark:border-t-violet-500',
    dot: 'bg-violet-400'
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    borderTop: 'border-t-4 border-t-slate-400 dark:border-t-slate-500',
    dot: 'bg-slate-400'
  }
};

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSessionAndNotes();
  }, []);

  const fetchSessionAndNotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotes(user.id);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', uid)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error.message);
    }
  };

  const handleEdit = (note: Note) => {
    setCurrentNote(note);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setCurrentNote({ color: 'yellow', is_pinned: false });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if ((!currentNote.title && !currentNote.content) || !userId) return;

    setSaving(true);
    try {
      if (currentNote.id) {
        // Edit
        const { error } = await supabase
          .from('notes')
          .update({
            title: currentNote.title || 'Sem título',
            content: currentNote.content || '',
            color: currentNote.color || 'yellow',
            is_pinned: currentNote.is_pinned || false
          })
          .eq('id', currentNote.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('notes')
          .insert([{
            user_id: userId,
            title: currentNote.title || 'Sem título',
            content: currentNote.content || '',
            color: currentNote.color || 'yellow',
            is_pinned: currentNote.is_pinned || false,
            is_archived: false
          }]);

        if (error) throw error;
      }

      await fetchNotes(userId); // Refresh notes to get IDs and updated sorting
      setIsModalOpen(false);
      setCurrentNote({});
    } catch (error: any) {
      alert('Erro ao salvar anotação: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const triggerDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteToDelete);
      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      if (currentNote.id === noteToDelete) setIsModalOpen(false);
    } catch (error: any) {
      alert('Erro ao excluir anotação: ' + error.message);
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  const cancelDelete = () => {
    setNoteToDelete(null);
  };

  const togglePin = async (id: string, currentPinStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    // Otimista
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !currentPinStatus } : n)
      .sort((a, b) => (b.is_pinned === a.is_pinned) ? 0 : b.is_pinned ? 1 : -1)
    );

    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      // Reverte em caso de erro
      if (userId) fetchNotes(userId);
      console.error('Erro ao fixar nota:', error);
    }
  };

  const toggleArchive = async (id: string, currentStatus: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation();

    // Otimista
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_archived: !currentStatus, is_pinned: false } : n));

    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_archived: !currentStatus, is_pinned: false })
        .eq('id', id);

      if (error) throw error;
      if (currentNote.id === id) setIsModalOpen(false);
    } catch (error: any) {
      if (userId) fetchNotes(userId);
      console.error('Erro ao arquivar nota:', error);
    }
  };

  const filteredNotes = notes.filter(n => {
    const isArchived = Boolean(n.is_archived);
    const matchesViewMode = viewMode === 'archived' ? isArchived : !isArchived;

    const matchesSearch = (n.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (n.content?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    return matchesViewMode && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <StickyNote size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Anotações
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>

          <div className="flex items-center gap-1 mt-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'active'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Ativas
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'archived'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Arquivadas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Buscar nas anotações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
          <Button onClick={handleCreate} icon={<Plus size={18} />}>Nova Nota</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {filteredNotes.map((note) => {
            const safeColor = (NOTE_COLORS[note.color as NoteColor] || NOTE_COLORS['yellow']);
            return (
              <div
                key={note.id}
                onClick={() => handleEdit(note)}
                className={`group relative flex flex-col p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer min-h-[220px] ${safeColor.bg} ${safeColor.border} ${safeColor.borderTop}`}
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{note.title}</h3>
                  <div className="tooltip-container tooltip-top">
                    <button
                      onClick={(e) => togglePin(note.id, note.is_pinned, e)}
                      className={`shrink-0 p-1.5 rounded-full transition-colors ${note.is_pinned ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
                    >
                      <Pin size={14} className={note.is_pinned ? 'fill-current' : ''} />
                    </button>
                    <span className="tooltip-content">{note.is_pinned ? "Desafixar" : "Fixar"}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-6 flex-1 mb-4">
                  {note.content}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 mt-auto">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(note.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex gap-2">
                    <div className="tooltip-container tooltip-top">
                      <button
                        onClick={(e) => toggleArchive(note.id, note.is_archived, e)}
                        className="text-slate-400 hover:text-indigo-500 p-1 rounded transition-colors"
                      >
                        {note.is_archived ? <Plus size={16} className="rotate-45" /> : <Save size={16} />}
                      </button>
                      <span className="tooltip-content">{note.is_archived ? "Desarquivar" : "Arquivar"}</span>
                    </div>
                    <div className="tooltip-container tooltip-top">
                      <button
                        onClick={(e) => triggerDelete(note.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className="tooltip-content">Excluir</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <Sticker size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                {currentNote.id ? 'Editar Nota' : 'Nova Anotação'}
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
        }
        size="lg"
        footer={
          <>
            {currentNote.id && (
              <div className="flex gap-2 mr-auto">
                <Button
                  variant="danger"
                  onClick={(e) => triggerDelete(currentNote.id!, e as any)}
                  icon={<Trash2 size={16} />}
                  disabled={saving || isDeleting}
                >
                  Excluir
                </Button>
                <Button
                  variant="secondary"
                  onClick={(e) => toggleArchive(currentNote.id!, currentNote.is_archived, e as any)}
                  icon={currentNote.is_archived ? <Plus size={16} className="rotate-45" /> : <Save size={16} />}
                  disabled={saving}
                >
                  {currentNote.is_archived ? 'Desarquivar' : 'Arquivar'}
                </Button>
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            placeholder="Título da nota"
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-bold border-transparent focus:border-indigo-500 px-0 bg-transparent shadow-none rounded-none border-b dark:text-white"
            autoFocus
          />

          <textarea
            placeholder="Digite sua anotação aqui..."
            value={currentNote.content || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
            className="w-full min-h-[200px] p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border-0 focus:ring-0 text-slate-700 dark:text-slate-200 resize-y text-sm leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cores:</span>
              <div className="flex gap-2">
                {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => {
                  const safeColor = NOTE_COLORS[color];
                  return (
                    <button
                      key={color}
                      onClick={() => setCurrentNote(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${safeColor.dot} ${currentNote.color === color
                        ? 'border-indigo-600 dark:border-indigo-400 scale-110 shadow-sm'
                        : 'border-transparent hover:scale-110'
                        }`}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={() => setCurrentNote(prev => ({ ...prev, is_pinned: !prev.is_pinned }))}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${currentNote.is_pinned
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <Pin size={14} className={currentNote.is_pinned ? 'fill-current' : ''} />
              {currentNote.is_pinned ? 'Fixado no topo' : 'Fixar Anotação'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Overlay */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-6 p-8 sm:p-10 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] animate-in zoom-in-95 duration-200 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-rose-500/50 animate-spin [animation-duration:3s]" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-white font-bold text-xl">Excluir Anotação?</h3>
              <p className="text-slate-400 text-sm leading-relaxed px-4">
                Tem certeza que deseja excluir esta nota? Esta ação <strong className="text-rose-400 font-medium">não poderá ser desfeita</strong>.
              </p>
            </div>

            <div className="flex w-full gap-3 mt-2">
              <Button 
                variant="secondary" 
                onClick={cancelDelete} 
                disabled={isDeleting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                variant="danger" 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 shadow-lg shadow-rose-500/20"
                icon={isDeleting ? <Loader2 size={18} className="animate-spin" /> : undefined}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};