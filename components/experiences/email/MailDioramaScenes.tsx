"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import {
  Desk,
  Envelope,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Monitor,
  Person,
  Phone,
  Plant,
  ServerRack,
  Wall,
  type RouteTone,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { Inbox, MailStop, MailTone, RouteSceneProps, RouteSeg, SyncNodeId, SyncSceneProps } from "./mailTypes";
import styles from "./maildiorama.module.css";

// 電子メールの図解（2つの模型）。
// ① 配送：自宅のPC →（SMTP）→ あなたのプロバイダの送信サーバ →（SMTP）→ 相手のメールサーバ →（POP / IMAP）→ 相手の会社のPC。
//    送る2区間は SMTP、受け取る区間は POP か IMAP。道の色と札で区間ごとの手順（プロトコル）を見せる。
// ② POP と IMAP：同じメールサーバからスマホとPCが受け取る。POP はメールを端末へ取り出して、サーバは空になる。
//    IMAP はサーバに置いたまま、既読も含めてどの端末でも同じ状態が見える。

// ---------- 共通：封筒の札 ----------

function MailTag({ tone, label, testId }: { tone: MailTone; label: string; testId: string }) {
  return (
    <div className={styles.mail} data-tone={tone} data-testid={testId} role="img" aria-label={label}>
      <span className={styles.mailGlyph} aria-hidden>
        ✉
      </span>
      <span>{label}</span>
    </div>
  );
}

// ---------- ① 配送 ----------

const ROUTE_AT = {
  you: { x: 130, y: 330, z: 0 },
  smtp: { x: 190, y: 110, z: 0 },
  mailbox: { x: 600, y: 110, z: 0 },
  friend: { x: 660, y: 330, z: 0 },
} satisfies Record<MailStop, Vec3>;
const MAIL_AT: Record<MailStop, Vec3> = {
  you: { x: 150, y: 330, z: 64 },
  smtp: { x: 190, y: 160, z: 20 },
  mailbox: { x: 600, y: 160, z: 20 },
  friend: { x: 640, y: 330, z: 64 },
};
const G = 3;
const SEG: Record<RouteSeg, Vec3[]> = {
  send: [
    { x: 150, y: 290, z: G },
    { x: 170, y: 230, z: G },
    { x: 190, y: 170, z: G },
  ],
  relay: [
    { x: 240, y: 164, z: G },
    { x: 400, y: 160, z: G },
    { x: 560, y: 164, z: G },
  ],
  fetch: [
    { x: 610, y: 170, z: G },
    { x: 630, y: 230, z: G },
    { x: 645, y: 290, z: G },
  ],
};
const SEG_TEXT: Record<RouteSeg, string> = { send: "SMTP", relay: "SMTP", fetch: "POP / IMAP" };
const SEG_TONE: Record<RouteSeg, RouteTone> = { send: "violet", relay: "violet", fetch: "request" };
const SEG_TO: Record<Exclude<MailStop, "you">, RouteSeg> = { smtp: "send", mailbox: "relay", friend: "fetch" };

function routePath(stop: MailStop): Vec3[] | undefined {
  if (stop === "you") return undefined;
  return [...SEG[SEG_TO[stop]].map((p) => ({ ...p, z: 18 })), MAIL_AT[stop]];
}

const ROUTE_SHOT: Record<MailStop, Camera> = {
  you: { yaw: -14, pitch: 52, zoom: 1.2, fx: 180, fy: 280, fz: 50 },
  smtp: { yaw: -16, pitch: 54, zoom: 1.0, fx: 230, fy: 210, fz: 50 },
  mailbox: { yaw: -18, pitch: 54, zoom: 0.92, fx: 420, fy: 180, fz: 50 },
  friend: { yaw: -18, pitch: 52, zoom: 1.0, fx: 560, fy: 260, fz: 50 },
};

