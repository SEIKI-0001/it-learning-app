"use client";

import type { CSSProperties } from "react";
import { scramble } from "../httpsFlow";
import type { LabSceneProps } from "./labTypes";
import styles from "./screenstory.module.css";

// パターンB：3つの画面で追う。
// 「あなたのブラウザ」「通信路（ケーブル）」「盗聴者のパケット盗聴ツール」「Webサーバのログ」を
// 実物に近い UI で並べ、同じデータが“誰の画面にどう映るか”を直接見せる。
// ステップの主役の画面にスポットライトを当て、ほかは少し暗くする。

/** 送る内容をパケットに見立てて最大4つに分ける */
function chunks(text: string): string[] {
  const size = Math.max(4, Math.ceil(text.length / 4));
  const out: string[] = [];
  for (let i = 0; i < text.length && out.length < 4; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : ["…"];
}

export function ScreenStoryScene({ mode, index, step, plain, cipher, reducedMotion }: LabSceneProps) {
  const https = mode === "https";
  const captured = step.intercepted;
  const arrived = step.stop === "arrived";
  const pieces = chunks(plain);
  const focus = ["you", "wire", "eve", "server"][index];

  return (
    <div
      className={styles.story}
      data-mode={mode}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="screenstory-scene"
    >
      {/* ---------- あなたのPC（ブラウザ） ---------- */}
      <section className={styles.device} data-focus={focus === "you"} aria-label="あなたのPCの画面">
        <p className={styles.deviceLabel}>
          <span aria-hidden>🧑</span> あなたのPC
          {index === 0 && <span className={styles.chip}>入力中</span>}
          {index === 1 && <span className={styles.chip}>送信</span>}
        </p>
        <BrowserScreen mode={mode} index={index} plain={plain} />
      </section>

      {/* ---------- 通信路 ---------- */}
      <section className={styles.wire} data-focus={focus === "wire"} data-active={step.laneActive} aria-label="通信路">
        <p className={styles.wireLabel}>
          インターネット（通信路）
          {https && <span className={styles.tlsChip}>🔒 TLS で暗号化</span>}
        </p>
        <div className={styles.pipeWrap}>
          <div className={styles.pipe}>
            <div className={styles.shield} aria-hidden />
            {step.laneActive &&
              pieces.map((piece, i) => (
                <span
                  key={`${mode}-${i}-${piece}`}
                  className={styles.packet}
                  style={{ animationDelay: `${i * 0.55}s` } as CSSProperties}
                >
                  {https ? scramble(piece).slice(0, 9) : piece}
                </span>
              ))}
          </div>
          {/* 盗聴クリップ → 盗聴者のPC */}
          <div className={styles.tap} data-on={captured ? "true" : "false"} aria-hidden>
            <span className={styles.clip} />
            <span className={styles.tapLine} />
            {captured && !arrived && <span className={styles.tapCopy}>{https ? "🔒" : "✉"}</span>}
          </div>
          {/* 出口 → Webサーバ */}
          <div className={styles.exit} data-on={arrived ? "true" : "false"} aria-hidden>
            <span className={styles.exitLine} />
          </div>
        </div>
      </section>

      <div className={styles.row}>
        {/* ---------- 盗聴者のPC ---------- */}
        <section className={styles.device} data-focus={focus === "eve"} aria-label="盗聴者の画面" data-testid="screenstory-eve">
          <p className={styles.deviceLabel}>
            <span aria-hidden>😈</span> 盗聴者のPC
            {captured && <span className={styles.chip} data-tone="danger">盗聴中</span>}
          </p>
          <SnifferScreen mode={mode} captured={captured} plain={plain} cipher={cipher} />
        </section>

        {/* ---------- Webサーバ ---------- */}
        <section className={styles.device} data-focus={focus === "server"} aria-label="Webサーバのログ">
          <p className={styles.deviceLabel}>
            <span aria-hidden>🗄️</span> Webサーバ
            {arrived && <span className={styles.chip} data-tone="ok">受信</span>}
          </p>
          <ServerLogScreen mode={mode} arrived={arrived} plain={plain} />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 画面の部品（3Dカフェの「画面を拡大」版でも使う）
// ---------------------------------------------------------------------------

type ScreenMode = LabSceneProps["mode"];

export function BrowserScreen({ mode, index, plain }: { mode: ScreenMode; index: number; plain: string }) {
  const https = mode === "https";
  const sent = index >= 1;
  return (
    <div className={styles.browser}>
      <div className={styles.browserTabs}>
        <span className={styles.dots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.tab}>ログイン | shop.example</span>
      </div>
      <div className={styles.urlBar}>
        <span className={styles.urlBadge} data-mode={mode}>
          {https ? "🔒" : "⚠︎ 保護されていない通信"}
        </span>
        <span className={styles.urlText}>
          <b data-mode={mode}>{https ? "https://" : "http://"}</b>shop.example/login
        </span>
      </div>
      <div className={styles.page}>
        <p className={styles.pageTitle}>ログイン</p>
        <div className={styles.field} data-typing={index === 0 ? "true" : "false"}>
          <span
            key={`${plain}-${index === 0}`}
            className={styles.typed}
            style={{ "--n": plain.length } as CSSProperties}
          >
            {plain}
          </span>
        </div>
        <div className={styles.submit} data-sent={sent ? "true" : "false"}>
          {sent ? "送信しました ✓" : "ログイン"}
        </div>
      </div>
    </div>
  );
}

export function SnifferScreen({
  mode,
  captured,
  plain,
  cipher,
}: {
  mode: ScreenMode;
  captured: boolean;
  plain: string;
  cipher: string;
}) {
  const https = mode === "https";
  return (
    <div className={styles.terminal}>
      <div className={styles.termBar}>
        <span className={styles.dots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>sniffer — wlan0</span>
      </div>
      <div className={styles.termBody}>
        <p>
          <span className={styles.prompt}>$</span> sniff wlan0
        </p>
        <p className={styles.dim}>listening on wlan0…</p>
        {captured ? (
          <>
            <p className={styles.line} style={{ animationDelay: "0.1s" }}>
              <span className={styles.dim}>14:02:11</span> {https ? "TLSv1.3 :443 Application Data" : "HTTP :80 POST /login"}
            </p>
            <p className={styles.line} style={{ animationDelay: "0.5s" }}>
              <span className={styles.hit} data-mode={mode}>
                {https ? cipher || "…" : plain}
              </span>
            </p>
            <p className={`${styles.line} ${styles.verdict}`} data-mode={mode} style={{ animationDelay: "0.9s" }}>
              {https ? ">> 暗号化されていて読めない…" : ">> 読めた！パスワード入手"}
            </p>
          </>
        ) : (
          <p>
            <span className={styles.cursor} />
          </p>
        )}
      </div>
    </div>
  );
}

export function ServerLogScreen({ mode, arrived, plain }: { mode: ScreenMode; arrived: boolean; plain: string }) {
  const https = mode === "https";
  return (
    <div className={styles.log}>
      <div className={styles.logBar}>access.log</div>
      <div className={styles.logBody}>
        {arrived ? (
          <>
            {https && (
              <p className={styles.line} style={{ animationDelay: "0.1s" }}>
                <span className={styles.ok}>TLS 復号 ✓</span>
              </p>
            )}
            <p className={styles.line} style={{ animationDelay: https ? "0.5s" : "0.1s" }}>
              POST /login <span className={styles.ok}>200</span>
            </p>
            <p className={styles.line} style={{ animationDelay: https ? "0.9s" : "0.5s" }}>
              <span className={styles.body}>{plain}</span>
            </p>
          </>
        ) : (
          <p className={styles.dim}>待機中…</p>
        )}
      </div>
    </div>
  );
}
