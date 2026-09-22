import type { CSSProperties } from "react";
import { DeskPersonIllustration } from "../crypto/CryptoPeopleIllustration";
import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  leftFaceTransform,
  rightFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import { NetworkHumanIllustration } from "../network/NetworkHumanIllustration";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge, type Lane } from "../scene/IsoParts";
import styles from "./email.module.css";

// メール配送の模型（U字）：あなた（左手前）→ 送信(SMTP)サーバ（左奥）→ 相手のメールサーバ（右奥）→ 相手（右手前）。
// 区間ごとに路面に「SMTP」「POP / IMAP」を描き、送る区間と受け取る区間が経路だけで分かるようにする。

export const SMTP_COLOR = "#4F46E5";
export const RECV_COLOR = "#0284C7";

// ---------- 模型パーツ ----------

/** メールサーバ：白いラック＋正面プレート。受信側は郵便受け（旗つき）を持つ。 */
function MailServerIllustration({ kind, state, mailCount }: { kind: "smtp" | "mailbox"; state: NodeState; mailCount: number }) {
  const W = 12;
  const D = 14;
  const H = 46;
  const box = isoBox({ x0: -W, x1: W, y0: -D, y1: D, z0: 0, z1: H });
  const ink = kind === "smtp" ? "#4338CA" : "#0369A1";
  const plate = kind === "smtp" ? "#EEF2FF" : "#E0F2FE";
  return (
    <g data-illustration={kind === "smtp" ? "smtp-server" : "mail-server"}>
      <polygon points={box.left} fill="#F6F7FA" />
      <polygon points={box.right} fill="#DCE2EC" />
      <polygon points={box.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-W, D, H)}>
        <rect x={2.5} y={2.5} width={23} height={8} rx={1.6} fill={plate} stroke={ink} strokeOpacity={0.35} strokeWidth={0.6} />
        <text x={14} y={8.3} textAnchor="middle" fontSize={4.8} fontWeight={800} letterSpacing={0.4} fill={ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {kind === "smtp" ? "SMTP" : "MAIL"}
        </text>
        {[14, 21, 28, 35].map((y, i) => (
          <g key={y}>
            <rect x={2.5} y={y} width={23} height={4.6} rx={1} fill="#E9EDF4" stroke="#D2D9E5" strokeWidth={0.5} />
            <circle cx={5} cy={y + 2.3} r={0.9} className={netStyles[`led_${state}`]} style={{ animationDelay: `${i * 120}ms` }} />
          </g>
        ))}
      </g>
      {kind === "mailbox" && (
        <g transform={rightFaceTransform(W, D, H)}>
          {/* 受信箱（郵便受け）＋ 旗：メールがあると旗が上がる */}
          <rect x={6} y={10} width={14} height={11} rx={2} fill="#FFFFFF" stroke={ink} strokeWidth={0.8} />
          <rect x={9} y={14} width={8} height={1.6} rx={0.8} fill={ink} />
          <line x1={21} y1={21} x2={21} y2={mailCount > 0 ? 6 : 13} stroke="#9AA8BD" strokeWidth={0.9} />
          <rect x={21} y={mailCount > 0 ? 6 : 13} width={5} height={3.4} fill={mailCount > 0 ? "#E11D48" : "#CBD4E2"} />
        </g>
      )}
    </g>
  );
}

/** スマホ（スタンドに立てた端末）。画面は左前面。 */
function PhoneIllustration({ state, lit }: { state: NodeState; lit: boolean }) {
  const stand = isoBox({ x0: -8, x1: 8, y0: -8, y1: 8, z0: 0, z1: 3 });
  const slab = isoBox({ x0: -9, x1: 9, y0: -2, y1: 2, z0: 3, z1: 36 });
  return (
    <g data-illustration="phone">
      <polygon points={stand.left} fill="#DCE3EE" />
      <polygon points={stand.right} fill="#C8D2E1" />
      <polygon points={stand.top} fill="#EEF2F8" />
      <polygon points={slab.right} fill="#1F2533" />
      <polygon points={slab.top} fill="#3B4458" />
      <polygon points={slab.left} fill="#2B3242" />
      <g transform={leftFaceTransform(-9, 2, 36)}>
        <rect x={2} y={2.5} width={14} height={28} rx={2} className={styles.deviceScreen} data-lit={lit ? "true" : "false"} data-state={state} />
        {lit && (
          <g>
            <rect x={4} y={8} width={10} height={6} rx={1} fill="#FFFFFF" />
            <path d="M 4 8 L 9 11.5 L 14 8" fill="none" stroke="#0284C7" strokeWidth={0.8} />
          </g>
        )}
      </g>
    </g>
  );
}

