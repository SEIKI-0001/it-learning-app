import Link from 'next/link';
import { GUIDE_FACTS, toHours } from '@/lib/guide/facts';
import { getWordlistCount } from '@/lib/wordlist';
import { MOCK_EXAM_RULE } from '@/lib/mockExam';
import { BILLING_PLANS, DAILY_LIMITS, FREE_RECORDING_DAYS } from '@/lib/billing/constants';
import { ph } from '../ph';

// ============================================================================
// 切り口別LP（/lp/lab・/lp/lab/fifteen・/lp/lab/retry）の共通部品。
// 見た目は /lp と同じ lp.css に乗せ、足りない部品だけ lab.css（.lp スコープ・lb- 接頭辞）に置く。
// 数字は /lp と同じく教材データと課金定数から読む（ベタ書きしない）。
// ============================================================================

export type Campaign = 'fifteen' | 'retry';

export const N = {
  topics: GUIDE_FACTS.topicCount,
  checkQuestions: GUIDE_FACTS.checkQuestionCount,
  official: GUIDE_FACTS.officialQuestionCount,
  officialRange: GUIDE_FACTS.officialYearRange,
  words: getWordlistCount(),
  mock: MOCK_EXAM_RULE.questionCount,
  freeDays: FREE_RECORDING_DAYS,
  freeGrading: DAILY_LIMITS.free,
  proGrading: DAILY_LIMITS.pro,
  lowestPrice: Math.min(...BILLING_PLANS.map((p) => p.totalJpy)),
  requiredHours: toHours(GUIDE_FACTS.plannerRequiredMinutes),
  /** 再受験・あと一歩（インプット済みで、確認問題の回し直しと過去問だけが残る場合）の上限。 */
  retryHours: toHours(GUIDE_FACTS.reviewMinutes + GUIDE_FACTS.kakomonMinutes),
  studyAmounts: GUIDE_FACTS.studyAmountOptions,
  comebackDays: GUIDE_FACTS.comebackDaysAway,
  comebackMinutes: GUIDE_FACTS.comebackMinutes,
  reviewIntervals: GUIDE_FACTS.reviewIntervalDays,
  fieldDrill: GUIDE_FACTS.fieldDrillTarget,
};

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

// 流入元の記録はフル遷移時にルートで拾うので、Link ではなく <a> で UTM を付けて渡す。
const utm = (c: Campaign) => `utm_source=lp_lab&utm_medium=landing&utm_campaign=${c}`;
export const tryHref = (c: Campaign) => `/lp/try?${utm(c)}`;
export const startHref = (c: Campaign) => `/login?${utm(c)}`;

