import type { Metadata } from 'next';
import { ph } from '../ph';
import { LabFooter, LabHeader } from './Shared';
import '../lp.css';
import './lab.css';

export const metadata: Metadata = {
  title: 'あなたに合う始め方｜ITパスポート学習コーチ',
};

const ENTRIES = [
  {
    href: '/lp/lab/fifteen',
    k: '01 忙しい毎日に',
    title: '仕事終わりも、|学校帰りも。|まずは15分から。',
    body: 'まとまった時間がなくても、今日の分が終わるように。小さな学習習慣から始めたい人へ。',
    cta: '15分から始める',
  },
  {
    href: '/lp/lab/retry',
    k: '02 もう一度挑む人へ',
    title: '前回の勉強を、|次の一歩に。',
    body: '一度不合格になった人の再挑戦を、届かなかったところから埋める進め方で支えます。',
    cta: '再挑戦の進め方を見る',
  },
];

export default function LabIndexPage() {
  return (
    <div className="lp lb">
      <LabHeader />
      <main id="top">
        <section className="hero lb-index">
          <div className="col">
            <h1>
              <span className="eyebrow">ITパスポートの始め方</span>
              {ph('あなたに合う|始め方を。')}
            </h1>
            <p className="hero-lead">ITパスポートの学習を始める、ふたつのきっかけ。</p>
            <div className="lb-entries">
              {ENTRIES.map((e) => (
                <a key={e.href} className="lb-entry" href={e.href}>
                  <span className="lb-entry-k">{e.k}</span>
                  <h2>{ph(e.title)}</h2>
                  <p>{e.body}</p>
                  <span className="more">{e.cta}</span>
                </a>
              ))}
            </div>
            <p className="pain-note">
              サービス全体の紹介は<a href="/lp">こちら</a>。
            </p>
          </div>
        </section>
      </main>
      <LabFooter />
    </div>
  );
}
