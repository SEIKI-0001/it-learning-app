"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box } from "../scene/Diorama3D";
import { Building, Database, Floor, FloorRoute, Group, Monitor, Paper, ServerRack, Tree, type RouteTone } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip, pathLength } from "../scene/DioramaStage";

// 処理場所（集中／分散）と役割分担（クライアントサーバ／三層／P2P）を、コンビニチェーンの模型1つで見せる。
//   奥の真ん中に本部（屋根の前にサーバ室を切り出して、APサーバとDBが見える）、四隅に店舗。各店のレジ端末が手前に出ている。
//   集中：全店のデータが本部の1台へ集まって処理される
//   分散：各店の小さなサーバがそれぞれ処理し、必要なときだけ店どうしで連携する
//   クライアントサーバ：店の端末（頼む側）が本部のサーバ（応える側）に依頼し、結果が返ってくる
//   三層：店の端末（表示）→ 本部のAPサーバ（業務処理）→ DB（データ）と3段に分けて往復する
//   P2P：本部を使わず、店の端末どうしが直接やり取りする（どれも提供も利用もする）

export type ArchMode = "central" | "distributed" | "cs" | "three" | "p2p";

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

const HQ = { x: 360, y: 70 };
const AP: Vec3 = { x: 320, y: 190, z: 0 };
const DB: Vec3 = { x: 410, y: 192, z: 0 };
const HUB: Vec3 = { x: 360, y: 250, z: 0 };

type StoreId = "a" | "b" | "c" | "d";
const STORES: Record<StoreId, { at: Vec3; term: Vec3; rack: Vec3 }> = {
  a: { at: { x: 110, y: 130 }, term: { x: 150, y: 200 }, rack: { x: 72, y: 196 } },
  b: { at: { x: 610, y: 130 }, term: { x: 570, y: 200 }, rack: { x: 648, y: 196 } },
  c: { at: { x: 110, y: 370 }, term: { x: 160, y: 300 }, rack: { x: 72, y: 300 } },
  d: { at: { x: 610, y: 370 }, term: { x: 560, y: 300 }, rack: { x: 648, y: 300 } },
};
const IDS: StoreId[] = ["a", "b", "c", "d"];
const TERM_Z = 50;
const FLY = 10;

/** 店の端末 → 本部の前の広場 → サーバ（行き）。返りはこの逆 */
const toHq = (id: StoreId, target: Vec3, dz: number): Vec3[] => [up(STORES[id].term, TERM_Z), { ...STORES[id].term, z: FLY }, { ...HUB, z: FLY }, up(target, dz)];
const travelMs = (points: Vec3[]) => 900 + pathLength(points) * 2.6;

type Tok = { at: Vec3 | null; path?: Vec3[]; start?: Vec3; delay?: number; restart?: boolean };
const hidden: Tok = { at: null };
const run = (points: Vec3[], delay = 0): Tok => ({ start: points[0], path: points.slice(1), at: points[points.length - 1], restart: true, delay });

function tokensFor(mode: ArchMode | null): Record<string, Tok> {
  const none: Record<string, Tok> = { t0: hidden, t1: hidden, t2: hidden, t3: hidden };
  switch (mode) {
    case "central":
      return Object.fromEntries(IDS.map((id, i) => [`t${i}`, run(toHq(id, AP, 96), i * 250)]));
    case "distributed":
      return Object.fromEntries(IDS.map((id, i) => [`t${i}`, run([up(STORES[id].term, TERM_Z), { ...STORES[id].rack, z: FLY }, up(STORES[id].rack, 76)], i * 250)]));
    case "cs": {
      const goA = toHq("a", AP, 96);
      const goD = toHq("d", AP, 96);
      return { t0: run(goA), t1: run([...goA].reverse(), travelMs(goA)), t2: run(goD, 400), t3: run([...goD].reverse(), 400 + travelMs(goD)) };
    }
    case "three": {
      const go = toHq("c", AP, 96);
      const toDb = [up(AP, 96), up(DB, 60)];
      const back = [up(DB, 60), up(AP, 96), { ...HUB, z: FLY }, { ...STORES.c.term, z: FLY }, up(STORES.c.term, TERM_Z)];
      const t1 = travelMs(go);
      return { ...none, t0: run(go), t1: run(toDb, t1), t2: run(back, t1 + travelMs(toDb)) };
    }
    case "p2p":
      return {
        t0: run([up(STORES.a.term, TERM_Z), { ...STORES.a.term, z: FLY }, { ...STORES.b.term, z: FLY }, up(STORES.b.term, TERM_Z)]),
        t1: run([up(STORES.d.term, TERM_Z), { ...STORES.d.term, z: FLY }, { ...STORES.c.term, z: FLY }, up(STORES.c.term, TERM_Z)], 300),
        t2: run([up(STORES.c.term, TERM_Z), { ...STORES.c.term, z: FLY }, { ...STORES.a.term, z: FLY }, up(STORES.a.term, TERM_Z)], 600),
        t3: run([up(STORES.b.term, TERM_Z), { ...STORES.b.term, z: FLY }, { ...STORES.d.term, z: FLY }, up(STORES.d.term, TERM_Z)], 900),
      };
    default:
      return none;
  }
}

