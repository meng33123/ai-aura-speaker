export type LightMode = "rhythm" | "mood" | "theme";

export type MoodLabel =
  | "joy"
  | "passion"
  | "calm"
  | "melancholy"
  | "energetic"
  | "neutral";

export type DynamicEffect = "pulse" | "gradient" | "breathe";

export interface AnalysisPayload {
  mood: MoodLabel;
  key_mode: "major" | "minor" | "unknown";
  primary_hue: number;
  secondary_hue: number;
  palette_hues?: number[];
  saturation_hint?: number;
  dynamic_bias?: number;
  tempo: number;
  beat_index: number[];
  intensity: number[];
}

export interface UserLightPrefs {
  brightness: number;
  colorBiasHue: number;
  effect: DynamicEffect;
  themeId: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  hueBase: number;
  saturation: number;
}
