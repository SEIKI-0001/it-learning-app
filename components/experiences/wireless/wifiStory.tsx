import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import styles from "./wifidiorama.module.css";

// 無線LAN の図解の中身（2.5D の模型 WifiDioramaScene と 3D の WifiScene3D で共通）。
//   一言・Wi-Fi の一覧・データの札・盗聴者の画面は、どちらの模型でも同じ文言と見た目にする。

export type WifiMode = "open" | "wpa" | "wired";
export type WifiPhase = "connect" | "send" | "arrive";
/** 一言が指す相手：あなたのノートPC／アクセスポイント／盗聴者 */
export type WifiFocus = "you" | "ap" | "eve";

export type WifiSceneProps = {
  mode: WifiMode;
  phase: WifiPhase;
  /** 前へ進んだ直後か（戻る・飛ばすときは小包を瞬間移動させる） */
  forward: boolean;
  reducedMotion: boolean;
};

export const SECRET = "id=tanaka&pass=spring123";
export const CIPHER = "8f#2a@Qx$9Lw&X9q…";

export const SSIDS: { name: string; lock: "open" | "wpa"; ours?: boolean }[] = [
  { name: "cafe-wifi-2F", lock: "open", ours: true },
  { name: "Free_WiFi", lock: "open" },
  { name: "aterm-3f9a2b", lock: "wpa" },
];

/** いまつなぐ SSID の鍵（同じ名前のまま、モードで鍵だけ変わる） */
export function ssidLock(s: (typeof SSIDS)[number], mode: WifiMode) {
  return s.ours ? (mode === "wpa" ? "wpa" : "open") : s.lock;
}

// 一言（40字以内）。mode × phase ごと
export const WIFI_CAPTION: Record<WifiMode, Record<WifiPhase, { text: ReactNode; tone: "info" | "ok" | "danger"; focus: WifiFocus }>> = {
  open: {
    connect: { text: <>同じ<b>SSID</b>でも暗号化なしがある。鍵マークで見分ける</>, tone: "info", focus: "you" },
    send: { text: <>電波は周り全部へ広がり、店の外まで届く。<b>暗号化なし</b></>, tone: "danger", focus: "you" },
    arrive: { text: <>盗聴者にも同じ電波が届き、<b>ID/PASS</b>が丸見え</>, tone: "danger", focus: "eve" },
  },
  wpa: {
    connect: { text: <><b>SSID</b>は電波の名前。鍵マークは WPA2/WPA3 の暗号化</>, tone: "info", focus: "you" },
    send: { text: <>電波は店の外まで届くが、送る前に<b>暗号化</b>してある</>, tone: "info", focus: "you" },
    arrive: { text: <>受信はされても<b>暗号文</b>で読めない。守るのは暗号化</>, tone: "ok", focus: "eve" },
  },
  wired: {
    connect: { text: <>比較のため、PCとアクセスポイントを<b>ケーブル</b>でつなぐ</>, tone: "info", focus: "you" },
    send: { text: <>データは<b>ケーブルの中だけ</b>を通って向かう</>, tone: "info", focus: "you" },
    arrive: { text: <>盗聴者には<b>何も届かない</b>。電波が出ていないから</>, tone: "ok", focus: "ap" },
  },
};

/** 小包の色。暗号化あり＝緑、暗号化なしの電波＝赤、ケーブル＝ふつう */
export function packetTone(mode: WifiMode) {
  return mode === "wpa" ? "secure" : mode === "open" ? "danger" : "plain";
}

const lockIcon = <Icon name="lock" className="mr-0.5 inline-block h-3 w-3 align-[-1px]" />;

/** 右上（3D は右下）の札：いまつないでいる SSID と、鍵の有無（別々の札） */
export function SsidPlate({ mode }: { mode: WifiMode }) {
  return (
    <span className={styles.ssidPlate} data-lock={mode} data-testid="wifi-ssid">
      <span className={styles.ssidName}>cafe-wifi-2F</span>
      <span className={styles.ssidLock}>{mode === "wired" ? "有線LAN" : mode === "wpa" ? <>{lockIcon}WPA2/WPA3</> : "暗号化なし"}</span>
    </span>
  );
}

/** ノートPCの Wi-Fi 一覧（① つなぐ） */
export function WifiListCard({ mode }: { mode: WifiMode }) {
  return (
    <div className={styles.wifiList} data-testid="wifi-list">
      <span className={styles.wifiListTitle}>ノートPCの Wi-Fi 一覧</span>
      {SSIDS.map((s) => {
        const lock = ssidLock(s, mode);
        const picked = !!s.ours && mode !== "wired";
        return (
          <span key={s.name} className={styles.wifiRow} data-picked={picked ? "true" : "false"}>
            <span className={styles.wifiName}>{s.name}</span>
            <span className={styles.wifiLock} data-lock={lock}>
              {lock === "wpa" ? <>{lockIcon}WPA2/3</> : "鍵なし"}
            </span>
          </span>
        );
      })}
      {mode === "wired" && <span className={styles.wifiWired}>今回は Wi-Fi を使わず LANケーブル</span>}
    </div>
  );
}

/** 運んでいるデータの中身 */
export function WifiDataTag({ mode }: { mode: WifiMode }) {
  const encrypted = mode === "wpa";
  return (
    <div className={styles.dataTag} data-tone={packetTone(mode)} role="img" aria-label={encrypted ? "暗号化されたデータ" : `暗号化されていないデータ：${SECRET}`}>
      <span className={styles.dataTagHead}>{encrypted ? <>{lockIcon}WPA2/WPA3 で暗号化</> : mode === "open" ? "暗号化なし" : "ケーブルの中"}</span>
      <span className={styles.dataTagBody}>{encrypted ? CIPHER : SECRET}</span>
    </div>
  );
}

/** 盗聴者のノートPCに届いたもの（③ 届いた先） */
export function EveScreen({ mode }: { mode: WifiMode }) {
  const wireless = mode !== "wired";
  return (
    <div
      className={styles.eveScreen}
      data-testid="wifi-eve"
      data-reads={mode === "open" ? "true" : "false"}
      data-gets={wireless ? "true" : "false"}
      data-mode={mode}
      role="status"
    >
      <span className={styles.eveTitle}>盗聴者のノートPC（受信した電波）</span>
      {!wireless ? (
        <span className={styles.eveNothing}>何も届かない（電波が出ていない）</span>
      ) : mode === "wpa" ? (
        <span className={styles.eveLine}>{CIPHER}</span>
      ) : (
        <>
          <span className={styles.eveLine}>POST /login</span>
          <span className={styles.eveLine} data-secret>
            id=tanaka
            <br />
            pass=spring123
          </span>
        </>
      )}
    </div>
  );
}
