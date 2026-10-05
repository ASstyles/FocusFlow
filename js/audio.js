/**
 * FocusFlow - Offline Web Audio Synthesizer
 * 100% procedural offline sound generator for ambient study audio & chimes.
 */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.currentAmbient = 'off';
    this.ambientNodes = [];
    this.masterGain = null;
    this.ambientGain = null;
    this.volume = 0.4;
    this.isMuted = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.ambientGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // ==========================================
  // PROCEDURAL AMBIENT SOUND GENERATORS
  // ==========================================

  playAmbient(type) {
    this.stopAmbient();
    if (type === 'off') return;

    this.ensureContext();
    if (!this.ctx) return;

    this.currentAmbient = type;

    switch (type) {
      case 'rain':
        this.createRainGenerator();
        break;
      case 'brown':
        this.createBrownNoiseGenerator();
        break;
      case 'waves':
        this.createOceanWavesGenerator();
        break;
      case 'binaural':
        this.createBinauralGammaGenerator();
        break;
    }
  }

  stopAmbient() {
    this.ambientNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.ambientNodes = [];
    this.currentAmbient = 'off';
  }

  // 1. Synthesized Gentle Rain
  createRainGenerator() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Seamless loop boundary cross-fade
    const fadeLen = 1200;
    for (let i = 0; i < fadeLen; i++) {
      const factor = i / fadeLen;
      output[i] = output[i] * factor + output[bufferSize - fadeLen + i] * (1 - factor);
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(400, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.ambientGain);

    whiteNoise.start();
    this.ambientNodes.push(whiteNoise, filter, highpass, gain);
  }

  // 2. Synthesized Brown Noise (Seamless loop)
  createBrownNoiseGenerator() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    // Cross-fade boundary to avoid loop pops
    const fadeLen = 2000;
    for (let i = 0; i < fadeLen; i++) {
      const factor = i / fadeLen;
      output[i] = output[i] * factor + output[bufferSize - fadeLen + i] * (1 - factor);
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(this.ambientGain);

    brownNoise.start();
    this.ambientNodes.push(brownNoise, filter);
  }

  // 3. Synthesized Ocean Waves (LFO Modulated Pink Noise)
  createOceanWavesGenerator() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    // Boundary cross-fade
    const fadeLen = 2000;
    for (let i = 0; i < fadeLen; i++) {
      const factor = i / fadeLen;
      output[i] = output[i] * factor + output[bufferSize - fadeLen + i] * (1 - factor);
    }

    const pinkNoise = this.ctx.createBufferSource();
    pinkNoise.buffer = noiseBuffer;
    pinkNoise.loop = true;

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // LFO to modulate wave swells
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);

    pinkNoise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.ambientGain);

    pinkNoise.start();
    lfo.start();
    this.ambientNodes.push(pinkNoise, lfo, lfoGain, filter, waveGain);
  }

  // 4. Synthesized 40Hz Gamma Focus Frequency
  createBinauralGammaGenerator() {
    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();

    // 210Hz left and 250Hz right -> 40Hz difference
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(210, this.ctx.currentTime);

    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(250, this.ctx.currentTime);

    const merger = this.ctx.createChannelMerger(2);
    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    merger.connect(gain);
    gain.connect(this.ambientGain);

    oscLeft.start();
    oscRight.start();
    this.ambientNodes.push(oscLeft, oscRight, merger, gain);
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS & CHIMES
  // ==========================================

  /**
   * Warm meditation bell chime when focus session completes
   */
  playSessionChime() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + 0.01;
    const fundamental = 528; // 528Hz Solfeggio frequency
    const harmonics = [1, 2.76, 5.4, 8.93];
    const gains = [0.4, 0.2, 0.1, 0.05];

    harmonics.forEach((h, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * h, now);

      gain.gain.setValueAtTime(gains[idx] * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3.3);
    });
  }

  /**
   * Celebratory chime when task is marked complete
   */
  playTaskDoneSound() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + 0.01;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      const startTime = now + idx * 0.07;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }

  /**
   * Soft UI click
   */
  playClick() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + 0.01;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Global instance
window.audioSynth = new AudioSynthesizer();