export function MailRouteDiorama({ nodes, segments, mail, reducedMotion, forward = true }: RouteSceneProps & { forward?: boolean }) {
  const inMailbox = mail.stop === "mailbox";
  const segState = (id: RouteSeg) => segments[id];
  return (
    <DioramaStage
      testId="mail-route-scene"
      ariaLabel="メール配送の模型。左手前の自宅のあなたから、左奥のプロバイダの送信サーバ、右奥の相手のメールサーバを通って、右手前の相手の会社のPCに届く。送る2区間はSMTP、受け取る区間はPOPまたはIMAP"
      shot={ROUTE_SHOT[mail.stop]}
      shotKey={`${mail.stop}-${mail.tone}`}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={{ mail: { at: MAIL_AT[mail.stop], path: routePath(mail.stop) } }}
      corner={
        <span className={styles.legend}>
          <span data-proto="smtp">送る＝SMTP</span>
          <span data-proto="recv">受け取る＝POP/IMAP</span>
        </span>
      }
      world={
        <>
          <Floor x={0} y={30} w={800} d={400} h={16} material="plain" />
          {/* 自宅 */}
          <Floor x={20} y={260} w={220} d={160} h={5} z={4} material="wood" />
          <Group z={4} data={{ "data-node": "you", "data-state": nodes.you }}>
            <Desk x={ROUTE_AT.you.x} y={ROUTE_AT.you.y} w={96} d={52} tone="wood" />
            <Laptop x={ROUTE_AT.you.x} y={ROUTE_AT.you.y} z={44} glow={nodes.you !== "idle"} />
            <Person x={ROUTE_AT.you.x - 4} y={ROUTE_AT.you.y + 58} pose="sit" shirt="#4f86e8" size={0.95} />
          </Group>
          {/* プロバイダの送信サーバ（SMTP） */}
          <Floor x={100} y={50} w={200} d={120} h={5} z={4} material="dc" />
          <Group z={4} data={{ "data-node": "smtp", "data-state": nodes.smtp }}>
            <ServerRack x={ROUTE_AT.smtp.x - 30} y={ROUTE_AT.smtp.y} h={100} units={5} state={nodes.smtp} accent="#6366f1" />
            <ServerRack x={ROUTE_AT.smtp.x + 36} y={ROUTE_AT.smtp.y} h={100} units={5} />
          </Group>
          {/* 相手のメールサーバ（受信箱） */}
          <Floor x={500} y={50} w={200} d={120} h={5} z={4} material="dc" />
          <Group z={4} data={{ "data-node": "mailbox", "data-state": nodes.mailbox }}>
            <ServerRack x={ROUTE_AT.mailbox.x - 30} y={ROUTE_AT.mailbox.y} h={100} units={5} state={nodes.mailbox} accent="#0ea5e9" />
            <ServerRack x={ROUTE_AT.mailbox.x + 36} y={ROUTE_AT.mailbox.y} h={100} units={5} />
          </Group>
          {/* 相手の会社 */}
          <Floor x={560} y={260} w={230} d={160} h={5} z={4} material="carpet" />
          <Group z={4} data={{ "data-node": "friend", "data-state": nodes.friend }}>
            <Desk x={ROUTE_AT.friend.x} y={ROUTE_AT.friend.y} w={100} d={52} />
            <Monitor x={ROUTE_AT.friend.x} y={ROUTE_AT.friend.y - 6} w={52} glow={nodes.friend !== "idle"} />
            <Person x={ROUTE_AT.friend.x} y={ROUTE_AT.friend.y + 58} pose="sit" shirt="#6b7fd6" size={0.95} />
            <Plant x={770} y={400} size={0.8} />
          </Group>

          {(Object.keys(SEG) as RouteSeg[]).map((id) => (
            <FloorRoute key={id} points={SEG[id]} width={10} z={4.8} tone={segState(id) === "idle" ? "idle" : SEG_TONE[id]} active={segState(id) === "active"} data={{ "data-seg": id }} />
          ))}
          <DioramaToken id="mail">
            <Envelope tone={mail.tone === "missing" ? "danger" : "plain"} sealed={mail.tone !== "draft"} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel token="mail" dz={12} place={mail.stop === "you" ? "right" : mail.stop === "friend" ? "left" : "above"}>
            <MailTag tone={mail.tone} label={mail.label} testId="route-mail" />
          </DioramaLabel>
          {(Object.keys(SEG) as RouteSeg[]).map((id) => (
            <DioramaLabel key={id} at={SEG[id][1]} place="below">
              <span className={styles.protoBadge} data-proto={id === "fetch" ? "recv" : "smtp"} data-state={segState(id)} data-testid={`seg-${id}`}>
                {SEG_TEXT[id]}
              </span>
            </DioramaLabel>
          ))}
          <DioramaLabel at={{ ...ROUTE_AT.you, y: ROUTE_AT.you.y + 74 }} place="below" optional>
            <div data-node-label="you">
              <NameChip name="あなた" sub="送る人・自宅" tone="info" />
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...ROUTE_AT.smtp, z: 110 }} place="above" optional>
            <div data-node-label="smtp">
              <NameChip name="送信サーバ" sub="SMTPサーバ" tone="muted" />
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...ROUTE_AT.mailbox, z: 110 }} place="above" optional>
            <div data-node-label="mailbox">
              <NameChip name="相手のサーバ" sub={`受信箱${inMailbox ? "：✉ 1通" : ""}`} tone="muted" />
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...ROUTE_AT.friend, y: ROUTE_AT.friend.y + 74 }} place="below" optional>
            <div data-node-label="friend">
              <NameChip name="相手" sub="受け取る人・会社" tone="info" />
            </div>
          </DioramaLabel>
        </>
      }
    />
  );
}

// ---------- ② POP と IMAP ----------

const SYNC_AT: Record<SyncNodeId, Vec3> = {
  server: { x: 400, y: 110, z: 0 },
  phone: { x: 190, y: 330, z: 0 },
  pc: { x: 610, y: 330, z: 0 },
};
const SYNC_MAIL_AT: Record<SyncNodeId, Vec3> = {
  server: { x: 400, y: 160, z: 30 },
  phone: { x: 214, y: 322, z: 70 },
  pc: { x: 590, y: 324, z: 66 },
};
const SYNC_LANE: Record<"phone" | "pc", Vec3[]> = {
  phone: [
    { x: 380, y: 170, z: G },
    { x: 290, y: 250, z: G },
    { x: 214, y: 300, z: G },
  ],
  pc: [
    { x: 420, y: 170, z: G },
    { x: 510, y: 250, z: G },
    { x: 590, y: 300, z: G },
  ],
};

