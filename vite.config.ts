import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.svg", "pwa-192x192.svg", "pwa-512x512.svg"],
      manifest: {
        name: "声光共情 AI 氛围灯音响",
        short_name: "声光共情",
        description: "AI 音乐氛围灯音响，实时节奏与情绪驱动光效。",
        theme_color: "#0b0d18",
        background_color: "#0b0d18",
        display: "standalone",
        orientation: "portrait",
        lang: "zh-CN",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
