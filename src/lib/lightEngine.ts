import type {
  AnalysisPayload,
  LightMode,
  UserLightPrefs,
} from "../types";
import { moodToHue } from "./moodAnalyzer";
import { THEMES } from "./themes";

export interface LightFrame {
  hue: number;
  accentHue: number;
  saturation: number;
  lightness: number;
  glow: number;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeLightFrame(
  mode: LightMode,
  analysis: AnalysisPayload,
  prefs: UserLightPrefs,
  beatStrength: number,
  timeSec: number,
  phase: number
): LightFrame {
  const theme = THEMES.find((t) => t.id === prefs.themeId) ?? THEMES[0]!;
  let hue = analysis.primary_hue + prefs.colorBiasHue;
  let accentHue = analysis.secondary_hue;
  let sat = theme.saturation;
  let light = 0.42 + prefs.brightness * 0.28;
  let glow = 0.35 + beatStrength * 0.5;

  const moodHue = moodToHue(analysis.mood);
  const lastInt =
    analysis.intensity[analysis.intensity.length - 1] ?? beatStrength;
  const bpmNorm = clamp((analysis.tempo - 80) / 90, 0, 1);
  const keyWarmBias = analysis.key_mode === "major" ? 1 : analysis.key_mode === "minor" ? -1 : 0;

  if (mode === "rhythm") {
    hue = lerp(moodHue, hue, 0.42) + beatStrength * (24 + bpmNorm * 38);
    accentHue = (hue + (analysis.key_mode === "minor" ? 36 : 72)) % 360;
    sat = clamp(0.52 + lastInt * 0.38 + bpmNorm * 0.08, 0.35, 1);
    light = 0.38 + prefs.brightness * 0.22 + beatStrength * 0.18;
    glow = 0.36 + beatStrength * 0.58;
  } else if (mode === "mood") {
    hue =
      lerp(moodHue, analysis.primary_hue, 0.55) +
      prefs.colorBiasHue * 0.35 +
      keyWarmBias * 14;
    accentHue = (analysis.secondary_hue + keyWarmBias * 10 + 360) % 360;
    sat = clamp(0.48 + (analysis.mood === "calm" ? -0.08 : 0.18), 0.3, 0.95);
    light = 0.4 + prefs.brightness * 0.25;
    glow = 0.45 + lastInt * 0.35;
  } else {
    const drift = Math.sin(timeSec * (0.24 + bpmNorm * 0.62)) * (10 + bpmNorm * 18);
    hue = analysis.primary_hue + prefs.colorBiasHue + drift;
    accentHue = (analysis.secondary_hue - drift * 0.5 + 360) % 360;
    sat = clamp(theme.saturation + bpmNorm * 0.06, 0.25, 1);
    light = 0.42 + prefs.brightness * 0.2;
    glow = 0.34 + beatStrength * 0.4;
  }

  const eff = prefs.effect;
  if (eff === "breathe") {
    const b = (Math.sin(timeSec * (1.1 + bpmNorm * 2.2) + phase) + 1) * 0.5;
    light = light * lerp(0.85, 1.08, b);
    glow = glow * lerp(0.9, 1.15, b);
  } else if (eff === "pulse") {
    const p = beatStrength > 0.15 ? 1.15 : 0.95;
    light *= p;
    glow *= p;
  } else if (eff === "gradient") {
    hue += Math.sin(timeSec * (0.5 + bpmNorm * 1.8) + phase) * (16 + bpmNorm * 26);
  }

  hue = ((hue % 360) + 360) % 360;
  accentHue = ((accentHue % 360) + 360) % 360;
  sat = clamp(sat, 0.25, 1);
  light = clamp(light, 0.18, 0.85);
  glow = clamp(glow, 0.2, 1);

  return { hue, accentHue, saturation: sat, lightness: light, glow };
}

export function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
}
