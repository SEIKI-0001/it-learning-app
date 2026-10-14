import Link from "next/link";
import Icon from "@/components/ui/Icon";
import styles from "./quest.module.css";

export default function QuestHeader({ progress = false }: { progress?: boolean }) {
  return <header className={styles.header}>
    <Link href="/netlab/quest" className={styles.brand}><span className={styles.brandIcon}><Icon name="globe" /></span><span>ネットワーク<span className={styles.brandAccent}>冒険ラボ</span><small>IT PASSPORT LEARNING LAB</small></span></Link>
    <nav aria-label="メインナビゲーション">
      <Link href="/netlab/quest#adventure-map">冒険マップ</Link>
      <Link href="/netlab/quest/progress" aria-current={progress ? "page" : undefined}><Icon name="chart" /> 学習の記録</Link>
    </nav>
  </header>;
}
