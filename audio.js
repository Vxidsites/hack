/**
 * SINGULARITY: OMEGA CORE - Procedural Web Audio Engine
 * 100% synthesized sound effects, cosmic drone & cybernetic soundtrack.
 * Zero external audio files required!
 */

class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.droneGain = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.musicTimer = null;
    this.isMusicPlaying = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output with mild limiter
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupCosmicDrone();
      this.setupStarshipEngine();
      this.startAmbientMusic();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio not supported or blocked:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.initialized) {
      this.init();
    }
  }

  // Deep resonant cosmic drone for the black hole
  setupCosmicDrone() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass oscillator (42Hz)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(42, now);

    // Warm second harmonic (84Hz)
    const midOsc = this.ctx.createOscillator();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(84.5, now);

    // Slow LFO for gravitational pulse (0.15Hz)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(8, now);
    lfo.connect(lfoGain);
    lfoGain.connect(subOsc.frequency);

    // Lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.Q.setValueAtTime(4.0, now);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.35, now);

    subOsc.connect(filter);
    midOsc.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    subOsc.start();
    midOsc.start();
    lfo.start();
  }

  // Modulate cosmic drone based on distance to black hole
  updateDrone(proximityRatio, massRatio) {
    if (!this.initialized || !this.droneGain || this.isMuted) return;
    const targetGain = 0.2 + (1.0 - Math.min(proximityRatio, 1.0)) * 0.5 * massRatio;
    this.droneGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  // Interactive starfighter engine sound
  setupStarshipEngine() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(55, now);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(180, now);
    this.engineFilter.Q.setValueAtTime(3.0, now);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, now);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
  }

  updateStarshipSound(speedRatio, isBoosting) {
    if (!this.initialized || !this.engineGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const baseFreq = 50 + speedRatio * 90 + (isBoosting ? 65 : 0);
    const filterFreq = 180 + speedRatio * 600 + (isBoosting ? 800 : 0);
    const targetGain = 0.05 + speedRatio * 0.25 + (isBoosting ? 0.25 : 0);

    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  // Dual plasma laser blaster
  playLaser(isAlt = false) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = isAlt ? 'sawtooth' : 'triangle';
    const startFreq = isAlt ? 1400 : 920;
    const endFreq = isAlt ? 180 : 120;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Torpedo firing & impact
  playTorpedoLaunch() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Planetary destruction / explosion sound
  playExplosion(intensity = 1.0) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110 * intensity, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    subGain.gain.setValueAtTime(0.6 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.75);

    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.22));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * intensity, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
  }

  // Spaghettification / Gravitational Wave pulse
  playSpaghettification() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(8.0, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.92);
  }

  // Cataclysmic Supernova Apocalypse
  playSupernova() {
    if (!this.initialized || this.isMuted) return;
    this.playExplosion(2.2);
    setTimeout(() => this.playExplosion(1.5), 180);
    setTimeout(() => this.playExplosion(1.8), 420);
  }

  // Procedural Cyberpunk Ambient Synth Soundtrack
  startAmbientMusic() {
    if (!this.ctx) return;

    // Chord progression in F minor / Dorian space vibes:
    // Fm9 -> Abmaj7 -> Dbmaj7 -> Bbm9 -> C7alt
    const chords = [
      [174.61, 207.65, 261.63, 311.13, 392.00], // F3, Ab3, C4, Eb4, G4
      [207.65, 261.63, 311.13, 392.00, 523.25], // Ab3, C4, Eb4, G4, C5
      [138.59, 174.61, 207.65, 261.63, 329.63], // Db3, F3, Ab3, C4, E4
      [116.54, 138.59, 174.61, 220.00, 261.63], // Bb2, Db3, F3, A3, C4
    ];

    let chordIdx = 0;
    let step = 0;

    const playChordStep = () => {
      if (!this.isMusicPlaying || this.isMuted || !this.ctx) {
        this.musicTimer = setTimeout(playChordStep, 450);
        return;
      }

      const chord = chords[chordIdx];
      const freq = chord[step % chord.length];

      // Play soft arpeggiated cosmic chime
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = (step % 2 === 0) ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * (step % 4 === 3 ? 2 : 1), now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.25);

      step++;
      if (step >= 8) {
        step = 0;
        chordIdx = (chordIdx + 1) % chords.length;
      }

      this.musicTimer = setTimeout(playChordStep, 420);
    };

    playChordStep();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
