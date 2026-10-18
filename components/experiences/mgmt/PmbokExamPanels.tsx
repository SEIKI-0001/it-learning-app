import { Panel, SectionTitle } from "../ui";

// PMBOKの解説で、過去問の出題に合わせて足した2枚。静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Tag = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
  <span className={`mt-0.5 w-[5.5rem] flex-none rounded px-1 text-center text-[11px] font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{ok ? yes : no}</span>
);

// ③ プロジェクトとは／始めるときの文書／ステークホルダ ---------------------------------------
const IS_PROJECT: { t: string; ok: boolean }[] = [
  { t: "新しい経理システム導入のためのプログラム開発", ok: true },
  { t: "会社の合併に伴う、新しい組織への移行", ok: true },
  { t: "サービスデスクの日々の運用", ok: false },
  { t: "毎年度末に行う会計処理", ok: false },
];
const DOCS = [
  { t: "プロジェクト憲章", d: "新しいプロジェクトを正式に認可する文書", hit: true },
  { t: "プロジェクトスコープ記述書", d: "作る成果物と作業の範囲を書く" },
  { t: "ステークホルダ登録簿", d: "関係者とその影響を一覧にする" },
  { t: "リスク登録簿", d: "見つけたリスクと対応を一覧にする" },
];

export function ProjectBasics({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>プロジェクトとは、始めるときの文書、関係者</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        プロジェクトは<b className="text-gray-800">始まりと終わりがあり（有期性）</b>、
        <b className="text-gray-800">そのときだけの成果を生む（独自性）</b>仕事。毎回同じことをくり返す定常業務とは別です。
      </p>
      <ul className="mt-2 space-y-1" data-testid="pmbok-is-project">
        {IS_PROJECT.map((x) => (
          <li key={x.t} className="flex items-start gap-2 text-[13px] leading-snug text-gray-800" data-ok={x.ok}>
            <Tag ok={x.ok} yes="プロジェクト" no="定常業務" />
            {x.t}
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1" data-testid="pmbok-docs">
        {DOCS.map((d) => (
          <div
            key={d.t}
            className={`grid grid-cols-[10.5rem_1fr] items-baseline gap-2 rounded-md px-1.5 py-0.5 text-[12.5px] leading-snug ${d.hit ? "bg-brand-50 ring-1 ring-brand-200" : ""}`}
            data-doc={d.t}
          >
            <dt className="font-bold text-gray-900">{d.t}</dt>
            <dd className="text-gray-700">{d.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-sky-950 ring-1 ring-sky-200" data-testid="pmbok-stakeholders">
        <b>ステークホルダ</b>＝プロジェクトに影響を与える人・受ける人の全員。A社がB社に開発を発注したなら、
        A社の経営者・A社の利用部門・B社のプロジェクトマネージャ・B社を支援する協力会社も含まれます。
      </div>
    </Panel>
  );
}

// ④ スコープと変更の流れ -------------------------------------------------------------------
const SCOPE: { t: string; ok: boolean }[] = [
  { t: "プロジェクトで作る成果物（とそれを作る作業）", ok: true },
  { t: "プロジェクトで使う市販のスケジュール管理ツール", ok: false },
  { t: "顧客が要求事項を書いた文書（もらう側の資料）", ok: false },
];
const CHANGE = [
  { t: "変更要求", d: "「新機能を追加したい」などの要求が出る" },
  { t: "変更管理委員会", d: "影響を審議して認可・却下する。コスト増や期日の延期を理由に却下してもよい" },
  { t: "スコープ管理", d: "認可されたら WBS を変更し、コストの詳しい見積りの材料として渡す" },
  { t: "ほかの管理へ", d: "新しいWBSをもとに、スケジュール・要員・コストを見直す" },
];

export function ScopeAndChange({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>スコープと、変更が出たときの流れ</SectionTitle>
      <p className="mt-2 text-sm font-bold text-gray-800">スコープに入るのは？</p>
      <ul className="mt-1.5 space-y-1" data-testid="pmbok-scope">
        {SCOPE.map((x) => (
          <li key={x.t} className="flex items-start gap-2 text-[13px] leading-snug text-gray-800" data-ok={x.ok}>
            <Tag ok={x.ok} yes="スコープ" no="入らない" />
            {x.t}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
        スコープ管理の失敗＝作る機能の範囲を決めずに始めた／やるべき作業が計画から抜けていた。人件費の見積りが甘い（コスト）や期間が短すぎる（スケジュール）は別の分野の失敗です。
      </p>

      <p className="mt-4 text-sm font-bold text-gray-800">変更要求が出たら</p>
      <ol className="mt-1.5 space-y-1" data-testid="pmbok-change">
        {CHANGE.map((c, i) => (
          <li key={c.t} className="grid grid-cols-[7rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug">
            <span className="font-bold text-gray-900">
              {i + 1}. {c.t}
            </span>
            <span className="text-gray-700">{c.d}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        プロジェクトを終えるときは、統合マネジメントで<b className="text-gray-900">知識や教訓を組織の資産として登録</b>し、次のプロジェクトに生かします。
      </p>
    </Panel>
  );
}
