import type { Session } from "../App";

interface Props { session: Session; }

export function DashboardScreen({ session }: Props) {
  const { analysis, lightFrame, playing, beatStrength, lightCss } = session;

  const dims = [
    { label: "能量", value: analysis.intensity[analysis.intensity.length - 1] ?? 0.75, color: "#a78bfa" },
    { label: "旋律", value: analysis.intensity[0] ?? 0.55,                              color: "#4f95ff" },
    { label: "节奏", value: playing ? Math.min(1, beatStrength * 2) : 0.48,            color: "#34d399" },
    { label: "情绪", value: analysis.intensity[Math.floor(analysis.intensity.length / 2)] ?? 0.62, color: "#fb7185" },
  ];

  return (
    <div className="screen-pad">
      <h2 className="screen-title">数据看板</h2>

      {/* Spectrum */}
      <div className="dash-card">
        <h3>实时频谱分析</h3>
        <div className="spectrum-bars">
          {Array.from({ length: 26 }).map((_, i) => {
            const v = analysis.beat_index[i % Math.max(1, analysis.beat_index.length)] ?? 0.35;
            return (
              <span
                key={i}
                className={`spec-bar${playing ? " spec-anim" : ""}`}
                style={{
                  height: `${18 + v * 62}px`,
                  background: `linear-gradient(180deg, ${lightCss}, rgba(79,149,255,0.45))`,
                  animationDelay: `${i * 48}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Mood dimensions */}
      <div className="dash-card">
        <h3>情绪维度</h3>
        <div className="dim-rows">
          {dims.map((d) => (
            <div key={d.label} className="dim-row">
              <span className="dim-label">{d.label}</span>
              <div className="dim-track">
                <div
                  className="dim-fill"
                  style={{ width: `${d.value * 100}%`, background: d.color }}
                />
              </div>
              <span className="dim-val">{(d.value * 100).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current light */}
      <div className="dash-card dash-light-row">
        <div
          className="dash-color-dot"
          style={{ background: lightCss, boxShadow: `0 0 18px 4px ${lightCss}` }}
        />
        <div>
          <p>光晕强度：<strong>{(lightFrame.glow * 100).toFixed(0)}%</strong></p>
          <p>节奏强度：<strong>{(beatStrength * 100).toFixed(0)}%</strong></p>
          <p>当前情绪：<strong>{analysis.mood}</strong></p>
        </div>
      </div>
    </div>
  );
}
