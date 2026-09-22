import type { ReactNode } from "react";
import { Klee_One } from "next/font/google";

// 週間レポートだけで使う手書き風の書体。日記として「人が書いた」感触を出す。
// 和文グリフは unicode-range で分割配信されるので、subsets は latin・preload はしない。
const klee = Klee_One({
  weight: ["400", "600"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-diary",
});

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <div className={klee.variable}>{children}</div>;
}
