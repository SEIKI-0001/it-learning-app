"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Parcel,
  Person,
  Plant,
  ServerRack,
  Wall,
  WallWindow,
  WifiRouter,
  offsetPath,
  slicePath,
  type CarryTone,
  type ParcelMark,
  type RouteTone,
} from "../scene/DioramaParts";
import { Badge, Callout, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { CapsuleKind } from "./dnsTypes";
import type { NodeState } from "./NetworkSceneBase";
import type { CapsuleStop, LaneId, LaneState, NetworkNodeId } from "./dnsTypes";
import styles from "./dnsdiorama.module.css";

// IPアドレス・DNS の図解：自宅の部屋のノートPC → Wi-Fiルータ → インターネット（通信会社）→ DNSサーバ／Webサーバ。
// 名前（example.com）をDNSサーバに問い合わせてIPアドレスを受け取り、そのIPを宛先にWebサーバへ向かう。
// DNSが止まると問い合わせが返らず、IPが分からないのでWebサーバへの道は最初から塞がる。
// 4本の車線（① 問い合わせ ② 応答 ③ 接続 ④ ページ）は床に引いた矢印の道。動いている車線だけ色が付く。

// 主要な点（床の高さ z=6 の上）
const LAPTOP: Vec3 = { x: 150, y: 286, z: 50 };
const ROUTER: Vec3 = { x: 256, y: 222, z: 40 };
const ISP: Vec3 = { x: 468, y: 262, z: 30 };
const DNS: Vec3 = { x: 412, y: 62, z: 6 };
const WEB: Vec3 = { x: 666, y: 236, z: 6 };

const G = 7; // 車線の高さ（床の上）
// 自宅 → ルータ → 部屋の外 → 通信会社のルータ → DNS ／ Web。2本の道を平行にずらして、往復で4車線にする。
const TO_DNS: Vec3[] = [
  { x: 186, y: 262, z: G },
  { x: 250, y: 250, z: G },
  { x: 330, y: 250, z: G },
  { x: 446, y: 244, z: G },
  { x: 430, y: 112, z: G },
];
const TO_WEB: Vec3[] = [
  { x: 186, y: 290, z: G },
  { x: 250, y: 280, z: G },
  { x: 330, y: 282, z: G },
  { x: 480, y: 290, z: G },
  { x: 628, y: 288, z: G },
];
const reverse = (p: Vec3[]) => [...p].reverse();
const LANE_PATH: Record<LaneId, Vec3[]> = {
  query: offsetPath(TO_DNS, -6),
  response: offsetPath(reverse(TO_DNS), -6),
  web: offsetPath(TO_WEB, -6),
  page: offsetPath(reverse(TO_WEB), -6),
};

const Z_PARCEL = G + 1;
const INPUT_AT: Vec3 = { x: LAPTOP.x + 2, y: LAPTOP.y - 30, z: 106 };

/** 各停止点：どの車線のどこまで進んだところか */
const STOP_ON: Record<Exclude<CapsuleStop, "input">, { lane: LaneId; t: number }> = {
  userOut: { lane: "query", t: 0.06 },
  dnsIn: { lane: "query", t: 0.9 },
  dnsOut: { lane: "response", t: 0.1 },
  userIn: { lane: "response", t: 0.86 },
  webOut: { lane: "web", t: 0.06 },
  webIn: { lane: "web", t: 0.9 },
  pageOut: { lane: "page", t: 0.1 },
  pageIn: { lane: "page", t: 0.86 },
  dnsBlocked: { lane: "query", t: 0.8 },
};

function stopPath(stop: CapsuleStop): Vec3[] {
  if (stop === "input") return [INPUT_AT];
  const { lane, t } = STOP_ON[stop];
  return slicePath(LANE_PATH[lane], t, Z_PARCEL);
}

const PARCEL: Record<CapsuleKind, { tone: CarryTone; mark: ParcelMark }> = {
  input: { tone: "plain", mark: "none" },
  query: { tone: "info", mark: "none" },
  response: { tone: "ok", mark: "check" },
  connect: { tone: "info", mark: "none" },
  connected: { tone: "info", mark: "check" },
  page: { tone: "ok", mark: "check" },
  timeout: { tone: "danger", mark: "alert" },
};

const LANE_TONE: Record<LaneId, RouteTone> = { query: "request", response: "response", web: "request", page: "response" };
const LANE_NAME: Record<LaneId, string> = {
  query: "① 名前を問い合わせ",
  response: "② IPアドレスを返す",
  web: "③ IPを宛先に接続",
  page: "④ ページを返す",
};

const STATUS_WORD: Partial<Record<NodeState, string>> = {
  active: "処理中",
  sending: "送信",
  error: "応答なし",
  disabled: "未接続",
};
const STATUS_TONE: Partial<Record<NodeState, "info" | "ok" | "danger" | "muted">> = {
  active: "ok",
  sending: "info",
  error: "danger",
  disabled: "muted",
};

// 主役へ寄るカメラ。ステップの主役（入力＝PC、問い合わせ＝家とDNS、接続＝家とWeb…）が画面の中心に来る。
const SHOT_INPUT: Camera = { yaw: -12, pitch: 50, zoom: 1.6, fx: 160, fy: 280, fz: 70 };
const SHOT_DNS: Camera = { yaw: -18, pitch: 52, zoom: 0.92, fx: 330, fy: 190, fz: 40 };
const SHOT_WEB: Camera = { yaw: -22, pitch: 54, zoom: 0.86, fx: 440, fy: 240, fz: 40 };
const SHOT_WEB_CLOSE: Camera = { yaw: -26, pitch: 50, zoom: 1.25, fx: 640, fy: 260, fz: 60 };
const SHOT_WIDE: Camera = { yaw: -20, pitch: 54, zoom: 0.84, fx: 430, fy: 200, fz: 40 };
const SHOT_OUTAGE: Camera = { yaw: -16, pitch: 52, zoom: 1.0, fx: 330, fy: 170, fz: 40 };

function shotFor(stop: CapsuleStop | null, outage: boolean, showBrowser: boolean, connecting: boolean): Camera {
  if (showBrowser) return SHOT_INPUT;
  if (!stop || stop === "input") return SHOT_INPUT;
  if (stop === "dnsBlocked") return SHOT_OUTAGE;
  if (stop === "dnsIn" || stop === "dnsOut" || stop === "userIn" || stop === "userOut") return outage ? SHOT_OUTAGE : SHOT_DNS;
  if (stop === "webIn") return connecting ? SHOT_WEB : SHOT_WEB_CLOSE;
  if (stop === "pageIn" || stop === "pageOut") return SHOT_WIDE;
  return SHOT_WEB;
}

/** ノートPCの画面：アドレス欄に名前を入れた状態 → ページが表示された状態 */
function BrowserScreen({ shown, waiting }: { shown: boolean; waiting: boolean }) {
  return (
    <div className={styles.browser}>
      <div className={styles.browserBar}>
        <span className={styles.dots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.url}>example.com</span>
      </div>
      {shown ? (
        <div className={styles.page}>
          <span className={styles.hero} />
          <b>Example Domain</b>
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.short}`} />
        </div>
      ) : (
        <div className={styles.blank}>{waiting ? "接続先を探しています…" : ""}</div>
      )}
    </div>
  );
}

export function DnsDioramaScene({
  nodes,
  lanes,
  capsule,
  outage,
  reducedMotion,
  inspectOpen,
  onInspect,
  showBrowser = false,
  forward,
}: {
  nodes: Record<NetworkNodeId, NodeState>;
  lanes: Record<LaneId, LaneState>;
  capsule: { kind: CapsuleKind; tag: string; payload: string; stop: CapsuleStop } | null;
  showBrowser?: boolean;
  outage: boolean;
  reducedMotion: boolean;
  inspectOpen: boolean;
  onInspect: () => void;
  /** 前へ進んだ直後か（戻る・飛ばすときは小包を瞬間移動させる） */
  forward: boolean;
}) {
  const stop = capsule?.stop ?? null;
  // 接続（あなたが送信中）は家からWebまでの道全体、到達はWebサーバへ寄る
  const shot = shotFor(stop, nodes.dns === "error", showBrowser, nodes.user === "sending");
  // IPアドレスが分かるのは DNS の応答を受け取ってから
  const knowsIp = showBrowser || (!!stop && !["input", "userOut", "dnsIn", "dnsBlocked"].includes(stop));
  const path = stop ? stopPath(stop) : null;
  const parcel = capsule ? PARCEL[capsule.kind] : null;
  const activeLanes = (Object.keys(lanes) as LaneId[]).filter((id) => lanes[id] === "active");
  const dnsDown = nodes.dns === "error";
  const webOff = nodes.web === "disabled";

  const routeTone = (id: LaneId): RouteTone =>
    lanes[id] === "blocked" ? "blocked" : lanes[id] === "active" ? LANE_TONE[id] : "idle";

  return (
    <DioramaStage
      testId="network-scene"
      ariaLabel="自宅の部屋のノートPCとWi-Fiルータ、通信会社のルータ（インターネット）、奥のDNSサーバ、右のデータセンターのWebサーバが並ぶ模型。4本の車線で結ばれている"
      shot={shot}
      shotKey={`${stop ?? "none"}-${showBrowser ? "b" : ""}-${dnsDown ? "x" : ""}-${nodes.user}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-outage": outage ? "true" : "false" }}
      tokens={{
        packet: {
          at: path ? path[path.length - 1] : null,
          path: path ?? undefined,
        },
      }}
      corner={
        <span className={styles.plate} data-outage={dnsDown ? "true" : "false"}>
          {dnsDown ? "DNS 停止中" : knowsIp ? "example.com → 93.184.216.34" : "example.com → ?"}
        </span>
      }
      world={
        <>
          {/* 台座 */}
          <Floor x={0} y={-24} w={820} d={452} h={16} material="plain" />

          {/* ---------- 自宅の部屋 ---------- */}
          <Floor x={20} y={184} w={290} d={236} h={6} z={6} material="wood" />
          <Wall x={20} y={184} length={290} h={118} tone="home">
            <WallWindow left={34} top={20} w={96} h={60} />
          </Wall>
          <Group x={0} y={0} z={6}>
            <Desk x={LAPTOP.x} y={LAPTOP.y} w={112} d={62} tone="wood" />
            <Group data={{ "data-node": "user", "data-state": nodes.user }}>
              <Laptop
                x={LAPTOP.x}
                y={LAPTOP.y}
                z={44}
                glow={nodes.user === "active" || nodes.user === "sending"}
                screen={
                  showBrowser ? (
                    <div data-testid="browser-window" role="img" aria-label="ブラウザに example.com のページが表示された画面">
                      <BrowserScreen shown waiting={false} />
                    </div>
                  ) : (
                    <BrowserScreen shown={false} waiting={dnsDown} />
                  )
                }
              />
              <Person x={LAPTOP.x - 4} y={LAPTOP.y + 74} pose="sit" shirt="#4f86e8" />
            </Group>
            {/* ルータを置いた低い棚 */}
            <Group x={ROUTER.x} y={ROUTER.y}>
              <Desk x={0} y={0} w={52} d={34} h={34} tone="wood" />
            </Group>
            <WifiRouter x={ROUTER.x} y={ROUTER.y} z={34} />
            <Plant x={52} y={214} />
          </Group>

          {/* ---------- 通信会社のルータ（インターネットの入口） ---------- */}
          <Group data={{ "data-illustration": "internet" }}>
            <Appliance x={ISP.x} y={ISP.y + 14} kind="router" stand={26} w={62} state={activeLanes.length ? "active" : "idle"} />
          </Group>

          {/* ---------- DNSサーバ（通信会社のサーバ室） ---------- */}
          <Floor x={330} y={-4} w={170} d={128} h={6} z={6} material="dc" />
          <Wall x={330} y={-4} length={170} h={128} tone="dc" />
          <Group data={{ "data-node": "dns", "data-state": nodes.dns, "data-illustration": "dns" }}>
            <ServerRack x={DNS.x} y={DNS.y} z={6} h={104} units={5} state={nodes.dns} accent={dnsDown ? "#e11d48" : "#2f6fdb"} />
          </Group>
          <ServerRack x={DNS.x + 58} y={DNS.y + 6} z={6} w={36} d={44} h={70} units={3} />

          {/* ---------- Webサーバ（データセンター） ---------- */}
          <Floor x={574} y={126} w={236} d={244} h={6} z={6} material="dc" />
          <Wall x={574} y={126} length={236} h={128} tone="dc" />
          <Group data={{ "data-node": "web", "data-state": nodes.web, "data-illustration": "web" }}>
            <ServerRack x={WEB.x} y={WEB.y} z={6} state={webOff ? "disabled" : nodes.web} accent="#16a37a" />
          </Group>
          <ServerRack x={WEB.x + 76} y={WEB.y} z={6} state={webOff ? "disabled" : "idle"} />
          <ServerRack x={WEB.x + 38} y={WEB.y - 74} z={6} h={96} units={5} state={webOff ? "disabled" : "idle"} />
          <ServerRack x={WEB.x + 114} y={WEB.y - 74} z={6} h={96} units={5} state={webOff ? "disabled" : "idle"} />

          {/* ---------- 4本の車線 ---------- */}
          {(["page", "web", "response", "query"] as LaneId[]).map((id) => (
            <FloorRoute
              key={id}
              points={LANE_PATH[id]}
              width={7}
              tone={routeTone(id)}
              active={lanes[id] === "active"}
              data={{ "data-lane": id, "data-state": lanes[id] }}
            />
          ))}

          {/* ---------- 流れるデータ ---------- */}
          <DioramaToken id="packet">
            {parcel && <Parcel tone={parcel.tone} mark={parcel.mark} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {capsule && (
            <DioramaLabel token="packet" dz={16} place={stop === "input" ? "right" : stop === "dnsIn" || stop === "dnsOut" || stop === "dnsBlocked" ? "below" : "above"} interactive>
              <button
                type="button"
                onClick={onInspect}
                aria-expanded={inspectOpen}
                aria-label="流れているデータの中身を見る"
                className={styles.capsule}
                data-capsule-kind={capsule.kind}
              >
                <span className={styles.capsuleTag}>{capsule.tag}</span>
                <span className={styles.capsulePayload}>{capsule.payload}</span>
              </button>
            </DioramaLabel>
          )}

          {outage && (
            <DioramaLabel at={{ ...DNS, z: 150 }} place="above">
              <div data-testid="dns-alarm">
                <Callout tone="danger" title="⚠ DNSサーバ" body="DNSタイムアウト" verdict="IPアドレスが分からない" role="status" />
              </div>
            </DioramaLabel>
          )}

          {showBrowser && (
            <DioramaLabel at={{ x: LAPTOP.x, y: LAPTOP.y - 20, z: 110 }} place="above">
              <Badge tone="ok">ページを表示</Badge>
            </DioramaLabel>
          )}

          {activeLanes.map((id) => {
            const mid = LANE_PATH[id][2];
            return (
              <DioramaLabel key={id} at={{ ...mid, z: 10 }} place="below" optional>
                <Badge tone={LANE_TONE[id] === "request" ? "info" : "ok"}>{LANE_NAME[id]}</Badge>
              </DioramaLabel>
            );
          })}

          <DioramaLabel at={{ x: 108, y: 360, z: 0 }} place="below" optional>
            <NameChip name="あなた" sub="自宅のPC・ブラウザ" status={STATUS_WORD[nodes.user]} tone={STATUS_TONE[nodes.user]} />
          </DioramaLabel>
          <DioramaLabel at={{ ...DNS, z: 118 }} place="above" optional>
            <NameChip name="DNSサーバ" sub="名前 → IP" status={STATUS_WORD[nodes.dns]} tone={STATUS_TONE[nodes.dns]} />
          </DioramaLabel>
          <DioramaLabel at={{ ...WEB, z: 124 }} place="above" optional>
            <NameChip name="Webサーバ" sub="93.184.216.34" status={STATUS_WORD[nodes.web]} tone={STATUS_TONE[nodes.web]} />
          </DioramaLabel>
          <DioramaLabel at={{ ...ROUTER, z: 72 }} place="above" optional>
            <NameChip name="Wi-Fiルータ" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={{ x: 700, y: 140, z: 128 }} place="above" optional>
            <NameChip name="データセンター" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={{ ...ISP, y: ISP.y + 28, z: 0 }} place="below" optional>
            <NameChip name="インターネット" sub="通信会社のルータ" tone="muted" />
          </DioramaLabel>
        </>
      }
    />
  );
}
