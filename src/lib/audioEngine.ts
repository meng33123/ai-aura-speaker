const FFT_SIZE = 2048;
const SMOOTHING = 0.75;
const BASS_LOW_HZ = 35;
const BASS_HIGH_HZ = 180;
const MIN_BEAT_GAP_MS = 260;
const MAX_INTERVAL_MS = 1500;
const MIN_INTERVAL_MS = 260;
const HISTORY_SIZE = 64;

export interface RhythmFrame {
  tempoEstimate: number;
  beatStrength: number;
  visualStrength: number;
  bassEnergy: number;
  beatDetected: boolean;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  spectrum: Uint8Array;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private attachedKey: object | null = null;
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  private lastEnergy = 0;
  private energyHistory: number[] = [];
  private bassHistory: number[] = [];

  private mean(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  private stdDev(nums: number[], avg: number): number {
    if (nums.length === 0) return 0;
    const variance =
      nums.reduce((sum, n) => sum + (n - avg) * (n - avg), 0) / nums.length;
    return Math.sqrt(variance);
  }

  private estimateTempo(): number {
    if (this.beatIntervals.length < 3) return 108;
    const sorted = [...this.beatIntervals].sort((a, b) => a - b);
    const core = sorted.slice(1, -1);
    const avg =
      core.length > 0
        ? core.reduce((a, b) => a + b, 0) / core.length
        : sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const bpm = Math.round(60000 / Math.max(MIN_INTERVAL_MS, avg));
    return Math.max(60, Math.min(190, bpm));
  }

  attachMedia(audio: HTMLAudioElement): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    const key = audio as unknown as object;
    if (this.source && this.attachedKey === key && this.analyser) {
      return;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    this.source = this.ctx.createMediaElementSource(audio);
    this.attachedKey = key;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = SMOOTHING;
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }
  }

  getFrame(nowMs: number): RhythmFrame | null {
    if (!this.analyser || !this.ctx) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const spectrum = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(spectrum);

    const nyquist = this.ctx.sampleRate / 2;
    const binHz = nyquist / bufferLength;

    const bandEnergy = (lowHz: number, highHz: number) => {
      const i0 = Math.floor(lowHz / binHz);
      const i1 = Math.min(bufferLength - 1, Math.ceil(highHz / binHz));
      let sum = 0;
      let n = 0;
      for (let i = i0; i <= i1; i++) {
        sum += spectrum[i] ?? 0;
        n++;
      }
      return n ? sum / n / 255 : 0;
    };

    const bassEnergy = bandEnergy(BASS_LOW_HZ, BASS_HIGH_HZ);
    const lowEnergy = bandEnergy(20, 120);
    const midEnergy = bandEnergy(120, 2000);
    const highEnergy = bandEnergy(2000, 8000);

    // Favor bass for lighting/beat response.
    const instantEnergy = bassEnergy * 0.72 + midEnergy * 0.2 + highEnergy * 0.08;
    this.energyHistory.push(instantEnergy);
    if (this.energyHistory.length > HISTORY_SIZE) this.energyHistory.shift();

    this.bassHistory.push(bassEnergy);
    if (this.bassHistory.length > HISTORY_SIZE) this.bassHistory.shift();

    const avgEnergy = this.mean(this.energyHistory);
    const stdEnergy = this.stdDev(this.energyHistory, avgEnergy);

    // Onset/flux: instantaneous energy difference.
    const delta = instantEnergy - this.lastEnergy;
    const flux = Math.max(0, delta);
    this.lastEnergy = this.lastEnergy * 0.82 + instantEnergy * 0.18;

    const dynamicThreshold = Math.max(0.08, avgEnergy + stdEnergy * 0.9);
    const fluxThreshold = Math.max(0.015, stdEnergy * 0.45);
    const beatDetected =
      instantEnergy > dynamicThreshold &&
      flux > fluxThreshold &&
      nowMs - this.lastBeatTime > MIN_BEAT_GAP_MS;

    if (beatDetected) {
      const interval = nowMs - this.lastBeatTime;
      if (interval > MIN_INTERVAL_MS && interval < MAX_INTERVAL_MS) {
        this.beatIntervals.push(interval);
        if (this.beatIntervals.length > 16) this.beatIntervals.shift();
      }
      this.lastBeatTime = nowMs;
    }

    const tempoEstimate = this.estimateTempo();

    const bassAvg = this.mean(this.bassHistory);
    const bassPeak = this.bassHistory.length
      ? Math.max(...this.bassHistory)
      : bassEnergy;
    const bassRange = Math.max(0.06, bassPeak - bassAvg * 0.85);
    const normalizedBass = Math.max(
      0,
      Math.min(1, (bassEnergy - bassAvg * 0.7) / bassRange)
    );

    // Guarantee 20%~100% dynamic span across different song loudness.
    let visualStrength = Math.max(0.2, Math.min(1, 0.2 + normalizedBass * 0.8));
    const beatStrength = Math.max(
      0,
      Math.min(1, flux / Math.max(0.02, stdEnergy + 0.02))
    );
    if (beatDetected) {
      visualStrength = Math.max(
        visualStrength,
        Math.min(1, 0.65 + Math.min(0.35, flux * 4))
      );
    }

    return {
      tempoEstimate,
      beatStrength,
      visualStrength,
      bassEnergy,
      beatDetected,
      lowEnergy,
      midEnergy,
      highEnergy,
      spectrum,
    };
  }

  dispose(): void {
    try {
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.source = null;
    this.analyser = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
