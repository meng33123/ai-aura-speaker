import type { CSSProperties } from "react";
import type { LightFrame } from "../lib/lightEngine";

interface Props {
  lightCss: string;
  frame: LightFrame;
  playing: boolean;
  beatStrength?: number;
  mood?: string;
  tempo?: number;
}

const MOOD_CONFIG: Record<string, { zh: string; icon: string }> = {
  joy:        { zh: "愉悦", icon: "◎" },
  passion:    { zh: "激情", icon: "★" },
  calm:       { zh: "平静", icon: "〜" },
  melancholy: { zh: "忧郁", icon: "◐" },
  energetic:  { zh: "活力", icon: "⚡" },
  neutral:    { zh: "中性", icon: "·" },
};

export function LightPreview({
  lightCss,
  frame,
  playing,
  beatStrength = 0,
  mood = "neutral",
  tempo,
}: Props) {
  const glowPx = `${36 + frame.glow * 120}px`;
  const pulse  = playing ? 0.4 + beatStrength * 0.6 : 0.28;
  const beat   = playing ? beatStrength : 0;
  const meta   = MOOD_CONFIG[mood.toLowerCase()] ?? { zh: mood, icon: "◎" };

  return (
    <div
      className="preview-hero"
      style={{
        "--c":    lightCss,
        "--glow": glowPx,
        "--pulse": pulse,
        "--beat":  beat,
      } as CSSProperties}
    >
      <div className="preview-bg" />
      <div className="preview-orbs">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="orb orb-core" />
      </div>
      <div className="preview-overlay">
        <div className="mood-badge">
          <span className="mood-icon">{meta.icon}</span>
          <span className="mood-zh">{meta.zh}</span>
          {tempo !== undefined && (
            <span className="mood-bpm">{tempo} BPM</span>
          )}
        </div>
        <div className={`play-state ${playing ? "active" : ""}`}>
          {playing ? "实时节奏驱动光晕" : "情绪氛围预览"}
        </div>
      </div>
      <div className="beat-ring" />
    </div>
  );
}
