"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box } from "../scene/Diorama3D";
import {
  Appliance,
  Database,
  Desk,
  Floor,
  Group,
  KeyGlyph,
  Paper,
  Parcel,
  Person,
  Phone,
  Plant,
  Safe,
  ServerRack,
  Wall,
  type CarryTone,
} from "../scene/DioramaParts";
import { Callout, DioramaLabel, DioramaStage, DioramaToken, NameChip, type TokenSpec } from "../scene/DioramaStage";
import { hashHex, toyCipher } from "./toyCrypto";
import styles from "./membersite.module.css";

// 暗号化とハッシュ化の図解：通販サイトの会員登録を、そのまま模型にする。
//   左手前：あなたの部屋のスマホ ／ 中央：通販会社のサーバ室（Webサーバ・🔑暗号化装置・ハッシュ関数・DB・鍵の金庫）
//   右手前：発送倉庫（送り状を印刷する係）／ 右奥：DBを盗み出そうとする攻撃者
// 同じ登録フォームから来た2つの情報を、使い道に合わせて別々に守る。
//   住所     … 発送のときに中身が要る → 鍵で暗号化して保存し、倉庫で同じ鍵で復号する（戻せる）
//   パスワード … 本人かどうか照合できれば十分 → ハッシュ値だけ保存し、ログインのたびに入力をハッシュして比べる（戻さない）

export type MemberPhase = "register" | "store" | "ship" | "login" | "typo" | "leak";

export const ADDRESS = "東京都港区芝1-2-3";
export const PASSWORD = "spring123";
const KEY = 3;
export const ADDRESS_CIPHER = toyCipher(ADDRESS, KEY);
export const PASSWORD_HASH = hashHex(PASSWORD);

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

const PHONE: Vec3 = { x: 110, y: 350, z: 50 };
const WEB: Vec3 = { x: 300, y: 170, z: 0 };
const ENC: Vec3 = { x: 400, y: 110, z: 0 }; // 🔑 暗号化装置
const HASH: Vec3 = { x: 400, y: 240, z: 0 }; // ハッシュ関数
const DB: Vec3 = { x: 500, y: 170, z: 0 };
const SAFE: Vec3 = { x: 540, y: 262, z: 0 };
const WAREHOUSE: Vec3 = { x: 680, y: 350, z: 44 };
const ATTACKER: Vec3 = { x: 700, y: 110, z: 0 };

const T = 58; // 機器の上を通る高さ
const AT = {
  phone: up(PHONE, 30),
  web: up(WEB, 128),
  enc: up(ENC, 36),
  hash: up(HASH, 36),
  db: up(DB, 66),
  ware: up(WAREHOUSE, 24),
  thief: up(ATTACKER, 64),
};

const SHOTS: Record<MemberPhase, Camera> = {
  register: { yaw: -16, pitch: 54, zoom: 0.92, fx: 220, fy: 260, fz: 60 },
  store: { yaw: -18, pitch: 55, zoom: 1.08, fx: 410, fy: 180, fz: 50 },
  ship: { yaw: -22, pitch: 54, zoom: 0.94, fx: 610, fy: 280, fz: 50 },
  login: { yaw: -16, pitch: 54, zoom: 0.86, fx: 320, fy: 230, fz: 60 },
  typo: { yaw: -16, pitch: 54, zoom: 0.86, fx: 320, fy: 230, fz: 60 },
  leak: { yaw: -24, pitch: 56, zoom: 0.9, fx: 580, fy: 170, fz: 50 },
};

type Row = { addr: "none" | "cipher"; pass: "none" | "hash" };
const ROW: Record<MemberPhase, Row> = {
  register: { addr: "none", pass: "none" },
  store: { addr: "cipher", pass: "hash" },
  ship: { addr: "cipher", pass: "hash" },
  login: { addr: "cipher", pass: "hash" },
  typo: { addr: "cipher", pass: "hash" },
  leak: { addr: "cipher", pass: "hash" },
};