/** ノートPC（デスクなし・床置きの台の上）。画面は左前面。 */
function LaptopIllustration({ state, lit }: { state: NodeState; lit: boolean }) {
  const table = isoBox({ x0: -14, x1: 14, y0: -12, y1: 12, z0: 0, z1: 10 });
  const base = isoBox({ x0: -10, x1: 10, y0: -8, y1: 8, z0: 10, z1: 11.5 });
  const lid = isoBox({ x0: -10, x1: 10, y0: -9, y1: -7.5, z0: 11.5, z1: 28 });
  return (
    <g data-illustration="laptop">
      <polygon points={table.left} fill="#E6EBF3" />
      <polygon points={table.right} fill="#D3DBE7" />
      <polygon points={table.top} fill="#FFFFFF" stroke="#D8DFEA" strokeWidth={0.7} />
      <polygon points={base.left} fill="#AEB9CA" />
      <polygon points={base.right} fill="#9CA8BB" />
      <polygon points={base.top} fill="#CDD5E1" />
      <polygon points={lid.right} fill="#6F7F99" />
      <polygon points={lid.top} fill="#8292AB" />
      <polygon points={lid.left} fill="#3B4458" />
      <g transform={leftFaceTransform(-10, -7.5, 28)}>
        <rect x={1.5} y={1.5} width={17} height={13.5} rx={1} className={styles.deviceScreen} data-lit={lit ? "true" : "false"} data-state={state} />
        {lit && (
          <g>
            <rect x={5} y={4.5} width={10} height={6} rx={1} fill="#FFFFFF" />
            <path d="M 5 4.5 L 10 8 L 15 4.5" fill="none" stroke="#0284C7" strokeWidth={0.8} />
          </g>
        )}
      </g>
    </g>
  );
}

// ---------- 共通：メール封筒 ----------

export type MailTone = "draft" | "smtp" | "recv" | "read" | "missing";

function MailEnvelope({ at, tone, label, testId }: { at: ScreenPoint; tone: MailTone; label: string; testId: string }) {
  return (
    <div className={styles.mailAnchor} style={toPercent(at)} data-tone={tone} data-testid={testId} role="img" aria-label={label}>
      <span aria-hidden className={styles.mailShadow} />
      <span className={styles.mail}>
        <svg viewBox="0 0 20 14" className={styles.mailGlyph} aria-hidden>
          <rect x={0.8} y={0.8} width={18.4} height={12.4} rx={2} />
          <path d="M 1.5 1.8 L 10 8 L 18.5 1.8" fill="none" />
        </svg>
        <span className={styles.mailText}>{label}</span>
      </span>
    </div>
  );
}

function ProtoBadge({ lane, text, color, state, testId }: { lane: Lane; text: string; color: string; state: "idle" | "active" | "done"; testId: string }) {
  const mid = iso(along(lane, 0.5, 0));
  return (
    <span className={styles.protoBadge} style={{ ...toPercent(nudge(mid, 0, 12)), "--proto": color } as CSSProperties} data-state={state} data-testid={testId}>
      {text}
    </span>
  );
}

// ---------- ① 配送シーン ----------

export type RouteNodeId = "you" | "smtp" | "mailbox" | "friend";
export type RouteSeg = "send" | "relay" | "fetch";
export type MailStop = "you" | "smtp" | "mailbox" | "friend";

const ROUTE_AT: Record<RouteNodeId, WorldPoint> = {
  you: { x: -14, y: 72 },
  smtp: { x: -64, y: -4 },
  mailbox: { x: -4, y: -64 },
  friend: { x: 72, y: -14 },
};

const ROUTE_LANE: Record<RouteSeg, Lane> = {
  send: laneBetween(ROUTE_AT.you, ROUTE_AT.smtp),
  relay: laneBetween(ROUTE_AT.smtp, ROUTE_AT.mailbox),
  fetch: laneBetween(ROUTE_AT.mailbox, ROUTE_AT.friend),
};

const SEG_COLOR: Record<RouteSeg, string> = { send: SMTP_COLOR, relay: SMTP_COLOR, fetch: RECV_COLOR };
const SEG_TEXT: Record<RouteSeg, string> = { send: "SMTP", relay: "SMTP", fetch: "POP / IMAP" };

