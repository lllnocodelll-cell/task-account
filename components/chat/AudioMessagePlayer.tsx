import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Download, Volume2, AlertCircle } from 'lucide-react';

interface AudioMessagePlayerProps {
  src: string;
  duration?: number;
  isMe?: boolean;
  fileName?: string;
}

// Canal global para pausar áudios concorrentes
const GLOBAL_AUDIO_CHANNEL = 'taskaccount_active_audio';

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  src,
  duration: initialDuration,
  isMe = false,
  fileName,
}) => {
  const playerId = useMemo(() => `audio-${Math.random().toString(36).substring(2, 9)}`, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Formatar segundos em MM:SS
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Gerar barras de amplitude consistentes e determinísticas com base na URL
  const waveformBars = useMemo(() => {
    const barsCount = 28;
    const bars: number[] = [];
    let seed = 0;
    for (let i = 0; i < src.length; i++) {
      seed = (seed + src.charCodeAt(i) * (i + 1)) % 1000;
    }

    for (let i = 0; i < barsCount; i++) {
      // Cria uma curva orgânica com picos e vales
      const pseudoRandom = Math.sin((seed + i * 17) * 0.5) * 0.5 + 0.5;
      const height = Math.round(10 + pseudoRandom * 22); // Entre 10px e 32px
      bars.push(height);
    }
    return bars;
  }, [src]);

  // Listener para pausar se outro player começar
  useEffect(() => {
    const handleGlobalPlay = (e: CustomEvent<{ id: string }>) => {
      if (e.detail?.id !== playerId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener(GLOBAL_AUDIO_CHANNEL as any, handleGlobalPlay as any);
    return () => {
      window.removeEventListener(GLOBAL_AUDIO_CHANNEL as any, handleGlobalPlay as any);
    };
  }, [playerId]);

  // Carregar metadados e duração
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (audioDuration && !isNaN(audioDuration) && isFinite(audioDuration)) {
        setDuration(Math.round(audioDuration));
      }
    }
  };

  // Alternar Play / Pause
  const togglePlay = useCallback(async () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      // Notifica outros players para pausarem
      window.dispatchEvent(new CustomEvent(GLOBAL_AUDIO_CHANNEL, { detail: { id: playerId } }));

      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Erro ao reproduzir áudio:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying, playerId, hasError]);

  // Ciclar velocidade de reprodução (1x -> 1.5x -> 2x)
  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  // Pular para o ponto clicado no waveform (Scrubbing)
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current || !duration) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = clickRatio * duration;

    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);

    if (!isPlaying) {
      togglePlay();
    }
  };

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${isMe ? 'bg-indigo-700/50 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
        <AlertCircle size={16} className="text-rose-400 shrink-0" />
        <span>Não foi possível carregar o áudio.</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="ml-auto underline text-[11px] opacity-80 hover:opacity-100">
          Baixar
        </a>
      </div>
    );
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex flex-col gap-1.5 py-1 px-1 sm:px-1.5 min-w-[240px] max-w-[320px] select-none ${isMe ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setHasError(true)}
      />

      <div className="flex items-center gap-2.5">
        {/* Botão Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
            isMe
              ? 'bg-white text-indigo-700 hover:bg-indigo-50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
          }`}
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? (
            <Pause size={16} className="fill-current" />
          ) : (
            <Play size={16} className="fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform Interativo */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="flex-1 flex items-center gap-[3px] h-9 cursor-pointer py-1 group"
          title="Clique para avançar ou retroceder"
        >
          {waveformBars.map((height, i) => {
            const barPct = (i / waveformBars.length) * 100;
            const isPlayed = barPct <= progressPct;

            return (
              <div
                key={i}
                style={{ height: `${height}px` }}
                className={`w-[3px] sm:w-[4px] rounded-full transition-all duration-75 group-hover:opacity-90 ${
                  isMe
                    ? isPlayed
                      ? 'bg-white shadow-2xs'
                      : 'bg-indigo-400/50'
                    : isPlayed
                    ? 'bg-indigo-600 dark:bg-indigo-400 shadow-2xs'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Botão de Velocidade (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 transition-all active:scale-90 ${
            isMe
              ? 'bg-indigo-700/60 hover:bg-indigo-700 text-white border border-indigo-400/40'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
          }`}
          title="Mudar velocidade de reprodução"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Linha Inferior: Tempo Decorrido & Ícone */}
      <div className="flex items-center justify-between px-1 text-[10px] font-medium font-mono tabular-nums opacity-85">
        <span>{formatTime(currentTime)}</span>
        <div className="flex items-center gap-2">
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
