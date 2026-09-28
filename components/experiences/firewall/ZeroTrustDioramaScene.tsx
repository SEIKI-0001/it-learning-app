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
  Person,
  Plant,
  ServerRack,
  Wall,
  WallWindow,
  type RouteTone,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, NameChip } from "../scene/DioramaStage";
import styles from "./firewalldiorama.module.css";

// ゼロトラストの図解：会社のオフィスと、在宅勤務の自宅。社内システムのサーバへ3人がアクセスする。
//   ① 自席の社員（登録済みのPC）  ② オフィスに入り込んだ侵入者  ③ 自宅から働く社員（登録済みのPC）
// 境界防御：オフィスの壁の内側かどうかだけで決める → 侵入者は「社内だから」通れてしまい、在宅の社員は入れない。
// ゼロトラスト：サーバの前で毎回「本人か」「登録済みの端末か」を確かめる → 侵入者は止まり、在宅の社員は通れる。

export type TrustMode = "perimeter" | "zerotrust";

type Actor = {
  id: "staff" | "intruder" | "remote";
  name: string;
  sub: string;
  at: Vec3;
  route: Vec3[];
  /** [本人, 端末] の確認結果 */
  identity: [boolean, boolean];
  inside: boolean;
};

const SERVER: Vec3 = { x: 560, y: 150, z: 0 };
const CHECK: Vec3 = { x: 500, y: 196, z: 0 };
const G = 3;

const ACTORS: Actor[] = [
  {
    id: "staff",
    name: "社員A",
    sub: "自席・登録済みPC",
    at: { x: 420, y: 250 },
    route: [
      { x: 474, y: 280, z: G },
      { x: 500, y: 240, z: G },
      { x: 534, y: 196, z: G },
    ],
    identity: [true, true],
    inside: true,
  },
  {
    id: "intruder",
    name: "侵入者",
    sub: "社内に入り込んだ",
    at: { x: 640, y: 320 },
    route: [
      { x: 620, y: 300, z: G },
      { x: 600, y: 250, z: G },
      { x: 575, y: 200, z: G },
    ],
    identity: [false, false],
    inside: true,
  },
  {
    id: "remote",
    name: "社員B",
    sub: "自宅・登録済みPC",
    at: { x: 130, y: 300 },
    route: [
      { x: 170, y: 290, z: G },
      { x: 300, y: 250, z: G },
      { x: 370, y: 230, z: G },
      { x: 470, y: 205, z: G },
      { x: 530, y: 188, z: G },
    ],
    identity: [true, true],
    inside: false,
  },
];

function verdictOf(actor: Actor, mode: TrustMode) {
  if (mode === "perimeter") {
    return actor.inside
      ? { ok: true, text: actor.id === "intruder" ? "社内なので通れてしまう" : "社内なので許可" }
      : { ok: false, text: "社外なので入れない" };
  }
  const ok = actor.identity[0] && actor.identity[1];
  return { ok, text: ok ? "本人と端末を確認 → 許可" : "確認できない → 拒否" };
}

const SHOT: Camera = { yaw: -20, pitch: 54, zoom: 0.86, fx: 420, fy: 230, fz: 40 };

