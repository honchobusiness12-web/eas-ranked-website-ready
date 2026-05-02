/**
 * Sound effects using the Web Audio API.
 * All sounds are generated programmatically — no external files needed.
 * Designed to be short (80–200ms) and subtle (default volume 0.3).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

interface ToneOptions {
  startFreq: number;
  endFreq?: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
}

function playTone({ startFreq, endFreq, duration, volume = 0.3, type = "sine" }: ToneOptions): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);

    if (endFreq !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration / 1000);
    }

    // Fade in quickly, then fade out to avoid clicks/pops
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000 + 0.01);
  } catch {
    // Silently fail if audio is unavailable
  }
}

/** Short beep — used for button/link clicks (200 Hz, 100ms) */
export function playClick(volume = 0.3): void {
  playTone({ startFreq: 200, duration: 100, volume, type: "sine" });
}

/** Subtle tone — used for hovering over interactive elements (300 Hz, 80ms) */
export function playHover(volume = 0.15): void {
  playTone({ startFreq: 300, duration: 80, volume, type: "sine" });
}

/** Rising tone — used for successful navigation (400 Hz → 600 Hz, 200ms) */
export function playSuccess(volume = 0.3): void {
  playTone({ startFreq: 400, endFreq: 600, duration: 200, volume, type: "sine" });
}

/** Low tone — used for errors or destructive actions (150 Hz, 150ms) */
export function playError(volume = 0.3): void {
  playTone({ startFreq: 150, duration: 150, volume, type: "sine" });
}
