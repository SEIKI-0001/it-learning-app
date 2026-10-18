"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// システム監査の解説で、過去問の出題に合わせて足したパネル群。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

// ① 監査人の独立性 --------------------------------------------------------------
const WHO: { who: string; ok: boolean; why: string }[] = [
  { who: "経理とITの知識をもつ、経営者直轄の内部監査部門の人", ok: true, why: "社内の人でも、監査対象と指揮命令系統が別なら独立している" },
  { who: "このシステムに関わっていない管理部門のリーダー", ok: true, why: "対象の業務に関与していない" },
  { who: "このシステムの開発・運用の担当者", ok: false, why: "自分の仕事を自分で評価することになる" },
  { who: "このシステムを使っている利用部門の担当者", ok: false, why: "監査対象の当事者" },
  { who: "開発を請け負った委託先の社員", ok: false, why: "利害関係がある" },
];

export function AuditIndependence({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>監査人に求められる「独立性」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        システム監査は、システムが<b className="text-gray-800">ルールどおり安全・有効に使われているか</b>を、
        対象から独立した監査人が<b className="text-gray-800">客観的に</b>評価する活動です。独立性は2つあります。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="audit-independence">
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200">
          <p className="text-[15px] font-bold text-gray-900">外観上の独立性</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">監査対象と同じ指揮命令系統に属さない（形のうえで離れている）</p>
        </div>
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200">
          <p className="text-[15px] font-bold text-gray-900">精神上の独立性</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">客観的な立場で公正に判断する（心のもち方）</p>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-gray-800">社内の経理システムを監査する人として…</p>
      <ul className="mt-1.5 space-y-1" data-testid="audit-who">
        {WHO.map((w) => (
          <li key={w.who} className="flex items-start gap-2 text-[13px] leading-snug" data-ok={w.ok}>
            <span className={`mt-0.5 flex-none rounded px-1.5 text-[11px] font-bold ${w.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
              {w.ok ? "適切" : "不適切"}
            </span>
            <span>
              <span className="font-bold text-gray-800">{w.who}</span>
              <span className="block text-[12px] text-gray-500">{w.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <Takeaway>
        「独立」は<b>社外の人</b>という意味ではありません。<b>対象の業務に関わっていない</b>ことがポイントです。
      </Takeaway>
    </Panel>
  );
}

// ② 監査の4種類 -----------------------------------------------------------------
const KINDS = [
  { kind: "会計監査", what: "取引の発生から決算書への集計まで、不正や誤りのない処理か" },
  { kind: "業務監査", what: "諸業務が組織の方針に従って、合理的かつ効率的に運用されているか" },
  { kind: "情報セキュリティ監査", what: "情報資産のリスクマネジメントが効果的に実施されているか" },
  { kind: "システム監査", what: "情報システムに係るリスクに適切に対応しているか（組織の目標達成に役立てる）" },
];

export function AuditKinds({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>監査は「何を確かめるか」で4種類</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="audit-kinds">
        {KINDS.map((k) => (
          <div key={k.kind} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-kind={k.kind}>
            <dt className="text-[15px] font-bold text-gray-900">{k.kind}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug text-gray-700">{k.what}</dd>
          </div>
        ))}
      </dl>
      <Takeaway>
        見分けるキーワードは、会計＝<b>決算・不正や誤り</b>、業務＝<b>合理的・効率的</b>、
        情報セキュリティ＝<b>情報資産のリスク</b>、システム＝<b>情報システムのリスク</b>です。
      </Takeaway>
    </Panel>
  );
}

// ③ 監査の流れと監査人の役割 -----------------------------------------------------
const FLOW = [
  { t: "監査計画", d: "何を・いつ・どこまで調べるか決める" },
  { t: "予備調査", d: "資料を集めて対象の概要をつかむ" },
  { t: "本調査", d: "閲覧・ヒアリング・コンピュータを利用した監査技法で証拠を集める" },
  { t: "評価・結論", d: "集めた証拠をもとに監査意見をまとめる" },
  { t: "報告", d: "監査報告書を作り、改善を提案（勧告）する" },
  { t: "フォローアップ", d: "改善の実施状況をモニタリングする" },
];

export function AuditFlow({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>監査の流れと、監査人がやること</SectionTitle>
      <ol className="mt-3 space-y-1" data-testid="audit-flow">
        {FLOW.map((f, i) => (
          <li key={f.t} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-2 text-[13px] leading-snug">
            <span className="font-bold text-gray-900">
              {i + 1}. {f.t}
            </span>
            <span className="text-gray-700">{f.d}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-950 ring-1 ring-rose-200" data-testid="audit-not-do">
        <p className="font-bold">監査人がしないこと</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>改善の実施を監査対象部門に<b>指示</b>する（提案と、実施状況の確認まで）</li>
          <li>自分でシステムを直す（独立性が崩れる）</li>
        </ul>
      </div>
      <Takeaway>
        判断のものさし（判断尺度）は「システム管理基準」が基本ですが、テーマに応じて<b>他の基準を使ってもよい</b>です。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 内部統制の6要素 --------------------------------------------------------------
const ELEMENTS = [
  { t: "統制環境", d: "経営者の姿勢や組織の気風。ほかの5つの土台" },
  { t: "リスクの評価と対応", d: "目標の達成を妨げるリスクを見つけて対応を決める" },
  { t: "統制活動", d: "職務分掌（申請者と承認者を分ける）・承認・照合など" },
  { t: "情報と伝達", d: "必要な情報が組織の中で正しく伝わる。内部通報の窓口も" },
  { t: "モニタリング", d: "内部統制がうまく働いているか継続して確かめる" },
  { t: "ITへの対応", d: "業務に使うITを適切に取り入れ、管理する" },
];

export function InternalControlElements({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>内部統制の基本的要素は6つ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        内部統制の目的のひとつは<b className="text-gray-800">法令の遵守</b>。決算に重大な誤りがあれば速やかに公表する、といった活動も含みます。
      </p>
      <ol className="mt-3 grid grid-cols-2 gap-1.5" data-testid="ic-elements">
        {ELEMENTS.map((e) => (
          <li key={e.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200">
            <p className="text-[14px] font-bold text-gray-900">{e.t}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-gray-600">{e.d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-[13px] leading-relaxed text-sky-950 ring-1 ring-sky-200">
        <b>組織間のけん制</b>：営業部門の出張精算を、<b>別の部門（経理）</b>が審査して承認する。同じ部門の上長の承認だけでは組織間のけん制になりません。
      </div>
      <Takeaway>
        「ITへの対応」は、新しいシステムの導入を強いるものではありません。今あるITの使い方を変えて目標を達成できるなら、それで足ります。
      </Takeaway>
    </Panel>
  );
}

// ⑥ ITガバナンス ------------------------------------------------------------------
export function ItGovernance({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>ITガバナンス＝経営陣がITを方向づける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        経営陣が組織の価値を高めるために、IT戦略を立てて実現していく取組みです。経営陣の仕事は3つの動詞で表せます。
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center" data-testid="itgov-edm">
        {[
          { v: "評価", d: "現在と将来のITの利用を評価する" },
          { v: "指示", d: "責任と要員を割り当て、方針を示す" },
          { v: "モニター", d: "効果がどれだけ出たか情報を集める" },
        ].map((x) => (
          <div key={x.v} className="rounded-lg bg-brand-50 px-1.5 py-2 ring-1 ring-brand-200">
            <p className="text-[15px] font-bold text-brand-800">{x.v}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-gray-700">{x.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm font-bold text-gray-800">3つの層の関係</p>
      <ol className="mt-1.5 space-y-1 text-[13px] leading-snug text-gray-700" data-testid="itgov-layers">
        <li><b className="text-gray-900">ITガバナンス</b>（経営陣）：ルールを決める。例：IT投資の判断基準を確立する</li>
        <li><b className="text-gray-900">内部統制・管理</b>（現場）：ルールに従って動く。例：予算管理、SLAを守る運用</li>
        <li><b className="text-gray-900">監査</b>（独立した監査人）：うまくいっているか評価し、助言する</li>
      </ol>
      <Takeaway>
        経営陣は外部コンサルや担当部門に<b>丸投げしない</b>。取締役会が規範を作って<b>率先して守る</b>ことで、組織に浸透します。
        専門家に比較分析を依頼するのはかまいません（判断は経営陣が行う）。
      </Takeaway>
    </Panel>
  );
}

// ⑦ 正しい？ ダメ？（過去問の論点） ---------------------------------------------------
const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "監査人が、改善提案の実施状況をモニタリングする", ok: true, why: "フォローアップは監査人の役割。" },
  { t: "監査人が、改善の実施を監査対象部門に指示する", ok: false, why: "監査人は提案（勧告）まで。指示はしない。" },
  { t: "申請者が、自分の申請を自分で承認できないようにする", ok: true, why: "不正防止のための職務分掌。" },
  { t: "支払伝票の起票者が、自分で最終承認まで行う", ok: false, why: "起票と承認は別の人に分ける。" },
  { t: "経営陣が、IT戦略の立案からモニタリングまで外部コンサルに全面的に任せる", ok: false, why: "ITガバナンスの責任は経営陣にある。" },
  { t: "ITガバナンスで、経営者は現在と将来のITの利用を評価する", ok: true, why: "過去ではなく「現在と将来」。" },
];

export function AuditQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={step}>正しい？ ダメ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="audit-quiz">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "正しい" },
                  { v: false, label: "ダメ" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(o.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: o.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {has && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : "残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
