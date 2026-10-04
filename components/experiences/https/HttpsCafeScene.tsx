"use client";

import { useRef, type ReactNode } from "react";
import { Billboard, Box, CablePulses, Cylinder, FloorShadow, type Vec3 } from "../scene/Diorama3D";
import { Parcel } from "../scene/DioramaParts";
import { EavesdropperStanding, UserFromBehind } from "../scene/DioramaPeople";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip, lerp3 } from "../scene/DioramaStage";
import type { Camera } from "../scene/Diorama3D";
import type { HttpsCapsuleStop } from "./HttpsScene";
import { FLOW_STEPS, type HttpsSceneInput } from "./httpsFlow";
import styles from "./httpscafe.module.css";

// HTTP/HTTPS ① 盗み見くらべの図解：フリーWi-Fi のカフェ（実際に盗聴が起きやすい場面）を CSS 3D で再現する。
//   あなたの席のノートPC →（電波）→ 壁のフリーWi-Fi →（インターネット）→ データセンターの Webサーバ
//   電波は周り全部へ届くので、隣の席で受信機を付けたノートPCを開く盗聴者にも同じデータが届く。
// カメラ・ドラッグ・投影ラベル・小包の移動は共通の舞台（scene/DioramaStage）が受け持つ。
// zoom を渡すと（図解ラボ用）、ステップの主役の機器からステージ下の拡大パネルへ光の帯を伸ばす。

const L: Vec3 = { x: 143, y: 240, z: 72 }; // あなたのノートPCの画面
const R: Vec3 = { x: 460, y: 8, z: 114 }; // 壁のフリーWi-Fi（アクセスポイント）
const A: Vec3 = { x: 375, y: 206, z: 64 }; // 盗聴者のノートPC
const S: Vec3 = { x: 690, y: 150, z: 122 }; // Webサーバ（ラック上面）

// 小包が通る点の列。middle → arrived はアクセスポイントを経由する。
const ROUTE: Vec3[] = [
  { x: 150, y: 266, z: 78 },
  lerp3(L, R, 0.2),
  lerp3(L, R, 0.56),
  { ...R, z: (R.z ?? 0) + 4 },
  { ...S, z: (S.z ?? 0) + 6 },
];
const ROUTE_INDEX: Record<HttpsCapsuleStop, number> = { desk: 0, out: 1, middle: 2, arrived: 4 };
const COPY_AT: Vec3 = { ...A, z: 92 };

const SHOTS: Camera[] = [
  { yaw: -14, pitch: 52, zoom: 1.45, fx: 150, fy: 262, fz: 60 },
  { yaw: -20, pitch: 55, zoom: 0.98, fx: 290, fy: 170, fz: 70 },
  { yaw: -8, pitch: 50, zoom: 1.08, fx: 350, fy: 160, fz: 80 },
  { yaw: -30, pitch: 54, zoom: 0.74, fx: 540, fy: 150, fz: 70 },
];

const LABELS: { id: string; at: Vec3; place: "above" | "below"; name: string }[] = [
  { id: "user", at: { x: 96, y: 372, z: 0 }, place: "below", name: "あなた" },
  { id: "eve", at: { x: 372, y: 160, z: 116 }, place: "above", name: "盗聴者" },
  { id: "ap", at: { x: 460, y: 8, z: 146 }, place: "above", name: "フリーWi-Fi" },
  { id: "web", at: { x: 690, y: 150, z: 132 }, place: "above", name: "Webサーバ" },
];

const STATUS: Record<string, Partial<Record<string, string>>> = {
  user: { active: "入力中", sending: "送信" },
  web: { active: "受信" },
  eve: { error: "盗聴中" },
};
const STATUS_TONE: Partial<Record<string, "info" | "ok" | "danger">> = { active: "ok", sending: "info", error: "danger" };

/** zoom を渡したとき、ステップごとに拡大パネルとつなぐ機器（3D の中の点） */
const ZOOM_AT: Vec3[] = [L, L, A, S];

