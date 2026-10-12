import type { DnsLookup } from "./dnsTypes";
import styles from "./dnsdiorama.module.css";

// DNSサーバが持つ「名前 → IPアドレス」の対応表。問い合わせが届いた場面で DNS の横に出し、
// example.com の行を探し当てて IPアドレスに変換する様子を見せる（2.5D・3D の両方で使う）。

const ROWS = [
  { name: "sample.jp", ip: "203.0.113.80" },
  { name: "example.com", ip: "93.184.216.34", hit: true },
  { name: "test.jp", ip: "198.51.100.7" },
];

export function DnsLookupTable({ state }: { state: DnsLookup }) {
  const found = state === "found";
  return (
    <div className={styles.lookup} data-testid="dns-lookup" data-state={state}>
      <p className={styles.lookupTitle} aria-live="polite">
        {found ? "DNSの対応表：見つけた → 変換" : "DNSの対応表：example.com を探す…"}
      </p>
      <ul className={styles.lookupRows}>
        {ROWS.map((row) => (
          <li key={row.name} className={styles.lookupRow} data-hit={row.hit ? "true" : undefined}>
            <span className={styles.lookupName}>{row.name}</span>
            <span aria-hidden className={styles.lookupArrow}>→</span>
            <span className={styles.lookupIp}>{row.ip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
