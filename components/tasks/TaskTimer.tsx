import React, { useState, useEffect } from 'react';
import { TaskStatus } from '../../types';
import { Play, Pause, CheckCircle2, Clock } from 'lucide-react';

interface TaskTimerProps {
  status: TaskStatus;
  timerStartedAt?: string | null;
  totalTimeSpentSeconds?: number | null;
  variant?: 'table' | 'kanban' | 'detail';
  className?: string;
}

export const formatDuration = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

export const TaskTimer: React.FC<TaskTimerProps> = ({
  status,
  timerStartedAt,
  totalTimeSpentSeconds = 0,
  variant = 'table',
  className = ''
}) => {
  const isRunning = status === TaskStatus.INICIADA && !!timerStartedAt;
  const baseSeconds = totalTimeSpentSeconds || 0;

  const calculateElapsed = () => {
    if (isRunning && timerStartedAt) {
      const startTime = new Date(timerStartedAt).getTime();
      const now = Date.now();
      const currentSessionSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      return baseSeconds + currentSessionSeconds;
    }
    return baseSeconds;
  };

  const [displaySeconds, setDisplaySeconds] = useState<number>(calculateElapsed);

  useEffect(() => {
    // Atualiza imediatamente quando as props mudam
    setDisplaySeconds(calculateElapsed());

    if (!isRunning) return;

    // Tique-taque em tempo real a cada 1 segundo
    const interval = setInterval(() => {
      setDisplaySeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerStartedAt, totalTimeSpentSeconds, status]);

  const formattedTime = formatDuration(displaySeconds);

  // Se for Pendente e nunca foi iniciada (0s), exibe de forma sutil
  if (status === TaskStatus.PENDENTE && displaySeconds === 0 && variant === 'table') {
    return (
      <div 
        className={`inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono ${className}`}
        title="Tempo trabalhado: 00:00"
      >
        <Clock size={10} className="text-slate-300 dark:text-slate-600" />
        <span>00:00</span>
      </div>
    );
  }

  // Estilos conforme o status
  if (isRunning) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-all ${
          variant === 'kanban'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm'
        } ${className}`}
        title="Cronômetro em execução (Tempo Real)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <Play size={10} className="fill-current stroke-none shrink-0" />
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (status === TaskStatus.PAUSADA) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-all ${
          variant === 'kanban'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 shadow-sm'
        } ${className}`}
        title="Cronômetro pausado (Tempo preservado)"
      >
        <Pause size={10} className="fill-current stroke-none shrink-0 text-amber-500" />
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (status === TaskStatus.CONCLUIDA) {
    return (
      <div
        className={`inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 ${className}`}
        title={`Tempo total de execução: ${formattedTime}`}
      >
        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
        <span className="font-semibold">{formattedTime}</span>
      </div>
    );
  }

  // Padrão para outros status (Pendente com tempo acumulado ou Atrasada)
  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 ${className}`}
      title={`Tempo decorrido acumulado: ${formattedTime}`}
    >
      <Clock size={10} className="text-slate-400 shrink-0" />
      <span>{formattedTime}</span>
    </div>
  );
};
