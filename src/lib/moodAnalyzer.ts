import type { AnalysisPayload, MoodLabel } from "../types";

const MOOD_KEYWORDS: Record<MoodLabel, string[]> = {
  joy: ["快乐", "开心", "阳光", "微笑", "庆祝", "happy", "joy", "smile"],
  passion: ["爱", "火热", "激情", "热恋", "love", "passion", "fire"],
  calm: ["安静", "宁静", "睡眠", "雨", "海", "calm", "peace", "sleep", "rain"],
  melancholy: ["忧伤", "离别", "孤独", "眼泪", "sad", "blue", "lonely", "tear"],
  energetic: [
    "燃",
    "炸",
    "派对",
    "夜",
    "跑",
    "跳",
    "party",
    "night",
    "run",
    "dance",
    "edm",
  ],
  neutral: [],
};

const MOOD_HUE: Record<MoodLabel, number> = {
  joy: 48,
  passion: 350,
  calm: 200,
  melancholy: 260,
  energetic: 18,
  neutral: 210,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreText(text: string): MoodLabel {
  const t = text.toLowerCase();
  let best: MoodLabel = "neutral";
  let bestScore = 0;
  (Object.keys(MOOD_KEYWORDS) as MoodLabel[]).forEach((m) => {
    if (m === "neutral") return;
    const score = MOOD_KEYWORDS[m].reduce(
      (acc, kw) => acc + (t.includes(kw.toLowerCase()) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  });
  return bestScore > 0 ? best : "neutral";
}

function moodFromTempoEnergy(tempo: number, low: number): MoodLabel {
  if (tempo > 128 && low > 0.35) return "energetic";
  if (tempo < 95 && low < 0.22) return "calm";
  if (low > 0.4) return "passion";
  return "neutral";
}

function inferKeyMode(
  text: string,
  mood: MoodLabel,
  tempo: number,
  intensity: number[]
): "major" | "minor" | "unknown" {
  const t = text.toLowerCase();
  const majorHints = [
    "夏",
    "阳光",
    "sun",
    "summer",
    "happy",
    "bright",
    "festival",
  ];
  const minorHints = [
    "夜",
    "晚",
    "雨",
    "moon",
    "night",
    "sad",
    "lonely",
    "dark",
  ];
  const majorScore = majorHints.reduce(
    (acc, kw) => acc + (t.includes(kw.toLowerCase()) ? 1 : 0),
    0
  );
  const minorScore = minorHints.reduce(
    (acc, kw) => acc + (t.includes(kw.toLowerCase()) ? 1 : 0),
    0
  );
  if (majorScore > minorScore) return "major";
  if (minorScore > majorScore) return "minor";

  const avgIntensity =
    intensity.length > 0
      ? intensity.reduce((a, b) => a + b, 0) / intensity.length
      : 0.5;

  if (mood === "melancholy" || mood === "calm") return "minor";
  if (mood === "joy" || mood === "energetic" || mood === "passion") return "major";
  if (tempo >= 132 && avgIntensity > 0.55) return "major";
  if (tempo <= 96 && avgIntensity < 0.48) return "minor";
  return "unknown";
}

function derivePaletteHues(
  text: string,
  mood: MoodLabel,
  tempo: number,
  keyMode: "major" | "minor" | "unknown"
): { primaryHue: number; secondaryHue: number } {
  const t = text.toLowerCase();
  const hasSummer = t.includes("夏") || t.includes("summer");
  const hasNight = t.includes("夜") || t.includes("night") || t.includes("moon");

  // Base by mood + tonality.
  let base = moodToHue(mood);
  if (keyMode === "major") {
    // Major -> warmer / brighter.
    base = (base + 18 + tempo * 0.08) % 360;
  } else if (keyMode === "minor") {
    // Minor -> cooler / deeper.
    base = (base + 250 + tempo * 0.04) % 360;
  } else {
    base = (base + tempo * 0.06) % 360;
  }

  // Requested "style offset" by BPM.
  if (tempo >= 150) base = (base + 20) % 360; // push towards red/orange pressure
  else if (tempo >= 125 && tempo <= 138) base = (base + 275) % 360; // keep purple/green trendy

  // Keyword-driven gradient pair.
  if (mood === "energetic" && hasSummer) {
    return { primaryHue: 52, secondaryHue: 182 }; // yellow -> cyan
  }
  if (hasNight || keyMode === "minor") {
    return { primaryHue: 228, secondaryHue: 276 }; // deep blue -> purple
  }

  const secondary = (base + (keyMode === "major" ? 76 : 58)) % 360;
  return { primaryHue: base, secondaryHue: secondary };
}

/** 合并文本情绪与节奏推断 */
export function inferMoodHybrid(
  lyricsOrTitle: string,
  tempo: number,
  lowEnergy: number
): MoodLabel {
  const fromText = scoreText(lyricsOrTitle);
  const fromAudio = moodFromTempoEnergy(tempo, lowEnergy);
  if (fromText !== "neutral") return fromText;
  return fromAudio;
}

export function moodToHue(mood: MoodLabel): number {
  return MOOD_HUE[mood];
}

/**
 * 可选：POST 到 VITE_ANALYZE_URL，body: { text, tempo }
 * 期望返回 AnalysisPayload 或 { mood, tempo, beat_index, intensity }
 */
export async function analyzeWithRemote(
  url: string,
  text: string,
  tempo: number,
  beatIndex: number[],
  intensity: number[]
): Promise<AnalysisPayload | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tempo, beat_index: beatIndex, intensity }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AnalysisPayload>;
    if (
      typeof data.mood === "string" &&
      typeof data.tempo === "number" &&
      Array.isArray(data.beat_index) &&
      Array.isArray(data.intensity)
    ) {
      const keyMode =
        data.key_mode === "major" || data.key_mode === "minor"
          ? data.key_mode
          : "unknown";
      const fallback = derivePaletteHues(
        text,
        data.mood as MoodLabel,
        data.tempo,
        keyMode
      );
      return {
        mood: data.mood as MoodLabel,
        tempo: data.tempo,
        beat_index: data.beat_index as number[],
        intensity: data.intensity as number[],
        key_mode: keyMode,
        palette_hues: Array.isArray(data.palette_hues)
          ? data.palette_hues.filter((n) => typeof n === "number").slice(0, 4)
          : [fallback.primaryHue, fallback.secondaryHue, (fallback.primaryHue + 42) % 360],
        saturation_hint:
          typeof data.saturation_hint === "number"
            ? Math.min(1, Math.max(0.2, data.saturation_hint))
            : undefined,
        dynamic_bias:
          typeof data.dynamic_bias === "number"
            ? Math.min(1, Math.max(0, data.dynamic_bias))
            : undefined,
        primary_hue:
          typeof data.primary_hue === "number"
            ? data.primary_hue
            : fallback.primaryHue,
        secondary_hue:
          typeof data.secondary_hue === "number"
            ? data.secondary_hue
            : fallback.secondaryHue,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildLocalPayload(
  text: string,
  tempo: number,
  beatIndex: number[],
  intensity: number[],
  lowEnergy: number
): AnalysisPayload {
  const mood = inferMoodHybrid(text, tempo, lowEnergy);
  const keyMode = inferKeyMode(text, mood, tempo, intensity);
  const { primaryHue, secondaryHue } = derivePaletteHues(
    text,
    mood,
    tempo,
    keyMode
  );
  return {
    mood,
    key_mode: keyMode,
    primary_hue: primaryHue,
    secondary_hue: secondaryHue,
    palette_hues: [
      primaryHue,
      secondaryHue,
      (primaryHue + (keyMode === "minor" ? 26 : 42)) % 360,
    ],
    saturation_hint: clamp(
      0.48 + (intensity[intensity.length - 1] ?? 0.5) * 0.35,
      0.28,
      0.95
    ),
    dynamic_bias: clamp((tempo - 80) / 100, 0.1, 0.95),
    tempo,
    beat_index: beatIndex,
    intensity,
  };
}
