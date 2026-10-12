import type { Metadata } from "next";
import Link from "next/link";
import s from "./experiment.module.css";

export const metadata: Metadata = {
  title: "あなたに合う始め方｜資格もちっと",
};
export default function ExperimentsPage() {
  return (
    <main className={s.index}>
      <p className={s.eyebrow}>資格もちっと / YOUR NEXT STEP</p>
      <h1>
        新しい入口、
        <br />
        2つのアプローチ。
      </h1>
      <p>ITパスポートの学習を始める、ふたつのきっかけ。</p>
      <div className={s.indexGrid}>
        <Link href="/lp/lab/fifteen" className={s.indexFifteen}>
          <span>01 / SMALL DAILY STEPS</span>
          <h2>
            仕事終わりも、
            <br />
            学校帰りも。
            <br />
            まずは、15分。
          </h2>
          <p>忙しい毎日に、小さな学習習慣を。</p>
          <strong>15分から始めるLPを見る ↗</strong>
        </Link>
        <Link href="/lp/lab/retry" className={s.indexRetry}>
          <span>02 / YOUR NEXT CHAPTER</span>
          <h2>
            前回の勉強を、
            <br />
            次の一歩に。
          </h2>
          <p>一度不合格になった人の、再挑戦を支える。</p>
          <strong>再挑戦のLPを見る ↗</strong>
        </Link>
      </div>
      <p className={s.micro}>
        サービスの詳しい内容はこちら。<Link href="/lp">既存LPを見る ↗</Link>
      </p>
    </main>
  );
}
