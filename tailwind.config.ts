import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          base: "#0c0e12",
          surface: "#14171d",
          elevated: "#1a1e26",
          border: "rgba(255, 255, 255, 0.08)",
          subtle: "rgba(255, 255, 255, 0.04)",
        },
        ink: {
          pure: "#ffffff",
          primary: "#f1f5f9",
          muted: "#94a3b8",
          faint: "#64748b",
        },
        accent: {
          sage: "#86a789",      // 恬淡鼠尾草灰绿（生命、平安与呼吸感）
          fog: "#cbd5e1",       // 晨雾冷白
          slate: "#334155",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          "sans-serif",
        ],
        serif: [
          '"Songti SC"',
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"STSong"',
          '"Microsoft YaHei"',
          "serif",
        ],
        mono: [
          "ui-monospace",
          '"SF Mono"',
          '"Cascadia Code"',
          '"Segoe UI Mono"',
          '"JetBrains Mono"',
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
