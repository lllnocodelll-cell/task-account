/**
 * Utilitário de Efeitos Sonoros usando Web Audio API nativa.
 * Sem necessidade de carregar arquivos externos (.mp3/.wav).
 */

class SoundEffectManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Toca um chime suave e elegante de dois tons (587Hz -> 880Hz)
   * Ideal para notificações discretas no ambiente de trabalho contábil.
   */
  playNotificationSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1º Tom (Ré 5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);

      // 2º Tom mais agudo (Lá 5 - 880.00 Hz) para efeito harmônico
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.08);

      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.55);
    } catch (e) {
      // Ignorar erros de áudio silenciosamente se o navegador restringir
    }
  }
}

export const soundEffects = new SoundEffectManager();