function InboxLabel({ id, name, box }: { id: SyncNodeId; name: string; box: Inbox }) {
  return (
    <div className={styles.inbox} data-inbox={id} data-has-mail={box.mail ? "true" : "false"} data-testid={`inbox-${id}`}>
      <b>{name}</b>
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

export function MailSyncDiorama({ proto, nodes, lanes, boxes, mail, reducedMotion, forward = true }: SyncSceneProps & { forward?: boolean }) {
  const laneTone = (id: "phone" | "pc"): RouteTone => (lanes[id] === "blocked" ? "blocked" : lanes[id] === "active" ? (proto === "POP" ? "amber" : "request") : "idle");
  return (
    <DioramaStage
      testId="mail-sync-scene"
      ariaLabel="奥に相手のメールサーバ、左手前にスマホを持つ人、右手前に会社のPC。どちらの端末もサーバからメールを受け取る"
      shot={{ yaw: -16, pitch: 54, zoom: 0.94, fx: 400, fy: 230, fz: 40 }}
      shotKey={`${mail?.at ?? "-"}-${proto}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-proto": proto }}
      tokens={{ mail: { at: mail ? SYNC_MAIL_AT[mail.at] : null, path: mail && mail.at !== "server" ? [...SYNC_LANE[mail.at].map((p) => ({ ...p, z: 20 })), SYNC_MAIL_AT[mail.at]] : undefined } }}
      corner={
        <span className={styles.protoTag} data-proto={proto}>
          {proto === "POP" ? "POP：端末へ取り出す" : "IMAP：サーバに置いたまま同期"}
        </span>
      }
      world={
        <>
          <Floor x={0} y={30} w={800} d={400} h={16} material="plain" />
          <Floor x={280} y={50} w={240} d={130} h={5} z={4} material="dc" />
          <Wall x={280} y={50} length={240} h={110} tone="dc" />
          <Group z={4} data={{ "data-node": "server", "data-state": nodes.server }}>
            <ServerRack x={SYNC_AT.server.x - 34} y={SYNC_AT.server.y} h={100} units={5} state={nodes.server} accent="#0ea5e9" />
            <ServerRack x={SYNC_AT.server.x + 34} y={SYNC_AT.server.y} h={100} units={5} />
          </Group>
          {/* スマホを持つ人（外出先） */}
          <Floor x={60} y={260} w={260} d={160} h={4} z={4} material="paving" />
          <Group z={4} data={{ "data-node": "phone", "data-state": nodes.phone }}>
            <Phone x={SYNC_AT.phone.x + 20} y={SYNC_AT.phone.y - 6} z={48} scale={0.9} glow={boxes.phone.mail} />
            <Person x={SYNC_AT.phone.x - 6} y={SYNC_AT.phone.y + 12} pose="back" shirt="#e0803a" />
          </Group>
          {/* 会社のPC */}
          <Floor x={480} y={260} w={260} d={160} h={5} z={4} material="carpet" />
          <Group z={4} data={{ "data-node": "pc", "data-state": nodes.pc }}>
            <Desk x={SYNC_AT.pc.x} y={SYNC_AT.pc.y} w={100} d={52} />
            <Laptop x={SYNC_AT.pc.x} y={SYNC_AT.pc.y} z={44} glow={boxes.pc.mail} />
            <Person x={SYNC_AT.pc.x - 4} y={SYNC_AT.pc.y + 58} pose="sit" shirt="#6b7fd6" size={0.95} />
          </Group>

          {(["phone", "pc"] as const).map((id) => (
            <FloorRoute key={id} points={SYNC_LANE[id]} width={10} z={4.8} tone={laneTone(id)} active={lanes[id] === "active"} data={{ "data-lane": id, "data-state": lanes[id] ?? "idle" }} />
          ))}
          <DioramaToken id="mail">
            {mail && <Envelope tone={mail.tone === "missing" ? "danger" : "plain"} sealed />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {mail && (
            <DioramaLabel token="mail" dz={12} place="above">
              <MailTag tone={mail.tone} label={mail.label} testId="sync-mail" />
            </DioramaLabel>
          )}
          <DioramaLabel at={{ ...SYNC_AT.server, y: SYNC_AT.server.y + 64, z: 0 }} place="below" pinned>
            <InboxLabel id="server" name="メールサーバ" box={boxes.server} />
          </DioramaLabel>
          <DioramaLabel at={{ ...SYNC_AT.phone, y: SYNC_AT.phone.y + 30 }} place="below" pinned>
            <InboxLabel id="phone" name="📱 スマホ" box={boxes.phone} />
          </DioramaLabel>
          <DioramaLabel at={{ ...SYNC_AT.pc, y: SYNC_AT.pc.y + 70 }} place="below" pinned>
            <InboxLabel id="pc" name="💻 PC" box={boxes.pc} />
          </DioramaLabel>
        </>
      }
    />
  );
}
