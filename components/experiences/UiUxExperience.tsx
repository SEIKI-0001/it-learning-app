"use client";

import type { ReactNode } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「情報デザインとヒューマンインタフェース」。抽象図より、実物に近いUI例を見せる。
//   ① 同じ予約画面の 悪い例／良い例。①〜④の番号が両方の画面の同じ場所に付き、下で「何を直したか」と原則名を対応させる
//   ② LATCH：同じ4つの店を、場所・名前・時間・種類・順位 の5通りで並べる
//   ③ UI と UX、アクセシビリティ、ユーザビリティ：名称 → 一言 → 小さな具体例
//   ④ 試験ポイント

function Num({ n, invert = false }: { n: number; invert?: boolean }) {
  return (
    <span
      className={`mr-1 inline-grid h-4 w-4 flex-none place-items-center rounded-full align-[-2px] text-[9px] font-bold ${invert ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}
      aria-label={`${n}番`}
    >
      {n}
    </span>
  );
}

function Phone({ title, tone, children, testId }: { title: string; tone: "bad" | "good"; children: ReactNode; testId: string }) {
  return (
    <figure className="min-w-0" data-testid={testId}>
      <figcaption className={`mb-1.5 text-center text-base font-bold ${tone === "bad" ? "text-rose-700" : "text-emerald-700"}`}>
        {tone === "bad" ? "✕ " : "○ "}
        {title}
      </figcaption>
      <div className="mx-auto max-w-[15rem] rounded-[1.25rem] border-[3px] border-gray-800 bg-white p-2.5 text-[11px] leading-snug text-gray-800">
        {children}
      </div>
    </figure>
  );
}

const Field = ({ label, className = "" }: { label: ReactNode; className?: string }) => (
  <div className={className}>
    <div className="text-[10px]">{label}</div>
    <div className="mt-0.5 h-5 rounded border border-gray-300 bg-white" />
  </div>
);

function BadScreen() {
  return (
    <Phone title="悪い例" tone="bad" testId="ui-bad">
      <p className="text-[12px] font-bold">イベント予約</p>
      <div className="mt-2 space-y-1.5">
        <Field label={<><Num n={4} />郵便番号</>} />
        <Field label={<span className="text-rose-500"><Num n={2} />氏名</span>} />
        <Field label="電話番号" />
        <Field label={<span className="text-rose-500">メールアドレス</span>} />
        <Field label="住所" />
      </div>
      <div className="mt-2.5 flex justify-center gap-4 text-[11px] text-gray-500">
        <span>
          <Num n={1} />
          キャンセル
        </span>
        <span>送信</span>
      </div>
      <p className="mt-2 text-[8.5px] leading-tight text-gray-400">
        <Num n={3} />
        ※お申込みの締切は本日18時です。締切後の変更はできません。その他の注意事項は利用規約をご確認ください。
      </p>
    </Phone>
  );
}

function GoodScreen() {
  return (
    <Phone title="良い例" tone="good" testId="ui-good">
      <p className="text-[12px] font-bold">イベント予約</p>
      <p className="mt-1.5 rounded bg-amber-100 px-1.5 py-1 text-[11.5px] font-bold text-gray-900">
        <Num n={3} />
        締切：本日18時まで
      </p>
      <div className="mt-2 space-y-1.5">
        <Field
          label={
            <>
              <Num n={2} />
              氏名 <span className="rounded bg-rose-600 px-1 text-[9px] font-bold text-white">必須</span>
            </>
          }
        />
        <Field label={<>メールアドレス <span className="rounded bg-rose-600 px-1 text-[9px] font-bold text-white">必須</span></>} />
        <Field label="電話番号" />
        <div className="rounded border border-gray-200 p-1.5">
          <div className="text-[10px] font-bold">
            <Num n={4} />
            お届け先
          </div>
          <Field label="郵便番号" className="mt-1" />
          <Field label="住所" className="mt-1" />
        </div>
      </div>
      <div className="mt-2.5 rounded-lg bg-gray-900 py-1.5 text-center text-[12px] font-bold text-white">
        <Num n={1} invert />
        予約を確定する
      </div>
      <p className="mt-1 text-center text-[10px] text-gray-500">キャンセル</p>
    </Phone>
  );
}

const FIXES = [
  { n: 1, bad: "どれが押せるボタンか分からない", good: "押す所を目立つボタンに。主な操作は1つ", rule: "操作対象を明確に" },
  { n: 2, bad: "必須を赤い色だけで伝えている", good: "「必須」と文字でも書く", rule: "色だけに頼らない" },
  { n: 3, bad: "締切が小さな注記に埋もれている", good: "いちばん上に大きく出す", rule: "対比：重要度で強弱" },
  { n: 4, bad: "郵便番号と住所が離れている", good: "関連する項目を近くにまとめる", rule: "近接：関係をまとまりで" },
];

function BeforeAfterPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>同じ画面の「悪い例」と「良い例」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        入力する項目は同じ。変えたのは<b className="text-gray-900">見せ方</b>だけです。番号の場所を見比べてください。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
        <BadScreen />
        <GoodScreen />
      </div>
      <ul className="mt-4 divide-y divide-gray-100" data-testid="ui-fixes">
        {FIXES.map((f) => (
          <li key={f.n} className="flex gap-2 py-2">
            <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-gray-900 text-[10px] font-bold text-white">{f.n}</span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-snug text-gray-900">{f.rule}</p>
              <p className="text-[13px] leading-snug text-rose-700">✕ {f.bad}</p>
              <p className="text-[13px] font-bold leading-snug text-emerald-800">○ {f.good}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// LATCH
// ---------------------------------------------------------------------------

type Shop = { name: string; short: string; kana: string; x: number; y: number; open: string; kind: "カフェ" | "書店"; rank: number };
const SHOPS: Shop[] = [
  { name: "青空カフェ", short: "青空", kana: "あ", x: 20, y: 30, open: "7:00", kind: "カフェ", rank: 2 },
  { name: "海風書店", short: "海風", kana: "う", x: 70, y: 20, open: "10:00", kind: "書店", rank: 4 },
  { name: "木かげ珈琲", short: "木かげ", kana: "こ", x: 45, y: 70, open: "8:00", kind: "カフェ", rank: 1 },
  { name: "さくら文庫", short: "さくら", kana: "さ", x: 80, y: 65, open: "11:00", kind: "書店", rank: 3 },
];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function MiniList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-1 space-y-0.5 text-[12px] leading-snug text-gray-800">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

const LATCH: { key: string; ja: string; what: string; body: ReactNode }[] = [
  {
    key: "Location",
    ja: "場所",
    what: "地図・地域で並べる",
    body: (
      <svg viewBox="0 0 100 90" className="mt-1 h-20 w-full" aria-hidden>
        <rect x={1} y={1} width={98} height={88} rx={6} fill="#f9fafb" stroke="#d1d5db" />
        <path d="M0 50 H100 M55 0 V90" stroke="#e5e7eb" strokeWidth={6} />
        {SHOPS.map((s) => (
          <g key={s.name}>
            <circle cx={s.x} cy={s.y} r={4} fill="#111827" />
            <text x={s.x} y={s.y - 7} textAnchor="middle" fontSize={8} fontWeight={700} fill="#374151">
              {s.short}
            </text>
          </g>
        ))}
      </svg>
    ),
  },
  {
    key: "Alphabet",
    ja: "名前",
    what: "あいうえお順・ABC順",
    body: <MiniList items={[...SHOPS].sort((a, b) => a.kana.localeCompare(b.kana, "ja")).map((s) => s.name)} />,
  },
  {
    key: "Time",
    ja: "時間",
    what: "日時・順序で並べる",
    body: (
      <MiniList
        items={[...SHOPS]
          .sort((a, b) => toMin(a.open) - toMin(b.open))
          .map((s) => (
            <>
              <span className="font-mono text-gray-500">{s.open}</span> {s.name}
            </>
          ))}
      />
    ),
  },
  {
    key: "Category",
    ja: "種類",
    what: "同じ種類でまとめる",
    body: (
      <div className="mt-1 space-y-1 text-[12px]">
        {(["カフェ", "書店"] as const).map((k) => (
          <p key={k}>
            <b className="text-gray-900">{k}</b>：{SHOPS.filter((s) => s.kind === k).map((s) => s.name).join("・")}
          </p>
        ))}
      </div>
    ),
  },
  {
    key: "Hierarchy",
    ja: "階層・重要度",
    what: "順位・大小・上下関係",
    body: (
      <MiniList
        items={[...SHOPS]
          .sort((a, b) => a.rank - b.rank)
          .map((s) => (
            <>
              <b>{s.rank}位</b> {s.name}
            </>
          ))}
      />
    ),
  },
];

function LatchPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>LATCH ＝ 情報を並べる5つの切り口</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        同じ4つの店でも、<b className="text-gray-900">何で並べるか</b>で見つけやすさが変わります。目的に合う軸を選びます。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="latch">
        {LATCH.map((l) => (
          <div key={l.key} className="rounded-xl p-2.5 ring-1 ring-gray-200" data-axis={l.key}>
            <p className="text-[15px] font-bold leading-tight text-gray-900">
              <span className="text-amber-600">{l.key[0]}</span>
              {l.key.slice(1)}
              <span className="ml-1 text-[12px] text-gray-700">{l.ja}</span>
            </p>
            <p className="text-[11.5px] text-gray-600">{l.what}</p>
            {l.body}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// UI と UX／アクセシビリティ／ユーザビリティ
// ---------------------------------------------------------------------------

const JOURNEY = ["知る", "登録する", "使う", "問い合わせる"];

function TermsPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>UI・UX・アクセシビリティ・ユーザビリティ</SectionTitle>
      <div className="mt-4 space-y-4" data-testid="ui-terms">
        <div>
          <p className="text-base font-bold text-gray-900">UI と UX</p>
          <p className="text-[14px] leading-relaxed text-gray-800">
            <b>UI</b>＝画面・ボタンなど<b>操作する接点</b>。<b>UX</b>＝知ってから使い終わるまでの<b>体験全体</b>。
          </p>
          <div className="mt-2" data-testid="ui-journey">
            <div className="flex gap-1">
              {JOURNEY.map((j) => (
                <span
                  key={j}
                  className={`flex-1 rounded px-1 py-1.5 text-center text-[11.5px] font-bold ${j === "登録する" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
                >
                  {j}
                  {j === "登録する" && <span className="block text-[10px] font-medium text-gray-300">ここの画面＝UI</span>}
                </span>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11.5px] font-bold text-amber-700">
              <span className="h-px flex-1 bg-amber-500" />
              全体の体験＝UX
              <span className="h-px flex-1 bg-amber-500" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-base font-bold text-gray-900">アクセシビリティ</p>
          <p className="text-[14px] leading-relaxed text-gray-800">高齢者や障害のある人を含め、<b>多様な人が情報や機能を使える</b>こと。</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg p-2 ring-1 ring-gray-200">
              <p className="text-rose-700">✕ 色だけで区別</p>
              <p className="mt-1">
                <span className="font-bold text-rose-500">氏名</span>
              </p>
              <p className="text-[11px] text-gray-500">色が見分けにくい人には伝わらない</p>
            </div>
            <div className="rounded-lg p-2 ring-1 ring-gray-200">
              <p className="font-bold text-emerald-800">○ 文字や読み上げでも伝わる</p>
              <p className="mt-1">
                氏名 <span className="rounded bg-rose-600 px-1 text-[10px] font-bold text-white">必須</span>
              </p>
              <p className="text-[11px] text-gray-500">画像には代わりの説明文も付ける</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-base font-bold text-gray-900">ユーザビリティ</p>
          <p className="text-[14px] leading-relaxed text-gray-800">
            利用者が<b>目的を迷わず・少ない手間で達成できる</b>使いやすさ。
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-700">
            例：<b className="text-gray-900">ユーザビリティテスト</b>＝実際の利用者に「予約してください」と頼んで操作してもらい、<b className="text-gray-900">迷った場所</b>を観察して直す。
          </p>
        </div>
      </div>
    </Panel>
  );
}

export default function UiUxExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        良い情報デザインとは、<b>説明を読まなくても「何が大事で、どこを操作すればいいか」が分かる</b>こと。
        まず実際の画面で、良い例と悪い例を見比べます。
      </Lead>
      <BeforeAfterPanel />
      <LatchPanel />
      <TermsPanel />
      <PointsPanel
        step={4}
        points={[
          <>情報デザインは<b>誰が・何のために・どこで使うか</b>から考え、近接・対比などで視線を導く</>,
          <>LATCH＝<b>L</b>ocation 場所・<b>A</b>lphabet 名前・<b>T</b>ime 時間・<b>C</b>ategory 種類・<b>H</b>ierarchy 階層</>,
          <>UI＝操作する接点、UX＝利用前後を含む体験全体</>,
        ]}
        traps={[
          ["Hierarchy は日時順のこと", "日時順は Time。Hierarchy は順位や上下関係"],
          ["UX は画面デザインのこと", "画面は UI。UX は知る・使う・問い合わせるまでの体験全体"],
        ]}
      />
    </div>
  );
}
