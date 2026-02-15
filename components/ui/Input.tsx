import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
        <option value="" disabled selected>Selecione...</option>
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