function tokensFor(phase: MemberPhase): Record<string, TokenSpec> {
  const none: TokenSpec = { at: null };
  switch (phase) {
    case "register":
      return {
        addr: { at: AT.web, start: AT.phone, path: [{ ...AT.web, z: T + 60 }, AT.web], restart: true },
        pass: { at: up(AT.web, 16), start: AT.phone, path: [{ ...AT.web, z: T + 76 }, up(AT.web, 16)], restart: true, delay: 350 },
        login: none,
        ship: none,
        loot: none,
      };
    case "store":
      return {
        addr: { at: AT.db, start: AT.web, path: [AT.enc, AT.db], restart: true },
        pass: { at: up(AT.db, 14), start: up(AT.web, 16), path: [AT.hash, up(AT.db, 14)], restart: true, delay: 300 },
        login: none,
        ship: none,
        loot: none,
      };
    case "ship":
      return {
        addr: { at: AT.db, jump: true },
        pass: { at: up(AT.db, 14), jump: true },
        login: none,
        ship: { at: AT.ware, start: AT.db, path: [up(AT.db, 30), { x: 620, y: 300, z: 90 }, AT.ware], restart: true },
        loot: none,
      };
    case "login":
    case "typo":
      return {
        addr: { at: AT.db, jump: true },
        pass: { at: up(AT.db, 14), jump: true },
        login: { at: AT.hash, start: AT.phone, path: [{ ...AT.web, z: T + 60 }, AT.web, AT.hash], restart: true },
        ship: none,
        loot: none,
      };
    case "leak":
      return {
        addr: { at: AT.db, jump: true },
        pass: { at: up(AT.db, 14), jump: true },
        login: none,
        ship: none,
        loot: { at: AT.thief, start: AT.db, path: [up(AT.db, 40), AT.thief], restart: true },
      };
  }
}

