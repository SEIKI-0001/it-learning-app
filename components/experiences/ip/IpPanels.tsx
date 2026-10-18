"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 知的財産の解説で、過去問の出題に合わせて足したパネル群。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

const OkTag = ({ ok, yes = "保護される", no = "保護されない" }: { ok: boolean; yes?: string; no?: string }) => (
  <span className={`mt-0.5 w-[5.5rem] flex-none rounded px-1 text-center text-[11px] font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{ok ? yes : no}</span>
);

// ② 権利の地図 ------------------------------------------------------------------
const INDUSTRIAL = [
  { name: "特許権", what: "発明（自然法則を利用した高度な技術的思想）。製造方法やビジネスモデルも、システムとして実現すれば対象" },
  { name: "実用新案権", what: "物品の形・構造・組合せの考案。複数の物品を組み合わせた新製品など（方法は対象外）" },
  { name: "意匠権", what: "物品のデザイン（見た目）" },
  { name: "商標権", what: "商品名・ロゴ。運送や金融などの役務（サービス）に付けるものはサービスマーク" },
];
const OTHERS = [
  { name: "著作権", what: "作品の表現。作った時点で発生し、出願・登録はいらない" },
  { name: "不正競争防止法", what: "営業秘密、限定提供データ、コピープロテクトを無効にするプログラムの販売などを規制" },
  { name: "パブリシティ権", what: "有名人の名前や姿が持つ「客を引き付ける力」。写真を勝手に商品にすると侵害" },
];

export function IpMap({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>知的財産を守るしくみの地図</SectionTitle>
      <p className="mt-3 text-sm font-bold text-gray-800">産業財産権（特許庁に出願・登録して守る）</p>
      <dl className="mt-1.5 space-y-1" data-testid="ip-industrial">
        {INDUSTRIAL.map((r) => (
          <div key={r.name} className="grid grid-cols-[6rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-right={r.name}>
            <dt className="font-bold text-gray-900">{r.name}</dt>
            <dd className="text-gray-700">{r.what}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm font-bold text-gray-800">そのほか</p>
      <dl className="mt-1.5 space-y-1" data-testid="ip-others">
        {OTHERS.map((r) => (
          <div key={r.name} className="grid grid-cols-[6rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-right={r.name}>
            <dt className="font-bold text-gray-900">{r.name}</dt>
            <dd className="text-gray-700">{r.what}</dd>
          </div>
        ))}
      </dl>
      <Takeaway>
        <b>限定提供データ</b>は、特定の相手に提供するために電子的に大量に蓄積・管理したデータ（秘密として管理しているものは営業秘密の側）。
      </Takeaway>
    </Panel>
  );
}

// ③ 著作物になる？ -------------------------------------------------------------------
const WORKS: { t: string; ok: boolean; why: string }[] = [
  { t: "原稿なしで話した講演の録音", ok: true, why: "話した言葉も表現" },
  { t: "ソースプログラム", ok: true, why: "プログラムの表現" },
  { t: "操作マニュアル", ok: true, why: "文章の表現" },
  { t: "アルゴリズム（処理の手順の考え方）", ok: false, why: "アイデアであって表現ではない" },
  { t: "通信プロトコル（通信の約束事）", ok: false, why: "規約であって表現ではない" },
  { t: "時刻表に載ったバスの到着時刻", ok: false, why: "ただの事実・データ" },
  { t: "創造性の高い技術の発明", ok: false, why: "発明は特許で守る" },
];

export function CopyrightCheck({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>著作権で守られる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        著作権が守るのは<b className="text-gray-800">表現</b>。アイデアや事実そのものは守りません。
      </p>
      <ul className="mt-3 space-y-1" data-testid="ip-works">
        {WORKS.map((w) => (
          <li key={w.t} className="flex items-start gap-2 text-[13px] leading-snug" data-ok={w.ok}>
            <OkTag ok={w.ok} />
            <span>
              <span className="font-bold text-gray-800">{w.t}</span>
              <span className="ml-1 text-[12px] text-gray-500">{w.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-sky-950 ring-1 ring-sky-200" data-testid="ip-same">
        <p className="font-bold">偶然そっくりなものが2つできたら</p>
        <p className="mt-0.5">
          著作権：それぞれが独自に作ったなら<b>両方に</b>著作権がある。特許権：先に出願した<b>一方だけ</b>が取れる。
        </p>
      </div>
    </Panel>
  );
}

// ④ 特許とライセンスを経営に使う ----------------------------------------------------
const PATENT_EFFECTS = ["他社の参入を防げる", "ライセンス料で開発費の一部を回収できる", "他社との提携（アライアンス）で有利な条件を出せる"];
const STRATEGY = [
  { t: "特許ポートフォリオ", d: "持っている特許を、事業への貢献や特許どうしの相乗効果で分析できるようにまとめたもの" },
  { t: "クロスライセンス", d: "特許権者どうしが、互いの特許を使うことを許し合う" },
  { t: "IPランドスケープ", d: "知財情報を事業・経営の情報と合わせて分析し、経営戦略に生かす" },
  { t: "シュリンクラップ契約", d: "パッケージの包装を開けた時点で、使用許諾の契約が成立する" },
];

export function PatentStrategy({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>特許とライセンスを経営に生かす</SectionTitle>
      <p className="mt-3 text-sm font-bold text-gray-800">自社技術を特許にすると</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-snug text-gray-700" data-testid="ip-patent-effects">
        {PATENT_EFFECTS.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1.5" data-testid="ip-strategy">
        {STRATEGY.map((s) => (
          <div key={s.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-term={s.t}>
            <dt className="text-[14px] font-bold text-gray-900">{s.t}</dt>
            <dd className="mt-0.5 text-[12.5px] leading-snug text-gray-700">{s.d}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

// ⑤ 生成AIと著作権 -------------------------------------------------------------------
const AI_CASES: { t: string; need: boolean; why: string }[] = [
  { t: "好きな曲に似せるつもりで生成し、ネットで公開した", need: true, why: "既存の曲をもとにしていて（依拠）、しかも公開している" },
  { t: "好きな曲に似せるつもりで生成し、自分で聴くだけ", need: false, why: "個人で楽しむだけなら私的使用の範囲" },
  { t: "生成したら偶然似た曲ができ、自分で聴くだけ", need: false, why: "既存の曲をもとにしていない（依拠がない）" },
];

export function GenAiCopyright({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>生成AIで作ったものと著作権</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        生成物が既存の作品の侵害になるのは、<b className="text-gray-800">似ている（類似性）</b>うえに
        <b className="text-gray-800">それをもとにした（依拠性）</b>とき。さらに、自分で楽しむだけなら私的使用として許されます。
      </p>
      <ul className="mt-3 space-y-1.5" data-testid="ip-genai">
        {AI_CASES.map((c) => (
          <li key={c.t} className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-[13px] leading-snug ring-1 ring-gray-200" data-need={c.need}>
            <OkTag ok={!c.need} yes="許諾不要" no="許諾が必要かも" />
            <span>
              <span className="font-bold text-gray-800">{c.t}</span>
              <span className="block text-[12px] text-gray-500">{c.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <Takeaway>
        判断のポイントは<b>「もとにしたか」</b>と<b>「公開・販売するか」</b>の2つです。
      </Takeaway>
    </Panel>
  );
}

// ⑥ どの権利・法律？ --------------------------------------------------------------------
const ITEMS: { t: string; ans: string; opts: string[]; why: string }[] = [
  { t: "ネット広告の新しいビジネスモデルを、システムとして実現した", ans: "特許権", opts: ["著作権", "特許権", "意匠権"], why: "ビジネスモデル特許＝特許法。" },
  { t: "複数の物品を組み合わせて考えた新しい製品", ans: "実用新案権", opts: ["特許権", "実用新案権", "意匠権"], why: "物品の組合せの考案＝実用新案。" },
  { t: "運送会社が自社の配送サービスに付けるマーク", ans: "商標権", opts: ["商標権", "意匠権", "著作権"], why: "役務に付ける商標＝サービスマーク。" },
  { t: "映像ソフトのコピープロテクトを外すプログラムを販売する", ans: "不正競争防止法", opts: ["不正競争防止法", "不正アクセス禁止法", "商標法"], why: "技術的制限手段の無効化＝不正競争防止法。" },
  { t: "人気選手の写真を無断でプリントして販売する", ans: "パブリシティ権", opts: ["パブリシティ権", "著作権", "意匠権"], why: "有名人の客を引き付ける力＝パブリシティ権。" },
  { t: "自分で描いたイラスト", ans: "著作権", opts: ["著作権", "特許権", "商標権"], why: "作品の表現＝著作権。描いた時点で発生。" },
];

export function IpQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どの権利・法律で守る？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="ip-quiz">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={it.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {it.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は ${it.ans}。 `}
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
