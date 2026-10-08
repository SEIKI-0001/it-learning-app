"use client";

import { HttpsCafeScene } from "../HttpsCafeScene";
import type { LabSceneProps } from "./labTypes";
import { BrowserScreen, ServerLogScreen, SnifferScreen } from "./ScreenStoryScene";
import ss from "./screenstory.module.css";
import Icon, { type IconName } from "@/components/ui/Icon";

// パターンF：本番の 3D カフェ（E）の下に、B の画面（ブラウザ／盗聴ツール／サーバログ）を拡大して付ける。

const WHO: { who: string; icon: IconName }[] = [
  { who: "あなたのPCの画面", icon: "user" },
  { who: "あなたのPCの画面", icon: "user" },
  { who: "隣の席の盗聴者の画面", icon: "attacker" },
  { who: "Webサーバのログ", icon: "server" },
];

export function CafeScreensScene(props: LabSceneProps) {
  const { mode, index, step, plain, cipher } = props;
  const zoom = WHO[index];
  return (
    <HttpsCafeScene
      {...props}
      zoom={
        <div className={ss.story} data-mode={mode}>
          <section className={ss.device} data-focus="true" aria-label={zoom.who}>
            <p className={ss.deviceLabel}>
              <Icon name={zoom.icon} aria-hidden className="inline h-3.5 w-3.5 align-text-bottom" /> {zoom.who}（拡大）
              {index === 2 && (
                <span className={ss.chip} data-tone="danger">
                  盗聴中
                </span>
              )}
              {index === 3 && (
                <span className={ss.chip} data-tone="ok">
                  受信
                </span>
              )}
            </p>
            {index <= 1 && <BrowserScreen mode={mode} index={index} plain={plain} />}
            {index === 2 && <SnifferScreen mode={mode} captured={step.intercepted} plain={plain} cipher={cipher} />}
            {index === 3 && <ServerLogScreen mode={mode} arrived plain={plain} />}
          </section>
        </div>
      }
    />
  );
}
