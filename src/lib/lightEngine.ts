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
  const palette = analysis.palette_hues?.length
    ? analysis.palette_hues
    : [analysis.primary_hue, analysis.secondary_hue];
  let hue = analysis.primary_hue + prefs.colorBiasHue;
  let accentHue = analysis.secondary_hue;
  let sat = theme.saturation;
  let light = 0.42 + prefs.brightness * 0.28;
  let glow = 0.35 + beatStrength * 0.5;

  const moodHue = moodToHue(analysis.mood);
  const lastInt =
    analysis.intensity[analysis.intensity.length - 1] ?? beatStrength;
  const bpmNorm = clamp((analysis.tempo - 80) / 90, 0, 1);
  const satHint = analysis.saturation_hint ?? theme.saturation;
  const dynamicBias = analysis.dynamic_bias ?? 0.5;
  const keyWarmBias = analysis.key_mode === "major" ? 1 : analysis.key_mode === "minor" ? -1 : 0;

  if (mode === "rhythm") {
    const base = palette[0] ?? hue;
    const partner = palette[1] ?? accentHue;
    hue = lerp(moodHue, base, 0.42) + beatStrength * (24 + bpmNorm * 38);
    accentHue = lerp(partner, hue, 0.3) + (analysis.key_mode === "minor" ? 24 : 56);
    sat = clamp(lerp(0.48, satHint, 0.55) + lastInt * 0.35 + bpmNorm * 0.08, 0.35, 1);
    light = 0.38 + prefs.brightness * 0.22 + beatStrength * 0.18;
    glow = 0.34 + beatStrength * (0.42 + dynamicBias * 0.22);
  } else if (mode === "mood") {
    const paletteLead = palette[0] ?? analysis.primary_hue;
    const paletteSoft = palette[2] ?? analysis.secondary_hue;
    hue =
      lerp(moodHue, paletteLead, 0.55) +
      prefs.colorBiasHue * 0.35 +
      keyWarmBias * 14;
    accentHue = (lerp(analysis.secondary_hue, paletteSoft, 0.6) + keyWarmBias * 10 + 360) % 360;
    sat = clamp(lerp(0.45, satHint, 0.7) + (analysis.mood === "calm" ? -0.06 : 0.12), 0.3, 0.95);
    light = 0.4 + prefs.brightness * 0.25;
    glow = 0.38 + lastInt * (0.25 + dynamicBias * 0.2);
  } else {
    const drift = Math.sin(timeSec * (0.24 + bpmNorm * (0.42 + dynamicBias * 0.55))) * (10 + bpmNorm * 18);
    hue = (palette[0] ?? analysis.primary_hue) + prefs.colorBiasHue + drift;
    accentHue = ((palette[1] ?? analysis.secondary_hue) - drift * 0.5 + 360) % 360;
    sat = clamp(lerp(theme.saturation, satHint, 0.55) + bpmNorm * 0.06, 0.25, 1);
    light = 0.42 + prefs.brightness * 0.2;
    glow = 0.32 + beatStrength * (0.35 + dynamicBias * 0.2);
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
    hue += Math.sin(timeSec * (0.5 + bpmNorm * (1.1 + dynamicBias * 1.2)) + phase) * (16 + bpmNorm * 26);
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
