"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { Camera, Vec3 } from "@/components/experiences/scene/Diorama3D";
import { Box } from "@/components/experiences/scene/Diorama3D";
import {
  Appliance,
  Building,
  Chair,
  Desk,
  Floor,
  FloorRoute,
  GlassWall,
  Group,
  Laptop,
  Monitor,
  Parcel,
  Person,
  Plant,
  ServerRack,
  Tree,
  Wall,
  WallWindow,
  WifiRouter,
  type PartState,
  type RouteTone,
} from "@/components/experiences/scene/DioramaParts";
import {
  Callout,
  DioramaLabel,
  DioramaStage,
  DioramaToken,
  NameChip,
  pathLength,
} from "@/components/experiences/scene/DioramaStage";
import { useReducedMotion } from "@/components/experiences/scene/useReducedMotion";
import {
  DEVICE_NAME,
  FIXED_DEVICES,
  HOP_NAME,
  PCS,
  PLACEABLE,
  linkKey,
  portLabel,
  type ConnectCheck,
  type DeviceId,
  type ExternalId,
  type HopId,
  type LabState,
  type PlaceableKind,
  type Sim,
  type TestResult,
} from "@/lib/netlab/engine";
import {
  EXTERNAL_AT,
  FIXED_AT,
  FLOOR,
  MEETING_Y,
  SERVER_ROOM,
  SLOTS,
  cablePath,
  deviceAt,
  hopAt,
  jackOf,
  slotById,
  type Point,
} from "@/lib/netlab/layout";
import styles from "./netlab.module.css";

// オフィスの模型。機器・ケーブル・テストの小包を、engine の state / sim からそのまま描く。
// 押せるもの（機器の名札）は DioramaLabel の中のボタンにして、ドラッグで回す操作とぶつけない。
// 見るものを減らすため、名札・外の人物は「いまのミッションに関係するもの」だけ出す。

/** 小包の速さ（ms/px）。オフィス全体を横切るので、共通の既定（2.6）より速く流す */
const PACE = 1.1;

const SHOT: Camera = { yaw: -16, pitch: 54, zoom: 0.92, fx: 360, fy: 190, fz: 0 };
/** スマホ（縦長の画面）では模型を90度近く回し、長い辺を縦に使う */
const SHOT_PORTRAIT: Camera = { yaw: -76, pitch: 60, zoom: 1.5, fx: 330, fy: 250, fz: 0 };

function usePortrait() {
  const [portrait, setPortrait] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 640px)");
    const update = () => setPortrait(q.matches);
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return portrait;
}

export type Trace = { key: number; result: TestResult };

const up = (p: Point, z: number): Vec3 => ({ x: p.x, y: p.y, z });

/** テストの小包が通る点の列。ケーブルでつながった区間は床の配線どおりに、外や無線は宙をまっすぐ */
function tracePoints(state: LabState, hops: HopId[]): Vec3[] {
  const pts: Vec3[] = [];
  const push = (p: Vec3) => {
    const last = pts[pts.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y || last.z !== p.z) pts.push(p);
  };
  hops.forEach((h, i) => {
    const at = hopAt(h, state.placed);
    if (!at) return;
    const prev = hops[i - 1];
    const lk = prev ? state.links.findIndex((l) => linkKey(l) === linkKey({ a: prev as DeviceId, b: h as DeviceId })) : -1;
    if (prev && lk >= 0) {
      const ja = jackOf(prev as DeviceId, state.placed)!;
      const jb = jackOf(h as DeviceId, state.placed)!;
      for (const p of cablePath(ja, jb, lk % 3)) push(up(p, 8));
    }
    push(up(at, h in EXTERNAL_AT ? 40 : 30));
  });
  return pts;
}

function deviceState(id: DeviceId, sim: Sim, state: LabState): PartState {
  if (id === "router") return sim.routerOnline ? "active" : state.links.some((l) => l.a === id || l.b === id) ? "idle" : "disabled";
  if (id === "firewall") return sim.firewallOnline ? "active" : "idle";
  const h = sim.hosts[id];
  if (h?.conflict) return "error";
  if (h?.ip && !h.problem) return "active";
  return state.links.some((l) => l.a === id || l.b === id) ? "idle" : "disabled";
}