export function HttpsCafeScene({
  mode,
  index,
  step,
  plain,
  cipher,
  forward,
  reducedMotion,
  zoom,
}: HttpsSceneInput & { zoom?: ReactNode }) {
  const https = mode === "https";
  const withScreens = zoom !== undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<SVGPolygonElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  // 前へ1段ずつ進むときだけ経路に沿って動かす（戻る・飛ばすときは瞬間移動）
  const to = ROUTE_INDEX[step.stop];
  const prev = index > 0 ? ROUTE_INDEX[FLOW_STEPS[index - 1].stop] : to;
  const packetPath = to > prev ? ROUTE.slice(prev + 1, to + 1) : undefined;

  const capsule =
    !https || step.stop === "desk"
      ? { state: "plain", tag: https ? "入力（まだPCの中）" : "平文（HTTP）", body: plain, label: `平文のデータ：${plain}` }
      : step.stop === "arrived"
        ? { state: "decrypted", tag: "サーバで復号", body: plain, label: `サーバで復号されたデータ：${plain}` }
        : {
            state: "encrypted",
            tag: "ENCRYPTED DATA",
            body: cipher.length > 14 ? `${cipher.slice(0, 14)}…` : cipher || "…",
            label: "暗号化されたデータ",
          };
  const eveSees = step.intercepted ? (https ? cipher || "…" : plain) : null;
  const radio = index === 1 || index === 2;
  const beamTone = index === 2 ? (https ? "safe" : "leak") : index === 3 ? "ok" : "you";

  return (
    <DioramaStage
      testId="https-scene"
      ariaLabel={
        https
          ? "カフェの模型。あなたのノートPCからフリーWi-Fiを通ってデータセンターのWebサーバまで、緑の暗号のトンネル（TLS）がつながっている。隣の席の盗聴者も電波を受信している"
          : "カフェの模型。あなたのノートPCが出す電波は、壁のフリーWi-Fiだけでなく隣の席の盗聴者のノートPCにも届いている"
      }
      shot={SHOTS[index]}
      shotKey={index}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": mode, "data-intercepted": step.intercepted ? "true" : "false" }}
      className={styles.cafeStage}
      tokens={{
        packet: { at: ROUTE[to], path: packetPath },
        // 同じ電波が盗聴者の受信機にも届く（小包が中間に来てから分かれる）
        copy: { at: step.intercepted ? COPY_AT : null, start: ROUTE[2], path: [COPY_AT], delay: 1100 },
      }}
      corner={
        <span className={`${styles.urlPlate} ${styles.urlPlateInline}`} data-mode={mode}>
          {https ? "https://  🔒" : "http://  ⚠︎"}
        </span>
      }
      onFrame={
        withScreens
          ? ({ project, width, height }) => {
              // F：3D の中の機器から、下の拡大画面へ光の帯を伸ばす
              const panel = panelRef.current;
              const beam = beamRef.current;
              if (!panel || !beam || !dotRef.current) return;
              const s = project(ZOOM_AT[index]);
              const sx = Math.max(4, Math.min(width - 4, s.x));
              const sy = Math.max(4, Math.min(height - 4, s.y));
              const top = panel.offsetTop + 2;
              const left = panel.offsetLeft + 10;
              const right = panel.offsetLeft + panel.offsetWidth - 10;
              beam.setAttribute("points", `${sx},${sy} ${left},${top} ${right},${top}`);
              dotRef.current.setAttribute("cx", `${sx}`);
              dotRef.current.setAttribute("cy", `${sy}`);
            }
          : undefined
      }
      world={
        <>
          {/* ---------- カフェの床と壁 ---------- */}
          <Box x={0} y={0} z={-18} w={600} d={380} h={18} color="#c9b39a" faceClass={{ top: styles.woodFloor }} />
          <Box
            x={0}
            y={-12}
            w={600}
            d={12}
            h={150}
            color="#f3ede4"
            faceClass={{ front: styles.cafeWall }}
            faces={{
              front: (
                <>
                  <div className={styles.menuBoard} style={{ left: 30, top: 16, width: 170, height: 46 }}>
                    <b>CAFE MENU</b>
                    <span>ブレンド 450 ／ ラテ 520</span>
                  </div>
                  <div className={styles.window} style={{ left: 250, top: 22, width: 120, height: 74 }} />
                  <div className={styles.wifiSign} style={{ left: 396, top: 78, width: 128, height: 34 }}>
                    <b>FREE Wi-Fi</b>
                    <span>SSID: CAFE_FREE ／ パスワードなし</span>
                  </div>
                </>
              ),
            }}
          />

          {/* カウンターとコーヒーマシン */}
          <FloorShadow x={18} y={40} w={220} d={50} opacity={0.25} />
          <Box x={20} y={12} w={200} d={50} h={62} color="#7a5638" faceClass={{ top: styles.counterTop }} />
          <Box x={40} y={18} w={36} d={26} h={34} z={62} color="#a3acb8" />
          <Box x={90} y={24} w={10} d={10} h={12} z={62} color="#f8fafc" />
          <Box x={106} y={24} w={10} d={10} h={12} z={62} color="#f8fafc" />

          {/* 壁のフリーWi-Fi（アクセスポイント） */}
          <Box x={440} y={0} w={40} d={14} h={12} z={108} color="#eef1f5" />
          <Box x={445} y={4} w={3} d={3} h={24} z={120} color="#475569" />
          <Box x={472} y={4} w={3} d={3} h={24} z={120} color="#475569" />

          {/* 観葉植物 */}
          <FloorShadow x={560} y={28} w={50} d={40} opacity={0.25} />
          <Box x={566} y={26} w={28} d={28} h={26} color="#b86a44" />
          <Billboard x={580} y={40} z={24} w={58} h={64}>
            <svg viewBox="0 0 58 64" className="h-full w-full" aria-hidden>
              <path d="M29 64 C 20 44, 6 40, 2 22 C 16 26, 24 38, 29 64 Z" fill="#3f8f5a" />
              <path d="M29 64 C 38 42, 52 38, 56 18 C 42 24, 32 36, 29 64 Z" fill="#4fa56b" />
              <path d="M29 64 C 26 40, 22 18, 30 2 C 36 18, 34 42, 29 64 Z" fill="#5bb879" />
            </svg>
          </Billboard>

          {/* ---------- あなたの席 ---------- */}
          <FloorShadow x={86} y={236} w={120} d={80} />
          <Box x={134} y={259} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={90} y={226} w={106} d={74} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={110} y={244} w={66} d={40} h={3} z={49} color="#cfd5dd" faceClass={{ top: styles.keyboardTop }} />
          <div className={styles.group} style={{ transform: "translate3d(110px, 244px, 52px)" }}>
            <div className={`${styles.lid} ${styles.lid}`} data-state={step.nodes.user}>
              <div className={styles.lidScreen}>
                <div className={styles.browser} data-mode={mode}>
                  <div className={styles.browserBar}>
                    <span className={styles.browserLock}>{https ? "🔒" : "⚠︎"}</span>
                    <span>{https ? "https://" : "http://"}shop.example</span>
                  </div>
                  <div className={styles.browserBody}>
                    <p className={styles.browserTitle}>ログイン</p>
                    <div className={styles.browserField}>{plain}</div>
                    <div className={styles.browserButton} data-pressed={index >= 1 ? "true" : "false"}>
                      {index >= 1 ? "送信済み" : "送信"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Box x={180} y={284} w={9} d={9} h={10} z={49} color="#fafafa" />
          <FloorShadow x={104} y={318} w={70} d={40} opacity={0.3} />
          <Billboard x={128} y={340} w={78} h={106}>
            <div data-illustration="human" className="h-full w-full">
              <UserFromBehind />
            </div>
          </Billboard>

          {/* ---------- 隣の席の盗聴者 ---------- */}
          <FloorShadow x={336} y={140} w={110} d={96} />
          <Billboard x={372} y={162} w={60} h={112}>
            <div data-illustration="eavesdropper" className="h-full w-full">
              <EavesdropperStanding active={step.intercepted} />
            </div>
          </Billboard>
          <Box x={369} y={196} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={330} y={170} w={96} d={64} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={350} y={190} w={52} d={34} h={3} z={49} color="#2f3440" />
          <div className={styles.group} style={{ transform: "translate3d(402px, 224px, 52px) rotateZ(180deg)" }}>
            <div className={`${styles.lid} ${styles.evilLid}`} />
          </div>
          {/* USB の受信アンテナ */}
          <Box x={404} y={196} w={4} d={4} h={4} z={49} color="#111827" />
          <Box x={405} y={197} w={2} d={2} h={26} z={53} color="#111827" />
          <Box x={403} y={195} w={6} d={6} h={4} z={79} color={step.intercepted && !https ? "#e11d48" : "#475569"} />
          <Box x={410} y={210} w={9} d={9} h={10} z={49} color="#fafafa" />

          {/* 奥の席（雰囲気） */}
          <FloorShadow x={470} y={250} w={100} d={70} opacity={0.25} />
          <Box x={514} y={274} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={476} y={250} w={88} d={60} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={500} y={268} w={9} d={9} h={10} z={49} color="#fafafa" />
          <Box x={524} y={264} w={26} d={18} h={3} z={49} color="#dbeafe" />

          {/* ---------- 電波（あなたのノートPCから、周り全部へ） ---------- */}
          <Billboard x={L.x} y={L.y} z={(L.z ?? 0) - 170} w={340} h={340}>
            <div className={styles.waves} data-on={radio ? "true" : "false"} aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </Billboard>

          {/* ---------- インターネット（APからデータセンターへ） ---------- */}
          <Cylinder from={{ ...R, z: 112 }} to={{ ...S, z: 118 }} z={112} r={3.5} segments={8} stripClassName={styles.cableStrip} />
          <CablePulses
            from={{ ...R, z: 112 }}
            to={{ ...S, z: 118 }}
            r={3.5}
            on={step.stop === "arrived" || index === 2}
            color={https ? "#34d399" : "#fb7185"}
          />

          {/* ---------- TLS：あなたのブラウザからサーバまでの暗号のトンネル ---------- */}
          <div className={styles.group} data-tunnel={https ? "on" : "off"} data-on={https ? "true" : "false"} data-testid="tls-tunnel">
            <Cylinder from={lerp3(L, R, 0.06)} to={R} z={0} r={11} segments={14} stripClassName={styles.glassStrip} />
            <Cylinder from={{ ...R, z: 112 }} to={{ ...S, z: 118 }} z={0} r={11} segments={14} stripClassName={styles.glassStrip} />
          </div>

          {/* ---------- データセンター ---------- */}
          <Box x={620} y={70} z={-18} w={150} d={150} h={18} color="#cfd6e0" faceClass={{ top: styles.dcFloor }} />
          <FloorShadow x={652} y={124} w={120} d={70} />
          <div className={styles.group} data-illustration="web">
            <Box
              x={655}
              y={120}
              w={70}
              d={60}
              h={116}
              color="#2a303c"
              faceClass={{ front: styles.rackFront, left: styles.rackSide }}
              faces={{
                front: (
                  <div className={styles.rackBays} data-state={step.nodes.web}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className={styles.rackBay}>
                        <span className={styles.led} style={{ animationDelay: `${i * 170}ms` }} />
                        <span className={styles.led} data-alt style={{ animationDelay: `${i * 90 + 300}ms` }} />
                      </div>
                    ))}
                  </div>
                ),
              }}
            />
          </div>
          <Box x={730} y={132} w={30} d={48} h={80} color="#3a414f" />

          {/* ---------- 小包と、盗聴者に届いたコピー ---------- */}
          <DioramaToken id="packet">
            <div className={styles.group} data-testid="https-packet">
              <Parcel
                tone={capsule.state === "encrypted" ? "secure" : "plain"}
                mark={capsule.state === "encrypted" ? "lock" : capsule.state === "decrypted" ? "check" : "none"}
              />
            </div>
          </DioramaToken>
          <DioramaToken id="copy">
            <Parcel tone={https ? "secure" : "danger"} size={0.75} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          {/* 先に置いたものが優先 */}
          <DioramaLabel
            token="packet"
            dz={step.stop === "desk" ? 6 : 0}
            place={step.stop === "desk" ? "right" : step.stop === "out" ? "below" : "left"}
          >
            <div
              className={styles.packetLabel}
              data-state={capsule.state}
              data-capsule-state={capsule.state}
              role="img"
              aria-label={capsule.label}
            >
              <span className={styles.packetTag}>{capsule.tag}</span>
              <span className={styles.packetBody}>{capsule.body}</span>
            </div>
          </DioramaLabel>

          {!withScreens && eveSees !== null && (
            <DioramaLabel token="copy" dz={30}>
              <div className={styles.eveBubble} data-mode={mode} role="status" data-testid="eve-screen">
                <span className={styles.eveBubbleTitle}>😈 盗聴者の画面</span>
                <span className={styles.eveBubbleBody}>{eveSees}</span>
                <span className={styles.eveBubbleVerdict}>{https ? "読めない…" : "読めた！"}</span>
              </div>
            </DioramaLabel>
          )}

          {https && index > 0 && (
            <DioramaLabel at={{ ...lerp3(R, S, 0.5), z: 124 }} place="above">
              <span className={styles.tlsBadge}>TLS 暗号化トンネル</span>
            </DioramaLabel>
          )}

          {LABELS.filter((label) => !(label.id === "eve" && eveSees !== null && !withScreens)).map((label) => {
            const state = label.id === "ap" ? (radio ? "sending" : "idle") : step.nodes[label.id as keyof typeof step.nodes];
            const status = STATUS[label.id]?.[state];
            return (
              <DioramaLabel key={label.id} at={label.at} place={label.place} optional>
                <NameChip name={label.name} status={status} tone={STATUS_TONE[state]} />
              </DioramaLabel>
            );
          })}
        </>
      }
      after={
        withScreens && (
          <>
            <svg className={styles.beamLayer} aria-hidden>
              <polygon ref={beamRef} className={styles.beam} data-tone={beamTone} />
              <circle ref={dotRef} r={5} className={styles.beamDot} data-tone={beamTone} />
            </svg>
            <div ref={panelRef} className={styles.panel} data-testid="https-zoom-panel">
              {zoom}
            </div>
          </>
        )
      }
    />
  );
}
