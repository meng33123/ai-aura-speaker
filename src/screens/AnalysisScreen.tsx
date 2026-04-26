import type { Session } from "../App";

const MOOD_ZH: Record<string, string> = {
  joy: "愉悦", passion: "激情", calm: "平静",
  melancholy: "忧郁", energetic: "活力", neutral: "中性",
};

const MOOD_COLOR: Record<string, string> = {
  joy: "#fde68a", passion: "#fb7185", calm: "#67e8f9",
  melancholy: "#a78bfa", energetic: "#ff9f43", neutral: "#6c8cff",
};

interface Props { session: Session; }

export function AnalysisScreen({ session }: Props) {
  const { analysis, lyricsText, setLyricsText, playing, aiNote, beatStrength } = session;

  const moodColor = MOOD_COLOR[analysis.mood] ?? "#6c8cff";

  const moodDims = [
    { label: "情绪", value: analysis.intensity[analysis.intensity.length - 1] ?? 0.6, color: "#a78bfa" },
    { label: "节奏", value: playing ? Math.min(1, beatStrength * 1.8) : (analysis.intensity[0] ?? 0.45), color: "#67e8f9" },
    { label: "能量", value: analysis.intensity[Math.floor(analysis.intensity.length / 2)] ?? 0.5, color: "#4f95ff" },
  ];

  return (
    <div className="screen-pad">
      <h2 className="screen-title">音乐分析</h2>

      {/* Song card */}
      <div className="song-card" style={{ borderColor: `${moodColor}40` }}>
        <div className="song-disc" style={{ background: `conic-gradient(${moodColor}, #1a1f35, ${moodColor})` }}>
          <div className="song-disc-center" />
        </div>
        <div className="song-info">
          <strong>{playing ? "正在播放" : "未在播放"}</strong>
          <span className="song-meta">
            {MOOD_ZH[analysis.mood] ?? analysis.mood} · {analysis.tempo} BPM
          </span>
        </div>
        <div className="song-status" style={{ color: moodColor }}>
          {playing ? "●" : "○"}
        </div>
      </div>

      {/* Waveform */}
      <div className="waveform-wrap">
        {Array.from({ length: 32 }).map((_, i) => {
          const v = analysis.beat_index[i % Math.max(1, analysis.beat_index.length)] ?? 0.4;
          return (
            <span
              key={i}
              className={`wave-bar${playing ? " wave-anim" : ""}`}
              style={{
                height: `${8 + v * 52}px`,
                background: `linear-gradient(180deg, ${moodColor}, rgba(79,149,255,0.4))`,
                animationDelay: `${i * 45}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Mood bars */}
      <div className="analysis-card">
        <h3>情绪分析谱</h3>
        <div className="mood-rows">
          {moodDims.map((d) => (
            <div key={d.label} className="mood-row">
              <span className="mood-row-label">{d.label}</span>
              <div className="mood-track">
                <div
                  className="mood-fill"
                  style={{ width: `${d.value * 100}%`, background: d.color }}
                />
              </div>
              <span className="mood-pct">{(d.value * 100).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <p className="ai-note-text">{aiNote}</p>
      </div>

      {/* Lyrics input */}
      <div className="analysis-card">
        <h3>歌词 / 氛围描述</h3>
        <textarea
          className="lyrics-input"
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
          rows={4}
          placeholder="粘贴歌词或描述音乐氛围…"
        />
      </div>
    </div>
  );
}
