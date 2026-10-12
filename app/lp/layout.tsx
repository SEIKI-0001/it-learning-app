import type { ReactNode } from "react";
import FunnelTracker from "@/components/growth/FunnelTracker";

// LP 配下（/lp・/lp/try・/lp/lab）の共通の外枠。見た目は各ページが持つ。
// 公開ページからの回遊の終点として、表示とリンクのクリックを計測する（lib/growth/funnel.ts）。

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <FunnelTracker />
      {children}
    </>
  );
}
