import React, { useState } from 'react';
import { Plus, Search, Trash2, Pin, Calendar, Save, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'slate';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  color: NoteColor;
  isPinned?: boolean;
}

const NOTE_COLORS: Record<NoteColor, { bg: string, border: string, dot: string }> = {
  yellow: { 
    bg: 'bg-yellow-50 dark:bg-yellow-900/20', 
    border: 'border-yellow-200 dark:border-yellow-700/50',
    dot: 'bg-yellow-400'
  },
  blue: { 
    bg: 'bg-sky-50 dark:bg-sky-900/20', 
    border: 'border-sky-200 dark:border-sky-700/50',
    dot: 'bg-sky-400'
  },
  green: { 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    border: 'border-emerald-200 dark:border-emerald-700/50',
    dot: 'bg-emerald-400'
  },
  pink: { 
    bg: 'bg-pink-50 dark:bg-pink-900/20', 
    border: 'border-pink-200 dark:border-pink-700/50',
    dot: 'bg-pink-400'
  },
  purple: { 
    bg: 'bg-violet-50 dark:bg-violet-900/20', 
    border: 'border-violet-200 dark:border-violet-700/50',
    dot: 'bg-violet-400'
  },
  slate: { 
    bg: 'bg-slate-50 dark:bg-slate-800', 
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400'
  }
};

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'Senha do Certificado A1',
    content: 'Cliente: Mercado Silva\nSenha: 123456\nValidade: 10/2026',
    date: '2025-10-15',
    color: 'yellow',
    isPinned: true
  },
  {
    id: '2',
    title: 'Reunião Diretoria',
    content: 'Pauta: Novos sistemas de integração e meta de redução de custos operacionais.',
    date: '2025-10-18',
    color: 'blue',
    isPinned: false
  },
  {
    id: '3',
    title: 'Lembrete DARF',
    content: 'Verificar se o cliente XYZ pagou a DARF de IRPJ que venceu ontem.',
    date: '2025-10-20',
    color: 'pink',
    isPinned: true
  },
  {
    id: '4',
    title: 'Aniversário Ana (Fiscal)',
    content: 'Comprar bolo e organizar vaquinha. Dia 25/10.',
    date: '2025-10-12',
    color: 'green',
    isPinned: false
  },
  {
    id: '5',
    title: 'Checklist Fechamento',
    content: '- Importar notas\n- Conferir retenções\n- Gerar guias\n- Enviar para cliente',
    date: '2025-10-01',
    color: 'purple',
    isPinned: false
  }
];

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});

  const handleEdit = (note: Note) => {
    setCurrentNote(note);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setCurrentNote({ color: 'yellow', isPinned: false });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentNote.title && !currentNote.content) return;

    if (currentNote.id) {
      // Edit
      setNotes(prev => prev.map(n => n.id === currentNote.id ? { ...n, ...currentNote } as Note : n));
    } else {
      // Create
      const newNote: Note = {
        id: Date.now().toString(),
        title: currentNote.title || 'Sem título',
        content: currentNote.content || '',
        date: new Date().toISOString().split('T')[0],
        color: currentNote.color || 'yellow',
        isPinned: currentNote.isPinned || false,
      };
      setNotes(prev => [newNote, ...prev]);
    }
    setIsModalOpen(false);
    setCurrentNote({});
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta nota?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (currentNote.id === id) setIsModalOpen(false);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anotações</h1>
           <p className="text-slate-500 dark:text-slate-400">Lembretes rápidos e informações importantes</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create Card Button (Visual) */}
        <button 
          onClick={handleCreate}
          className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3">
            <Plus size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">Criar nova nota</p>
        </button>

        {filteredNotes.map((note) => (
          <div
            key={note.id}
            onClick={() => handleEdit(note)}
            className={`group relative flex flex-col p-5 rounded-xl border transition-all duration-300 hover:shadow-md cursor-pointer min-h-[200px] ${NOTE_COLORS[note.color].bg} ${NOTE_COLORS[note.color].border}`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{note.title}</h3>
              <button 
                onClick={(e) => togglePin(note.id, e)}
                className={`p-1.5 rounded-full transition-colors ${note.isPinned ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100'}`}
                title={note.isPinned ? "Desafixar" : "Fixar"}
              >
                <Pin size={14} className={note.isPinned ? 'fill-current' : ''} />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-6 flex-1 mb-4">
              {note.content}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 mt-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                 <Calendar size={12} /> {new Date(note.date).toLocaleDateString('pt-BR')}
              </span>
              <button 
                onClick={(e) => handleDelete(note.id, e)}
                className="text-slate-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentNote.id ? 'Editar Nota' : 'Nova Nota'}
        footer={
          <>
            {currentNote.id && (
              <Button 
                variant="danger" 
                className="mr-auto bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40" 
                onClick={(e) => handleDelete(currentNote.id!, e as any)}
                icon={<Trash2 size={16} />}
              >
                Excluir
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} icon={<Save size={16} />}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            placeholder="Título da nota" 
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-bold border-transparent focus:border-indigo-500 px-0 bg-transparent shadow-none rounded-none border-b"
            autoFocus
          />
          
          <textarea
            placeholder="Digite sua anotação aqui..."
            value={currentNote.content || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
            className="w-full min-h-[200px] p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border-0 focus:ring-0 text-slate-700 dark:text-slate-200 resize-none text-sm leading-relaxed"
          />

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-medium text-slate-500">Cor:</span>
            <div className="flex gap-2">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentNote(prev => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${NOTE_COLORS[color].dot} ${
                    currentNote.color === color 
                      ? 'border-indigo-600 scale-110 shadow-sm' 
                      : 'border-transparent hover:scale-110'
                  }`}
                  title={color}
                />
              ))}
            </div>
            
            <div className="flex-1"></div>

            <button
               onClick={() => setCurrentNote(prev => ({ ...prev, isPinned: !prev.isPinned }))}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                 currentNote.isPinned 
                   ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                   : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
               }`}
            >
               <Pin size={12} className={currentNote.isPinned ? 'fill-current' : ''} />
               {currentNote.isPinned ? 'Fixado' : 'Fixar Nota'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};