import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Search, ChevronDown } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  copyable?: boolean;
  error?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  copyable = false,
  error,
  className = '',
  containerClassName = '',
  icon,
  ...props
}) => {
  const [copied, setCopied] = useState(false);

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
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
            ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
            ${icon ? 'pl-10' : ''}
            ${copyable ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {copyable && props.value && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Copiar"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
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
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
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
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface SearchableSelectProps {
  label?: string;
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  error,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
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

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
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
            <div className="max-h-60 overflow-auto py-1 custom-scrollbar">
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors
                      ${opt.value === value ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5 font-medium' : 'text-slate-700 dark:text-slate-200'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-slate-500 text-center">Nenhum resultado</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  value,
  onChange,
  error
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-3 h-10">
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
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};