// LP（app/lp/lp.css）と同じ配色と書体。動画は LP に埋め込まれるので、ページと地続きに見えるようにする。
export const C = {
  white: "#ffffff",
  ink: "#1a2340", // 墨紺：本文
  ai: "#2946ce", // 藍：CTA・強調
  aiDark: "#1f37a6",
  aiSoft: "#e3e8fb",
  shu: "#d9442c", // 朱：赤ペン強調
  wash: "#f2f5fe", // 淡藍
  wakaba: "#1fa971", // 若葉：正解・前進
  sub: "#5a6285", // 灰紺：補助テキスト
  line: "#dde2f0",
  night: "#0d1430", // 夜の勉強机（前半の暗い場面）
  night2: "#18214a",
  mist: "#c9d1ec", // 夜の場面の補助テキスト
} as const;

// 見出し＝明朝（LP の --disp）、本文＝角ゴシック（LP の --body-face）
export const DISP = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
export const BODY = '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';

export const W = 1920;
export const H = 1080;
export { FPS } from "./timelineCore";
