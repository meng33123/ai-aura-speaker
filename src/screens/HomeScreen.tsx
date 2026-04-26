import type { CSSProperties } from "react";
import type { Session, ScreenId } from "../App";

const MOOD_ZH: Record<string, string> = {
  joy: "愉悦", passion: "激情", calm: "平静",
  melancholy: "忧郁", energetic: "活力", neutral: "中性",
};
const KEY_ZH: Record<string, string> = {
  major: "大调",
  minor: "小调",
  unknown: "未识别",
};

interface Props {
  session: Session;
  onNavigate: (s: ScreenId) => void;
}

export function HomeScreen({ session, onNavigate }: Props) {
  const {
    playing, playPause, onPickFile,
    lightCss, lightAccentCss, lightFrame, beatStrength,
    analysis, volume, setVolume, skip,
  } = session;

  const pulse = playing ? 0.45 + beatStrength * 0.55 : 0.28;
  const glowPx = `${30 + lightFrame.glow * 120 - Math.min(22, analysis.tempo * 0.06)}px`;
  const orbSpeed = `${Math.max(3.2, 10.8 - analysis.tempo * 0.04)}s`;

  return (
    <div className="home-screen">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1 className="app-name">声光共情</h1>
          <p className="app-sub">AI 音乐氛围灯音响</p>
        </div>
        <label className="pick-label">
          <input
            type="file"
            accept="audio/*"
            className="hidden-audio"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          + 音乐
        </label>
      </div>

      {/* Ambient orb */}
      <div className="orb-stage">
        <div
          className="orb-outer"
          style={{ "--c": lightCss, "--glow": glowPx, "--p": pulse, "--spd": orbSpeed } as CSSProperties}
        />
        <div
          className="orb-mid"
          style={{ "--c": lightAccentCss, "--glow": `calc(${glowPx} * 0.62)`, "--p": pulse, "--spd": `calc(${orbSpeed} * 1.35)` } as CSSProperties}
        />
        <button
          type="button"
          className="orb-play"
          onClick={() => void playPause()}
        >
          {playing ? "⏸" : "▶"}
        </button>
      </div>

      {/* Status */}
      <p className="home-status">
        {playing ? "实时节奏驱动光晕" : "未播放 · 点击选择音乐开始"}
      </p>

      {/* Frequency bars */}
      <div className="freq-bars">
        {Array.from({ length: 22 }).map((_, i) => {
          const raw = analysis.intensity[i % Math.max(1, analysis.intensity.length)] ?? 0.35;
          return (
            <span
              key={i}
              className={`freq-bar${playing ? " freq-anim" : ""}`}
              style={{
                height: `${14 + raw * 46}px`,
                background: `linear-gradient(180deg, ${lightCss}, ${lightAccentCss})`,
                animationDelay: `${i * 65}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Controls row */}
      <div className="home-controls">
        <button type="button" className="ctrl-btn" onClick={() => skip(-10)}>−10s</button>
        <button type="button" className="play-btn" onClick={() => void playPause()}>
          {playing ? "暂停" : "播放"}
        </button>
        <button type="button" className="ctrl-btn" onClick={() => skip(10)}>+10s</button>
        <button type="button" className="icon-btn" onClick={() => onNavigate("dashboard")}>📊</button>
      </div>

      {/* Volume */}
      <div className="home-volume">
        <span>🔈</span>
        <input
          type="range" min={0} max={1} step={0.02}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="vol-slider"
        />
        <span>🔊</span>
      </div>

      {/* Stats */}
      <div className="home-stats">
        {[
          { label: "情绪", value: MOOD_ZH[analysis.mood] ?? analysis.mood },
          { label: "BPM",  value: String(analysis.tempo) },
          { label: "调性", value: KEY_ZH[analysis.key_mode] ?? "未识别" },
        ].map((s) => (
          <div key={s.label} className="stat-tile">
            <span className="stat-label">{s.label}</span>
            <strong className="stat-value">{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
