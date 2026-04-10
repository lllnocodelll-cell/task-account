import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Pin, Calendar, Save, Loader2, StickyNote } from 'lucide-react';
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta nota?')) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== id));
      if (currentNote.id === id) setIsModalOpen(false);
    } catch (error: any) {
      alert('Erro ao excluir anotação: ' + error.message);
    }
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
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <StickyNote size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">
                Anotações
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-2">
                Lembretes rápidos e informações importantes
              </p>
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
          {/* Create Card Button (Visual) */}
          <button
            onClick={handleCreate}
            className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 min-h-[220px] h-full"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3">
              <Plus size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">Criar nova nota</p>
          </button>

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
                      className={`shrink-0 p-1.5 rounded-full transition-colors ${note.is_pinned ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100'}`}
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
                        className="text-slate-400 hover:text-indigo-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {note.is_archived ? <Plus size={16} className="rotate-45" /> : <Save size={16} />}
                      </button>
                      <span className="tooltip-content">{note.is_archived ? "Desarquivar" : "Arquivar"}</span>
                    </div>
                    <div className="tooltip-container tooltip-top">
                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
        title={currentNote.id ? 'Editar Nota' : 'Nova Nota'}
        size="lg"
        footer={
          <>
            {currentNote.id && (
              <div className="flex gap-2 mr-auto">
                <Button
                  variant="danger"
                  onClick={(e) => handleDelete(currentNote.id!, e as any)}
                  icon={<Trash2 size={16} />}
                  disabled={saving}
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
    </div>
  );
};