export function Check() {
  return (
    <svg className="ck" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function Marked({ children }: { children: React.ReactNode }) {
  return (
    <span className="marked">
      {children}
      <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="none">
        <ellipse cx="50" cy="20" rx="48" ry="17" pathLength="100" />
      </svg>
    </span>
  );
}

export function LabHeader({
  campaign,
  nav,
}: {
  campaign?: Campaign;
  nav?: { href: string; label: string }[];
}) {
  return (
    <header className="top">
      <div className="col top-in">
        <a className="logo" href="/lp">
          ITパスポート学習コーチ
        </a>
        {nav && (
          <nav className="top-nav" aria-label="ページ内">
            {nav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
        )}
        <a className="btn small lb-top-cta" href={campaign ? startHref(campaign) : '/login'}>
          無料で始める
        </a>
      </div>
    </header>
  );
}

export function LabFooter() {
  return (
    <footer>
      <div className="col foot-in">
        <div className="foot-brand">
          <p className="logo">ITパスポート学習コーチ</p>
          <p>さわって理解する、ITパスポート試験の学習アプリ。</p>
        </div>
        <nav className="foot-nav" aria-label="無料で読める解説">
          <p className="foot-h">無料で読める解説</p>
          <a href="/guide">ITパスポート学習ガイド</a>
          <Link href="/kaisetsu">テーマ別解説</Link>
          <Link href="/kakomon">過去問解説</Link>
          <Link href="/words">英略語一覧</Link>
        </nav>
        <nav className="foot-nav" aria-label="サービス">
          <p className="foot-h">サービス</p>
          <a href="/lp">サービス紹介</a>
          <a href="/lp/lab">ほかの始め方</a>
          <a href="/login">ログイン / 無料登録</a>
          <a href="/legal/tokusho">{ph('特定商取引法に|基づく表示')}</a>
          <a href="/privacy">プライバシーポリシー</a>
        </nav>
      </div>
    </footer>
  );
}

/** /lp と同じ収録数グリッド。 */
export function Stats() {
  const items = [
    { value: N.topics, unit: 'トピック', label: '操作して学ぶ教材' },
    { value: N.official, unit: '問', label: `公式過去問|（${N.officialRange}）` },
    { value: N.checkQuestions, unit: '問', label: 'トピックごとの|確認問題' },
    { value: N.words, unit: '語', label: '英略語の単語帳' },
  ];
  return (
    <div className="col">
      <dl className="stats" aria-label="収録内容">
        {items.map((s) => (
          <div key={s.label}>
            <dt>{ph(s.label)}</dt>
            <dd>
              {s.value.toLocaleString('ja-JP')}
              <small>{s.unit}</small>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** 料金の要点（無料／Pro の2段）。プランごとの価格は /lp#price に任せる。 */
export function PriceBrief({ title }: { title: string }) {
  return (
    <section id="price">
      <div className="col reveal">
        <p className="eyebrow">料金と、無料で使える範囲</p>
        <h2 className="sec-title">{ph(title)}</h2>
        <div className="tiers">
          <div className="tier">
            <p className="tier-name">無料のまま使えるもの</p>
            <p className="tier-price">
              ¥0<small>・カード登録不要</small>
            </p>
            <ul>
              <li>
                <Check />
                <span>{ph(`全${N.topics}トピックの|体験教材と解説`)}</span>
              </li>
              <li>
                <Check />
                <span>{ph(`公式過去問${N.official}問|（独自解説付き）`)}</span>
              </li>
              <li>
                <Check />
                AI採点 1日{N.freeGrading}回
              </li>
              <li>
                <Check />
                <span>
                  <span className="ph">学習記録の保存は</span>
                  <b className="ph">登録から{N.freeDays}日間</b>
                </span>
              </li>
            </ul>
          </div>
          <div className="tier pro">
            <p className="tier-name">Proで増えること</p>
            <p className="tier-price">
              {yen(N.lowestPrice)}
              <small>から</small>
            </p>
            <ul>
              <li>
                <Check />
                学習記録を期間中ずっと保存
              </li>
              <li>
                <Check />
                <span>{ph('記録が合格準備度と|毎日の計画に|反映され続ける')}</span>
              </li>
              <li>
                <Check />
                <span>{ph(`AI採点が高精度の|Pro採点に|（1日${N.proGrading}回）`)}</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="pay-note">
          <b>買い切りプランに自動更新はありません。</b>
          期間が終わると無料の状態に戻るだけです。プランごとの価格は
          <a href="/lp#price">料金ページ</a>で確認できます。
        </p>
      </div>
    </section>
  );
}

/** FAQ。a は [前半, 太字, 後半]、q の「|」は折り返し位置。 */
export function LabFaq({ items }: { items: { q: string; a: [string, string, string] }[] }) {
  return (
    <section className="wash" id="faq">
      <div className="narrow reveal">
        <p className="eyebrow">よくある質問</p>
        <h2 className="sec-title">{ph('はじめる前に、|気になっていること。')}</h2>
        <div className="faq">
          {items.map(({ q, a: [before, bold, after] }) => (
            <details key={q}>
              <summary>
                <span>{ph(q)}</span>
              </summary>
              <p className="a">
                {before}
                <b>{bold}</b>
                {after}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LastPanel({
  campaign,
  title,
  lead,
  tryLabel,
}: {
  campaign: Campaign;
  title: string;
  lead: string;
  tryLabel: string;
}) {
  return (
    <section className="last">
      <div className="col">
        <div className="last-panel reveal">
          <h2>{ph(title)}</h2>
          <p>{ph(lead)}</p>
          <div className="last-cta">
            <a className="btn on-dark" href={tryHref(campaign)}>
              {tryLabel}
            </a>
            <a className="btn line" href={startHref(campaign)}>
              {N.freeDays}日間無料で始める
            </a>
          </div>
          <span className="last-note">
            {ph('教材体験は登録不要・|クレジットカード不要・|GoogleかLINEで登録')}
          </span>
        </div>
      </div>
    </section>
  );
}
