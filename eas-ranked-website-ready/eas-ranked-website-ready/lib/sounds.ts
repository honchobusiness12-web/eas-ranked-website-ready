/**
 * Sound effects using the Web Audio API.
 * All sounds are generated programmatically — no external files needed.
 * Designed to be short (80–250ms), subtle, and summer-themed:
 * bright, warm, and playful with smooth fade in/out to avoid clicks.
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

/**
 * Play multiple frequencies simultaneously to create a chord effect.
 * Each entry in `tones` defines a voice in the chord.
 */
function playChord(
  tones: Array<{ startFreq: number; endFreq?: number; type?: OscillatorType }>,
  duration: number,
  volume = 0.3
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Distribute volume evenly across voices so the chord doesn't clip
  const voiceVolume = volume / tones.length;

  for (const tone of tones) {
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.setValueAtTime(tone.startFreq, ctx.currentTime);

      if (tone.endFreq !== undefined) {
        oscillator.frequency.linearRampToValueAtTime(
          tone.endFreq,
          ctx.currentTime + duration / 1000
        );
      }

      // Smooth fade in/out per voice
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(voiceVolume, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000 + 0.01);
    } catch {
      // Silently fail if audio is unavailable
    }
  }
}

/**
 * Bright, punchy click — like a beach ball pop or summer snap.
 * Square wave at 400 Hz dropping to 350 Hz (120ms) with a subtle
 * sine harmonic layer for added richness.
 */
export function playClick(volume = 0.35): void {
  // Primary punch: square wave with a quick pitch drop
  playTone({ startFreq: 400, endFreq: 350, duration: 120, volume: volume * 0.75, type: "square" });
  // Harmonic layer: softer sine an octave up for brightness
  playTone({ startFreq: 800, endFreq: 700, duration: 80, volume: volume * 0.25, type: "sine" });
}

/**
 * Light, playful chime — like a beach bell or wind chime.
 * Triangle wave rising gently from 500 Hz to 520 Hz (100ms).
 * Very subtle and pleasant on repeated hover events.
 */
export function playHover(volume = 0.2): void {
  playTone({ startFreq: 500, endFreq: 520, duration: 100, volume, type: "triangle" });
}

/**
 * Bright, triumphant summer chord — like a beach celebration.
 * Two oscillators rise together (500→600 Hz and 750→900 Hz) to
 * create a full, satisfying major-interval chord over 250ms.
 */
export function playSuccess(volume = 0.35): void {
  playChord(
    [
      { startFreq: 500, endFreq: 600, type: "sine" },
      { startFreq: 750, endFreq: 900, type: "sine" },
    ],
    250,
    volume
  );
}

/**
 * Warm, gentle warning — clear but never harsh.
 * Triangle wave falling from 280 Hz to 200 Hz (150ms) for a soft,
 * rounded tone that signals an error without jarring the user.
 */
export function playError(volume = 0.25): void {
  playTone({ startFreq: 280, endFreq: 200, duration: 150, volume, type: "triangle" });
}
