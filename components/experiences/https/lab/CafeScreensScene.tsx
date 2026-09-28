"use client";

import { HttpsCafeScene } from "../HttpsCafeScene";
import type { LabSceneProps } from "./labTypes";
import { BrowserScreen, ServerLogScreen, SnifferScreen } from "./ScreenStoryScene";
import ss from "./screenstory.module.css";

// パターンF：本番の 3D カフェ（E）の下に、B の画面（ブラウザ／盗聴ツール／サーバログ）を拡大して付ける。

const WHO = [
  { who: "あなたのPCの画面", icon: "🧑" },
  { who: "あなたのPCの画面", icon: "🧑" },
  { who: "隣の席の盗聴者の画面", icon: "😈" },
  { who: "Webサーバのログ", icon: "🗄️" },
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
              <span aria-hidden>{zoom.icon}</span> {zoom.who}（拡大）
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
