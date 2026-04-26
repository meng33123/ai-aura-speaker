import { useState } from "react";
import { useAmbientSession } from "./hooks/useAmbientSession";
import { HomeScreen } from "./screens/HomeScreen";
import { AnalysisScreen } from "./screens/AnalysisScreen";
import { LightScreen } from "./screens/LightScreen";
import { SceneScreen } from "./screens/SceneScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { DashboardScreen } from "./screens/DashboardScreen";

export type Session = ReturnType<typeof useAmbientSession>;
export type ScreenId =
  | "home"
  | "analysis"
  | "light"
  | "scene"
  | "settings"
  | "dashboard";

const NAV: { id: ScreenId; label: string; icon: string }[] = [
  { id: "home",     label: "首页", icon: "⊙" },
  { id: "analysis", label: "音乐", icon: "♪" },
  { id: "light",    label: "灯光", icon: "✦" },
  { id: "scene",    label: "场景", icon: "▤" },
  { id: "settings", label: "设置", icon: "⋯" },
];

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const session = useAmbientSession();

  return (
    <div className="device-frame">
      <audio ref={session.audioRef} className="hidden-audio" crossOrigin="anonymous" />

      <div className="status-bar">
        <span className="status-time">9:41</span>
        <span className="status-icons">●●●</span>
      </div>

      <div className="screen-body">
        {screen === "home"      && <HomeScreen      session={session} onNavigate={setScreen} />}
        {screen === "analysis"  && <AnalysisScreen  session={session} />}
        {screen === "light"     && <LightScreen     session={session} />}
        {screen === "scene"     && <SceneScreen     session={session} />}
        {screen === "settings"  && <SettingsScreen  session={session} />}
        {screen === "dashboard" && <DashboardScreen session={session} />}
      </div>

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-btn${screen === item.id ? " active" : ""}`}
            onClick={() => setScreen(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