const MAIL_STOP_AT: Record<MailStop, ScreenPoint> = {
  you: nudge(iso(ROUTE_AT.you), 24, -70),
  smtp: nudge(iso(ROUTE_AT.smtp), 0, -66),
  mailbox: nudge(iso(ROUTE_AT.mailbox), 0, -66),
  friend: nudge(iso(ROUTE_AT.friend), -22, -70),
};

export type RouteSceneProps = {
  nodes: Record<RouteNodeId, NodeState>;
  segments: Record<RouteSeg, "idle" | "active" | "done">;
  mail: { stop: MailStop; tone: MailTone; label: string };
  reducedMotion: boolean;
};

export function MailRouteScene({ nodes, segments, mail, reducedMotion }: RouteSceneProps) {
  const inMailbox = mail.stop === "mailbox" ? 1 : 0;
  return (
    <div className={`${netStyles.scene} ${styles.scene}`} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="mail-route-scene">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="メール配送の模型。左手前のあなたから、左奥の送信サーバ、右奥の相手のメールサーバを通って、右手前の相手に届く。送る2区間はSMTP、受け取る区間はPOPまたはIMAP"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(ROUTE_AT) as RouteNodeId[]).map((id) => ({ id, at: ROUTE_AT[id], state: nodes[id] }))} />
        {(Object.keys(ROUTE_LANE) as RouteSeg[]).map((id) => (
          <SceneRail key={id} lane={ROUTE_LANE[id]} id={id} state={segments[id] === "active" ? "active" : "idle"} color={SEG_COLOR[id]} chevrons={[0.3, 0.7]} />
        ))}
        <SceneNode id="mailbox" at={ROUTE_AT.mailbox} state={nodes.mailbox} scale={0.92}>
          <MailServerIllustration kind="mailbox" state={nodes.mailbox} mailCount={inMailbox} />
        </SceneNode>
        <SceneNode id="smtp" at={ROUTE_AT.smtp} state={nodes.smtp} scale={0.92}>
          <MailServerIllustration kind="smtp" state={nodes.smtp} mailCount={0} />
        </SceneNode>
        <SceneNode id="friend" at={ROUTE_AT.friend} state={nodes.friend} scale={1.05}>
          <DeskPersonIllustration who="B" state={nodes.friend} />
        </SceneNode>
        <SceneNode id="you" at={ROUTE_AT.you} state={nodes.you} scale={1.05}>
          <NetworkHumanIllustration state={nodes.you} />
        </SceneNode>
      </svg>

      {(Object.keys(ROUTE_LANE) as RouteSeg[]).map((id) => (
        <ProtoBadge key={id} lane={ROUTE_LANE[id]} text={SEG_TEXT[id]} color={SEG_COLOR[id]} state={segments[id]} testId={`seg-${id}`} />
      ))}

      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(ROUTE_AT.you), 0, 24))} data-node-label="you">
        <span className="font-bold text-gray-900">あなた</span>
        <span className={netStyles.nodeLabelSub}>送る人</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${styles.sideLabel}`} style={toPercent(nudge(iso(ROUTE_AT.smtp), -24, -40))} data-node-label="smtp">
        <span className="font-bold text-gray-900">送信サーバ</span>
        <span className={netStyles.nodeLabelSub}>SMTPサーバ</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${netStyles.nodeLabelStart}`} style={toPercent(nudge(iso(ROUTE_AT.mailbox), 22, -40))} data-node-label="mailbox">
        <span className="font-bold text-gray-900">相手のサーバ</span>
        <span className={netStyles.nodeLabelSub}>受信箱{inMailbox ? "：✉ 1通" : ""}</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(ROUTE_AT.friend), 0, 24))} data-node-label="friend">
        <span className="font-bold text-gray-900">相手</span>
        <span className={netStyles.nodeLabelSub}>受け取る人</span>
      </div>

      <div className={styles.legend} aria-hidden>
        <span style={{ "--proto": SMTP_COLOR } as CSSProperties}>送る＝SMTP</span>
        <span style={{ "--proto": RECV_COLOR } as CSSProperties}>受け取る＝POP/IMAP</span>
      </div>

      <MailEnvelope at={MAIL_STOP_AT[mail.stop]} tone={mail.tone} label={mail.label} testId="route-mail" />
    </div>
  );
}

// ---------- ② POP / IMAP シーン ----------