export function ZeroTrustDioramaScene({ mode, reducedMotion }: { mode: TrustMode; reducedMotion: boolean }) {
  const zt = mode === "zerotrust";
  return (
    <DioramaStage
      testId="zero-trust-scene"
      ariaLabel={
        zt
          ? "会社のオフィスと自宅の模型。社内システムのサーバの前で、アクセスのたびに本人と端末を確認している。侵入者は止められ、在宅の社員は通れる"
          : "会社のオフィスと自宅の模型。オフィスの壁の内側にいれば信用される。侵入者はサーバまで通れてしまい、在宅の社員は入れない"
      }
      shot={SHOT}
      shotKey={mode}
      forward={false}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": mode }}
      world={
        <>
          <Floor x={0} y={20} w={800} d={400} h={16} material="plain" />

          {/* ---------- 自宅 ---------- */}
          <Floor x={16} y={210} w={210} d={200} h={5} z={4} material="wood" />
          <Wall x={16} y={210} length={210} h={96} tone="home">
            <WallWindow left={20} top={14} w={70} h={46} />
          </Wall>
          <Group z={4}>
            <Desk x={120} y={300} w={96} d={54} tone="wood" />
            <Laptop x={120} y={300} z={44} glow />
            <Person x={116} y={364} pose="sit" shirt="#3f9a73" />
            <Plant x={200} y={390} size={0.8} />
          </Group>

          {/* ---------- 会社のオフィス（壁＝従来の境界） ---------- */}
          <Floor x={330} y={40} w={460} d={370} h={5} z={4} material="carpet" />
          <Wall x={330} y={40} length={460} h={120} tone="office">
            <WallWindow left={40} top={18} w={110} h={54} />
          </Wall>
          <Group z={4}>
            {/* 境界：左の低い壁（入口にFW） */}
            <Box x={326} y={44} w={8} d={176} h={44} color={zt ? "#cbd5e1" : "#94a3b8"} />
            <Box x={326} y={262} w={8} d={148} h={44} color={zt ? "#cbd5e1" : "#94a3b8"} />
            <Appliance x={340} y={240} kind="firewall" stand={30} w={40} rot={90} />

            <Group data={{ "data-illustration": "server" }}>
              <ServerRack x={SERVER.x} y={SERVER.y - 40} state="active" accent="#2f6fdb" />
              <ServerRack x={SERVER.x + 70} y={SERVER.y - 40} />
            </Group>
            {/* ゼロトラスト：サーバの前の確認ゲート */}
            {zt && <Appliance x={CHECK.x} y={CHECK.y} kind="gateway" stand={34} w={44} rot={70} state="active" />}

            <Desk x={420} y={290} w={100} d={54} />
            <Monitor x={420} y={284} w={52} glow />
            <Person x={420} y={346} pose="sit" shirt="#6b7fd6" size={0.95} />
            <Desk x={690} y={250} w={96} d={54} />
            <Monitor x={690} y={244} w={50} />
            <Person x={646} y={340} pose="attacker" active={!zt} size={0.95} />
          </Group>

          {ACTORS.map((a) => {
            const v = verdictOf(a, mode);
            const tone: RouteTone = !v.ok ? "blocked" : a.id === "intruder" ? "danger" : "response";
            // 止められる通信は、止まる場所（壁 or 確認ゲート）までで途切れる
            const cut = !v.ok ? (mode === "perimeter" ? a.route.filter((p) => p.x <= 330) : a.route.slice(0, -1)) : a.route;
            return <FloorRoute key={a.id} points={cut.length > 1 ? cut : a.route.slice(0, 2)} width={10} z={4.8} tone={tone} active={v.ok} data={{ "data-actor": a.id, "data-ok": v.ok ? "true" : "false" }} />;
          })}
        </>
      }
      labels={
        <>
          {ACTORS.map((a) => {
            const v = verdictOf(a, mode);
            return (
              <DioramaLabel key={a.id} at={{ ...a.at, z: a.id === "intruder" ? 118 : 104 }} place="above">
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
                  <span className={styles.verdict} data-state={v.ok && a.id !== "intruder" ? "pass" : "block"}>
                    {v.ok ? "✅" : "⛔"} {v.text}
                  </span>
                </div>
              </DioramaLabel>
            );
          })}
          <DioramaLabel at={{ ...SERVER, x: SERVER.x + 36, y: SERVER.y - 40, z: 124 }} place="above" optional>
            <NameChip name="社内システム" sub="サーバ" tone="info" />
          </DioramaLabel>
          {zt && (
            <DioramaLabel at={{ ...CHECK, z: 50 }} place="left" optional>
              <NameChip name="毎回の確認" sub="認証・認可" tone="ok" status="確認中" />
            </DioramaLabel>
          )}
          {!zt && (
            <DioramaLabel at={{ x: 330, y: 300, z: 50 }} place="left" optional>
              <NameChip name="境界（オフィスの壁）" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