function PlacedDevice({ kind, at, st }: { kind: PlaceableKind; at: Point; st: PartState }) {
  switch (kind) {
    case "switch":
      return <Appliance x={at.x} y={at.y} kind="switch" stand={34} w={64} state={st} />;
    case "router":
      return <Appliance x={at.x} y={at.y} kind="gateway" stand={34} w={56} state={st} />;
    case "firewall":
      return <Appliance x={at.x} y={at.y} kind="firewall" stand={34} w={56} state={st} />;
    case "fileServer":
      return <ServerRack x={at.x} y={at.y} w={48} d={44} h={92} units={5} state={st} accent="#16a37a" />;
    case "webServer":
      return <ServerRack x={at.x} y={at.y} w={48} d={44} h={92} units={5} state={st} accent="#2463d1" />;
    case "ap":
      return (
        <Group x={at.x} y={at.y} z={at.z ?? 70}>
          <Box x={-16} y={-10} z={-6} w={32} d={20} h={6} color="#cbd2db" />
          <WifiRouter x={0} y={0} on={st !== "disabled"} />
        </Group>
      );
  }
}

type Drag = { from: DeviceId; sx: number; sy: number; x: number; y: number; over: DeviceId | null };

/** 次の操作の見せ方。wire＝名札から名札へのドラッグの見本、place＝置かれる場所、select＝押す名札 */
export type SceneHint = { wire?: [DeviceId, DeviceId]; place?: { kind: PlaceableKind; slot: string }; select?: DeviceId } | null;

