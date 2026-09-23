"use client";

import type { ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「意思決定と問題解決の手法」。手法の暗記ではなく「どの役割の道具か」で見分ける。
//   ① 役割マップ：発散 → 整理 → 重点把握 → 原因分析 の流れ＋別レーンの「意見収束（デルファイ法）」
//   ② 発散：ブレーンストーミング（話す）と ブレーンライティング（書いて回す）の違い（静的）
//   ③ 整理：親和図法。ばらばらのカードが似たもの同士に集まる（1回だけ動く）
//   ④ 重点把握：パレート図。多い順の棒 → 累積の折れ線 → 上位で8割（段階表示）
//   ⑤ 原因分析：特性要因図。結果 → 大骨 → 小骨（段階表示）
//   ⑥ 意見収束：デルファイ法。匿名回答を集計して返すたびに、予測のばらつきが縮む（静的）
//   ⑦ 試験ポイント
// 例はすべて「パン屋の苦情」でつなぐ（②で出た声を③で整理 → ④で最大の苦情を選ぶ → ⑤でその原因を掘る）。

export default function DecisionMethodsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🧭 6つの手法は<b>「何のための道具か」</b>で分かれます。パン屋の苦情を減らす話を例に、道具を順番に使っていきます。
      </Lead>
      <RoleMapPanel />
      <DivergePanel />
      <AffinityPanel />
      <ParetoPanel />
      <FishbonePanel />
      <DelphiPanel />
      <PointsPanel
        step={7}
        points={[
          <>案を<b>広げる</b>＝ブレーンストーミング／ブレーンライティング</>,
          <>似たものを<b>まとめる</b>＝親和図法、<b>多い順に絞る</b>＝パレート図、<b>原因を掘る</b>＝特性要因図</>,
          <>専門家の匿名回答を繰り返して<b>予測をまとめる</b>＝デルファイ法</>,
        ]}
        traps={[
          ["パレート図で原因の構造を調べる", "パレート図は多い順に並べて重点を決める図。原因の構造は特性要因図"],
          ["ブレーンストーミングで出た案をその場で批判する", "批判せず、とにかく量を出す"],
          ["デルファイ法はアイデアを広げる手法", "専門家の意見を繰り返し集めて収束させる手法"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 役割マップ
// ---------------------------------------------------------------------------

const ROLES: { role: string; goal: string; tools: string; icon: ReactNode }[] = [
  { role: "発散", goal: "案をたくさん出す", tools: "ブレーンストーミング\nブレーンライティング", icon: <MiniBubbles /> },
  { role: "整理", goal: "似た案をまとめる", tools: "親和図法", icon: <MiniAffinity /> },
  { role: "重点把握", goal: "どれから手を付けるか", tools: "パレート図", icon: <MiniPareto /> },
  { role: "原因分析", goal: "なぜ起きるかを掘る", tools: "特性要因図", icon: <MiniFishbone /> },
];

function RoleMapPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>役割マップ ― 道具は4＋1の役割</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">左の役割がわかれば、使う道具が決まります。</p>
      <ol className="mt-3" data-testid="decision-rolemap">
        {ROLES.map((r, i) => (
          <li key={r.role}>
            {i > 0 && (
              <div className="ml-9 text-sm leading-none text-gray-400" aria-hidden>
                ↓
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 ring-1 ring-gray-200">
              <div className="grid w-[4.5rem] flex-none place-items-center self-stretch rounded-lg bg-brand-600 px-1 text-center text-[13px] font-bold leading-tight text-white">
                {r.role}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-gray-500">{r.goal}</div>
                <div className="whitespace-pre-line text-[13px] font-bold leading-snug text-gray-800">{r.tools}</div>
              </div>
              <div className="flex-none">{r.icon}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-xl border-2 border-dashed border-gray-300 p-1.5">
        <Caption className="px-1">別の目的（上の流れとは別レーン）</Caption>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-white p-1.5 ring-1 ring-gray-200">
          <div className="grid w-[4.5rem] flex-none place-items-center self-stretch rounded-lg bg-gray-700 px-1 text-center text-[13px] font-bold leading-tight text-white">
            意見収束
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-gray-500">専門家の予測をまとめる</div>
            <div className="text-[13px] font-bold text-gray-800">デルファイ法</div>
          </div>
          <MiniDelphi />
        </div>
      </div>
    </Panel>
  );
}

// ミニ図（役割マップ用・装飾ではなく各手法の「形」そのもの）
function MiniSvg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 56 36" className="h-9 w-14" role="img" aria-label={label}>
      {children}
    </svg>
  );
}
function MiniBubbles() {
  return (
    <MiniSvg label="吹き出しがたくさん">
      {[
        [8, 10],
        [26, 7],
        [44, 11],
        [16, 26],
        [36, 26],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="8" ry="5.5" className="fill-brand-100 stroke-brand-400" strokeWidth="1" />
      ))}
    </MiniSvg>
  );
}
function MiniAffinity() {
  return (
    <MiniSvg label="カードを3つの島にまとめる">
      {[4, 22, 40].map((x) => (
        <g key={x}>
          <rect x={x} y="3" width="13" height="30" rx="2" className="fill-none stroke-gray-300" strokeDasharray="2 2" />
          <rect x={x + 2} y="7" width="9" height="7" rx="1" className="fill-accent-200" />
          <rect x={x + 2} y="16" width="9" height="7" rx="1" className="fill-accent-200" />
          <rect x={x + 2} y="25" width="9" height="5" rx="1" className="fill-accent-200" />
        </g>
      ))}
    </MiniSvg>
  );
}
function MiniPareto() {
  const hs = [26, 15, 9, 5, 3];
  return (
    <MiniSvg label="多い順の棒と累積の折れ線">
      {hs.map((h, i) => (
        <rect key={i} x={4 + i * 10} y={34 - h} width="8" height={h} className={i < 2 ? "fill-brand-500" : "fill-brand-200"} />
      ))}
      <polyline points="8,8 18,4 28,3 38,2 48,1.5" className="fill-none stroke-accent-500" strokeWidth="1.5" />
    </MiniSvg>
  );
}
function MiniFishbone() {
  return (
    <MiniSvg label="魚の骨の形">
      <line x1="3" y1="18" x2="42" y2="18" className="stroke-gray-600" strokeWidth="1.5" />
      {[10, 26].map((x) => (
        <g key={x}>
          <line x1={x} y1="5" x2={x + 8} y2="18" className="stroke-gray-500" strokeWidth="1.2" />
          <line x1={x} y1="31" x2={x + 8} y2="18" className="stroke-gray-500" strokeWidth="1.2" />
        </g>
      ))}
      <rect x="42" y="11" width="12" height="14" rx="2" className="fill-rose-200 stroke-rose-400" />
    </MiniSvg>
  );
}
function MiniDelphi() {
  return (
    <MiniSvg label="ばらつきが回を追うごとに縮む">
      {[
        [4, 52],
        [14, 42],
        [22, 34],
      ].map(([a, b], row) => (
        <g key={row}>
          <line x1={a} y1={7 + row * 11} x2={b} y2={7 + row * 11} className="stroke-gray-300" strokeWidth="1" />
          {[0, 0.5, 1].map((t) => (
            <circle key={t} cx={a + (b - a) * t} cy={7 + row * 11} r="2.3" className="fill-gray-600" />
          ))}
        </g>
      ))}
    </MiniSvg>
  );
}

// ---------------------------------------------------------------------------
// ② 発散：話す か 書いて回す か
// ---------------------------------------------------------------------------

function DivergePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>発散 ― 話して出す／書いて回す</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">どちらも<b className="text-gray-800">批判せず、質より量</b>。違いは「声に出すか、紙に書くか」だけです。</p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="decision-diverge">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">ブレーンストーミング</div>
          <svg viewBox="0 0 140 90" className="mt-1 w-full" role="img" aria-label="4人が机を囲み、次々に発言している">
            <rect x="45" y="35" width="50" height="22" rx="4" className="fill-gray-200" />
            {[
              [30, 46, "🙂"],
              [110, 46, "🙂"],
              [70, 80, "🙂"],
              [70, 18, "🙂"],
            ].map(([x, y, e], i) => (
              <text key={i} x={x} y={y} textAnchor="middle" fontSize="16">
                {e}
              </text>
            ))}
            {[
              [4, 14, "駐車場!"],
              [84, 14, "新商品!"],
              [84, 86, "早朝営業"],
              [4, 86, "値下げ?"],
            ].map(([x, y, t], i) => (
              <g key={i}>
                <rect x={Number(x) - 4} y={Number(y) - 11} width={String(t).length * 11 + 8} height="15" rx="7" className="fill-white stroke-brand-300" />
                <text x={x} y={y} fontSize="11" className="fill-brand-800 font-bold">
                  {t}
                </text>
              </g>
            ))}
          </svg>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">その場で<b>発言</b>。他人の案に乗っかってよい。</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">ブレーンライティング</div>
          <svg viewBox="0 0 140 90" className="mt-1 w-full" role="img" aria-label="各自が用紙に書いて隣へ回す">
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={8 + i * 44} y="14" width="36" height="46" rx="3" className="fill-white stroke-gray-400" />
                {[0, 1, 2].map((r) => (
                  <line key={r} x1={13 + i * 44} y1={24 + r * 11} x2={39 + i * 44} y2={24 + r * 11} className="stroke-brand-300" strokeWidth="2" />
                ))}
                {i < 2 && <text x={46 + i * 44} y="42" fontSize="12" className="fill-accent-600 font-bold">→</text>}
              </g>
            ))}
            <text x="70" y="80" textAnchor="middle" fontSize="11" className="fill-gray-600 font-bold">
              書いたら隣へ回す
            </text>
          </svg>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">各自が<b>紙に書く</b>。発言が苦手な人の案も同じだけ集まる。</p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 整理：親和図法
// ---------------------------------------------------------------------------

const CARDS = [
  { t: "レジが遅い", g: 0, from: [4, 8] },
  { t: "並ぶ時間が長い", g: 0, from: [54, 60] },
  { t: "注文で迷う", g: 0, from: [30, 84] },
  { t: "夕方に売切れ", g: 1, from: [62, 6] },
  { t: "種類が少ない", g: 1, from: [6, 58] },
  { t: "席が狭い", g: 2, from: [36, 34] },
  { t: "店内が暗い", g: 2, from: [68, 88] },
];
const GROUPS = ["待ち時間", "品ぞろえ", "店内"];
const AFFINITY_DELAYS = [1100];

function AffinityPanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(2, AFFINITY_DELAYS);
  const grouped = beat >= 1;
  const slot = CARDS.map((c, i) => CARDS.slice(0, i).filter((d) => d.g === c.g).length);
  return (
    <Panel>
      <SectionTitle step={3}>整理 ― 親和図法で似たもの同士に</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">発散で出た声をカードにして、<b className="text-gray-800">意味が近いものを集め、グループに名前</b>を付けます。</p>
      <div ref={ref} className="relative mt-3 h-40 rounded-xl bg-gray-50 ring-1 ring-gray-200" data-testid="decision-affinity" data-beat={beat}>
        {GROUPS.map((g, i) => (
          <div
            key={g}
            className={`absolute top-1.5 w-[31%] rounded-md bg-brand-600 py-0.5 text-center text-[12px] font-bold text-white transition-opacity duration-500 ${grouped ? "opacity-100" : "opacity-0"}`}
            style={{ left: `${1.5 + i * 33}%` }}
          >
            {g}
          </div>
        ))}
        {CARDS.map((c, i) => (
          <div
            key={c.t}
            className="absolute w-[31%] rounded bg-accent-100 px-1 py-1 text-center text-[11px] font-bold leading-tight text-accent-800 shadow-sm ring-1 ring-accent-200"
            style={{
              left: `${grouped ? 1.5 + c.g * 33 : c.from[0] * 0.68}%`,
              top: `${grouped ? 21 + slot[i] * 24 : c.from[1] * 0.8}%`,
              transition: reducedMotion ? undefined : "left 800ms cubic-bezier(0.45,0.05,0.25,1), top 800ms cubic-bezier(0.45,0.05,0.25,1)",
            }}
          >
            {c.t}
          </div>
        ))}
      </div>
      {grouped && <Note>💡 数を数えるのではなく、<b>言葉の意味の近さ</b>でまとめるのが親和図法。</Note>}
      <Replay onClick={replay} hidden={reducedMotion} />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 重点把握：パレート図
// ---------------------------------------------------------------------------

const PARETO = [
  { t: "待ち時間", n: 45 },
  { t: "接客", n: 25 },
  { t: "品切れ", n: 15 },
  { t: "価格", n: 8 },
  { t: "駐車場", n: 5 },
  { t: "その他", n: 2 },
];
const PARETO_DELAYS = [900, 1300, 1300];
// 合計100件なので、棒（件数）と折れ線（累積%）が同じ目盛りで読める
const PX = 40;
const PW = 42;
const PY0 = 150;
const PH = 130;

function ParetoPanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(4, PARETO_DELAYS);
  let acc = 0;
  const cum = PARETO.map((p) => (acc += p.n));
  const pts = cum.map((c, i) => `${PX + i * PW + PW / 2},${PY0 - (c / 100) * PH}`).join(" ");
  return (
    <Panel>
      <SectionTitle step={4}>重点把握 ― パレート図で「上位で8割」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">苦情100件を種類別に数え、<b className="text-gray-800">多い順</b>に並べます。</p>
      <div ref={ref} data-testid="decision-pareto" data-beat={beat}>
        <svg viewBox="0 0 300 190" className="mt-2 w-full" role="img" aria-label="パレート図。待ち時間45件、接客25件で累積70%、品切れまでで85%">
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PX} x2={PX + PW * 6} y1={PY0 - (v / 100) * PH} y2={PY0 - (v / 100) * PH} className="stroke-gray-200" />
              <text x={PX - 4} y={PY0 - (v / 100) * PH + 4} textAnchor="end" fontSize="11" className="fill-gray-500">
                {v}
              </text>
            </g>
          ))}
          <text x="4" y="14" fontSize="11" className="fill-gray-500">件・%</text>
          {PARETO.map((p, i) => {
            const top = i < 2 && beat >= 3;
            return (
              <g key={p.t}>
                {beat >= 1 && (
                  <rect
                    x={PX + i * PW + 5}
                    y={PY0 - (p.n / 100) * PH}
                    width={PW - 10}
                    height={(p.n / 100) * PH}
                    className={`${top ? "fill-brand-600" : beat >= 3 ? "fill-brand-200" : "fill-brand-400"} ${styles.reveal}`}
                    style={{ animationDelay: `${i * 90}ms`, transition: "fill 400ms" }}
                  />
                )}
                <text x={PX + i * PW + PW / 2} y={PY0 + 14} textAnchor="middle" fontSize="11" className="fill-gray-700 font-bold">
                  {p.t}
                </text>
                {beat >= 1 && (
                  // 1本目の棒の上端は累積の折れ線の始点と重なるので、背の高い棒は数を棒の中に書く
                  <text
                    x={PX + i * PW + PW / 2}
                    y={p.n >= 15 ? PY0 - (p.n / 100) * PH + 14 : PY0 - (p.n / 100) * PH - 3}
                    textAnchor="middle"
                    fontSize="11"
                    className={`${p.n >= 15 ? "fill-white" : "fill-gray-700"} font-bold ${styles.reveal}`}
                  >
                    {p.n}
                  </text>
                )}
              </g>
            );
          })}
          {beat >= 2 && (
            <>
              <polyline points={pts} pathLength={1} className={`fill-none stroke-accent-500 ${styles.draw}`} strokeWidth="2.5" />
              {cum.map((c, i) => (
                <circle key={i} cx={PX + i * PW + PW / 2} cy={PY0 - (c / 100) * PH} r="3" className={`fill-accent-500 ${styles.fadeLate}`} />
              ))}
              <text x={PX + 1 * PW + PW / 2 + 6} y={PY0 - 0.7 * PH + 14} fontSize="11" className={`fill-accent-700 font-bold ${styles.fadeLate}`}>
                累積70%
              </text>
            </>
          )}
          {beat >= 3 && (
            <line x1={PX} x2={PX + PW * 6} y1={PY0 - 0.8 * PH} y2={PY0 - 0.8 * PH} className={`stroke-rose-400 ${styles.reveal}`} strokeDasharray="4 3" />
          )}
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] font-bold text-gray-600">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-brand-400" />件数（棒）</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-accent-500" />累積比率（折れ線）</span>
        </div>
        {beat >= 3 && (
          <Note>
            💡 上位2項目だけで全体の約7割、3項目で8割超。<b>まず「待ち時間」から手を付ける</b>と一番効く――これがパレート図の使い方（ABC分析にも使う）。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 原因分析：特性要因図
// ---------------------------------------------------------------------------

const BONES = [
  { cat: "人", cause: "新人が多い", top: true, x: 60 },
  { cat: "方法", cause: "注文手順が複雑", top: true, x: 160 },
  { cat: "設備", cause: "レジが1台", top: false, x: 60 },
  { cat: "材料", cause: "仕込み不足", top: false, x: 160 },
];
const FISH_DELAYS = [900, 1100, 1100];

function FishbonePanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(4, FISH_DELAYS);
  return (
    <Panel>
      <SectionTitle step={5}>原因分析 ― 特性要因図（魚の骨）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        パレート図で一番多かった<b className="text-gray-800">「待ち時間が長い」</b>を頭（結果）に置き、原因を骨の形で掘り下げます。
      </p>
      <div ref={ref} data-testid="decision-fishbone" data-beat={beat}>
        <svg viewBox="0 0 300 200" className="mt-2 w-full" role="img" aria-label="特性要因図。結果「待ち時間が長い」に、人・方法・設備・材料の大骨と、具体的な原因の小骨がつながる">
          {/* 背骨と頭 */}
          <line x1="8" y1="100" x2="222" y2="100" className="stroke-gray-700" strokeWidth="3" />
          <path d="M222 100 L214 94 M222 100 L214 106" className="stroke-gray-700" strokeWidth="3" />
          <rect x="224" y="78" width="72" height="44" rx="6" className="fill-rose-100 stroke-rose-400" strokeWidth="1.5" />
          <text x="260" y="96" textAnchor="middle" fontSize="12" className="fill-rose-800 font-bold">待ち時間</text>
          <text x="260" y="112" textAnchor="middle" fontSize="12" className="fill-rose-800 font-bold">が長い</text>
          <text x="260" y="136" textAnchor="middle" fontSize="11" className="fill-gray-500">結果（特性）</text>

          {BONES.map((b, i) => {
            const y1 = b.top ? 26 : 174;
            const x2 = b.x + 50;
            return (
              <g key={b.cat}>
                {beat >= 2 && (
                  <g className={styles.reveal} style={{ animationDelay: `${i * 120}ms` }}>
                    <line x1={b.x} y1={y1} x2={x2} y2="100" className="stroke-gray-500" strokeWidth="2" />
                    <rect x={b.x - 22} y={b.top ? y1 - 20 : y1} width="44" height="20" rx="4" className="fill-brand-600" />
                    <text x={b.x} y={b.top ? y1 - 6 : y1 + 14} textAnchor="middle" fontSize="12" className="fill-white font-bold">
                      {b.cat}
                    </text>
                  </g>
                )}
                {beat >= 3 && (
                  <g className={styles.reveal} style={{ animationDelay: `${i * 150}ms` }}>
                    <line x1={b.x + 25} y1={b.top ? 63 : 137} x2={b.x - 38} y2={b.top ? 63 : 137} className="stroke-gray-400" strokeWidth="1.5" />
                    <text x={b.x + 20} y={b.top ? 58 : 152} textAnchor="end" fontSize="11" className="fill-gray-800 font-bold">
                      {b.cause}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {beat < 2 && (
            <text x="110" y="90" textAnchor="middle" fontSize="11" className="fill-gray-400">
              ← 原因をここに枝分かれで書く
            </text>
          )}
        </svg>
        <div className="mt-1 text-[11px] font-bold text-gray-500">
          大骨＝原因の大分類（人・方法・設備・材料など）／小骨＝具体的な原因
        </div>
        {beat >= 3 && (
          <Note>
            💡 パレート図は<b>「どれが多いか」</b>、特性要因図は<b>「なぜ起きるか」</b>。形（棒グラフ／魚の骨）で見分けられます。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 意見収束：デルファイ法
// ---------------------------------------------------------------------------

const DELPHI_ROUNDS = [
  { label: "1回目", years: [2029, 2031, 2033, 2036, 2040, 2044] },
  { label: "2回目", years: [2031, 2032, 2033, 2035, 2037, 2039] },
  { label: "3回目", years: [2032, 2033, 2033, 2034, 2035, 2035] },
];
const Y0 = 2028;
const Y1 = 2045;

function DelphiPanel() {
  return (
    <Panel>
      <SectionTitle step={6}>意見収束 ― デルファイ法</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「無人レジが普及するのは何年？」を専門家6人に<b className="text-gray-800">匿名</b>で聞き、集計結果を見せてもう一度聞く――を繰り返します。
      </p>
      <div className="mt-3 space-y-1" data-testid="decision-delphi">
        {DELPHI_ROUNDS.map((r, i) => {
          const min = Math.min(...r.years);
          const max = Math.max(...r.years);
          const pos = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100;
          return (
            <div key={r.label}>
              {i > 0 && (
                <div className="ml-12 text-[11px] font-bold text-accent-700">
                  ↓ 集計（中央値・ばらつき）を全員に返して、再回答
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-10 flex-none text-[12px] font-bold text-gray-700">{r.label}</div>
                <div className="relative h-7 flex-1 rounded-md bg-gray-50 ring-1 ring-gray-200">
                  <div className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-brand-100" style={{ left: `${pos(min)}%`, width: `${pos(max) - pos(min)}%` }} />
                  {r.years.map((y, k) => {
                    // 同じ年の回答は上下にずらして重ねない
                    const same = r.years.filter((v) => v === y).length;
                    const nth = r.years.slice(0, k).filter((v) => v === y).length;
                    const dy = same === 1 ? -50 : nth === 0 ? -105 : 5;
                    return (
                      <span
                        key={k}
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-600 ring-2 ring-white"
                        style={{ left: `${pos(y)}%`, transform: `translate(-50%, ${dy}%)` }}
                        aria-hidden
                      />
                    );
                  })}
                </div>
                <div className="w-[4.6rem] flex-none whitespace-nowrap text-right text-[11px] font-bold tabular-nums text-gray-600">
                  {min}〜{max}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between pl-12 pr-[5.1rem] text-[11px] text-gray-400" aria-hidden>
          <span>{Y0}</span>
          <span>{Y1}</span>
        </div>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        💡 案を<b className="text-gray-800">広げる</b>のではなく、専門家の予測を<b className="text-gray-800">1つにまとめていく</b>手法。匿名なので、声の大きい人に引っぱられません。
      </p>
    </Panel>
  );
}