export type SyncNodeId = "server" | "phone" | "pc";

const SYNC_AT: Record<SyncNodeId, WorldPoint> = {
  server: { x: -50, y: -50 },
  phone: { x: -24, y: 62 },
  pc: { x: 62, y: -24 },
};

const SYNC_LANE: Record<"phone" | "pc", Lane> = {
  phone: laneBetween(SYNC_AT.server, SYNC_AT.phone),
  pc: laneBetween(SYNC_AT.server, SYNC_AT.pc),
};

export type Inbox = { mail: boolean; read?: boolean; note?: string };

export type SyncSceneProps = {
  proto: "POP" | "IMAP";
  nodes: Record<SyncNodeId, NodeState>;
  lanes: Partial<Record<"phone" | "pc", "active" | "blocked">>;
  boxes: Record<SyncNodeId, Inbox>;
  mail: { at: SyncNodeId; tone: MailTone; label: string } | null;
  reducedMotion: boolean;
};

const SYNC_MAIL_AT: Record<SyncNodeId, ScreenPoint> = {
  server: nudge(iso(SYNC_AT.server), 0, -64),
  phone: nudge(iso(SYNC_AT.phone), 30, -56),
  pc: nudge(iso(SYNC_AT.pc), -28, -60),
};

function InboxLabel({ id, name, box, at }: { id: SyncNodeId; name: string; box: Inbox; at: ScreenPoint }) {
  return (
    <div className={`${netStyles.nodeLabel} ${styles.inbox}`} style={toPercent(at)} data-inbox={id} data-has-mail={box.mail ? "true" : "false"} data-testid={`inbox-${id}`}>
      <span className="font-bold text-gray-900">{name}</span>
      <span className={styles.inboxBody}>
        {box.mail ? (
          <>
            ✉ 会議の件
            <span className={styles.readChip} data-read={box.read ? "true" : "false"}>
              {box.read ? "既読" : "未読"}
            </span>
          </>
        ) : (
          (box.note ?? "受信箱：空")
        )}
      </span>
    </div>
  );
}

export function MailSyncScene({ proto, nodes, lanes, boxes, mail, reducedMotion }: SyncSceneProps) {
  return (
    <div className={`${netStyles.scene} ${styles.scene}`} data-reduced-motion={reducedMotion ? "true" : "false"} data-proto={proto} data-testid="mail-sync-scene">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="奥に相手のメールサーバ、左手前にスマホ、右手前にPC。どちらの端末もサーバからメールを受け取る"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(SYNC_AT) as SyncNodeId[]).map((id) => ({ id, at: SYNC_AT[id], state: nodes[id] }))} />
        {(["phone", "pc"] as const).map((id) => (
          <SceneRail key={id} lane={SYNC_LANE[id]} id={id} state={lanes[id] ?? "idle"} color={proto === "POP" ? "#D97706" : RECV_COLOR} chevrons={[0.5]} />
        ))}
        <SceneNode id="server" at={SYNC_AT.server} state={nodes.server} scale={0.95}>
          <MailServerIllustration kind="mailbox" state={nodes.server} mailCount={boxes.server.mail ? 1 : 0} />
        </SceneNode>
        <SceneNode id="pc" at={SYNC_AT.pc} state={nodes.pc} scale={1.15}>
          <LaptopIllustration state={nodes.pc} lit={boxes.pc.mail} />
        </SceneNode>
        <SceneNode id="phone" at={SYNC_AT.phone} state={nodes.phone} scale={1.15}>
          <PhoneIllustration state={nodes.phone} lit={boxes.phone.mail} />
        </SceneNode>
      </svg>

      <InboxLabel id="server" name="メールサーバ" box={boxes.server} at={nudge(iso(SYNC_AT.server), 0, 22)} />
      <InboxLabel id="phone" name="📱 スマホ" box={boxes.phone} at={nudge(iso(SYNC_AT.phone), 0, 22)} />
      <InboxLabel id="pc" name="💻 PC" box={boxes.pc} at={nudge(iso(SYNC_AT.pc), 0, 22)} />

      <span className={styles.protoTag} data-proto={proto}>
        {proto === "POP" ? "POP：端末へ取り出す" : "IMAP：サーバに置いたまま同期"}
      </span>

      {mail && <MailEnvelope at={SYNC_MAIL_AT[mail.at]} tone={mail.tone} label={mail.label} testId="sync-mail" />}
    </div>
  );
}
