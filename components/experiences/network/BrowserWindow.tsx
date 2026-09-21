import styles from "./network.module.css";

// 最終段: 受け取ったデータをブラウザが組み立てて表示した「画面」。
// ノートPCの上に、少し手前へ傾いたウィンドウとして浮かせる。

export function BrowserWindow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div
      className={styles.browser}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="browser-window"
      role="img"
      aria-label="ブラウザに example.com のページが表示された画面"
    >
      <div className={styles.browserInner}>
        <div className={styles.browserBar}>
          <span className={styles.browserDots} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.browserUrl}>example.com</span>
        </div>
        <div className={styles.browserPage} aria-hidden>
          <span className={styles.browserHero} />
          <span className={styles.browserTitle}>Example Domain</span>
          <span className={styles.browserLine} />
          <span className={`${styles.browserLine} ${styles.browserLineShort}`} />
        </div>
      </div>
      <span className={styles.browserTail} aria-hidden />
    </div>
  );
}
