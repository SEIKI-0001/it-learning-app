import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// ISMS解説で、過去問の出題に合わせて足したパネル群。すべて操作不要の静的な図（ボタンを置かない）。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

// ① 脅威・脆弱性・リスク ＋ アセスメント3段階 -------------------------------------
const TERMS = [
  { term: "情報資産", def: "守るべき情報やそれを扱う機器", ex: "顧客名簿・サーバ" },
  { term: "脅威", def: "情報資産に損害を与える原因になるもの", ex: "不正アクセス・地震・置き忘れ" },
  { term: "脆弱性", def: "脅威につけ込まれる弱点", ex: "更新していないソフト・施錠しない部屋" },
  { term: "リスク", def: "脅威が脆弱性を突いて損害が出る可能性", ex: "発生可能性 × 影響度で見積もる" },
];

const ASSESS = [
  { step: "リスク特定", what: "どんなリスクがあるか洗い出す" },
  { step: "リスク分析", what: "各リスクのレベル（大きさ）を決める" },
  { step: "リスク評価", what: "レベルを受容基準と比べ、対応が必要か・優先順位を決める" },
];

export function IsmsTerms({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>脅威・脆弱性・リスクのちがい</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="isms-terms">
        {TERMS.map((t) => (
          <div key={t.term} className="grid grid-cols-[4.5rem_1fr] gap-2 rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-term={t.term}>
            <dt className="text-[15px] font-bold text-gray-900">{t.term}</dt>
            <dd>
              <p className="text-[13px] font-bold leading-snug text-gray-800">{t.def}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-gray-500">例：{t.ex}</p>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm font-bold text-gray-800">リスクアセスメントは3段階</p>
      <ol className="mt-2 space-y-1" data-testid="isms-assessment">
        {ASSESS.map((a, i) => (
          <li key={a.step} className="flex items-baseline gap-2 text-[13px] leading-snug text-gray-700">
            <span className="flex-none font-bold text-gray-900">
              {i + 1}. {a.step}
            </span>
            <span>{a.what}</span>
          </li>
        ))}
      </ol>
      <Takeaway>
        「損害の<b>原因</b>」＝脅威、「つけ込まれる<b>弱点</b>」＝脆弱性。分析は<b>レベルを決める</b>まで、
        受け入れられるかを決めるのは<b>評価</b>です。
      </Takeaway>
    </Panel>
  );
}

// ④ PDCAを試験の言葉で -----------------------------------------------------------
const PDCA = [
  { k: "P", t: "計画", d: "適用範囲を決め、方針を立て、リスクアセスメントをして、対策の目的と手順を定める", ex: "サーバ監視の目的と手順を定める" },
  { k: "D", t: "運用", d: "定めた手順どおりに対策を運用する", ex: "手順に従ってサーバを監視する" },
  { k: "C", t: "パフォーマンス評価", d: "第三者が客観的に評価する。代表が内部監査", ex: "監視の作業内容を第三者が評価する" },
  { k: "A", t: "改善", d: "見つかった不適合を是正処置で直し、次の計画へ", ex: "是正処置として監視方法を変える" },
];

export function IsmsPdcaExam({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>ISMS＝PDCAで回し続けるしくみ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばん最初にするのは<b className="text-gray-900">ISMSの適用範囲の決定</b>（どの組織・どの情報を守るか）。
        そのあと次のPDCAを回し続けます。
      </p>
      <ol className="mt-3 space-y-1.5" data-testid="isms-pdca">
        {PDCA.map((p) => (
          <li key={p.k} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-phase={p.k}>
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 flex-none place-items-center rounded bg-brand-100 font-mono text-xs font-bold text-brand-700">{p.k}</span>
              <span className="text-[15px] font-bold text-gray-900">{p.t}</span>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-gray-800">{p.d}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-gray-500">例：{p.ex}</p>
          </li>
        ))}
      </ol>
      <Takeaway>
        内部監査は、規格や社内ルールに<b>合っているか（適合性）</b>だけでなく、<b>効果が出ているか（有効性）</b>も見ます。
        経営者は担当者やCISOに丸投げせず、方針・予算・人材を決めて<b>自らリーダーシップを発揮</b>します。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 情報セキュリティポリシーの3層 ---------------------------------------------------
const POLICY = [
  { name: "基本方針", who: "トップマネジメント", d: "組織としての意思・方向付け。組織全体で1つ", w: "w-[60%]" },
  { name: "対策基準", who: "何を守るか", d: "基本方針を実現するために守るべきルール", w: "w-[80%]" },
  { name: "実施手順", who: "どうやるか", d: "部門や業務ごとの具体的なやり方", w: "w-full" },
];
const ORDER = ["策定の責任者・担当者を決める", "基本方針を策定する", "情報資産を洗い出し、分類する", "リスクを分析する"];

export function IsmsPolicy({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>情報セキュリティポリシーは3層</SectionTitle>
      <div className="mt-3 flex flex-col items-center gap-1" data-testid="isms-policy">
        {POLICY.map((p) => (
          <div key={p.name} className={`${p.w} rounded-lg bg-sky-50 px-2.5 py-2 text-center ring-1 ring-sky-200`} data-layer={p.name}>
            <p className="text-[15px] font-bold text-sky-900">
              {p.name}
              <span className="ml-1 text-[11px] font-normal text-sky-700">（{p.who}）</span>
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-gray-700">{p.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-gray-500">上ほど抽象的、下ほど具体的</p>

      <p className="mt-4 text-sm font-bold text-gray-800">ISMSの情報セキュリティ方針（基本方針）の性質</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-snug text-gray-700">
        <li>情報セキュリティに対する組織の意図を示し、方向付けするもの</li>
        <li>ISMSを継続的に改善するという約束（コミットメント）を含める</li>
        <li>部門ごとではなく組織全体で定め、トップが承認する</li>
      </ul>

      <p className="mt-4 text-sm font-bold text-gray-800">ポリシーを作る順番</p>
      <ol className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[12.5px] font-bold text-gray-800" data-testid="isms-policy-order">
        {ORDER.map((o, i) => (
          <li key={o} className="flex items-center gap-1">
            <span className="rounded-md px-2 py-1 ring-1 ring-gray-300">{o}</span>
            {i < ORDER.length - 1 && (
              <span className="text-gray-400" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ⑥ 対策の3分類と、媒体の廃棄 -------------------------------------------------------
const CONTROLS = [
  { kind: "技術的", d: "機器やソフトの機能で守る", ex: ["マルウェア対策ソフトと定義ファイルの更新", "通信の監視・遮断", "退職者のアカウント削除"] },
  { kind: "人的", d: "人へのルール・教育で守る", ex: ["採用時の守秘義務契約", "セキュリティ教育・攻撃手口の周知"] },
  { kind: "物理的", d: "場所や物を守る", ex: ["ICカードで部屋ごとに入退室管理", "共連れ防止のアンチパスバック", "クリアデスク（書類を机に放置しない）", "遠隔地にバックアップシステム"] },
];
const DISPOSE = [
  { ok: true, t: "専用ソフトでランダムなデータを全領域に上書き" },
  { ok: true, t: "ドリルやシュレッダーで物理的に破壊" },
  { ok: true, t: "SSDは Secure Erase で全消去" },
  { ok: false, t: "ファイルを削除する・ごみ箱を空にする" },
  { ok: false, t: "論理フォーマットする" },
];

export function IsmsControls({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>対策の3分類と、捨てるときの消し方</SectionTitle>
      <div className="mt-3 space-y-1.5" data-testid="isms-controls">
        {CONTROLS.map((c) => (
          <div key={c.kind} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-kind={c.kind}>
            <p className="text-[15px] font-bold text-gray-900">
              {c.kind}セキュリティ対策
            </p>
            <p className="text-[12px] text-gray-500">{c.d}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">{c.ex.join("／")}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
        遠隔地のバックアップは「場所を分けて守る」ので物理的。ICカードの入退室も、カードという技術を使っていても「部屋を守る」ので物理的です。
      </p>

      <p className="mt-4 text-sm font-bold text-gray-800">PC・HDD・SSDを捨てるとき</p>
      <ul className="mt-1.5 space-y-1" data-testid="isms-dispose">
        {DISPOSE.map((d) => (
          <li key={d.t} className="flex items-start gap-2 text-[13px] leading-snug text-gray-800" data-ok={d.ok}>
            <span className={`mt-0.5 flex-none rounded px-1.5 text-[11px] font-bold ${d.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
              {d.ok ? "有効" : "不十分"}
            </span>
            {d.t}
          </li>
        ))}
      </ul>
      <Takeaway>
        削除やフォーマットは「見えなくする」だけで、データは復元できます。<b>上書き・物理破壊・Secure Erase</b>で消します。
      </Takeaway>
    </Panel>
  );
}

// ⑦ 事故が起きたら ＋ 問題文の言い回し → 用語 ------------------------------------------
const PHRASES = [
  { phrase: "セキュリティ事故の発生時に影響範囲を調べ、被害拡大の防止を支援する組織", term: "CSIRT" },
  { phrase: "犯罪や紛争のとき、削除されたメールを復元するなどして証拠を集め、保全する", term: "デジタルフォレンジックス" },
  { phrase: "クレジットカード情報を扱う事業者に求められるセキュリティ基準", term: "PCI DSS" },
  { phrase: "企画・設計の段階からセキュリティを確保する", term: "セキュリティバイデザイン" },
  { phrase: "一人の認証で他の人も一緒に入る（共連れ）のを防ぐ", term: "アンチパスバック" },
  { phrase: "書類などを机の上に放置したまま離席しない", term: "クリアデスク" },
  { phrase: "保険に入って損害に備える", term: "リスク共有（移転）" },
];

export function IsmsIncidentPhrases({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>事故への備えと、問題文の言い回し</SectionTitle>
      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200" data-testid="isms-incident">
        <p className="font-bold">インシデント管理の基本</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>おかしなこと（事象）を速やかに報告できるよう、<b>連絡経路と仕組みを前もって用意</b>する</li>
          <li>対応手順も前もって文書化しておく</li>
          <li>報告された事象は<b>評価してから</b>インシデントかどうかを決める</li>
          <li>得られた教訓は管理策の強化に生かす</li>
        </ul>
      </div>
      <table className="mt-3 w-full border-collapse text-[12px]" data-testid="isms-phrases">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">問題文にこう書いてあれば</th>
            <th className="w-[9.5rem] px-1.5 py-1 font-bold">答え</th>
          </tr>
        </thead>
        <tbody>
          {PHRASES.map((p) => (
            <tr key={p.term} className="border-b border-gray-100 align-top">
              <td className="px-1.5 py-1.5 text-gray-700">{p.phrase}</td>
              <td className="px-1.5 py-1.5 font-bold text-brand-800">{p.term}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