const SHOTS: Record<ArchMode | "none", Camera> = {
  none: { yaw: -10, pitch: 56, zoom: 0.8, fx: 360, fy: 230, fz: 30 },
  central: { yaw: -10, pitch: 56, zoom: 0.84, fx: 360, fy: 230, fz: 30 },
  distributed: { yaw: -10, pitch: 56, zoom: 0.84, fx: 360, fy: 240, fz: 30 },
  cs: { yaw: -14, pitch: 54, zoom: 0.84, fx: 360, fy: 220, fz: 30 },
  three: { yaw: -6, pitch: 54, zoom: 1.05, fx: 290, fy: 250, fz: 40 },
  p2p: { yaw: -10, pitch: 58, zoom: 0.84, fx: 360, fy: 250, fz: 30 },
};

export function ArchDioramaScene({ mode, runKey, reducedMotion }: { mode: ArchMode | null; runKey: number; reducedMotion: boolean }) {
  const hqUsed = mode === "central" || mode === "cs" || mode === "three";
  const local = mode === "distributed";
  const wire = (id: StoreId): RouteTone => {
    if (mode === "central") return "request";
    if (mode === "cs") return id === "a" || id === "d" ? "request" : "idle";
    if (mode === "three") return id === "c" ? "request" : "idle";
    return "idle";
  };
  const terminalOn = mode !== null;

  return (
    <DioramaStage
      testId="arch-scene"
      ariaLabel="コンビニチェーンの模型。奥の真ん中に本部とサーバ室（APサーバとデータベース）、四隅に店舗。各店の前にレジ端末があり、本部へは道でつながっている"
      shot={SHOTS[mode ?? "none"]}
      shotKey={`${mode ?? "none"}-${runKey}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": mode ?? "none" }}
      tokens={tokensFor(mode)}
      world={
        <>
          <Floor x={-20} y={-20} w={760} d={470} h={16} material="grass" />
          <Floor x={0} y={232} w={720} d={36} h={2} z={2} material="asphalt" />

          {/* ---------- 本部とサーバ室 ---------- */}
          <Building x={HQ.x} y={HQ.y} w={150} d={90} h={90} kind="office" dim={mode === "p2p" || mode === "distributed"} testId="arch-hq" />
          <Floor x={270} y={150} w={180} d={76} h={4} z={4} material="dc" />
          <Group z={4} testId="arch-hq-servers" data={{ "data-on": hqUsed ? "true" : "false" }}>
            <ServerRack x={AP.x} y={AP.y} w={50} d={44} h={86} units={4} state={hqUsed ? "active" : mode === "p2p" || local ? "disabled" : "idle"} />
            <Group data={{ "data-on": mode === "three" ? "true" : "false" }}>
              <Database x={DB.x} y={DB.y} r={20} state={mode === "three" ? "active" : "idle"} />
            </Group>
          </Group>

          {/* ---------- 4つの店舗と、店の前のレジ端末 ---------- */}
          {IDS.map((id) => {
            const s = STORES[id];
            return (
              <Group key={id} testId={`arch-store-${id}`} data={{ "data-on": terminalOn ? "true" : "false" }}>
                <Building x={s.at.x} y={s.at.y} w={110} d={70} h={50} kind="store" />
                <Box x={s.term.x - 18} y={s.term.y - 12} w={36} d={24} h={30} color="#9aa3b0" />
                <Monitor x={s.term.x} y={s.term.y} z={30} w={34} keyboard={false} glow={terminalOn} />
                {local && <ServerRack x={s.rack.x} y={s.rack.y} w={26} d={26} h={56} units={3} state="active" />}
              </Group>
            );
          })}

          {/* 店 → 本部の道 */}
          {IDS.map((id) => {
            const tone = wire(id);
            return (
              <FloorRoute
                key={id}
                points={[{ ...STORES[id].term, z: 0 }, HUB, { ...AP, y: AP.y + 26 }]}
                width={6}
                z={3}
                tone={tone}
                active={tone !== "idle"}
              />
            );
          })}
          {/* 店どうしの直接の道（分散の連携・P2P） */}
          {(mode === "p2p" || local) && (
            <>
              <FloorRoute points={[{ ...STORES.a.term, z: 0 }, { ...STORES.b.term, z: 0 }]} width={5} z={4} tone={mode === "p2p" ? "violet" : "idle"} active={mode === "p2p"} testId="arch-peer" />
              <FloorRoute points={[{ ...STORES.c.term, z: 0 }, { ...STORES.d.term, z: 0 }]} width={5} z={4} tone={mode === "p2p" ? "violet" : "idle"} active={mode === "p2p"} />
              <FloorRoute points={[{ ...STORES.a.term, z: 0 }, { ...STORES.c.term, z: 0 }]} width={5} z={4} tone={mode === "p2p" ? "violet" : "idle"} active={mode === "p2p"} />
              <FloorRoute points={[{ ...STORES.b.term, z: 0 }, { ...STORES.d.term, z: 0 }]} width={5} z={4} tone={mode === "p2p" ? "violet" : "idle"} active={mode === "p2p"} />
            </>
          )}

          <Tree x={250} y={400} size={0.7} />
          <Tree x={470} y={410} size={0.7} />
          <Tree x={360} y={330} size={0.6} />

          {["t0", "t1", "t2", "t3"].map((t, i) => (
            <DioramaToken key={t} id={t}>
              <Paper tone={(mode === "cs" && i % 2 === 1) || (mode === "three" && i === 2) ? "ok" : "info"} />
            </DioramaToken>
          ))}
        </>
      }
      labels={<Labels mode={mode} />}
    />
  );
}

function Labels({ mode }: { mode: ArchMode | null }) {
  const stores = (status?: string, tone: "info" | "muted" | "ok" = "muted") =>
    IDS.map((id) => (
      <DioramaLabel key={id} at={{ ...STORES[id].at, z: 64 }} place="above" optional>
        <NameChip name="店" status={status} tone={tone} />
      </DioramaLabel>
    ));
  switch (mode) {
    case null:
      return (
        <>
          <DioramaLabel at={{ ...HQ, z: 100 }} place="above" optional>
            <NameChip name="本部" tone="muted" />
          </DioramaLabel>
          {stores()}
        </>
      );
    case "central":
      return (
        <>
          <DioramaLabel at={up(AP, 100)} place="above">
            <NameChip name="本部のサーバ" status="全店分を処理" tone="info" />
          </DioramaLabel>
          {stores()}
        </>
      );
    case "distributed":
      return (
        <>
          {IDS.map((id) => (
            <DioramaLabel key={id} at={up(STORES[id].rack, 64)} place={id === "a" || id === "c" ? "left" : "right"} optional>
              <NameChip name="店のサーバ" status="自分で処理" tone="ok" />
            </DioramaLabel>
          ))}
        </>
      );
    case "cs":
      return (
        <>
          <DioramaLabel at={up(AP, 100)} place="above">
            <NameChip name="サーバ" status="応える側" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={up(STORES.a.term, 60)} place="right">
            <NameChip name="クライアント" status="頼む側" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={up(STORES.d.term, 60)} place="left" optional>
            <NameChip name="クライアント" status="頼む側" tone="info" />
          </DioramaLabel>
        </>
      );
    case "three":
      return (
        <>
          <DioramaLabel at={up(AP, 100)} place="above">
            <Badge tone="info">②業務処理（APサーバ）</Badge>
          </DioramaLabel>
          <DioramaLabel at={STORES.c.term} place="below">
            <Badge tone="info">①表示（ブラウザ）</Badge>
          </DioramaLabel>
          <DioramaLabel at={up(DB, -4)} place="below">
            <Badge tone="info">③データ（DB）</Badge>
          </DioramaLabel>
        </>
      );
    default:
      return (
        <>
          <DioramaLabel at={{ x: 360, y: 250, z: 10 }} place="below">
            <Badge tone="info">本部のサーバを通らず、端末どうしで直接</Badge>
          </DioramaLabel>
          {stores("提供も利用も", "info")}
        </>
      );
  }
}