export default function OfficeScene({
  state,
  sim,
  selected,
  hint,
  visible,
  externals,
  trace,
  guide,
  checkWire,
  onConnect,
  onSelect,
}: {
  state: LabState;
  sim: Sim;
  selected: DeviceId | null;
  hint: SceneHint;
  /** 名札を出す機器（null なら全部）。いまのミッションに関係ない名札は出さない */
  visible: DeviceId[] | null;
  /** 出す外の相手（インターネット・お客さん・攻撃者・近所の人） */
  externals: ExternalId[];
  trace: Trace | null;
  /** 「次にやること」のカード（PC：模型の右上、スマホ：模型の上） */
  guide?: ReactNode;
  checkWire: (a: DeviceId, b: DeviceId) => ConnectCheck;
  onConnect: (a: DeviceId, b: DeviceId) => void;
  onSelect: (id: DeviceId) => void;
}) {
  const reducedMotion = useReducedMotion();
  const portrait = usePortrait();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  // 名札から名札へドラッグ＝ケーブルを引く。動かさずに離したら＝選ぶ
  function onChipPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: DeviceId) {
    if (e.button !== 0 || !wrapRef.current) return;
    e.preventDefault();
    const box = wrapRef.current.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    const sx = r.left + r.width / 2 - box.left;
    const sy = r.top + r.height / 2 - box.top;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    let over: DeviceId | null = null;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      moved = true;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-chip]");
      over = hit && hit.dataset.chip !== id ? (hit.dataset.chip as DeviceId) : null;
      const b = wrapRef.current?.getBoundingClientRect() ?? box;
      setDrag({ from: id, sx: sx + box.left - b.left, sy: sy + box.top - b.top, x: ev.clientX - b.left, y: ev.clientY - b.top, over });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keydown", esc);
      cleanup.current = null;
      setDrag(null);
    };
    const up = () => {
      stop();
      if (!moved) onSelect(id);
      else if (over) onConnect(id, over);
    };
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && stop();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keydown", esc);
    cleanup.current = stop;
  }
  const dragCheck = drag?.over ? checkWire(drag.from, drag.over) : null;

  // ドラッグの見本：つなぐ2つの名札の間に点線を引き、「つかむ点」を何度も滑らせる。
  // 名札の位置はカメラの動きで毎フレーム変わるので、DOM の位置を読んで SVG を直接書き換える（再描画しない）
  const demo = !drag && hint?.wire ? hint.wire : null;
  const demoKey = demo?.join(">") ?? "";
  const demoLine = useRef<SVGLineElement>(null);
  const demoDot = useRef<SVGGElement>(null);
  const demoSvg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!demo) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const wrap = wrapRef.current;
      const a = wrap?.querySelector<HTMLElement>(`[data-chip="${demo[0]}"]`);
      const b = wrap?.querySelector<HTMLElement>(`[data-chip="${demo[1]}"]`);
      const shown = (el: HTMLElement | null | undefined) => !!el && (el.closest<HTMLElement>("[data-anchor]")?.style.visibility ?? "") !== "hidden";
      if (wrap && a && b && shown(a) && shown(b) && demoLine.current && demoDot.current && demoSvg.current) {
        const box = wrap.getBoundingClientRect();
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const ax = ra.left + ra.width / 2 - box.left;
        const ay = ra.top + ra.height / 2 - box.top;
        const bx = rb.left + rb.width / 2 - box.left;
        const by = rb.top + rb.height / 2 - box.top;
        demoLine.current.setAttribute("x1", ax.toFixed(1));
        demoLine.current.setAttribute("y1", ay.toFixed(1));
        demoLine.current.setAttribute("x2", bx.toFixed(1));
        demoLine.current.setAttribute("y2", by.toFixed(1));
        // 0〜70%：つかんで運ぶ、70〜100%：離した所で止まる
        const phase = ((now - t0) % 2200) / 2200;
        const k = reducedMotion ? 1 : Math.min(1, phase / 0.7);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        demoDot.current.setAttribute("transform", `translate(${(ax + (bx - ax) * e).toFixed(1)} ${(ay + (by - ay) * e).toFixed(1)})`);
        demoSvg.current.style.visibility = "visible";
      } else if (demoSvg.current) {
        demoSvg.current.style.visibility = "hidden";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoKey, reducedMotion]);

  const points = trace ? tracePoints(state, trace.result.path) : [];
  const [shown, setShown] = useState<number | null>(null);

  // 小包が着いてから結果の吹き出しを出す（DioramaStage と同じ所要時間の式）
  useEffect(() => {
    if (!trace) return;
    const ms = reducedMotion || points.length < 2 ? 0 : 150 + 900 + pathLength(points) * PACE;
    const t = setTimeout(() => setShown(trace.key), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace?.key]);

  const traceLinks = new Set<string>();
  if (trace) {
    const p = trace.result.path;
    for (let i = 1; i < p.length; i++) traceLinks.add(linkKey({ a: p[i - 1] as DeviceId, b: p[i] as DeviceId }));
  }
  const traceTone: RouteTone = trace ? (trace.result.reached && trace.result.ok ? "done" : trace.result.ok ? "blocked" : "danger") : "idle";
  const occupied = new Set(Object.values(state.placed));
  const isVisible = (id: DeviceId) =>
    !visible || visible.includes(id) || selected === id || (hint?.wire?.includes(id) ?? false) || trace?.result.path.includes(id);
  const presentDevices: DeviceId[] = [...FIXED_DEVICES, ...PLACEABLE.filter((k) => state.placed[k])].filter(isVisible);
  const last = trace?.result.path.at(-1);
  const lastAt = last ? hopAt(last, state.placed) : null;
  const showExt = (id: ExternalId) => externals.includes(id) || trace?.result.path.includes(id);
  const placeAt = hint?.place ? slotById(hint.place.slot)?.at : null;

  const world = (
    <>
      {/* 建物の外（インターネット側） */}
      <Floor x={-160} y={-270} w={FLOOR.w + 260} d={262} material="grass" h={10} />
      <Floor x={-160} y={-70} w={FLOOR.w + 260} d={52} material="asphalt" h={2} z={0} />
      <Building x={EXTERNAL_AT.internet.x} y={-190} w={150} d={80} h={110} kind="datacenter" dim={!showExt("internet")} />
      <Building x={EXTERNAL_AT.customer.x - 20} y={-210} w={90} d={70} h={70} kind="house" />
      <Tree x={-90} y={-180} />
      <Tree x={FLOOR.w + 40} y={-200} size={1.2} />
      <Tree x={480} y={-210} size={0.9} />
      {showExt("customer") && <Person x={EXTERNAL_AT.customer.x + 40} y={EXTERNAL_AT.customer.y + 60} shirt="#16a37a" />}
      {showExt("attacker") && (
        <Person x={EXTERNAL_AT.attacker.x} y={EXTERNAL_AT.attacker.y + 60} pose="attacker" active={trace?.result.path[0] === "attacker"} />
      )}
      {/* 光回線：外のデータセンターから ONU へ */}
      <FloorRoute
        points={[{ x: EXTERNAL_AT.internet.x, y: -150 }, { x: 60, y: -150 }, { x: 60, y: -8 }]}
        width={6}
        tone="amber"
        active={!!trace?.result.path.includes("internet")}
      />
      {/* 外の通り：Wi-Fi をねらう近所の人 */}
      <Floor x={-160} y={-8} w={150} d={FLOOR.d + 20} material="paving" h={6} />
      {showExt("outsider") && <Person x={EXTERNAL_AT.outsider.x} y={EXTERNAL_AT.outsider.y} shirt="#8b5cf6" />}

      {/* 床：広いサーバ室（左奥）・会議室（左手前）・2人の執務室（右） */}
      <Floor x={0} y={0} w={FLOOR.w} d={FLOOR.d} material="carpet" h={14} />
      <Floor x={0} y={0} w={SERVER_ROOM.w} d={SERVER_ROOM.d} material="dc" h={1} z={1} />
      <Floor x={0} y={MEETING_Y} w={SERVER_ROOM.w} d={FLOOR.d - MEETING_Y} material="wood" h={1} z={1} />
      <Wall x={0} y={0} length={FLOOR.w} h={58}>
        <WallWindow left={500} top={10} w={180} h={30} />
      </Wall>
      <Wall x={0} y={0} length={FLOOR.d} h={58} side="left">
        <WallWindow left={360} top={10} w={150} h={30} />
      </Wall>
      <GlassWall x={0} y={SERVER_ROOM.d} length={SERVER_ROOM.w} h={64} />
      <GlassWall x={SERVER_ROOM.w} y={0} length={SERVER_ROOM.d} h={64} axis="y" />
      <GlassWall x={0} y={MEETING_Y} length={SERVER_ROOM.w} h={64} />
      <GlassWall x={SERVER_ROOM.w} y={MEETING_Y} length={FLOOR.d - MEETING_Y} h={64} axis="y" />

      {/* ONU（壁に付いた光回線の終端装置） */}
      <Group x={60} y={14} z={22}>
        <Box x={-14} y={-4} w={28} d={10} h={34} color="#f4f6f9" faceClass={{ front: styles.onuFront }} />
      </Group>

      {/* 空いている置き場所。「置く」の手番では、置かれる場所だけ光らせる */}
      {SLOTS.filter((s) => !occupied.has(s.id)).map((s) => (
        <div
          key={s.id}
          className={styles.slotMark}
          data-on={hint?.place?.slot === s.id ? "true" : "false"}
          data-wall={s.at.z ? "true" : "false"}
          style={{ transform: `translate3d(${s.at.x - 26}px, ${s.at.y - 20}px, ${(s.at.z ?? 0) + 1.5}px)` }}
        />
      ))}

      {/* ケーブル */}
      {state.links.map((l, i) => {
        const ja = jackOf(l.a, state.placed);
        const jb = jackOf(l.b, state.placed);
        if (!ja || !jb) return null;
        const on = traceLinks.has(linkKey(l));
        return <FloorRoute key={linkKey(l)} points={cablePath(ja, jb, i % 3)} width={5} tone={on ? traceTone : "request"} active={on} />;
      })}

      {/* 執務室：2つの机 */}
      {PCS.map((id) => {
        const at = deviceAt(id, state.placed)!;
        const h = sim.hosts[id];
        return (
          <Group key={id} x={at.x} y={at.y}>
            <Desk x={0} y={0} />
            <Monitor
              x={0}
              y={-10}
              tone={h?.ip ? "light" : "dark"}
              glow={!!h?.ip && !h.conflict}
              screen={
                <div className={styles.screenText} data-bad={!h?.ip || h.conflict ? "true" : "false"}>
                  <b>{DEVICE_NAME[id]}</b>
                  <span>{h?.ip ?? "IPなし"}</span>
                </div>
              }
            />
            <Chair x={0} y={48} rot={180} />
            <Person x={0} y={58} pose="sit" shirt={id === "pc-a" ? "#4f86e8" : "#e8794f"} />
          </Group>
        );
      })}
      <Plant x={FLOOR.w - 40} y={40} />
      <Plant x={FLOOR.w - 40} y={FLOOR.d - 40} size={1.2} />

      {/* 会議室 */}
      <Group x={FIXED_AT.laptop.x} y={FIXED_AT.laptop.y}>
        <Desk x={0} y={0} w={170} d={90} tone="wood" />
        <Laptop x={0} y={10} tone={sim.hosts.laptop?.ip ? "light" : "dark"} glow={!!sim.hosts.laptop?.ip} />
        <Chair x={-50} y={66} rot={180} />
        <Chair x={50} y={66} rot={180} />
      </Group>

      {/* 置いた機器 */}
      {PLACEABLE.map((k) => {
        const at = deviceAt(k, state.placed);
        return at ? <PlacedDevice key={k} kind={k} at={at} st={deviceState(k, sim, state)} /> : null;
      })}

      <DioramaToken id="pkt">
        <Parcel size={1.6} tone={trace?.result.ok ? (trace.result.reached ? "ok" : "secure") : "danger"} />
      </DioramaToken>
    </>
  );

  const chipFor = (id: DeviceId) => {
    const h = sim.hosts[id];
    let status: string | undefined;
    let tone: "info" | "ok" | "danger" | "warn" | "muted" = "muted";
    if (id === "onu") {
      status = "回線";
      tone = "info";
    } else if (id === "router") {
      status = sim.routerOnline ? "接続中" : "未接続";
      tone = sim.routerOnline ? "ok" : "warn";
    } else if (id === "firewall") {
      status = sim.firewallOnline ? "稼働" : "未接続";
      tone = sim.firewallOnline ? "ok" : "warn";
    } else if (id === "switch") {
      const n = state.links.filter((l) => l.a === id || l.b === id).length;
      status = `${n}本`;
      tone = n > 0 ? "ok" : "muted";
    } else if (id === "ap") {
      status = state.ap.security === "none" ? "暗号化なし" : state.ap.security.toUpperCase();
      tone = state.ap.security === "none" ? "warn" : "ok";
    } else if (h?.conflict) {
      status = "IP重複";
      tone = "danger";
    } else if (h?.ip && !h.problem) {
      status = h.source === "public" ? "公開中" : `.${h.ip.split(".")[3]}`;
      tone = "ok";
    } else {
      status = "IPなし";
      tone = "warn";
    }
    return <NameChip name={DEVICE_NAME[id]} status={status} tone={tone} />;
  };

  const labels = (
    <>
      {trace && shown === trace.key && lastAt && (
        <DioramaLabel at={up(lastAt, last && last in EXTERNAL_AT ? 50 : 40)} dz={30} place="above">
          <Callout
            tone={trace.result.ok ? "ok" : "danger"}
            title={trace.result.ok ? (trace.result.reached ? "届いた" : "防いだ") : trace.result.reached ? "侵入された" : "届かない"}
            body={trace.result.summary}
            testId="netlab-callout"
          />
        </DioramaLabel>
      )}
      {placeAt && hint?.place && (
        <DioramaLabel at={up(placeAt, (placeAt.z ?? 0) + 4)} place="below">
          <span className={styles.placeTag}>{DEVICE_NAME[hint.place.kind]}はここに置かれます</span>
        </DioramaLabel>
      )}
      {presentDevices.map((id) => {
        const at = deviceAt(id, state.placed)!;
        const lift = id.startsWith("pc-") ? 100 : id === "laptop" ? 70 : id === "onu" ? 60 : id === "ap" ? (at.z ?? 0) + 30 : 90;
        const target = drag && drag.from !== id ? checkWire(drag.from, id).ok : false;
        const role = hint?.wire?.[0] === id ? "from" : hint?.wire?.[1] === id ? "to" : hint?.select === id ? "select" : null;
        return (
          <DioramaLabel key={id} at={up(at, 0)} dz={lift} place="above" interactive>
            <div className={styles.chipWrap}>
              {!drag && role && (
                <span className={styles.chipCue} data-role={role}>
                  {role === "from" ? "ここをつかんで" : role === "to" ? "ここで離す" : "ここを押す"}
                </span>
              )}
              <button
                type="button"
                className={styles.chipButton}
                data-chip={id}
                data-selected={selected === id ? "true" : "false"}
                data-target={target ? "true" : "false"}
                data-hint={!drag && role ? "true" : "false"}
                data-dim={drag && !target && drag.from !== id ? "true" : "false"}
                onPointerDown={(e) => onChipPointerDown(e, id)}
                // キーボード（Enter / Space）のときだけ。ポインタは pointerdown 側で選ぶ／つなぐを判定する
                onClick={(e) => e.detail === 0 && onSelect(id)}
                aria-label={`${DEVICE_NAME[id]}を選ぶ（ほかの名札へドラッグするとケーブルをつなぐ）`}
                data-testid={`chip-${id}`}
              >
                {chipFor(id)}
              </button>
            </div>
          </DioramaLabel>
        );
      })}
      {(["internet", "customer", "attacker", "outsider"] as const).filter(showExt).map((id) => (
        <DioramaLabel key={id} at={EXTERNAL_AT[id]} dz={id === "internet" ? 120 : 130} place="above" optional>
          <NameChip name={HOP_NAME[id]} tone="muted" />
        </DioramaLabel>
      ))}
    </>
  );

  const line = drag && (
    <svg className={styles.dragLayer} aria-hidden>
      <line x1={drag.sx} y1={drag.sy} x2={drag.x} y2={drag.y} data-state={dragCheck ? (dragCheck.ok ? "ok" : "ng") : "idle"} className={styles.dragLine} />
      <circle cx={drag.x} cy={drag.y} r={5} className={styles.dragDot} data-state={dragCheck ? (dragCheck.ok ? "ok" : "ng") : "idle"} />
    </svg>
  );
  const dragTip = drag && (
    <div
      className={styles.dragTip}
      data-state={dragCheck ? (dragCheck.ok ? "ok" : "ng") : "idle"}
      style={{ transform: `translate(${Math.round(drag.x + 14)}px, ${Math.round(drag.y + 14)}px)` }}
    >
      {dragCheck
        ? dragCheck.ok
          ? `離すとつながる：${DEVICE_NAME[drag.from]}（${portLabel(dragCheck.roleA)}）⇔ ${DEVICE_NAME[drag.over!]}（${portLabel(dragCheck.roleB)}）`
          : dragCheck.reason
        : "つなぎたい機器の名札の上で離す"}
    </div>
  );

  return (
    <div className="space-y-2">
      {portrait && guide}
      <div ref={wrapRef} className={styles.wireWrap} data-dragging-wire={drag ? "true" : "false"}>
        <DioramaStage
          corner={portrait ? undefined : guide}
          shot={portrait ? SHOT_PORTRAIT : SHOT}
          shotKey={`${portrait ? "p" : "l"}-${trace ? `t-${trace.key}` : "idle"}`}
          forward
          reducedMotion={reducedMotion}
          tokens={{
            pkt: trace && points.length > 0 ? { at: points[points.length - 1], path: points.slice(1), start: points[0], restart: true } : { at: null },
          }}
          world={world}
          labels={labels}
          ariaLabel="小さな会社のオフィスの模型。左奥がサーバ室、左手前が会議室、右が執務室。奥の壁の向こうがインターネット側。"
          aspect="16 / 11"
          aspectMobile="3 / 4"
          baseWidth={960}
          testId="netlab-stage"
          pitchRange={[25, 80]}
          pace={PACE}
        />
        {demo && (
          <svg ref={demoSvg} className={styles.dragLayer} style={{ visibility: "hidden" }} aria-hidden data-testid="wire-demo">
            <line ref={demoLine} className={styles.demoLine} />
            <g ref={demoDot}>
              <circle r={11} className={styles.demoRing} />
              <circle r={5} className={styles.demoDot} />
            </g>
          </svg>
        )}
        {line}
        {dragTip}
      </div>
    </div>
  );
}
