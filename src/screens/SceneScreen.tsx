import type { Session } from "../App";
import type { DynamicEffect } from "../types";

const SCENES = [
  { themeId: "sunset",  effect: "pulse"    as DynamicEffect, name: "活力四射",  desc: "派对 / 运动氛围",  color: "#ff7f50" },
  { themeId: "neon",    effect: "gradient" as DynamicEffect, name: "放松情绪",  desc: "舒适休闲氛围",    color: "#9b7dff" },
  { themeId: "ocean",   effect: "breathe"  as DynamicEffect, name: "专注工作",  desc: "冷色专注氛围",    color: "#4f95ff" },
  { themeId: "forest",  effect: "breathe"  as DynamicEffect, name: "深度睡眠",  desc: "低频深蓝助眠",    color: "#6359d4" },
];

interface Props { session: Session; }

export function SceneScreen({ session }: Props) {
  const { prefs, setPrefs, setMode } = session;

  return (
    <div className="screen-pad">
      <h2 className="screen-title">场景模式</h2>

      <div className="scene-list">
        {SCENES.map((scene) => {
          const active = prefs.themeId === scene.themeId;
          return (
            <button
              key={scene.themeId}
              type="button"
              className={`scene-row${active ? " active" : ""}`}
              onClick={() => {
                setMode("theme");
                setPrefs((p) => ({ ...p, themeId: scene.themeId, effect: scene.effect }));
              }}
            >
              <span
                className="scene-dot"
                style={{
                  background: scene.color,
                  boxShadow: active ? `0 0 14px 4px ${scene.color}80` : "none",
                }}
              />
              <div className="scene-text">
                <strong>{scene.name}</strong>
                <span>{scene.desc}</span>
              </div>
              <span className="scene-check" style={{ opacity: active ? 1 : 0 }}>✓</span>
            </button>
          );
        })}
      </div>

      <p className="scene-hint">切换场景后可在「灯光」页进一步调节</p>
    </div>
  );
}
