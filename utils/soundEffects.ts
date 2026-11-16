/**
 * Utilitário de Efeitos Sonoros otimizado para Desktop e Mobile PWA (iOS Safari / Android Chrome).
 * - Reutiliza um único AudioContext e re-desbloqueia automaticamente após retorno do background.
 * - Gera um WAV PCM em memória como fallback HTML5 <audio> pré-aquecido no gesto do usuário.
 * - Possui debounce anti-rajada para evitar sobreposição em múltiplas mensagens simultâneas.
 */

class SoundEffectManager {
  private audioCtx: AudioContext | null = null;
  private fallbackAudioUrl: string | null = null;
  private fallbackAudioEl: HTMLAudioElement | null = null;
  private lastPlayedAt = 0;
  private isAudioWarmed = false;

  constructor() {
    this.setupAutoUnlock();
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        const ctx = this.ensureAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume()
            .then(() => {
              const buffer = ctx.createBuffer(1, 1, 22050);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(0);
            })
            .catch(() => {});
        }

        // Pré-aquece o elemento <audio> no primeiro gesto válido para liberar reprodução futura no Android/iOS
        const audio = this.ensureFallbackAudio();
        if (audio && !this.isAudioWarmed) {
          this.isAudioWarmed = true;
          const prevMuted = audio.muted;
          audio.muted = true;
          audio.play()
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.muted = prevMuted;
            })
            .catch(() => {
              audio.muted = prevMuted;
              this.isAudioWarmed = false;
            });
        }
      } catch {
        // Ignora silenciosamente
      }
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });

    // No Android/iOS, ao retornar de segundo plano o SO suspende o AudioContext até novo resume()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.audioCtx?.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    });
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Cria em memória um WAV PCM curto com chime suave de dois tons (Ré5 -> Lá5)
   * para uso como fallback confiável em dispositivos móveis.
   */
  private ensureFallbackAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') return null;

    try {
      if (!this.fallbackAudioUrl) {
        const sampleRate = 22050;
        const durationSec = 0.45;
        const numSamples = Math.floor(sampleRate * durationSec);
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        const writeStr = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
          }
        };

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          let sample = 0;

          if (t < 0.25) {
            const env1 = Math.min(1, t / 0.015) * Math.exp(-t * 14);
            sample += Math.sin(2 * Math.PI * 587.33 * t) * 0.22 * env1;
          }
          if (t >= 0.08) {
            const t2 = t - 0.08;
            const env2 = Math.min(1, t2 / 0.015) * Math.exp(-t2 * 10);
            sample += Math.sin(2 * Math.PI * 880.0 * t2) * 0.24 * env2;
          }

          const clamped = Math.max(-1, Math.min(1, sample));
          view.setInt16(44 + i * 2, clamped * 0x7fff, true);
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        this.fallbackAudioUrl = URL.createObjectURL(blob);
      }

      if (!this.fallbackAudioEl && this.fallbackAudioUrl) {
        const audio = new Audio(this.fallbackAudioUrl);
        audio.preload = 'auto';
        audio.volume = 0.7;
        (audio as any).playsInline = true;
        this.fallbackAudioEl = audio;
      }

      return this.fallbackAudioEl;
    } catch {
      return null;
    }
  }

  private playViaFallbackAudio() {
    const audio = this.ensureFallbackAudio();
    if (!audio) return;
    try {
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Silencioso
    }
  }

  /**
   * Toca um chime suave de dois tons (587.33 Hz -> 880 Hz).
   */
  playNotificationSound() {
    const nowMs = Date.now();
    if (nowMs - this.lastPlayedAt < 450) {
      return;
    }
    this.lastPlayedAt = nowMs;

    try {
      const ctx = this.ensureAudioContext();
      if (!ctx || ctx.state !== 'running') {
        // Se AudioContext estiver suspenso (ex: pós-background no Android), tenta resumir para próximas
        // e já garante execução imediata pelo canal <audio> HTML5 pré-aquecido
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        this.playViaFallbackAudio();
        return;
      }

      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.14, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.16, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.52);
    } catch {
      this.playViaFallbackAudio();
    }
  }
}

export const soundEffects = new SoundEffectManager();
