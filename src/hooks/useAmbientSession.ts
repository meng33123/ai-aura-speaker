import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "../lib/audioEngine";
import { analyzeWithRemote, buildLocalPayload } from "../lib/moodAnalyzer";
import {
  computeLightFrame,
  hslToCss,
  type LightFrame,
} from "../lib/lightEngine";
import type { AnalysisPayload, LightMode, UserLightPrefs } from "../types";
import { THEMES } from "../lib/themes";

const BEAT_HISTORY = 12;

const defaultPrefs: UserLightPrefs = {
  brightness: 0.75,
  colorBiasHue: 0,
  effect: "gradient",
  themeId: THEMES[0]!.id,
};

export interface SavedTemplate {
  id: string;
  name: string;
  prefs: UserLightPrefs;
  mode: LightMode;
  createdAt: number;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

export function useAmbientSession() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);
  const beatTimesRef = useRef<number[]>([]);
  const intensityRef = useRef<number[]>([]);
  const rhythmRef = useRef({
    tempo: 108,
    beatStrength: 0,
    lowEnergy: 0.25,
  });

  const [mode, setMode] = useState<LightMode>("mood");
  const [prefs, setPrefs] = useState<UserLightPrefs>(defaultPrefs);
  const [lyricsText, setLyricsText] = useState(
    "一首关于夜晚与城市灯光的歌，节奏轻快，带着一点期待。"
  );
  const [analysis, setAnalysis] = useState<AnalysisPayload>(() =>
    buildLocalPayload(lyricsText, 108, [0.5, 1.0, 1.5], [0.3, 0.6, 0.85], 0.25)
  );
  const [lightFrame, setLightFrame] = useState<LightFrame>(() =>
    computeLightFrame("mood", analysis, defaultPrefs, 0.2, 0, 0)
  );
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string>(
    "本地规则 + 音频节奏（可配置 VITE_ANALYZE_URL 接 LLM）"
  );
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [volume, setVolume] = useState(0.85);

  const attachEngine = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!engineRef.current) engineRef.current = new AudioEngine();
    try {
      engineRef.current.attachMedia(audio);
      setError(null);
    } catch (e) {
      setError("音频引擎绑定失败，请重新选择文件或刷新页面。");
      console.error(e);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const runAnalysisPass = useCallback(async () => {
    const tempoLive = rhythmRef.current.tempo;
    const low = rhythmRef.current.lowEnergy;
    const beats = beatTimesRef.current.slice(-BEAT_HISTORY);
    const normalized =
      beats.length > 1
        ? beats.map((t: number, i: number) =>
            i === 0 ? 0.5 : (t - beats[i - 1]!) / 1000
          )
        : [0.5, 1.0, 1.5];
    const beatIndex = normalized.length > 0 ? normalized : [0.5, 1.0, 1.5];
    const intensity =
      intensityRef.current.length > 0
        ? intensityRef.current.slice(-BEAT_HISTORY)
        : [0.2, 0.5, 0.75];

    const remoteUrl = import.meta.env.VITE_ANALYZE_URL;
    if (remoteUrl) {
      const remote = await analyzeWithRemote(
        remoteUrl,
        lyricsText,
        tempoLive,
        beatIndex,
        intensity
      );
      if (remote) {
        setAnalysis(remote);
        setAiNote("已使用远程分析服务");
        return;
      }
      setAiNote("远程不可用，已回退本地规则");
    } else {
      setAiNote("本地规则 + 音频节奏（可配置 VITE_ANALYZE_URL 接 LLM）");
    }

    setAnalysis(
      buildLocalPayload(lyricsText, tempoLive, beatIndex, intensity, low)
    );
  }, [lyricsText]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playing) return;
      void runAnalysisPass();
    }, 2000);
    return () => clearInterval(id);
  }, [playing, runAnalysisPass]);

  useEffect(() => {
    if (!playing) {
      void runAnalysisPass();
    }
  }, [lyricsText, playing, runAnalysisPass]);

  useEffect(() => {
    const tick = (now: number) => {
      const audio = audioRef.current;
      const engine = engineRef.current;
      let beatStrength = 0;
      let tempo = rhythmRef.current.tempo;
      let low = rhythmRef.current.lowEnergy;

      if (audio && engine && playing && !audio.paused) {
        const frame = engine.getFrame(now);
        if (frame) {
          beatStrength = frame.visualStrength;
          tempo = frame.tempoEstimate;
          low = frame.bassEnergy;
          rhythmRef.current = { tempo, beatStrength, lowEnergy: low };
          if (frame.beatDetected) {
            beatTimesRef.current.push(now);
            if (beatTimesRef.current.length > 32) {
              beatTimesRef.current.shift();
            }
          }
          intensityRef.current.push(
            clamp(
              frame.bassEnergy * 0.65 +
                frame.midEnergy * 0.25 +
                frame.highEnergy * 0.1,
              0,
              1
            )
          );
          if (intensityRef.current.length > 32) intensityRef.current.shift();
        }
      } else if (!playing) {
        rhythmRef.current = {
          tempo: analysis.tempo,
          beatStrength: 0,
          lowEnergy: 0.25,
        };
      }

      const r = rhythmRef.current;
      const merged: AnalysisPayload = {
        ...analysis,
        tempo: playing ? r.tempo : analysis.tempo,
      };

      const timeSec = now / 1000;
      const frame = computeLightFrame(
        mode,
        merged,
        prefs,
        r.beatStrength,
        timeSec,
        merged.mood.length
      );
      setLightFrame(frame);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, prefs, analysis, playing]);

  const playPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio?.src) {
      setError("请先选择本地音频文件。");
      return;
    }
    attachEngine();
    await engineRef.current?.resume();
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
      setError(null);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [attachEngine]);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime + delta);
  }, []);

  const onPickFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const audio = audioRef.current;
      if (audio) {
        audio.src = url;
        audio.volume = volume;
        attachEngine();
        setError(null);
      }
    },
    [attachEngine, volume]
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const saveTemplate = useCallback(
    (name: string) => {
      const t: SavedTemplate = {
        id: crypto.randomUUID(),
        name: name || `方案 ${templates.length + 1}`,
        prefs: { ...prefs },
        mode,
        createdAt: Date.now(),
      };
      setTemplates((prev: SavedTemplate[]) => [t, ...prev].slice(0, 20));
    },
    [prefs, mode, templates.length]
  );

  const applyTemplate = useCallback((t: SavedTemplate) => {
    setPrefs(t.prefs);
    setMode(t.mode);
  }, []);

  const lightCss = hslToCss(
    lightFrame.hue,
    lightFrame.saturation,
    lightFrame.lightness
  );
  const lightAccentCss = hslToCss(
    lightFrame.accentHue,
    clamp(lightFrame.saturation * 0.95, 0.25, 1),
    clamp(lightFrame.lightness * 0.92, 0.18, 0.85)
  );

  const displayAnalysis: AnalysisPayload = playing
    ? {
        ...analysis,
        tempo: rhythmRef.current.tempo,
      }
    : analysis;

  return {
    audioRef,
    mode,
    setMode,
    prefs,
    setPrefs,
    lyricsText,
    setLyricsText,
    analysis: displayAnalysis,
    lightFrame,
    lightCss,
    lightAccentCss,
    playing,
    playPause,
    skip,
    onPickFile,
    error,
    aiNote,
    volume,
    setVolume,
    beatStrength: rhythmRef.current.beatStrength,
    templates,
    saveTemplate,
    applyTemplate,
    rawJson: JSON.stringify(displayAnalysis, null, 2),
  };
}
