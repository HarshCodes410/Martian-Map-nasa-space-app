class MarsAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private windGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private isWindPlaying: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted && this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural synthesized Martian wind based on Perseverance microphone acoustic frequencies
   * (low-density CO2 resonance filtering with slow frequency sweeps).
   */
  public startMarsWind() {
    if (this.isWindPlaying) {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink/Brown noise approximation for thin atmospheric acoustic dispersion
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.3;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low-pass resonant filter (Mars CO2 attenuates high frequencies above 500Hz quickly)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      // Slow gust frequency sweep LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
      lfoGain.gain.setValueAtTime(90, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.windGain = ctx.createGain();
      this.windGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(ctx.destination);

      whiteNoise.start();
      lfo.start();
      this.windSource = whiteNoise;
      this.windLfo = lfo;
      this.isWindPlaying = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public stopMarsWind() {
    if (!this.isWindPlaying) return;
    try {
      this.windSource?.stop();
      this.windLfo?.stop();
      this.windSource?.disconnect();
      this.windLfo?.disconnect();
      this.windGain?.disconnect();
    } catch {
      // Ignore
    }
    this.windSource = null;
    this.windLfo = null;
    this.windGain = null;
    this.isWindPlaying = false;
  }

  /**
   * Futuristic NASA HUD click sound for interactive elements
   */
  public playClick(freq = 880) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  /**
   * Tactical radar ping when locking onto a new science target
   */
  public playRadarPing() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1240, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  /**
   * Hazard alert beep (e.g. slope > 15° or high radiation)
   */
  public playHazardAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now + offset);
        gain.gain.setValueAtTime(0.05, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    } catch {
      // Ignore
    }
  }
}

export const marsAudio = new MarsAudioEngine();
