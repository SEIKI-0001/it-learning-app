"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Monitor,
  Parcel,
  Person,
  Plant,
  ServerRack,
  Wall,
  WallWindow,
  slicePath,
  type RouteTone,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import styles from "./firewalldiorama.module.css";

// ゼロトラストの図解：会社のオフィスと、在宅勤務の自宅。3人が社内システムのサーバへアクセスする。
//   ① 自席の社員A（登録済みPC）  ② オフィスに入り込んだ侵入者  ③ 自宅から働く社員B（登録済みPC）
// 3人のアクセスはどれも、サーバの手前の同じ地点（確認ゲート）を通ってサーバへ向かう。
// 境界防御：オフィスの壁（入口のFW）の内側かどうかだけで決める → 侵入者は「社内だから」通れてしまい、社員Bは壁で止まる。
// ゼロトラスト：サーバの前で毎回「本人か」「登録済みの端末か」を確かめる → 侵入者は確認ゲートで止まり、社員Bは通れる。
// 切り替えるたびに、3つのアクセスが人の手元からもう一度動き直す。

export type TrustMode = "perimeter" | "zerotrust";

type ActorId = "staff" | "intruder" | "remote";
type Actor = {
  id: ActorId;
  name: string;
  sub: string;
  /** 人の足もと（名札の位置） */
  at: Vec3;
  /** アクセスの道：手元 → …… → 確認ゲート → サーバ */
  route: Vec3[];
  /** [本人, 端末] の確認結果 */
  identity: [boolean, boolean];
  inside: boolean;
};

const SERVER: Vec3 = { x: 600, y: 120, z: 0 };
const CHECK: Vec3 = { x: 540, y: 206, z: 0 };
const WALL_X = 330;
const G = 3;
const AT_SERVER: Vec3 = { x: 590, y: 176, z: G };
const AT_CHECK: Vec3 = { x: CHECK.x, y: CHECK.y + 12, z: G };

const ACTORS: Actor[] = [
  {
    id: "staff",
    name: "社員A",
    sub: "自席・登録済みPC",
    at: { x: 420, y: 300 },
    route: [{ x: 460, y: 280, z: G }, { x: 500, y: 250, z: G }, AT_CHECK, AT_SERVER],
    identity: [true, true],
    inside: true,
  },
  {
    id: "intruder",
    name: "侵入者",
    sub: "社内に入り込んだ",
    at: { x: 700, y: 330 },
    route: [{ x: 680, y: 300, z: G }, { x: 620, y: 262, z: G }, AT_CHECK, AT_SERVER],
    identity: [false, false],
    inside: true,
  },
  {
    id: "remote",
    name: "社員B",
    sub: "自宅・登録済みPC",
    at: { x: 120, y: 330 },
    route: [
      { x: 170, y: 306, z: G },
      { x: 260, y: 272, z: G },
      { x: WALL_X, y: 248, z: G },
      { x: 440, y: 226, z: G },
      AT_CHECK,
      AT_SERVER,
    ],
    identity: [true, true],
    inside: false,
  },
];

type Verdict = { ok: boolean; warn: boolean; text: string; stopAt: number };

function verdictOf(actor: Actor, mode: TrustMode): Verdict {
  const last = actor.route.length - 1;
  if (mode === "perimeter") {
    if (!actor.inside) return { ok: false, warn: false, text: "社外なので入れない", stopAt: 2 };
    return actor.id === "intruder"
      ? { ok: true, warn: true, text: "社内なので通れてしまう", stopAt: last }
      : { ok: true, warn: false, text: "社内なので許可", stopAt: last };
  }
  const ok = actor.identity[0] && actor.identity[1];
  return ok
    ? { ok: true, warn: false, text: "本人と端末を確認 → 許可", stopAt: last }
    : { ok: false, warn: false, text: "確認できない → 拒否", stopAt: actor.route.indexOf(AT_CHECK) };
}

/** アクセスが止まる点までの道（止められる通信は壁・ゲートの少し手前で止める） */
function accessPath(actor: Actor, v: Verdict): Vec3[] {
  const pts = actor.route.slice(0, v.stopAt + 1);
  return v.stopAt === actor.route.length - 1 ? pts.map((p) => ({ ...p, z: 14 })) : slicePath(pts, 0.94, 14);
}

const SHOTS: Record<TrustMode, Camera> = {
  perimeter: { yaw: -20, pitch: 54, zoom: 0.86, fx: 410, fy: 240, fz: 40 },
  zerotrust: { yaw: -22, pitch: 52, zoom: 0.96, fx: 450, fy: 230, fz: 40 },
};

