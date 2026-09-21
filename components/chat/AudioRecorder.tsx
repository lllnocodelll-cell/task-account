import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2, RefreshCw } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface AudioRecorderProps {
  onSendAudio: (blob: Blob, durationSeconds: number) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onSendAudio,
  onCancel,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const finalDurationRef = useRef<number>(0);

  // Determinar formato suportado pelo browser
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Formatação MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Limpeza completa de streams e áudio
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (analyserStreamRef.current) {
      analyserStreamRef.current.getTracks().forEach((track) => track.stop());
      analyserStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Monitorar níveis de volume para o visualizador de onda sonora
  const monitorAudioLevel = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const count = Math.min(dataArray.length, 16);
        for (let i = 0; i < count; i++) {
          sum += dataArray[i];
        }
        const avg = sum / count;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('Não foi possível iniciar monitor de volume de áudio:', e);
    }
  };

  // Iniciar gravação com áudio limpo, natural e sem artefatos metálicos
  const startRecording = async () => {
    try {
      setPermissionError(null);
      cleanupStream();
      audioChunksRef.current = [];
      setElapsedSeconds(0);
      finalDurationRef.current = 0;

      // Desativar noiseSuppression agressivo para evitar som robótico/metálico/picotado
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // EVITA voz metálica e cortes de frequência
          autoGainControl: true,
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      // Clona a stream para o visualizador (assim o Analyser não interfere nos buffers do MediaRecorder)
      try {
        const clonedStream = stream.clone();
        analyserStreamRef.current = clonedStream;
        monitorAudioLevel(clonedStream);
      } catch (err) {
        console.warn('Não foi possível clonar a stream para o analisador:', err);
      }

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000, // 128 kbps: alta fidelidade de voz
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        setRecordedBlob(blob);
      };

      // Iniciar sem timeslice: o browser gera um container contínuo com timecodes perfeitos
      mediaRecorder.start();
      setIsRecording(true);
      setIsPreviewing(false);

      // Cronômetro baseado no relógio real absoluto (impede contagem de 2 em 2 segundos)
      startTimeRef.current = Date.now();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);
        finalDurationRef.current = elapsed;
      }, 250);
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Permissão para uso do microfone foi negada.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('Nenhum microfone detectado no dispositivo.');
      } else {
        setPermissionError('Não foi possível iniciar a gravação de áudio.');
      }
    }
  };

  useEffect(() => {
    startRecording();
    return () => {
      cleanupStream();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pausar gravação e entrar em modo de prévia
  const handleStopAndPreview = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const actualMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        setRecordedBlob(blob);
        setIsRecording(false);
        setIsPreviewing(true);
        cleanupStream();
      };
      mediaRecorderRef.current.stop();
    }
  };

  // Descartar gravação
  const handleCancel = () => {
    cleanupStream();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setRecordedBlob(null);
    onCancel();
  };

  // Reproduzir / Pausar prévia do áudio
  const handleTogglePreviewPlay = () => {
    if (!recordedBlob) return;

    if (!previewAudioRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch((e) => {
        console.error('Erro ao tocar prévia:', e);
      });
    }
  };

  // Regravar do zero
  const handleRestart = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    setRecordedBlob(null);
    setIsPreviewing(false);
    setPreviewCurrentTime(0);
    startRecording();
  };

  // Confirmar e Enviar
  const handleConfirmSend = async () => {
    if (disabled || isUploading) return;
    setIsUploading(true);

    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      let blobToSend = recordedBlob;

      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => {
            const actualMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const blob = new Blob(audioChunksRef.current, { type: actualMime });
            setRecordedBlob(blob);
            blobToSend = blob;
            cleanupStream();
            resolve();
          };
          mediaRecorderRef.current.stop();
        });
      }

      if (!blobToSend && audioChunksRef.current.length > 0) {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        blobToSend = new Blob(audioChunksRef.current, { type: mime });
      }

      if (!blobToSend || blobToSend.size === 0) {
        throw new Error('Nenhum áudio foi capturado.');
      }

      const duration = Math.max(1, finalDurationRef.current || elapsedSeconds);
      await onSendAudio(blobToSend, duration);
      handleCancel();
    } catch (err) {
      console.error('Erro ao processar envio do áudio:', err);
      setIsUploading(false);
    }
  };

  // Tela de erro de permissão
  if (permissionError) {
    return (
      <div className="flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded-xl text-rose-700 dark:text-rose-300 text-xs w-full animate-fadeIn">
        <div className="flex items-center gap-2">
          <Mic size={18} className="text-rose-500 shrink-0" />
          <span>{permissionError}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={startRecording}
            className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 rounded-lg font-semibold transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>Tentar novamente</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 w-full transition-all shadow-xs animate-fadeIn">
      {/* Botão de Cancelar / Descartar (Lixeira) */}
      <Tooltip content="Descartar gravação" position="top">
        <button
          type="button"
          onClick={handleCancel}
          disabled={disabled || isUploading}
          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all active:scale-95 shrink-0"
          aria-label="Descartar áudio"
        >
          <Trash2 size={18} />
        </button>
      </Tooltip>

      {/* Área Central: Ondas Sonoras e Temporizador */}
      <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 px-2 overflow-hidden">
        {/* Indicador de Status / Prévia */}
        <div className="flex items-center gap-2 shrink-0">
          {isPreviewing ? (
            <button
              type="button"
              onClick={handleTogglePreviewPlay}
              className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 shadow-sm"
              title={isPreviewPlaying ? 'Pausar prévia' : 'Ouvir prévia'}
            >
              {isPreviewPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hidden sm:inline">
                Gravando
              </span>
            </div>
          )}

          {/* Temporizador */}
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
            {isPreviewing ? formatTime(previewCurrentTime || elapsedSeconds) : formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Visualizador de Ondas Sonoras / Barras Animadas */}
        <div className="flex-1 flex items-center justify-center gap-1 h-8 max-w-[280px] sm:max-w-[360px] overflow-hidden px-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const baseHeight = 15;
            let dynamicHeight = baseHeight;

            if (!isPreviewing && isRecording) {
              const variance = Math.sin((i + audioLevel / 10) * 0.8) * 12;
              const scale = audioLevel > 5 ? (audioLevel / 100) * 28 : 2;
              dynamicHeight = Math.max(12, Math.min(32, baseHeight + variance + scale));
            } else if (isPreviewing) {
              const progressPct = elapsedSeconds > 0 ? (previewCurrentTime / elapsedSeconds) * 100 : 0;
              const barPct = (i / 24) * 100;
              const isPlayed = barPct <= progressPct;
              dynamicHeight = Math.sin(i * 0.4) * 8 + 16;

              return (
                <div
                  key={i}
                  style={{ height: `${dynamicHeight}px` }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPlayed ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              );
            }

            return (
              <div
                key={i}
                style={{ height: `${dynamicHeight}px` }}
                className="w-1 rounded-full bg-indigo-500/80 dark:bg-indigo-400/80 transition-all duration-75"
              />
            );
          })}
        </div>

        {/* Botão de Pausar e Ouvir Prévia (quando gravando) ou Regravar (quando na prévia) */}
        {!isPreviewing ? (
          <Tooltip content="Pausar e ouvir antes de enviar" position="top">
            <button
              type="button"
              onClick={handleStopAndPreview}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Square size={14} className="fill-current" />
              <span className="hidden md:inline">Ouvir prévia</span>
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Gravar novamente" position="top">
            <button
              type="button"
              onClick={handleRestart}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <RefreshCw size={13} />
              <span className="hidden md:inline">Regravar</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Botão de Enviar Áudio */}
      <Tooltip content="Enviar áudio" position="top">
        <button
          type="button"
          onClick={handleConfirmSend}
          disabled={disabled || isUploading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center shrink-0"
          aria-label="Enviar mensagem de voz"
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} className="relative left-0.5" />
          )}
        </button>
      </Tooltip>
    </div>
  );
};
