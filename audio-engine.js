/* ERO SOUND PAD - polyphonic Web Audio sample engine */
(() => {
  "use strict";
  class AudioEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.active = new Set();
      this.decoded = new Map();
      this.masterVolume = 0.8;
      this.maxVoices = 48;
    }

    async unlock() {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("Web Audio is not supported in this browser");
        this.context = new AudioContextClass({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.gain.value = this.masterVolume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context;
    }

    setMasterVolume(value) {
      this.masterVolume = Math.max(0, Math.min(1, Number(value)));
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.015);
      }
    }

    async decodeSample(id) {
      if (this.decoded.has(id)) return this.decoded.get(id);
      const record = await window.EROSampleStore.get(id);
      if (!record) throw new Error("Sample file is no longer in local storage");
      const ctx = await this.unlock();
      const buffer = await ctx.decodeAudioData(record.data.slice(0));
      this.decoded.set(id, buffer);
      return buffer;
    }

    async preview(id) {
      const buffer = await this.decodeSample(id);
      return this.playBuffer(buffer, { velocity: 100, pitch: 0, volume: 1, pan: 0 });
    }

    async triggerPad(padIndex, velocity, config) {
      await this.unlock();
      const pad = config || {};
      const layers = pad.layers || {};
      const a = layers.A || {};
      const b = layers.B || {};
      const vel = Math.max(1, Math.min(127, Number(velocity) || 1));
      const mode = pad.layerMode || "both";
      const split = Number(pad.velocitySplit || 90);
      const chosen = mode === "velocity"
        ? (vel >= split ? [b] : [a])
        : [a, b];

      let available = chosen.filter(layer => layer && layer.sampleId);
      if (mode === "velocity" && available.length === 0) {
        const fallback = a.sampleId ? a : b;
        if (fallback.sampleId) available = [fallback];
      }
      if (available.length) {
        for (const layer of available) {
          try {
            const buffer = await this.decodeSample(layer.sampleId);
            this.playBuffer(buffer, {
              velocity: vel,
              pitch: Number(layer.pitch || 0),
              volume: Number(layer.volume ?? 100) / 100,
              pan: Number(layer.pan || 0) / 100
            });
          } catch (error) {
            console.warn("Sample playback failed:", error);
          }
        }
        return;
      }
      this.playDemoTone(padIndex, vel);
    }

    playBuffer(buffer, options) {
      const ctx = this.context;
      if (!ctx || !this.master) return;
      if (this.active.size >= this.maxVoices) {
        const oldest = this.active.values().next().value;
        if (oldest) {
          try { oldest.stop(); } catch (_) {}
          this.active.delete(oldest);
        }
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const velocity = Math.max(1, Math.min(127, options.velocity || 100)) / 127;
      const pitchRate = Math.pow(2, (Number(options.pitch || 0)) / 12);
      source.buffer = buffer;
      source.playbackRate.value = pitchRate;
      gain.gain.value = Math.max(0, Math.min(1.5, Number(options.volume ?? 1))) * velocity * velocity;
      source.connect(gain);
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, Number(options.pan || 0)));
        gain.connect(panner);
        panner.connect(this.master);
      } else {
        gain.connect(this.master);
      }

      this.active.add(source);
      source.onended = () => this.active.delete(source);
      source.start();
      return source;
    }

    playDemoTone(padIndex, velocity) {
      const ctx = this.context;
      const now = ctx.currentTime;
      const types = ["kick", "snare", "hat", "open", "tom", "tom", "crash", "ride"];
      const type = types[padIndex] || "tom";
      const v = Math.max(1, Math.min(127, velocity)) / 127;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      const duration = ({kick:0.25,snare:0.18,hat:0.07,open:0.32,tom:0.25,crash:0.65,ride:0.4})[type] || 0.2;
      gain.gain.exponentialRampToValueAtTime(Math.max(0.008, v * v * 0.65), now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      gain.connect(this.master);

      let source;
      if (["snare", "hat", "open", "crash", "ride"].includes(type)) {
        const length = Math.floor(ctx.sampleRate * Math.min(duration, 0.75));
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = type === "snare" ? 1100 : 4200;
        source.connect(filter);
        filter.connect(gain);
      } else {
        source = ctx.createOscillator();
        source.type = "sine";
        const base = type === "kick" ? 135 : 165;
        source.frequency.setValueAtTime(base, now);
        source.frequency.exponentialRampToValueAtTime(type === "kick" ? 42 : 68, now + 0.22);
        source.connect(gain);
      }
      this.active.add(source);
      source.onended = () => this.active.delete(source);
      source.start(now);
      source.stop(now + duration + 0.03);
    }

    stopAll() {
      if (!this.context) return;
      const now = this.context.currentTime;
      for (const source of Array.from(this.active)) {
        try { source.stop(now); } catch (_) {}
      }
      this.active.clear();
    }
  }

  window.EROAudioEngine = new AudioEngine();
})();