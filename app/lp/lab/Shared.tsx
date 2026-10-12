import Link from "next/link";
import { FREE_RECORDING_DAYS } from "@/lib/billing/constants";
import s from "./experiment.module.css";

export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export function Header({ retry = false }: { retry?: boolean }) {
  return (
    <header className={s.header}>
      <Link href="/lp" className={s.brand}>
        <span className={s.brandMark} aria-hidden="true">
          m.
        </span>
        <span>
          資格もちっと<small>ITパスポート学習コーチ</small>
        </span>
      </Link>
      <nav aria-label="ページ内メニュー">
        <a href="#how">{retry ? "再挑戦の進め方" : "15分の使い方"}</a>
        <a href="#start" className={s.navCta}>
          無料で体験 <Arrow />
        </a>
      </nav>
    </header>
  );
}

export function TrialLink({
  retry = false,
  children,
}: {
  retry?: boolean;
  children?: React.ReactNode;
}) {
  // Full navigation lets the root attribution capture observe the campaign query.
  return (
    <a
      className={s.button}
      href={`/lp/try?utm_source=lp_lab&utm_medium=landing&utm_campaign=${retry ? "retry" : "fifteen"}`}
    >
      {children ??
        (retry ? "もう一度、1問から始める" : "まずは、無料で体験してみる")}
      <Arrow />
    </a>
  );
}

export function Footer() {
  return (
    <footer className={s.footer}>
      <div>
        <strong>資格もちっと</strong>
        <p>今日の「わかった」を、明日の自信に。</p>
      </div>
      <div className={s.footerLinks}>
        <Link href="/lp#price">料金・無料で使える範囲</Link>
        <Link href="/privacy">プライバシー</Link>
        <Link href="/legal/tokusho">特定商取引法に基づく表示</Link>
        <Link href="/lp/lab">ほかの始め方</Link>
      </div>
      <small>© 資格もちっと</small>
    </footer>
  );
}

export function StartSection({ retry = false }: { retry?: boolean }) {
  return (
    <section id="start" className={s.start} aria-labelledby="start-heading">
      <p className={s.eyebrow}>
        {retry ? "YOUR NEXT CHAPTER" : "A LITTLE TIME, A NEW START"}
      </p>
      <h2 id="start-heading">
        {retry ? (
          <>
            次の一歩は、
            <br />
            小さくていい。
          </>
        ) : (
          <>
            今日の15分が、
            <br />
            明日の自分につながる。
          </>
        )}
      </h2>
      <p>
        {retry
          ? "前回の結果はいったん置いて。今日はひとつ、わかるを増やそう。"
          : "まとまった時間ができるのを待たずに。まずはひとつ、さわってみよう。"}
      </p>
      <TrialLink retry={retry} />
      <p className={s.micro}>登録不要・クレジットカード不要の教材体験</p>
      <div className={s.freeNote}>
        教材と公式過去問は無料。登録後の学習記録の保存は最初の
        {FREE_RECORDING_DAYS}日間無料です。
        <br />
        その後も記録を保存し続ける場合は、有料プランを選べます。
        <Link href="/lp#price">料金を見る ↗</Link>
      </div>
    </section>
  );
}

export function Faq({ retry = false }: { retry?: boolean }) {
  const items = retry
    ? [
        [
          "前回の勉強を、最初からやり直す必要はありますか？",
          "すべてを同じ量でやり直す必要はありません。過去問で今の理解を確かめ、迷ったテーマの教材を見直すところから始められます。",
        ],
        [
          "試験日がまだ決まっていなくても体験できますか？",
          "はい。この教材体験は試験日を決めずに、登録なしで使えます。まずは学び方が合うか、試してみてください。",
        ],
        [
          "このアプリを使えば次は合格できますか？",
          "合格を保証するものではありません。必要な学習時間は理解度や試験日によって変わります。理解の確認、復習、演習を重ねるための道具として使ってください。",
        ],
      ]
    : [
        [
          "1日15分だけで合格できますか？",
          "15分は学習を始めるための目安です。合格までに必要な時間は、今の理解度や試験日によって異なります。試験日から計画を立て、必要に応じて学習量を調整しましょう。",
        ],
        [
          "疲れていて、15分もできない日は？",
          "そんな日は1問だけでも。アプリでは、その日の学習時間を短くしたり、遅れた計画を立て直したりできます。翌日からまた始めましょう。",
        ],
        [
          "スマホだけで使えますか？",
          "はい。スマホのブラウザでそのまま使えるので、インストールは不要です。教材体験は登録せずに始められます。",
        ],
      ];
  return (
    <section className={s.faq} aria-labelledby="faq-heading">
      <p className={s.eyebrow}>BEFORE YOU START</p>
      <h2 id="faq-heading">気になっていること。</h2>
      <div>
        {items.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">＋</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
