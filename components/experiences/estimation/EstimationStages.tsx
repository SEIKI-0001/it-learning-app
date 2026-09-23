"use client";

import { useState } from "react";
import styles from "../calc/calc.module.css";
import { Choices, LeveledPractice, Note, Replay, placeAnswer, type Choice, type LeveledQuestion } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// 見積り（人月・生産性・手法）。FPカウンターの後ろに足す。
//   ② 人月は長方形の面積：3人×4か月＝12マス。逆に10マスを2人で並べると横に5列＝5か月
//   ③ 生産性：120kステップを「1人月でできる6k」の束に切ると20束＝20人月
//   ④ 工程ごと：工程ごとに割ってから足す（生産性を先に足さない）
//   ⑤ 人数が途中で変わる：総工数（面積）は同じ。できた分を引いて、残りの日数で割る
//   ⑥ 手法の使い分け：その時点で何が分かっているか
//   ⑦ 確認5問

export const ESTIMATION_STEPS = ["① 何を求める？", "② 掛ける／割る", "③ 工程ごとに足す"];

function Cell({ on, tone = "brand", delay = 0, small = false }: { on: boolean; tone?: "brand" | "emerald" | "rose" | "amber"; delay?: number; small?: boolean }) {
  const color = { brand: "bg-brand-500", emerald: "bg-emerald-500", rose: "bg-rose-200 ring-1 ring-rose-400", amber: "bg-amber-400" }[tone];
  const size = small ? "h-3.5 w-5" : "h-6 w-6";
  return on ? (
    <span className={`block rounded ${size} ${color} ${styles.pop}`} style={{ animationDelay: `${delay}ms` }} />
  ) : (
    <span className={`block rounded border border-dashed border-gray-300 ${size}`} />
  );
}

// ---------------------------------------------------------------------------
// ② 人月 ― 工数は長方形の面積
// ---------------------------------------------------------------------------

const PM_DELAYS = [900, 900, 900, 1300, 1400, 700, 700, 700, 700, 1300, 1500];

