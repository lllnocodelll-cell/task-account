import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

const MAX_TAG_LENGTH = 120;
const COLLAPSE_THRESHOLD = 15;

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagValue, setTagValue] = useState(initialTag || '');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    setTagValue(initialTag || '');
    if (!initialTag || initialTag.length <= COLLAPSE_THRESHOLD) {
      setIsExpanded(false);
    }
  }, [initialTag]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
      adjustTextareaHeight();
    }
  }, [isEditing, adjustTextareaHeight]);

  useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [tagValue, isEditing, adjustTextareaHeight]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
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
      setIsExpanded(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div 
        ref={containerRef}
        className="flex flex-col gap-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 rounded-lg p-1.5 shadow-lg relative z-20"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-1.5">
          <Tag size={10} className="text-indigo-500 dark:text-indigo-400 mt-1 shrink-0" />
          <textarea
            ref={textareaRef}
            rows={1}
            value={tagValue}
            onChange={e => setTagValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_TAG_LENGTH}
            disabled={isSaving}
            placeholder="Ex: Aguardando envio de documentos..."
            className="text-[10px] leading-snug w-[140px] sm:w-[165px] resize-none overflow-y-auto outline-none bg-transparent text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip content="Salvar Tag (Enter)" position="top">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
              >
                <Check size={12} />
              </button>
            </Tooltip>
            <Tooltip content="Cancelar (Esc)" position="top">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTagValue(initialTag || '');
                }}
                disabled={isSaving}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X size={12} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center justify-end px-0.5">
          <span className={`text-[8px] font-medium ${tagValue.length >= MAX_TAG_LENGTH ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
            {tagValue.length}/{MAX_TAG_LENGTH}
          </span>
        </div>
      </div>
    );
  }

  if (initialTag) {
    const canExpand = initialTag.length > COLLAPSE_THRESHOLD;

    return (
      <div 
        className={`group relative flex ${isExpanded ? 'items-start py-1' : 'items-center py-0.5'} gap-1 px-2 bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30 rounded-md shadow-sm cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all`}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Tag size={9} className={`opacity-70 shrink-0 ${isExpanded ? 'mt-0.5' : ''}`} />
        <span
          className={
            isExpanded
              ? `whitespace-normal break-words text-left leading-relaxed ${isKanban ? 'max-w-[180px]' : 'max-w-[220px]'}`
              : 'truncate max-w-[100px]'
          }
        >
          {initialTag}
        </span>

        <div className={`flex items-center gap-0.5 ml-0.5 shrink-0 ${isExpanded ? 'mt-0.5' : ''}`}>
          {canExpand && (
            <Tooltip content={isExpanded ? 'Recolher Tag' : 'Ver tag na íntegra'} position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(prev => !prev);
                }}
                className="p-0.5 rounded text-indigo-500 dark:text-indigo-300 hover:bg-indigo-200/60 dark:hover:bg-indigo-500/30 hover:text-indigo-700 dark:hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </Tooltip>
          )}

          <Tooltip content="Remover Tag" position="top">
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100/70 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <X size={10} />
            </button>
          </Tooltip>
        </div>
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
