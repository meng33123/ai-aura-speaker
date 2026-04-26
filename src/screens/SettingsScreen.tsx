import type { Session } from "../App";

const ROWS = [
  "音量设置",
  "灯光设置",
  "AI 分析设置",
  "调音助手",
  "固件更新",
  "关于我们",
];

interface Props { session: Session; }

export function SettingsScreen({ session }: Props) {
  const { volume, setVolume } = session;

  return (
    <div className="screen-pad">
      <h2 className="screen-title">设置</h2>

      {/* Volume control */}
      <div className="settings-card">
        <div className="settings-vol-row">
          <span>🔈</span>
          <input
            type="range" min={0} max={1} step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="vol-slider"
          />
          <span>🔊</span>
        </div>
        <p className="vol-val">{Math.round(volume * 100)}%</p>
      </div>

      {/* Settings rows */}
      <div className="settings-list">
        {ROWS.map((row) => (
          <button key={row} type="button" className="settings-row">
            <span>{row}</span>
            <span className="settings-arrow">›</span>
          </button>
        ))}
      </div>

      <p className="version-note">v 1.2.0 · AI 氛围灯音响原型</p>
    </div>
  );
}
