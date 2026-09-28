// アプリ本体（app/globals.css）のブランド色に合わせた動画用の配色と書体。
export const C = {
  brand50: "#f2f6fc",
  brand100: "#dce7fa",
  brand200: "#c3d5f4",
  brand300: "#97b6ec",
  brand400: "#5f8fe3",
  brand500: "#2f6fdb",
  brand600: "#2463d1",
  brand700: "#2257b0",
  brand800: "#1d4892",
  brand900: "#183a73",
  brand950: "#10264b",
  navy: "#021C48", // モチットの線の色
  mint: "#8CF1D9",
  cyan: "#6DEEFE",
  sun: "#FFC845",
  orange: "#F97316",
  red: "#EF4444",
  purple: "#A855F7",
  green: "#16A34A",
  white: "#FFFFFF",
  ink: "#0F172A",
  gray500: "#64748B",
} as const;

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

export const W = 1920;
export const H = 1080;
export { FPS } from "./timelineCore";
