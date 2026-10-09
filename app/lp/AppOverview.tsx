import Link from 'next/link';
import { GUIDE_FACTS } from '@/lib/guide/facts';
import { BILLING_PLANS, DAILY_LIMITS, FREE_RECORDING_DAYS } from '@/lib/billing/constants';

const monthly = BILLING_PLANS.find((plan) => plan.key === 'sub_monthly')!;

/** 検討に必要な情報を、ログイン・JavaScriptなしでも読める本文にする。 */
export default function AppOverview() {
  return (
    <section className="app-overview" aria-labelledby="app-overview-title">
      <div className="col">
        <p className="eyebrow">機能と無料範囲をひと目で</p>
        <h2 id="app-overview-title" className="sec-title">ITパスポート学習コーチは無料でどこまで使える？</h2>
        <p className="sec-lead">
          ITパスポート学習コーチ（資格もちっと）は、操作して理解する教材・公式過去問・学習計画をまとめたブラウザ学習アプリです。
          教材と過去問は無料で使えます。学習記録を保存できる期間と、AI採点の回数にはプランごとの違いがあります。
        </p>
        <dl className="app-facts">
          <div><dt>無料の教材</dt><dd>全{GUIDE_FACTS.topicCount}トピックの体験教材・解説と、公式過去問{GUIDE_FACTS.officialQuestionCount}問（{GUIDE_FACTS.officialYearRange}、独自解説付き）。</dd></div>
          <div><dt>学習記録・AI採点</dt><dd>学習記録の保存は登録から{FREE_RECORDING_DAYS}日間無料。無料プランのAI採点は1日{DAILY_LIMITS.free}回です。</dd></div>
          <div><dt>Proの料金と違い</dt><dd>月額{monthly.totalJpy.toLocaleString('ja-JP')}円。期間中の学習記録保存と1日{DAILY_LIMITS.pro}回のPro採点が使えます。期間を選ぶ買い切りプランもあります。<a href="#price">料金の詳細を見る</a></dd></div>
          <div><dt>使える端末・始め方</dt><dd>スマホ・PCのブラウザで利用でき、インストール不要。<Link href="/lp/try">AND・ORの教材体験</Link>と<Link href="/kakomon">公開過去問の解説</Link>は登録なしで確認できます。</dd></div>
        </dl>
        <p className="app-guide-link">
          自分に合う勉強アプリを探している方へ：<Link href="/guide/it-passport-app">ITパスポートアプリの選び方と無料範囲の確認方法</Link>
        </p>
      </div>
    </section>
  );
}
