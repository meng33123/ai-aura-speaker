import { useState, useRef } from "react";
import type { Session } from "../App";
import type { LightMode } from "../types";

interface Props { session: Session; }

const MODES: [LightMode, string][] = [
  ["rhythm", "节奏联动"],
  ["mood",   "情绪模式"],
  ["theme",  "自定义"],
];

export function LightScreen({ session }: Props) {
  const { prefs, setPrefs, mode, setMode, lightCss } = session;
  const [wheelHue, setWheelHue] = useState(210);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleWheelPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const radius = rect.width / 2;
    if (dist < radius * 0.25 || dist > radius) return; // ignore center + outside
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const hue = ((angle + 90 + 360) % 360);
    setWheelHue(hue);
    setPrefs((p) => ({ ...p, colorBiasHue: Math.round((hue / 360) * 120 - 60) }));
  };

  const dotAngle = ((wheelHue - 90) * Math.PI) / 180;
  const dotR = 37; // % from center
  const dotX = 50 + dotR * Math.cos(dotAngle);
  const dotY = 50 + dotR * Math.sin(dotAngle);

  return (
    <div className="screen-pad">
      <h2 className="screen-title">光效调节</h2>

      {/* Mode tabs */}
      <div className="mode-tabs">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`mode-tab${mode === id ? " active" : ""}`}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Color wheel */}
      <div className="wheel-wrap">
        <div
          ref={wheelRef}
          className="color-wheel"
          onPointerDown={handleWheelPointer}
          onPointerMove={(e) => { if (e.buttons === 1) handleWheelPointer(e); }}
        >
          {/* Selector dot */}
          <div
            className="wheel-dot"
            style={{ left: `${dotX}%`, top: `${dotY}%` }}
          />
          {/* Center overlay */}
          <div className="wheel-center">
            <span className="wheel-note">♪</span>
          </div>
        </div>
        {/* Current color preview ring */}
        <div
          className="wheel-color-ring"
          style={{ boxShadow: `0 0 24px 8px ${lightCss}` }}
        />
      </div>

      {/* Sliders */}
      <div className="slider-section">
        <label className="slider-row">
          <span>亮度</span>
          <input
            type="range" min={0} max={1} step={0.02}
            value={prefs.brightness}
            onChange={(e) => setPrefs((p) => ({ ...p, brightness: Number(e.target.value) }))}
          />
          <span className="slider-val">{Math.round(prefs.brightness * 100)}%</span>
        </label>

        <label className="slider-row">
          <span>轮和度</span>
          <input
            type="range" min={-60} max={60} step={1}
            value={prefs.colorBiasHue}
            onChange={(e) => setPrefs((p) => ({ ...p, colorBiasHue: Number(e.target.value) }))}
          />
          <span className="slider-val">
            {prefs.colorBiasHue > 0 ? "+" : ""}{prefs.colorBiasHue}
          </span>
        </label>

        <label className="slider-row">
          <span>动态效果</span>
          <select
            className="effect-select"
            value={prefs.effect}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, effect: e.target.value as typeof p.effect }))
            }
          >
            <option value="pulse">节拍脉冲</option>
            <option value="gradient">渐变流动</option>
            <option value="breathe">呼吸</option>
          </select>
        </label>
      </div>
    </div>
  );
}
