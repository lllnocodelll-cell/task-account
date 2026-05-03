import React, { useState, useRef, useEffect } from 'react';
import { Tag, Check, X, Edit2 } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface TaskTagEditorProps {
  taskId: string;
  initialTag?: string;
  onSave: (taskId: string, newTag: string | null) => Promise<void>;
  isKanban?: boolean;
}

export const TaskTagEditor: React.FC<TaskTagEditorProps> = ({
  taskId,
  initialTag,
  onSave,
  isKanban = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tagValue, setTagValue] = useState(initialTag || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTagValue(initialTag || '');
  }, [initialTag]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setTagValue(initialTag || ''); // revert
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, initialTag]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const valToSave = tagValue.trim();
      await onSave(taskId, valToSave || null);
      setIsEditing(false);
    } catch (e) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTagValue(initialTag || '');
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await onSave(taskId, null);
      setTagValue('');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div 
        ref={containerRef}
        className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1 shadow-lg relative z-20"
        onClick={e => e.stopPropagation()}
      >
        <Tag size={10} className="text-slate-400 ml-1" />
        <input
          ref={inputRef}
          type="text"
          value={tagValue}
          onChange={e => setTagValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={30}
          disabled={isSaving}
          placeholder="Ex: Falta documentos"
          className="text-[10px] w-[110px] outline-none bg-transparent dark:text-white"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
        >
          <Check size={12} />
        </button>
        <button
          onClick={() => {
            setIsEditing(false);
            setTagValue(initialTag || '');
          }}
          disabled={isSaving}
          className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  if (initialTag) {
    return (
      <div 
        className="group relative flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30 rounded-md shadow-sm cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Tag size={9} className="opacity-70" />
        <span className="truncate max-w-[100px]">{initialTag}</span>
        <Tooltip content="Remover Tag" position="top">
          <button
            onClick={handleClear}
            className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
          >
            <X size={10} />
          </button>
        </Tooltip>
      </div>
    );
  }

  // Not editing, no tag
  return (
    <Tooltip content="Adicionar Tag" position="top">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all text-[9px] font-bold"
      >
        <Tag size={9} />
        <span>+ Tag</span>
      </button>
    </Tooltip>
  );
};
