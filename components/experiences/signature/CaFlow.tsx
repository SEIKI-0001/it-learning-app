import type { CSSProperties } from "react";
import { KeyGlyph } from "../crypto/KeyToken";
import styles from "./ca.module.css";

// 認証局(CA)の流れを1本の台の上に並べた模型：本人 → CA → 電子証明書 → 利用者。
// 公開鍵トークンが台の上を移動し、CA を通ると「証明書の枠」と CA の印が付く。
// 偽者が申請した場合は CA の本人確認で止まり、利用者の手元には証明書が届かない。

export type CaStation = "owner" | "ca" | "cert" | "user";
export const CA_STATIONS: CaStation[] = ["owner", "ca", "cert", "user"];

const STATION: Record<CaStation, { icon: string; name: string }> = {
  owner: { icon: "🙋", name: "本人" },
  ca: { icon: "🏛️", name: "認証局(CA)" },
  cert: { icon: "📜", name: "電子証明書" },
  user: { icon: "🧑‍💻", name: "利用者" },
};

export type CaFlowView = {
  /** トークンが今いる駅 */
  at: CaStation;
  applicant: "real" | "fake";
  /** CA の判定（null=まだ） */
  check: "pass" | "reject" | null;
  certified: boolean;
  /** 利用者の判断（null=まだ） */
  userVerdict: "trust" | "reject" | null;
  active: CaStation[];
};

export function CaFlow({ view, reducedMotion }: { view: CaFlowView; reducedMotion: boolean }) {
  const index = CA_STATIONS.indexOf(view.at);
  const fake = view.applicant === "fake";
  return (
    <div className={styles.stage} data-reduced-motion={reducedMotion ? "true" : "false"} data-applicant={view.applicant} data-testid="ca-flow">
      <div className={styles.deck} aria-hidden />
      <ol className={styles.stations}>
        {CA_STATIONS.map((id) => (
          <li
            key={id}
            className={styles.station}
            data-station={id}
            data-active={view.active.includes(id) ? "true" : "false"}
            data-rejected={(id === "ca" && view.check === "reject") || (id === "user" && view.userVerdict === "reject") ? "true" : "false"}
          >
            <span className={styles.plinth}>
              <span className={styles.icon}>{id === "owner" && fake ? "🎭" : STATION[id].icon}</span>
            </span>
            <span className={styles.name}>{id === "owner" && fake ? "偽者" : STATION[id].name}</span>
            {id === "ca" && view.check && (
              <span className={styles.badge} data-tone={view.check === "pass" ? "ok" : "ng"} data-testid="ca-check">
                {view.check === "pass" ? "本人確認 ✓" : "本人確認 ✗"}
              </span>
            )}
            {id === "user" && view.userVerdict && (
              <span className={styles.badge} data-tone={view.userVerdict === "trust" ? "ok" : "ng"} data-testid="ca-user-verdict">
                {view.userVerdict === "trust" ? "本物と確認 ✓" : "信用しない ✗"}
              </span>
            )}
          </li>
        ))}
      </ol>
      <div
        className={styles.token}
        style={{ "--i": index } as CSSProperties}
        data-at={view.at}
        data-certified={view.certified ? "true" : "false"}
        data-testid="ca-token"
        role="img"
        aria-label={`${fake ? "偽者が「山田さんの公開鍵」と称する鍵" : "山田さんの公開鍵"}${view.certified ? "（CAの電子証明書つき）" : ""}`}
      >
        <span className={styles.tokenBody}>
          <KeyGlyph kind="public" owner={fake ? "X" : "Y"} />
          <span className={styles.tokenText}>
            <span>{view.certified ? "山田の公開鍵" : "山田の公開鍵？"}</span>
            {view.certified && <span className={styles.caSeal}>CA印</span>}
          </span>
        </span>
      </div>
    </div>
  );
}