export function PersonMonthStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(12, PM_DELAYS);
  const rows = Math.min(b, 3); // 3人のうち何人分の行が埋まったか
  const reverse = b >= 5;
  const cols = Math.max(0, Math.min(b - 4, 5)); // 逆算：何か月分の列が埋まったか
  return (
    <Panel>
      <SectionTitle step={2}>人月 ― 工数は「人数 × 期間」の面積</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">1人月</b>＝1人が1か月でできる作業量。1マスを1人月として並べると、工数は<b className="text-gray-800">長方形の面積</b>になります。
      </p>

      <div ref={ref} className="mt-3" data-testid="est-pm" data-beat={b}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
            <div className="text-[11px] font-bold text-gray-500">掛け算：3人で4か月</div>
            <div className="mt-1.5 flex gap-1">
              <div className="flex flex-col justify-around text-[10px] font-bold text-gray-400">
                {[1, 2, 3].map((p) => (
                  <span key={p} className="h-6 leading-6">
                    👤
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <Cell key={i} on={Math.floor(i / 4) < rows} delay={(i % 4) * 90} />
                ))}
              </div>
            </div>
            <div className="mt-1 pl-5 text-[10px] font-bold text-gray-400">← 4か月 →</div>
            {b >= 4 && (
              <p className={`mt-1.5 text-center text-sm font-bold text-gray-800 ${styles.reveal}`} data-testid="est-pm-mul">
                3 × 4 ＝ <span className="text-brand-600">12人月</span>
              </p>
            )}
          </div>

          <div className={`rounded-xl p-2 ring-1 ${reverse ? "bg-gray-50 ring-gray-200" : "bg-gray-50/40 ring-gray-100"}`}>
            <div className="text-[11px] font-bold text-gray-500">逆算：10人月を2人で</div>
            <div className="mt-1.5 flex gap-1">
              <div className="flex flex-col justify-around text-[10px] font-bold text-gray-400">
                {[1, 2].map((p) => (
                  <span key={p} className="h-6 leading-6">
                    👤
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  // 列（月）ごとに2マスずつ埋める＝1か月で2人月進む
                  <Cell key={i} on={reverse && (i % 5) < cols} tone="emerald" delay={Math.floor(i / 5) * 90} />
                ))}
              </div>
            </div>
            <div className="mt-1 pl-5 text-[10px] font-bold text-gray-400" data-testid="est-pm-months">
              {reverse ? `${cols}か月目` : "← ?か月 →"}
            </div>
            {b >= 10 && (
              <p className={`mt-1.5 text-center text-sm font-bold text-gray-800 ${styles.reveal}`} data-testid="est-pm-div">
                10 ÷ 2 ＝ <span className="text-emerald-600">5か月</span>
              </p>
            )}
          </div>
        </div>

        {b >= 11 && (
          <>
            <Note>
              💡 <b>工数 ＝ 人数 × 期間</b>（面積）。求めたいのが<b>工数なら掛ける</b>、<b>期間や人数（辺の長さ）なら工数を割る</b>。
            </Note>
            <p className={`mt-2 text-[11px] leading-relaxed text-gray-500 ${styles.reveal}`}>
              ※ 計算上は人を倍にすれば期間は半分ですが、実際は打合せや引き継ぎが増えるので<b>人を増やせば必ず早く終わるわけではありません</b>。
            </p>
          </>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 生産性 ― 1人月でできる量で割る
// ---------------------------------------------------------------------------

const PROD_DELAYS = [1300, 1500, 2300, 1500];
const CHUNKS = 20;

export function ProductivityStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(5, PROD_DELAYS);
  const cut = b >= 2;
  return (
    <Panel>
      <SectionTitle step={3}>生産性から工数 ― なぜ割り算？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">120kステップ</b>（12万行）のプログラムを作ります。1人が1か月で書ける量＝<b className="text-gray-800">生産性は 6kステップ/人月</b>。
      </p>

      <div ref={ref} className="mt-3" data-testid="est-prod" data-beat={b}>
        <div className="flex items-baseline justify-between text-[11px] font-bold">
          <span className="text-gray-500">作る量 120kステップ</span>
          <span className="tabular-nums text-brand-700" data-testid="est-prod-count">
            {cut ? `${CHUNKS}束` : ""}
          </span>
        </div>
        <div className="mt-1 flex h-9 gap-px overflow-hidden rounded-lg bg-gray-200 ring-1 ring-gray-300">
          {Array.from({ length: CHUNKS }, (_, i) => {
            const first = i === 0 && b >= 1;
            const on = cut || first;
            return (
              <span
                key={i}
                className={`grid flex-1 place-items-center text-[9px] font-bold ${on ? `${first ? "bg-amber-400 text-amber-950" : "bg-brand-500 text-white"} ${cut && !first ? styles.pop : ""}` : "bg-brand-200"}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {cut && (i + 1) % 5 === 0 ? i + 1 : ""}
              </span>
            );
          })}
        </div>
        {b >= 1 && (
          <p className={`mt-1 text-[11px] font-bold text-amber-800 ${styles.reveal}`}>
            ▲ 黄色の1束＝6kステップ＝<b>1人月</b>でできる量
          </p>
        )}
        {cut && (
          <p className={`mt-1 text-center text-xs font-bold text-gray-600 ${styles.reveal}`}>6kずつ切っていくと、ちょうど {CHUNKS} 束</p>
        )}
        {b >= 3 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="est-prod-eq">
            120 ÷ 6 ＝ <span className="text-brand-600">20人月</span>
          </div>
        )}
        {b >= 4 && (
          <Note>
            💡 <b>全体の量 ÷ 1人月でできる量 ＝ 必要な人月</b>。「1束が何個あるか」を数えるのが割り算です（転送時間の「量 ÷ 速さ」と同じ形）。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 工程ごとに割って、最後に足す
// ---------------------------------------------------------------------------

const PHASES = [
  { name: "設計", rate: 6, pm: 10 },
  { name: "製造", rate: 3, pm: 20 },
  { name: "テスト", rate: 5, pm: 12 },
];
const PHASE_DELAYS = [1300, 1300, 1300, 1500, 1500];

export function PhaseSumStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, PHASE_DELAYS);
  const total = PHASES.reduce((s, p) => s + p.pm, 0);
  return (
    <Panel>
      <SectionTitle step={4}>工程ごとに割って、最後に足す</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">60kステップ</b>を作るのに、工程ごとに生産性が違うとき。同じ60kを、工程ごとの「1人月の束」で切ります。
      </p>

      <div ref={ref} className="mt-3 space-y-2" data-testid="est-phase" data-beat={b}>
        {PHASES.map((p, i) => {
          const on = b >= i + 1;
          return (
            <div key={p.name} className="rounded-xl bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200">
              <div className="flex items-baseline justify-between text-[11px] font-bold">
                <span className="text-gray-700">
                  {p.name}　<span className="text-gray-400">生産性 {p.rate}k/人月</span>
                </span>
                {on && (
                  <span className={`tabular-nums text-brand-700 ${styles.reveal}`} data-testid={`est-phase-${p.name}`}>
                    60 ÷ {p.rate} ＝ {p.pm}人月
                  </span>
                )}
              </div>
              <div className="mt-1 flex h-4 gap-px overflow-hidden rounded bg-gray-200">
                {Array.from({ length: p.pm }, (_, k) => (
                  <span key={k} className={`flex-1 ${on ? `bg-brand-500 ${styles.pop}` : "bg-brand-200"}`} style={{ animationDelay: `${k * 40}ms` }} />
                ))}
              </div>
            </div>
          );
        })}
        {b >= 4 && (
          <div className={`rounded-xl bg-white px-3 py-2 text-center text-lg font-bold ring-2 ring-brand-400 ${styles.pop}`} data-testid="est-phase-total">
            10 ＋ 20 ＋ 12 ＝ <span className="text-brand-600">{total}人月</span>
          </div>
        )}
        {b >= 5 && (
          <Note>
            💡 生産性の数字を<b>先に足したり平均したりしない</b>（60 ÷ (6＋3＋5) は意味のない数）。<b>工程ごとに割る → 足す</b>の順です。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 途中で人数が変わる ― 面積（総工数）は変わらない
// ---------------------------------------------------------------------------

const DAYS = 10;
const EARLY = 5; // 人が足りない日数
const PLAN = 6; // 計画の人数
const SHORT = 4; // 最初の5日に確保できた人数
const AFTER = 8; // 5日目以降に必要な人数
const STAFF_DELAYS = [1400, 1500, 1500, 1600, 1600];

export function StaffChangeStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, STAFF_DELAYS);
  const shortage = b >= 1;
  const after = b >= 3;
  return (
    <Panel>
      <SectionTitle step={5}>途中で人数が変わったら？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        計画は<b className="text-gray-800">6人で10日</b>。ところが<b className="text-gray-800">最初の5日は4人</b>しか来られない。10日で終えるには、6日目から何人いればいい？
        （1マス＝<b className="text-gray-800">1人日</b>：1人が1日でできる量）
      </p>

      <div ref={ref} className="mt-3" data-testid="est-staff" data-beat={b}>
        <div className="mx-auto w-fit">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${DAYS}, auto)` }}>
            {Array.from({ length: AFTER }, (_, r) =>
              Array.from({ length: DAYS }, (_, d) => {
                const planned = r < PLAN;
                let on = false;
                let tone: "brand" | "emerald" | "rose" | "amber" = "brand";
                if (d < EARLY) {
                  if (!shortage) on = planned;
                  else if (r < SHORT) on = true;
                  else if (planned) {
                    // 足りなかった分。最後まで赤で残し、後ろの緑（増やした分）と見比べる
                    on = true;
                    tone = "rose";
                  }
                } else {
                  if (!after) on = planned;
                  else {
                    on = true;
                    tone = r < PLAN ? "brand" : "emerald";
                  }
                }
                return <Cell key={`${r}-${d}`} on={on} tone={tone} small delay={after && d >= EARLY ? (d - EARLY) * 70 : 0} />;
              }),
            )}
          </div>
          <div className="mt-1 grid text-center text-[9px] font-bold text-gray-400" style={{ gridTemplateColumns: `${EARLY}fr ${DAYS - EARLY}fr` }}>
            <span>1〜5日目</span>
            <span>6〜10日目</span>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-center text-sm font-bold">
          <p className="text-gray-700">
            計画の総工数：6人 × 10日 ＝ <span className="text-brand-700">60人日</span>
          </p>
          {shortage && (
            <p className={`text-gray-700 ${styles.reveal}`} data-testid="est-staff-done">
              最初の5日でできた分：4人 × 5日 ＝ 20人日
              <span className="block text-[11px] text-rose-600">（赤＝足りなかった 2人 × 5日 ＝ 10人日）</span>
            </p>
          )}
          {b >= 2 && (
            <p className={`text-gray-800 ${styles.reveal}`} data-testid="est-staff-rest">
              残り：60 − 20 ＝ <span className="text-brand-700">40人日</span>
            </p>
          )}
          {after && (
            <p className={`rounded-xl bg-white px-3 py-2 text-lg ring-2 ring-emerald-400 ${styles.pop}`} data-testid="est-staff-answer">
              40 ÷ 5日 ＝ <span className="text-emerald-600">8人</span>
            </p>
          )}
        </div>
        {b >= 5 && (
          <Note>
            💡 人数が変わっても<b>仕事の総量（面積）は同じ</b>。<b>総工数 → できた分を引く → 残りの日数で割る</b>。赤い不足分（10人日）が、後ろの緑の2人×5日に移っただけです。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 見積手法の使い分け
// ---------------------------------------------------------------------------

const M = {
  analogy: "類推見積法",
  fp: "FP法",
  bottomUp: "積上げ法",
  loc: "LOC法",
};

type Scene = { emoji: string; text: string; choices: Choice[] };

export const METHOD_SCENES: Scene[] = [
  {
    emoji: "🗓️",
    text: "計画のごく初期。中身はまだ決まっていないが「明日までにざっくり費用を」と言われた。似たシステムを作った実績はある。",
    choices: [
      { label: M.analogy, ok: true },
      { label: M.fp, why: "FP法は画面・帳票などの機能が出そろってから数えます。まだ中身が決まっていない段階では数えられません。" },
      { label: M.bottomUp, why: "積上げ法は作業を全部洗い出してから足すので、手間がかかり「明日までに概算」には向きません。" },
      { label: M.loc, why: "LOC法は作るプログラムの行数を見込む方法。まだ中身が決まっておらず行数も読めません。" },
    ],
  },
  {
    emoji: "🧩",
    text: "要件定義で「画面12・帳票5・データ4」と機能が出そろった。利用者にも説明しやすい根拠で規模を出したい。",
    choices: [
      { label: M.fp, ok: true },
      { label: M.analogy, why: "類推は過去の似た案件と比べる方法。ここでは出そろった機能の数と複雑さを数えるのが合います。" },
      { label: M.bottomUp, why: "積上げ法は「作業」を足す方法。ここで分かっているのは利用者から見た「機能」の数です。" },
      { label: M.loc, why: "LOC法は行数から見積もる方法。行数は利用者に説明しにくく、機能から数えるのはFP法です。" },
    ],
  },
  {
    emoji: "🧱",
    text: "WBSで作業が細かく洗い出せた。一つひとつの作業の工数を見積もって合計し、精度の高い見積りを作る。",
    choices: [
      { label: M.bottomUp, ok: true },
      { label: M.analogy, why: "類推は過去案件との比較でざっくり出す方法。作業ごとに足すのは積上げ法（ボトムアップ見積法）です。" },
      { label: M.fp, why: "FP法は機能を数える方法。作業ごとの工数を合計するのは積上げ法です。" },
      { label: M.loc, why: "LOC法は行数を見込む方法。作業ごとの工数を合計するのは積上げ法です。" },
    ],
  },
  {
    emoji: "📜",
    text: "作るプログラムのおおよその行数（ステップ数）を見込み、生産性で割って工数を出す。",
    choices: [
      { label: M.loc, ok: true },
      { label: M.fp, why: "FP法は機能を数える方法で、行数は使いません。行数から見積もるのはLOC法（プログラムステップ法）です。" },
      { label: M.analogy, why: "類推は過去の似た案件と比べる方法。行数を見込むのはLOC法です。" },
      { label: M.bottomUp, why: "積上げ法は作業を足す方法。行数を見込むのはLOC法です。" },
    ],
  },
];

const TIMELINE = [
  { name: M.analogy, when: "計画の初期", merit: "速い・粗い", key: "過去の似た案件" },
  { name: M.fp, when: "機能が見えたら", merit: "説明しやすい", key: "機能の数と複雑さ" },
  { name: M.loc, when: "規模が読めたら", merit: "計算しやすい", key: "プログラムの行数" },
  { name: M.bottomUp, when: "作業が見えたら", merit: "精度高い・手間大", key: "作業ごとの工数の合計" },
];


export function MethodStage() {
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const all = answered.size === METHOD_SCENES.length;
  return (
    <Panel>
      <SectionTitle step={6}>見積手法は「今、何が分かっているか」で選ぶ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">プロジェクトの場面ごとに、使う手法を選んでみよう。</p>

      <ul className="mt-3 space-y-2.5" data-testid="est-method" data-answered={answered.size}>
        {METHOD_SCENES.map((s, i) => (
          <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-sm font-bold leading-relaxed text-gray-800">
              <span aria-hidden>{s.emoji} </span>
              {s.text}
            </p>
            <div className="mt-2">
              <Choices choices={placeAnswer(s.choices, i * 3 + 2)} cols={2} onAnswer={() => setAnswered((cur) => new Set(cur).add(i))} testId={`est-method-${i}`} />
            </div>
          </li>
        ))}
      </ul>

      {all && (
        <div className={`mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-200 ${styles.reveal}`} data-testid="est-method-timeline">
          <div className="text-[11px] font-bold text-gray-500">プロジェクトが進むほど、分かることが増える →</div>
          <ol className="mt-2 space-y-1.5">
            {TIMELINE.map((t, i) => (
              <li key={t.name} className="flex items-center gap-2 text-xs">
                <span className="w-20 flex-none rounded bg-brand-50 px-1.5 py-1 text-center font-bold text-brand-700" style={{ marginLeft: `${i * 6}px` }}>
                  {t.name}
                </span>
                <span className="text-gray-700">
                  <b>{t.key}</b>
                  <span className="text-gray-400">（{t.when}・{t.merit}）</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            ※ 積上げ法＝<b>ボトムアップ見積法</b>、LOC法＝<b>プログラムステップ法</b>とも呼ばれます。
          </p>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 確認5問
// ---------------------------------------------------------------------------

export const ESTIMATION_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 人月の逆算",
    prompt: "20人月の仕事を4人で担当する。単純計算で何か月かかる？",
    choices: [
      { label: "5か月", ok: true },
      { label: "80か月", why: "掛けています。求めたいのは期間（辺の長さ）なので、工数 ÷ 人数。", step: 1 },
      { label: "16か月", why: "人数を引いています。工数 ＝ 人数 × 期間 なので、期間は割り算で出します。", step: 1 },
    ],
    solution: "① 期間を求める → ② 20 ÷ 4 ＝ 5か月",
  },
  {
    level: "Lv.2 生産性",
    prompt: "90kステップのプログラムを作る。生産性が1人月あたり3kステップのとき、工数は何人月？",
    choices: [
      { label: "30人月", ok: true },
      { label: "270人月", why: "掛けています。全体の量を「1人月でできる量」で割ると、束の数＝人月になります。", step: 1 },
      { label: "約0.03人月", why: "割る向きが逆です（3 ÷ 90）。全体の量 ÷ 1人月でできる量。", step: 1 },
    ],
    solution: "② 90 ÷ 3 ＝ 30人月",
  },
  {
    level: "Lv.3 本試験レベル（工程ごと）",
    prompt: "60kステップのソフトウェアを開発する。生産性（kステップ/人月）は設計工程が5、製造工程が3のとき、開発全体の工数は何人月か。",
    choices: [
      { label: "32人月", ok: true },
      { label: "7.5人月", why: "生産性を先に足しています（60 ÷ 8）。工程ごとに割ってから足します。", step: 2 },
      { label: "20人月", why: "製造工程の分（60 ÷ 3）だけです。設計工程の 60 ÷ 5 ＝ 12 も足します。", step: 2 },
      { label: "12人月", why: "設計工程の分（60 ÷ 5）だけです。製造工程の 60 ÷ 3 ＝ 20 も足します。", step: 2 },
    ],
    solution: "② 設計 60 ÷ 5 ＝ 12、製造 60 ÷ 3 ＝ 20 → ③ 12 ＋ 20 ＝ 32人月",
  },
  {
    level: "Lv.4 本試験レベル（人数が変わる）",
    prompt: "8名で12日間かかる計画を立てた。しかし最初の4日間は6名しか確保できない。12日間で終えるには、5日目以降は何名必要か。各要員の生産性は同じとする。",
    choices: [
      { label: "9名", ok: true },
      { label: "8名", why: "計画どおりの人数では、最初の4日の不足分（2名×4日＝8人日）が残ります。", step: 0 },
      { label: "10名", why: "不足した2名をそのまま足しています。不足分8人日は、残り8日に分けると1日1名分です。", step: 1 },
    ],
    solution: "① 総工数 8 × 12 ＝ 96人日 → できた分 6 × 4 ＝ 24 → 残り 72 → ② 72 ÷ 8日 ＝ 9名",
  },
  {
    level: "Lv.5 手法を選ぶ",
    prompt: "新規プロジェクトの計画段階で、短期間で概算費用を見積もりたい。最も適切な方法は？",
    choices: [
      { label: "類似プロジェクトを参考に見積もる", ok: true },
      { label: "FP法で機能を数えて見積もる", why: "計画段階では機能がまだ出そろっておらず、数えられません。", step: 0 },
      { label: "作業ごとに見積もって合算する", why: "積上げ法は精度が高いが手間がかかり、短期の概算には向きません。", step: 0 },
      { label: "コードの行数を基に見積もる", why: "計画段階では行数も読めません。", step: 0 },
    ],
    solution: "① 初期・短期間・概算 → 過去の似た案件と比べる類推見積法",
    cols: 2,
  },
];

export function EstimationPractice() {
  return (
    <LeveledPractice
      step={7}
      title="確認問題：5段階で本試験レベルへ"
      steps={ESTIMATION_STEPS}
      questions={ESTIMATION_QUESTIONS}
      testId="est-practice"
      done={
        <>
          🎉 ここまで解ければ、本試験の見積りの問題に対応できます。計算は<b>工数＝人数×期間（面積）</b>、手法は<b>今何が分かっているか</b>で選ぶ。
        </>
      }
    />
  );
}
