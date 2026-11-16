/**
 * Web Audio API based Sound Manager
 * Pure synthesizer sounds - zero external audio asset dependencies, guaranteed offline reliability.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(enable) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, decay = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  playTick() {
    this.playTone(880, 'sine', 0.05, 0.03);
  }

  playWarning() {
    // 5-second urgent pulse
    this.playTone(987.77, 'square', 0.12, 0.08); // B5 note
  }

  playTimeout() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    } catch (e) {}
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    // Chime: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.35, 0.12);
      }, i * 90);
    });
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    // Low dissonant buzz
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(165, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.45);
      osc2.stop(this.ctx.currentTime + 0.45);
    } catch (e) {}
  }

  playPass() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    // Gentle transition chime
    const notes = [440, 554.37];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.2, 0.08);
      }, i * 80);
    });
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    // Grand celebration fanfare
    const notes = [
      { f: 523.25, d: 0.2, t: 0 },
      { f: 523.25, d: 0.2, t: 0.15 },
      { f: 523.25, d: 0.2, t: 0.3 },
      { f: 659.25, d: 0.4, t: 0.45 },
      { f: 783.99, d: 0.3, t: 0.8 },
      { f: 1046.50, d: 0.8, t: 1.1 }
    ];
    notes.forEach(n => {
      setTimeout(() => {
        this.playTone(n.f, 'triangle', n.d, 0.15);
      }, n.t * 1000);
    });
  }
}

// Global sound singleton
const soundManager = new SoundManager();
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SoundManager, soundManager };
}
