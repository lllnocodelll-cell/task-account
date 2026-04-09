import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Search, ChevronDown, Info } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CopyButtonProps {
  text: string | number;
  className?: string;
  iconSize?: number;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '', iconSize = 14 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (text) {
      navigator.clipboard.writeText(text.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Tooltip content="Copiar" position="bottom">
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 ${className}`}
      >
        {copied ? <Check size={iconSize} className="text-emerald-500" /> : <Copy size={iconSize} />}
      </button>
    </Tooltip>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  tooltip?: string;
  copyable?: boolean;
  error?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  tooltip,
  copyable = false,
  error,
  className = '',
  containerClassName = '',
  icon,
  ...props
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.value) {
      navigator.clipboard.writeText(props.value.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center gap-1.5 h-5">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none">{label}</label>
          {tooltip && (
            <Tooltip content={tooltip} position="top">
              <Info size={12} className="text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
            </Tooltip>
          )}
        </div>
      )}
      {props.disabled ? (
        <div className="relative group flex items-center min-h-[40px] px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
          {icon && (
            <div className="mr-2 text-slate-400 dark:text-slate-500">
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
            {props.value || '-'}
          </span>
          {props.value && (
            <Tooltip content="Copiar" position="bottom">
              <button
                type="button"
                onClick={handleCopy}
                className="ml-auto p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-white dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </Tooltip>
          )}
        </div>
      ) : (
        <div className="relative group/date group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={inputRef}
            className={`w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
              ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
              ${icon ? 'pl-10' : ''}
              ${copyable ? 'pr-10' : ''}
              ${props.type === 'month' ? 'text-transparent cursor-pointer' : 'text-slate-900 dark:text-slate-100'}
              ${props.type === 'month' || props.type === 'date' || props.type === 'time' ? 'dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-opacity' : ''}
              ${className}
            `}
            {...props}
            title={(props.type === 'month' || props.type === 'date' || props.type === 'time') ? "" : props.title}
          />
          {props.type === 'month' && (
            <div className={`absolute left-[1px] top-[1px] bottom-[1px] right-10 bg-white dark:bg-slate-900 flex items-center pointer-events-none rounded-l-lg ${icon ? 'pl-10' : 'pl-3'}`}>
              <span className="text-[12px] font-medium text-slate-900 dark:text-slate-100">
                {props.value ? `${String(props.value).split('-')[1]}/${String(props.value).split('-')[0]}` : ''}
              </span>
            </div>
          )}
          {copyable && props.value && (
            <Tooltip content="Copiar" position="top">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </Tooltip>
          )}
          {(props.type === 'month' || props.type === 'date' || props.type === 'time') && (
            <div
              className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center group/datepicker pointer-events-none"
            >
              {/* Tooltip CSS puro — não interfere no layout */}
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-medium rounded shadow-xl border border-slate-700/50 whitespace-nowrap opacity-0 group-hover/datepicker:opacity-100 transition-opacity duration-150 pointer-events-none z-[9999]">
                Mostrar seletor de datas
                <div className="absolute top-full right-3 border-[4px] border-transparent border-t-slate-900 dark:border-t-slate-800" />
              </div>
            </div>
          )}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      {props.disabled ? (
        <div className="relative group flex items-start min-h-[80px] px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words whitespace-pre-wrap">
            {props.value || '-'}
          </span>
        </div>
      ) : (
        <textarea
          className={`w-full min-h-[80px] rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y
            ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
            ${className}
          `}
          {...props}
        />
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  tooltip?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedOption = options.find(opt => opt.value === props.value);
  const displayValue = selectedOption ? selectedOption.label : '-';

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      {label && (
        <div className="flex items-center gap-1.5 h-5">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none">{label}</label>
          {props.tooltip && (
            <Tooltip content={props.tooltip} position="top">
              <Info size={12} className="text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
            </Tooltip>
          )}
        </div>
      )}
      {props.disabled ? (
        <div className="relative group flex items-center min-h-[40px] px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
            {displayValue}
          </span>
          {displayValue !== '-' && (
            <button
              type="button"
              onClick={(e) => handleCopy(e, displayValue)}
              className="group/tooltip relative ml-auto p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-white dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <div className="absolute top-full right-0 mt-2 hidden group-hover/tooltip:block w-max px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                Copiar
                <div className="absolute bottom-full right-2 border-[3px] border-transparent border-b-slate-900 dark:border-b-slate-800" />
              </div>
            </button>
          )}
        </div>
      ) : (
        <select
          className={`w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
          ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} ${className}
        `}
          {...props}
        >
          <option value="" disabled>Selecione...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface SearchableSelectProps {
  label?: string;
  tooltip?: string;
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  error,
  tooltip,
  className = '',
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '-';

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Calcula posição do dropdown baseado no botão trigger
  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownH = 280; // altura estimada máxima
    const DROPDOWN_MIN_W = 320;
    const width = Math.max(rect.width, DROPDOWN_MIN_W);

    // Decide se abre para baixo ou para cima
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownH && rect.top > dropdownH;

    // Garante que não saia da tela pela direita
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }

    setDropdownStyle({
      position: 'fixed',
      top: openUpward ? rect.top - dropdownH : rect.bottom + 4,
      left,
      width,
      zIndex: 9999,
    });
  };

  const handleOpen = () => {
    updateDropdownPosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        !(document.getElementById('searchable-select-portal')?.contains(target))
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleScroll = () => {
      updateDropdownPosition();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <div
      id="searchable-select-portal"
      style={dropdownStyle}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
    >
      {/* Campo de busca — ESTÁTICO, fora do scroll */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full h-8 pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Lista rolável */}
      <div className="max-h-52 overflow-y-auto py-1 custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value.toString());
                setIsOpen(false);
                setSearch('');
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors
                ${opt.value === value
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5 font-medium'
                  : 'text-slate-700 dark:text-slate-200'
                }`}
            >
              {opt.label}
            </button>
          ))
        ) : (
          <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum resultado</div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center gap-1.5 h-5">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none">{label}</label>
          {tooltip && (
            <Tooltip content={tooltip} position="top">
              <Info size={12} className="text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
            </Tooltip>
          )}
        </div>
      )}
      {disabled ? (
        <div className="relative group flex items-center min-h-[40px] px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
            {displayValue}
          </span>
          {displayValue !== '-' && (
            <button
              type="button"
              onClick={(e) => handleCopy(e, displayValue)}
              className="group/tooltip relative ml-auto p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-white dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <div className="absolute top-full right-0 mt-2 hidden group-hover/tooltip:block w-max px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                Copiar
                <div className="absolute bottom-full right-2 border-[3px] border-transparent border-b-slate-900 dark:border-b-slate-800" />
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => isOpen ? (setIsOpen(false), setSearch('')) : handleOpen()}
            className={`w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-left flex items-center justify-between transition-all
              ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
              ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}
            `}
          >
            <span className={selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  value,
  onChange,
  error,
  disabled
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-3 h-10">
        {disabled ? (
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
            {value ? 'Sim' : 'Não'}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onChange(!value)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
            <span className={`text-sm font-medium ${value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {value ? 'Sim' : 'Não'}
            </span>
          </>
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface GroupedSelectProps {
  label?: string;
  groups: { category: string; options: { value: string | number; label: string }[] }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const GroupedSelect: React.FC<GroupedSelectProps> = ({
  label,
  groups,
  value,
  onChange,
  placeholder = 'Selecione...',
  error,
  className = '',
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  let selectedOption: { value: string | number; label: string } | undefined;
  for (const group of groups) {
    const opt = group.options.find(o => o.value === value);
    if (opt) {
      selectedOption = opt;
      break;
    }
  }
  const displayValue = selectedOption ? selectedOption.label : '-';

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownH = 280;
    const DROPDOWN_MIN_W = 320;
    const width = Math.max(rect.width, DROPDOWN_MIN_W);

    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownH && rect.top > dropdownH;

    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }

    setDropdownStyle({
      position: 'fixed',
      top: openUpward ? rect.top - dropdownH : rect.bottom + 4,
      left,
      width,
      zIndex: 9999,
    });
  };

  const handleOpen = () => {
    updateDropdownPosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        !(document.getElementById('grouped-select-portal')?.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      updateDropdownPosition();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <div
      id="grouped-select-portal"
      style={dropdownStyle}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
    >
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-200 dark:bg-slate-800 sticky top-0 z-10 border-y border-slate-300 dark:border-slate-700/50">
              {group.category}
            </div>
            {group.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value.toString());
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  opt.value === value
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center gap-1.5 h-5">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none">{label}</label>
        </div>
      )}
      {disabled ? (
        <div className="relative group flex items-center min-h-[40px] px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
            {displayValue}
          </span>
        </div>
      ) : (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
            className={`w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-left flex items-center justify-between transition-all
              ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
              ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}
            `}
          >
            <span className={selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};