export function MemberSiteDioramaScene({
  phase,
  loginInput,
  reducedMotion,
}: {
  phase: MemberPhase;
  /** ログインで入力したパスワード（typo のとき1文字変えられる） */
  loginInput: string;
  reducedMotion: boolean;
}) {
  const row = ROW[phase];
  const loginHash = hashHex(loginInput);
  const match = loginHash === PASSWORD_HASH;
  const loggingIn = phase === "login" || phase === "typo";
  const addrTone: CarryTone = phase === "register" ? "plain" : "secure";
  const passTone: CarryTone = phase === "register" ? "plain" : "info";

  return (
    <DioramaStage
      testId="member-scene"
      ariaLabel="通販サイトの模型。左手前にあなたのスマホ、中央に通販会社のサーバ室（Webサーバ、鍵で暗号化する装置、ハッシュ関数、データベース、鍵の金庫）、右手前に発送倉庫、右奥に攻撃者"
      shot={SHOTS[phase]}
      shotKey={`${phase}-${phase === "typo" ? loginInput : ""}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-phase": phase }}
      tokens={tokensFor(phase)}
      corner={
        <span className={styles.plate} data-testid="member-plate">
          🛒 通販サイト「example-shop」
        </span>
      }
      world={
        <>
          <Floor x={-10} y={-20} w={840} d={480} h={16} material="concrete" />

          {/* ---------- あなたの部屋 ---------- */}
          <Floor x={10} y={270} w={200} d={170} h={6} z={6} material="wood" />
          <Group z={6}>
            <Desk x={PHONE.x} y={PHONE.y + 6} w={90} d={50} tone="wood" />
            <Phone x={PHONE.x} y={PHONE.y} z={44} scale={0.8} glow={phase === "register" || loggingIn} testId="member-phone" />
            <Person x={PHONE.x + 6} y={PHONE.y + 66} pose="sit" shirt="#4f86e8" />
            <Plant x={34} y={292} size={0.7} />
          </Group>

          {/* ---------- 通販会社のサーバ室 ---------- */}
          <Floor x={230} y={40} w={360} d={270} h={6} z={6} material="dc" />
          <Wall x={230} y={40} length={360} h={110} tone="dc" />
          <Group z={6}>
            <Group data={{ "data-node": "web" }}>
              <ServerRack x={WEB.x} y={WEB.y} state={phase === "register" || loggingIn ? "active" : "idle"} accent="#2f6fdb" />
            </Group>
            <Group data={{ "data-node": "enc" }}>
              <Appliance x={ENC.x} y={ENC.y} kind="vpn" stand={22} w={56} state={phase === "store" || phase === "ship" ? "active" : "idle"} />
            </Group>
            <Group data={{ "data-node": "hash" }}>
              <Appliance x={HASH.x} y={HASH.y} kind="gateway" stand={22} w={56} state={phase === "store" || loggingIn ? "active" : "idle"} />
            </Group>
            <Group data={{ "data-node": "db" }}>
              <Database x={DB.x} y={DB.y} r={24} state={phase === "leak" ? "error" : phase === "register" ? "idle" : "active"} testId="member-db" />
            </Group>
            <Safe x={SAFE.x} y={SAFE.y} w={44} h={50} state={phase === "leak" ? "active" : "idle"} testId="member-safe" />
            <Group x={SAFE.x} y={SAFE.y} z={64}>
              <KeyGlyph kind="common" size={0.9} />
            </Group>
          </Group>

          {/* ---------- 発送倉庫 ---------- */}
          <Floor x={600} y={280} w={210} d={160} h={6} z={6} material="concrete" />
          <Group z={6}>
            <Desk x={WAREHOUSE.x} y={WAREHOUSE.y} w={96} d={50} />
            <Box x={WAREHOUSE.x - 30} y={WAREHOUSE.y - 14} z={44} w={30} d={22} h={14} color="#e5e7eb" />
            {[0, 1, 2].map((i) => (
              <Box key={i} x={760} y={300 + i * 34} w={34} d={28} h={26 + (i % 2) * 18} color="#c8a276" />
            ))}
            <Person x={WAREHOUSE.x + 10} y={WAREHOUSE.y + 52} pose="back" shirt="#16a37a" />
          </Group>

          {/* ---------- 攻撃者（サーバ室の外） ---------- */}
          <Person x={ATTACKER.x} y={ATTACKER.y} pose="attacker" active={phase === "leak"} testId="member-attacker" />

          {/* ---------- 流れるデータ ---------- */}
          <DioramaToken id="addr">
            <Parcel tone={addrTone} mark={addrTone === "secure" ? "lock" : "none"} size={0.8} />
          </DioramaToken>
          <DioramaToken id="pass">
            <Parcel tone={passTone} size={0.7} />
          </DioramaToken>
          <DioramaToken id="login">
            <Parcel tone={phase === "typo" && !match ? "warn" : "plain"} size={0.7} />
          </DioramaToken>
          <DioramaToken id="ship">
            <Paper stamp="ok" />
          </DioramaToken>
          <DioramaToken id="loot">
            <Parcel tone="danger" mark="alert" size={0.8} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          {/* 主役の札（先に置いたものが優先） */}
          {phase === "register" && (
            <DioramaLabel at={up(PHONE, 64)} place="above">
              <div className={styles.form} data-testid="member-form">
                <span className={styles.formTitle}>会員登録</span>
                <span className={styles.field}>
                  <i>住所</i>
                  {ADDRESS}
                </span>
                <span className={styles.field}>
                  <i>パスワード</i>
                  {PASSWORD}
                </span>
              </div>
            </DioramaLabel>
          )}

          {row.addr !== "none" && (
            <DioramaLabel at={up(DB, 70)} place={phase === "leak" ? "left" : "above"} pinned>
              <div className={styles.table} data-testid="member-db-row" data-leaked={phase === "leak" ? "true" : "false"}>
                <span className={styles.tableTitle}>{phase === "leak" ? "😈 盗まれた会員データベース" : "会員データベース（保存される中身）"}</span>
                <span className={styles.cell}>
                  <i>住所</i>
                  <b data-kind="cipher">🔒 {ADDRESS_CIPHER}</b>
                </span>
                <span className={styles.cell}>
                  <i>パスワード</i>
                  <b data-kind="hash">{PASSWORD_HASH}</b>
                </span>
                {phase === "store" && <span className={styles.tableNote}>元の住所・パスワードは、どこにも保存しない</span>}
              </div>
            </DioramaLabel>
          )}

          {phase === "store" && (
            <>
              <DioramaLabel at={up(ENC, 44)} place="above">
                <span className={styles.gate} data-kind="enc">
                  🔑 住所 → 鍵で暗号化
                </span>
              </DioramaLabel>
              <DioramaLabel at={up(HASH, 0)} place="below">
                <span className={styles.gate} data-kind="hash">
                  パスワード → ハッシュ関数
                </span>
              </DioramaLabel>
            </>
          )}

          {phase === "ship" && (
            <DioramaLabel at={up(WAREHOUSE, 76)} place="above">
              <div className={styles.label} data-testid="member-ship">
                <span className={styles.labelHead}>🔑 同じ鍵で復号 → 送り状</span>
                <span className={styles.labelBody}>お届け先：{ADDRESS}</span>
              </div>
            </DioramaLabel>
          )}

          {loggingIn && (
            <DioramaLabel at={up(HASH, 50)} place="left">
              <div className={styles.compare} data-match={match ? "true" : "false"} data-testid="member-compare">
                <span className={styles.compareTitle}>ログイン：入力をハッシュして比べる</span>
                <span className={styles.compareRow}>
                  <i>入力「{loginInput}」</i>
                  <b>{loginHash}</b>
                </span>
                <span className={styles.compareRow}>
                  <i>保存してある値</i>
                  <b>{PASSWORD_HASH}</b>
                </span>
                <span className={styles.compareVerdict}>{match ? "✓ 一致 → 本人としてログイン" : "✕ 不一致 → ログインできない"}</span>
              </div>
            </DioramaLabel>
          )}

          {phase === "leak" && (
            <DioramaLabel at={up(ATTACKER, 120)} place="above" pinned>
              <div data-testid="member-leak">
                <Callout
                  tone="ok"
                  title="😈 攻撃者の手元"
                  body="住所は暗号文、パスワードはハッシュ値"
                  verdict="鍵は金庫の中・ハッシュは戻せない"
                  role="status"
                />
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel at={up(PHONE, 10)} place="left" optional>
            <NameChip name="あなた" sub="スマホで登録" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={up(WEB, 124)} place="above" optional>
            <NameChip name="Webサーバ" tone="muted" />
          </DioramaLabel>
          {phase !== "store" && (
            <DioramaLabel at={up(ENC, 40)} place="above" optional>
              <NameChip name="🔑 暗号化" sub="鍵を使う" tone="muted" />
            </DioramaLabel>
          )}
          {phase !== "store" && !loggingIn && (
            <DioramaLabel at={up(HASH, 0)} place="below" optional>
              <NameChip name="ハッシュ関数" sub="鍵は使わない" tone="muted" />
            </DioramaLabel>
          )}
          <DioramaLabel at={up(DB, 60)} place="above" optional>
            <NameChip name="データベース" sub="会員情報" tone={phase === "leak" ? "danger" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(SAFE, 0)} place="below" optional>
            <NameChip name="鍵の金庫" sub="DBとは別に保管" tone="warn" />
          </DioramaLabel>
          <DioramaLabel at={up(WAREHOUSE, 0)} place="below" optional>
            <NameChip name="発送倉庫" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={up(ATTACKER, 116)} place="above" optional>
            <NameChip name="攻撃者" tone="danger" />
          </DioramaLabel>
        </>
      }
    />
  );
}
