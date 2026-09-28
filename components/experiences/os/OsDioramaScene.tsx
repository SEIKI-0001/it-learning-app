"use client";

import type { CSSProperties } from "react";
import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import { Cable, Desk, Floor, GlassSlab, Group, Laptop, Parcel, Person, Screen, type RouteTone } from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken } from "../scene/DioramaStage";
import type { NodeState } from "../network/NetworkSceneBase";
import type { OsLayer, OsPart, OsSceneProps } from "./osTypes";
import styles from "./osdiorama.module.css";

// OS の図解：パソコンを3つの階に分けた分解模型。
//   上の階＝アプリ（画面に並ぶ音楽App・メモApp。手前のユーザーが操作する）
//   中の階＝OS（全体を覆う床。真ん中の OS の中枢だけが上と下をつなぐ）
//   下の階＝ハードウェア（マザーボードの上の CPU・スピーカー・ストレージ）
// アプリの頼みごとは OS の中枢を通ってハードへ届き、結果も OS を通ってアプリへ戻る。
// アプリが OS を飛ばして直接ハードに触ろうとすると、アプリの真下の OS の床で止まる。

const FOOT = { x: 250, y: 170, w: 300, d: 170 };
const LEVEL_Z: Record<OsLayer, number> = { hw: 10, os: 130, app: 250 };

type BlockPart = Exclude<OsPart, "user" | "wallL" | "wallR">;
const PART: Record<BlockPart, { layer: OsLayer; x: number; y: number; icon: string; name: string }> = {
  music: { layer: "app", x: 330, y: 250, icon: "🎵", name: "音楽App" },
  files: { layer: "app", x: 470, y: 250, icon: "📝", name: "メモApp" },
  core: { layer: "os", x: 400, y: 250, icon: "⚙️", name: "OS" },
  cpu: { layer: "hw", x: 320, y: 250, icon: "🧠", name: "CPU" },
  speaker: { layer: "hw", x: 400, y: 262, icon: "🔊", name: "スピーカー" },
  storage: { layer: "hw", x: 480, y: 250, icon: "💾", name: "ストレージ" },
};
const LAYER_META: Record<OsLayer, { name: string; sub: string }> = {
  app: { name: "アプリ", sub: "応用ソフト" },
  os: { name: "OS", sub: "基本ソフト" },
  hw: { name: "ハードウェア", sub: "機械" },
};
const TONE: Record<"request" | "result" | "blocked", RouteTone> = { request: "request", result: "response", blocked: "danger" };

/** 部品の上（札・小包を置く点） */
function partAt(part: OsPart): Vec3 {
  if (part === "user") return { x: 190, y: 330, z: 130 };
  if (part === "wallL") return { x: PART.music.x, y: 250, z: LEVEL_Z.os + 8 };
  if (part === "wallR") return { x: PART.files.x, y: 250, z: LEVEL_Z.os + 8 };
  const p = PART[part];
  const lift = p.layer === "app" ? 64 : p.layer === "os" ? 30 : 34;
  return { x: p.x, y: p.y, z: LEVEL_Z[p.layer] + lift };
}

/** 板と板をつなぐ管の端（部品の上面・下面） */
function linkEnd(part: OsPart, upper: boolean): Vec3 {
  const p = partAt(part);
  if (part === "user") return p;
  if (part === "wallL" || part === "wallR") return { ...p, z: LEVEL_Z.os + 6 };
  const layer = PART[part as BlockPart].layer;
  const base = LEVEL_Z[layer];
  return { x: p.x, y: p.y, z: upper ? base + 4 : base + (layer === "os" ? 26 : 30) };
}

