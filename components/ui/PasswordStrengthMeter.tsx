import React from 'react';
import { Check, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
  bgClass: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function analyzePassword(pwd: string): PasswordAnalysis {
  const minLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (pwd.length >= 6) score++;
  if (minLength) score++;
  if (hasUppercase) score++;
  if (hasNumber || hasSpecialChar) score++;

  // Se tiver todos os 4 critérios fortes, garante score 4
  if (minLength && hasUppercase && hasNumber && hasSpecialChar) {
    score = 4;
  }

  const levels: Record<number, { label: string; colorClass: string; bgClass: string }> = {
    0: { label: '', colorClass: 'text-slate-400', bgClass: 'bg-slate-200 dark:bg-slate-800' },
    1: { label: 'Senha fraca', colorClass: 'text-red-500', bgClass: 'bg-red-500' },
    2: { label: 'Senha moderada', colorClass: 'text-amber-500', bgClass: 'bg-amber-500' },
    3: { label: 'Senha boa', colorClass: 'text-sky-500', bgClass: 'bg-sky-500' },
    4: { label: 'Senha excelente e segura', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500' },
  };

  const current = levels[score] || levels[0];

  return {
    score,
    label: current.label,
    colorClass: current.colorClass,
    bgClass: current.bgClass,
    requirements: {
      minLength,
      hasUppercase,
      hasNumber,
      hasSpecialChar,
    }
  };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
  className = ''
}) => {
  if (!password) return null;

  const analysis = analyzePassword(password);

  return (
    <div className={`space-y-2 mt-1.5 ${className}`}>
      {/* Barra de 4 Segmentos */}
      <div className="flex items-center gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => {
          let stepBg = 'bg-slate-200 dark:bg-slate-800';
          if (analysis.score >= step) {
            if (analysis.score === 1) stepBg = 'bg-red-500';
            else if (analysis.score === 2) stepBg = 'bg-amber-500';
            else if (analysis.score === 3) stepBg = 'bg-sky-500';
            else stepBg = 'bg-emerald-500';
          }

          return (
            <div
              key={step}
              className={`flex-1 h-full rounded-full transition-all duration-300 ${stepBg}`}
            />
          );
        })}
      </div>

      {/* Label de Força */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold transition-colors duration-200 flex items-center gap-1 ${analysis.colorClass}`}>
          {analysis.score >= 4 ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
          {analysis.label}
        </span>
        <span className="text-[10px] text-slate-400">
          Nível {analysis.score} de 4
        </span>
      </div>

      {/* Requisitos */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1.5">
            {analysis.requirements.minLength ? (
              <Check size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 ml-0.5" />
            )}
            <span className={analysis.requirements.minLength ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}>
              Mínimo 8 caracteres
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {analysis.requirements.hasUppercase ? (
              <Check size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 ml-0.5" />
            )}
            <span className={analysis.requirements.hasUppercase ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}>
              Letra maiúscula (A-Z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {analysis.requirements.hasNumber ? (
              <Check size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 ml-0.5" />
            )}
            <span className={analysis.requirements.hasNumber ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}>
              Número (0-9)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {analysis.requirements.hasSpecialChar ? (
              <Check size={12} className="text-emerald-500 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 ml-0.5" />
            )}
            <span className={analysis.requirements.hasSpecialChar ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}>
              Símbolo especial (@, #, ...)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