export function ZeroTrustDioramaScene({ mode, reducedMotion }: { mode: TrustMode; reducedMotion: boolean }) {
  const zt = mode === "zerotrust";
  const tokens = Object.fromEntries(
    ACTORS.map((a, i) => {
      const v = verdictOf(a, mode);
      const path = accessPath(a, v);
      return [`acc-${a.id}`, { at: path[path.length - 1], path, start: { ...a.route[0], z: 14 }, restart: true, delay: i * 250 }];
    }),
  );

  return (
    <DioramaStage
      testId="zero-trust-scene"
      ariaLabel={
        zt
          ? "会社のオフィスと自宅の模型。3人のアクセスはサーバの手前の確認ゲートを通る。ゲートで毎回、本人と端末を確認するので、侵入者は止められ、在宅の社員は通れる"
          : "会社のオフィスと自宅の模型。オフィスの壁の内側にいれば信用される。侵入者はサーバまで通れてしまい、在宅の社員は入口の壁で止まる"
      }
      shot={SHOTS[mode]}
      shotKey={mode}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": mode }}
      tokens={tokens}
      world={
        <>
          <Floor x={0} y={30} w={800} d={400} h={16} material="plain" />

          {/* ---------- 自宅（社外） ---------- */}
          <Floor x={16} y={220} w={206} d={196} h={5} z={4} material="wood" />
          <Wall x={16} y={220} length={206} h={96} tone="home">
            <WallWindow left={20} top={14} w={70} h={46} />
          </Wall>
          <Group z={4}>
            <Desk x={120} y={318} w={96} d={54} tone="wood" />
            <Laptop x={120} y={318} z={44} glow />
            <Person x={116} y={382} pose="sit" shirt="#3f9a73" size={0.95} />
          </Group>

          {/* ---------- 会社のオフィス（壁＝従来の境界） ---------- */}
          <Floor x={WALL_X} y={40} w={460} d={380} h={5} z={4} material="carpet" />
          <Wall x={WALL_X} y={40} length={460} h={120} tone="office">
            <WallWindow left={40} top={18} w={110} h={54} />
          </Wall>
          <Group z={4}>
            <Box x={WALL_X - 4} y={44} w={8} d={186} h={44} color={zt ? "#cbd5e1" : "#64748b"} />
            <Box x={WALL_X - 4} y={270} w={8} d={150} h={44} color={zt ? "#cbd5e1" : "#64748b"} />
            <Appliance x={WALL_X + 12} y={250} kind="firewall" stand={30} w={40} rot={90} />

            <Group data={{ "data-illustration": "server" }}>
              <ServerRack x={SERVER.x} y={SERVER.y - 30} state="active" accent="#2f6fdb" />
              <ServerRack x={SERVER.x + 70} y={SERVER.y - 30} />
            </Group>
            {/* ゼロトラスト：サーバの手前の確認ゲート（毎回、本人と端末を確かめる） */}
            <Group data={{ "data-illustration": "check-gate", "data-on": zt ? "true" : "false" }}>
              {zt && (
                <>
                  <Box x={CHECK.x - 26} y={CHECK.y - 4} w={6} d={30} h={70} color="#2455b8" />
                  <Box x={CHECK.x + 20} y={CHECK.y - 4} w={6} d={30} h={70} color="#2455b8" />
                  <Box x={CHECK.x - 26} y={CHECK.y - 4} z={70} w={52} d={30} h={8} color="#1d4ed8" />
                </>
              )}
            </Group>

            <Desk x={420} y={300} w={100} d={54} />
            <Monitor x={420} y={294} w={52} glow />
            <Person x={420} y={356} pose="sit" shirt="#6b7fd6" size={0.95} />
            <Desk x={690} y={250} w={96} d={54} />
            <Monitor x={690} y={244} w={50} />
            <Person x={704} y={346} pose="attacker" active={!zt} size={0.95} />
            <Plant x={372} y={400} size={0.8} />
          </Group>

          {ACTORS.map((a) => {
            const v = verdictOf(a, mode);
            const tone: RouteTone = !v.ok ? "blocked" : v.warn ? "danger" : "response";
            return (
              <FloorRoute
                key={a.id}
                points={a.route.slice(0, v.stopAt + 1)}
                width={10}
                z={4.8}
                tone={tone}
                active={v.ok}
                data={{ "data-actor": a.id, "data-ok": v.ok ? "true" : "false" }}
              />
            );
          })}
          {ACTORS.map((a) => {
            const v = verdictOf(a, mode);
            return (
              <DioramaToken key={a.id} id={`acc-${a.id}`}>
                <Parcel tone={!v.ok ? "danger" : v.warn ? "warn" : "ok"} mark={!v.ok || v.warn ? "alert" : "check"} size={0.8} />
              </DioramaToken>
            );
          })}
        </>
      }
      labels={
        <>
          {ACTORS.map((a) => {
            const v = verdictOf(a, mode);
            return (
              <DioramaLabel key={a.id} at={{ ...a.at, z: a.id === "intruder" ? 116 : 100 }} place="above">
                <div className={styles.gateLabel} data-testid={`zt-${a.id}`} data-ok={v.ok ? "true" : "false"}>
                  <span className={styles.ztHead}>
                    <b>{a.name}</b>
                    <span className={styles.looksAt} data-sub>
                      {a.sub}
                    </span>
                  </span>
                  {zt && (
                    <span className={styles.checks}>
                      <span className={styles.check} data-ok={a.identity[0] ? "true" : "false"}>
                        本人{a.identity[0] ? "✓" : "✗"}
                      </span>
                      <span className={styles.check} data-ok={a.identity[1] ? "true" : "false"}>
                        端末{a.identity[1] ? "✓" : "✗"}
                      </span>
                    </span>
                  )}
                  <span className={styles.verdict} data-state={v.ok && !v.warn ? "pass" : "block"}>
                    {v.warn ? "⚠" : v.ok ? "✅" : "⛔"} {v.text}
                  </span>
                </div>
              </DioramaLabel>
            );
          })}
          <DioramaLabel at={{ ...SERVER, x: SERVER.x + 36, y: SERVER.y - 30, z: 124 }} place="above" optional>
            <NameChip name="社内システム" tone="info" />
          </DioramaLabel>
          {zt ? (
            <DioramaLabel at={{ ...CHECK, z: 80 }} place="above" optional>
              <NameChip name="毎回の確認" tone="ok" />
            </DioramaLabel>
          ) : (
            <DioramaLabel at={{ x: WALL_X, y: 360, z: 46 }} place="above" optional>
              <NameChip name="境界（オフィスの壁）" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