function shotFor(at: OsPart | null): Camera {
  // 横から見上げる角度（pitch は真上からの傾き）で、3つの階が縦に並んで見えるようにする
  if (!at || at === "user") return { yaw: -26, pitch: 64, zoom: 0.9, fx: 390, fy: 250, fz: 140 };
  const layer = at === "wallL" || at === "wallR" ? "os" : PART[at].layer;
  // 3つの階は常に画面に入れたまま、いま動いている階へ少し寄る
  return { yaw: -26, pitch: 64, zoom: 1.0, fx: 390, fy: 250, fz: (LEVEL_Z[layer] + 30 + 140) / 2 };
}

const partState = (s: NodeState | undefined) => s ?? "idle";

export function OsDioramaScene({ layers, parts, links, capsule, barrier, userHears, reducedMotion, forward = true }: OsSceneProps & { forward?: boolean }) {
  const at = capsule ? partAt(capsule.at) : null;
  return (
    <DioramaStage
      testId="os-scene"
      ariaLabel="パソコンを3つの階に分けた分解模型。上の階にアプリ（音楽App・メモApp）、中の階にOS、下の階にハードウェア（CPU・スピーカー・ストレージ）。上と下は真ん中のOSを通ってだけつながる"
      shot={shotFor(capsule?.at ?? null)}
      shotKey={`${capsule?.at ?? "-"}-${barrier ? "b" : ""}`}
      forward={forward}
      reducedMotion={reducedMotion}
      aspect="20 / 18"
      aspectMobile="10 / 13"
      dataAttrs={{ "data-barrier": barrier ? "true" : "false" }}
      corner={
        // 階の順番は動かさない（上から アプリ → OS → ハードウェア）
        <span className={styles.legend}>
          {(["app", "os", "hw"] as OsLayer[]).map((layer) => (
            <span key={layer} className={styles.layerTag} data-layer-tag={layer} data-state={layers[layer]}>
              <b>{LAYER_META[layer].name}</b>
              <span>{LAYER_META[layer].sub}</span>
            </span>
          ))}
        </span>
      }
      tokens={{ capsule: { at } }}
      world={
        <>
          <Floor x={80} y={80} w={640} d={340} h={16} material="wood" />
          {/* 手前でパソコンを使う人 */}
          <Desk x={190} y={320} w={100} d={52} tone="wood" />
          <Laptop x={190} y={318} z={44} glow />
          <Person x={186} y={384} pose="sit" shirt="#4f86e8" />

          {/* ---------- 下の階：ハードウェア（マザーボード） ---------- */}
          <Box x={FOOT.x} y={FOOT.y} z={0} w={FOOT.w} d={FOOT.d} h={LEVEL_Z.hw} color="#14532d" faceClass={{ top: styles.pcb }} />
          <Group data={{ "data-part": "cpu", "data-state": partState(parts.cpu) }}>
            <Box x={PART.cpu.x - 20} y={PART.cpu.y - 20} z={LEVEL_Z.hw} w={40} d={40} h={26} color="#cbd5e1" faceClass={{ front: styles.fins, left: styles.fins }} />
          </Group>
          <Group data={{ "data-part": "speaker", "data-state": partState(parts.speaker) }}>
            <Box x={PART.speaker.x - 16} y={PART.speaker.y - 12} z={LEVEL_Z.hw} w={32} d={22} h={30} color="#1f2937" faceClass={{ front: styles.speaker }} faces={{ front: <span className={styles.cone} data-on={parts.speaker === "active" || parts.speaker === "sending" ? "true" : "false"} /> }} />
          </Group>
          <Group data={{ "data-part": "storage", "data-state": partState(parts.storage) }}>
            <Box x={PART.storage.x - 26} y={PART.storage.y - 10} z={LEVEL_Z.hw} w={52} d={20} h={4} color="#111827" faceClass={{ top: styles.ssd }} />
          </Group>

          {/* ---------- 中の階：OS（全体を覆う床と、真ん中の中枢） ---------- */}
          <GlassSlab x={FOOT.x} y={FOOT.y} z={LEVEL_Z.os - 6} w={FOOT.w} d={FOOT.d} tone="indigo" alarm={barrier} data={{ "data-layer": "os", "data-state": layers.os }} />
          <Group data={{ "data-part": "core", "data-state": partState(parts.core) }}>
            <Box x={PART.core.x - 30} y={PART.core.y - 22} z={LEVEL_Z.os} w={60} d={44} h={24} color="#4f46e5" faceClass={{ front: styles.core }} faces={{ front: <span className={styles.coreLeds} data-on={parts.core === "active" || parts.core === "sending" ? "true" : "false"} /> }} />
          </Group>

          {/* ---------- 上の階：アプリ（画面に並ぶ2つのアプリ） ---------- */}
          <GlassSlab x={FOOT.x} y={FOOT.y} z={LEVEL_Z.app - 6} w={FOOT.w} d={FOOT.d} tone="sky" data={{ "data-layer": "app", "data-state": layers.app }} />
          {(["music", "files"] as const).map((id) => (
            <Group key={id} data={{ "data-part": id, "data-state": partState(parts[id]) }}>
              <Box
                x={PART[id].x - 40}
                y={PART[id].y - 2}
                z={LEVEL_Z.app}
                w={80}
                d={4}
                h={54}
                color="#1f2937"
                faceClass={{ front: styles.window }}
                faces={{
                  front: (
                    <Screen glow={parts[id] === "active" || parts[id] === "sending"}>
                      <div className={styles.appUi} data-app={id}>
                        <span className={styles.appTitle}>{PART[id].name}</span>
                        <span className={styles.appArt} />
                      </div>
                    </Screen>
                  ),
                }}
              />
            </Group>
          ))}

          {/* 階と階をつなぐ管（頼みごと＝青、結果＝緑、止められた＝赤） */}
          {links.map((l, i) => {
            const a = partAt(l.from);
            const b = partAt(l.to);
            const downward = (a.z ?? 0) >= (b.z ?? 0);
            return (
              <div key={`${l.from}-${l.to}-${i}`} className={styles.link} data-tone={l.tone} data-from={l.from} data-to={l.to}>
                <Cable from={linkEnd(l.from, downward)} to={linkEnd(l.to, !downward)} r={3} tone={TONE[l.tone]} />
              </div>
            );
          })}

          <DioramaToken id="capsule">
            {capsule && <Parcel tone={capsule.tone === "blocked" ? "danger" : capsule.tone === "result" ? "ok" : "info"} size={0.8} mark={capsule.tone === "blocked" ? "alert" : "none"} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {capsule && (
            <DioramaLabel token="capsule" dz={12} place="right">
              <div className={styles.capsule} data-at={capsule.at} data-tone={capsule.tone} data-testid="os-capsule" style={{ "--tone": capsule.tone === "blocked" ? "#e11d48" : capsule.tone === "result" ? "#059669" : "#2f6fdb" } as CSSProperties}>
                {capsule.text}
              </div>
            </DioramaLabel>
          )}
          {barrier && (
            <DioramaLabel at={{ x: 400, y: FOOT.y + FOOT.d, z: LEVEL_Z.os }} place="below" pinned>
              <span className={styles.denied} role="status" data-testid="os-denied">
                ⛔ OSを経由してください
              </span>
            </DioramaLabel>
          )}
          <DioramaLabel at={{ x: 190, y: 330, z: 110 }} place="above" pinned>
            <span className={styles.user} data-hears={userHears ? "true" : "false"} data-testid="os-user">
              🙂{userHears ? ` ${userHears}` : " ユーザー"}
            </span>
          </DioramaLabel>
          {(Object.keys(PART) as BlockPart[]).map((id) => (
            <DioramaLabel key={id} at={partAt(id)} place={PART[id].x < 400 ? "left" : "right"} optional>
              <span className={styles.partTag} data-part-tag={id} data-state={parts[id] ?? "idle"}>
                <span aria-hidden>{PART[id].icon}</span>
                {PART[id].name}
              </span>
            </DioramaLabel>
          ))}
        </>
      }
    />
  );
}
