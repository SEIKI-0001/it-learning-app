import stage from "../scene/stage.module.css";
import styles from "./requirements.module.css";

// 「曖昧な要求 → 認識ズレ → 手戻り」と「要件を足すほど認識がそろう」を1つのステージで見せる。
//   左＝依頼者の頭の中（固定）、右＝開発者の理解（変わる）、上＝完成イメージの一致度。
//   曖昧：言葉にしなかった条件は届かず、開発者は想像で埋める → 完成物が「これじゃない」→ 工程を逆走。
//   明確：要件カードが1枚ずつ渡るたびに開発者の画面が変わり、一致度が伸び、
//         カードは完成物の周りに「機能要件／非機能要件」として積み上がる。

export type ReqMode = "vague" | "clear";

type Device = "phone" | "pc" | "unknown";
type Tri = boolean | null; // null = まだ決まっていない（想像もしていない）
export type Picture = { device: Device; calendar: Tri; cancel: Tri; fast: Tri };

export const CLIENT: Picture = { device: "phone", calendar: true, cancel: true, fast: true };
const BLANK: Picture = { device: "unknown", calendar: null, cancel: null, fast: null };
/** 「使いやすい予約システム」だけを聞いた開発者の解釈 */
const GUESS: Picture = { device: "pc", calendar: true, cancel: false, fast: false };

export const REQS = [
  { key: "calendar", text: "予約日時を選べる", kind: "機能", note: "何ができるか" },
  { key: "cancel", text: "キャンセルできる", kind: "機能", note: "何ができるか" },
  { key: "device", text: "スマホで使える", kind: "非機能", note: "使いやすさ" },
  { key: "fast", text: "3秒以内に表示", kind: "非機能", note: "速さ（性能）" },
] as const;

export const VAGUE_ORDER = "使いやすい予約システムがほしい";

/** 明確モードで phase 枚の要件を渡し終えたときの開発者の理解 */
function clearPicture(phase: number): Picture {
  const given = new Set<string>(REQS.slice(0, phase).map((r) => r.key));
  return {
    device: given.has("device") ? "phone" : "unknown",
    calendar: given.has("calendar") ? true : null,
    cancel: given.has("cancel") ? true : null,
    fast: given.has("fast") ? true : null,
  };
}

export function devPicture(mode: ReqMode, phase: number): Picture {
  if (mode === "clear") return clearPicture(Math.min(phase, REQS.length));
  return phase >= 2 ? GUESS : BLANK;
}

/** 依頼者の頭の中と何項目そろっているか（0〜100%） */
export function matchRate(p: Picture) {
  const same = [
    p.device === CLIENT.device,
    p.calendar === CLIENT.calendar,
    p.cancel === CLIENT.cancel,
    p.fast === CLIENT.fast,
  ].filter(Boolean).length;
  return Math.round((same / 4) * 100);
}

const ROWS: { key: keyof Picture; label: string; show: (p: Picture) => string }[] = [
  { key: "device", label: "画面", show: (p) => (p.device === "phone" ? "スマホ" : p.device === "pc" ? "パソコン" : "？") },
  { key: "calendar", label: "日時選択", show: (p) => (p.calendar === null ? "？" : p.calendar ? "あり" : "なし") },
  { key: "cancel", label: "キャンセル", show: (p) => (p.cancel === null ? "？" : p.cancel ? "あり" : "なし") },
  { key: "fast", label: "表示", show: (p) => (p.fast === null ? "？" : p.fast ? "3秒以内" : "遅い") },
];

function Sketch({ p, compare, testId }: { p: Picture; compare?: boolean; testId: string }) {
  const bad = (k: keyof Picture) => compare === true && p[k] !== CLIENT[k];
  return (
    <div data-testid={testId} data-device={p.device}>
      <div className="grid h-[66px] place-items-center">
        <div className={styles.device} data-device={p.device} data-bad={bad("device") ? "true" : "false"}>
          {p.device === "unknown" && p.calendar === null ? (
            <span className={styles.unknownMark}>？</span>
          ) : (
            <>
              <div className={styles.bar} />
              <div className={styles.screen}>
                {p.calendar && (
                  <div className={`${styles.cal} ${styles.part}`}>
                    {Array.from({ length: 8 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                )}
                {p.cancel && <div className={`${styles.cancel} ${styles.part}`} />}
                {p.fast !== null && <div className={`${p.fast ? styles.fast : styles.slow} ${styles.part}`} />}
              </div>
            </>
          )}
        </div>
      </div>
      <dl className="mt-1.5 space-y-0.5">
        {ROWS.map((r) => {
          const off = bad(r.key);
          const value = r.show(p);
          return (
            <div
              key={r.key}
              className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[10px] leading-tight transition-colors duration-500 ${
                off ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : value === "？" ? "text-gray-400" : "bg-white text-gray-700 ring-1 ring-gray-200"
              }`}
              data-testid={`${testId}-${r.key}`}
              data-bad={off ? "true" : "false"}
            >
              <dt className="font-bold">{r.label}</dt>
              <dd className="font-bold">
                {off && "✕ "}
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function RequirementsStage({
  mode,
  phase,
  reducedMotion,
}: {
  mode: ReqMode;
  /** 曖昧：0=頭の中 1=言葉で伝える 2=開発者が解釈 3=完成 4=手戻り
   *  明確：0=頭の中 1〜4=要件を1枚ずつ渡す 5=完成 */
  phase: number;
  reducedMotion: boolean;
}) {
  const vague = mode === "vague";
  const dev = devPicture(mode, phase);
  const rate = matchRate(dev);
  const built = vague ? phase >= 3 : phase >= REQS.length + 1;
  const flying = vague ? (phase === 1 ? VAGUE_ORDER : null) : phase >= 1 && phase <= REQS.length ? REQS[phase - 1].text : null;
  const given = vague ? [] : REQS.slice(0, Math.min(phase, REQS.length));

  return (
    <div
      className={`${stage.stage} ${styles.stage} p-2.5`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="req-stage"
      data-mode={mode}
      data-phase={phase}
      data-flying={flying && !reducedMotion ? "true" : "false"}
    >
      {/* 一致度メーター */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
        <span className="flex-none">完成イメージの一致度</span>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={styles.meterFill}
            style={{
              width: `${Math.max(rate, 3)}%`,
              backgroundColor: rate === 100 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#f43f5e",
            }}
          />
        </div>
        <span className="w-9 flex-none text-right tabular-nums text-gray-800" data-testid="req-match">
          {rate}%
        </span>
      </div>

      {/* 依頼者の頭の中 ⇄ 開発者の理解 */}
      <div className="relative mt-2 grid grid-cols-[1fr_20%_1fr] items-start gap-1">
        <div className="rounded-xl bg-white p-1.5 ring-1 ring-gray-200">
          <div className="text-center text-[10px] font-bold text-gray-600">🙋 依頼者の頭の中</div>
          <Sketch p={CLIENT} testId="req-client" />
        </div>
        <div className="flex h-full flex-col items-center justify-center text-gray-300" aria-hidden>
          <span className="text-lg">→</span>
        </div>
        <div className="rounded-xl bg-white p-1.5 ring-1 ring-brand-200">
          <div className="text-center text-[10px] font-bold text-brand-700">🧑‍💻 開発者の理解</div>
          <Sketch p={dev} compare={built && vague} testId="req-dev" />
        </div>

        {flying && !reducedMotion && (
          <span
            key={`${mode}-${phase}`}
            className={`${styles.fly} rounded-lg px-1.5 py-1 text-center text-[10px] font-bold leading-tight ring-1 ${
              vague ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
            }`}
            data-testid="req-flying"
          >
            {vague ? "「使いやすい予約システム」" : flying}
          </span>
        )}
      </div>

      {/* 下段：場面ごとの結果 */}
      <div className="mt-2 min-h-[118px] rounded-xl bg-white p-2 ring-1 ring-gray-200">
        {vague && phase === 0 && <Waiting />}
        {vague && phase === 1 && <LostWords />}
        {vague && phase === 2 && (
          <p className="text-center text-[11px] font-bold leading-relaxed text-gray-700">
            💭 「使いやすい＝大きな画面かな」「予約だから日時は選べるはず」
            <br />
            <span className="text-gray-500">言葉にされなかった部分は、開発者の想像で埋まる。</span>
            <br />
            <span className="text-rose-600">⚡ 2人ともズレに気づいていない</span>
          </p>
        )}
        {vague && phase === 3 && (
          <div className="text-center" data-testid="req-verdict">
            <p className="text-[11px] text-gray-500">開発者は理解どおり、真面目に完成させた…</p>
            <p className="mt-1 text-sm font-bold text-rose-700">🙋😣「これじゃない！」</p>
            <p className="mt-1 text-[11px] font-bold text-rose-600">✕ が付いた3か所が、頭の中とズレていた</p>
          </div>
        )}
        {vague && phase >= 4 && <Rework />}

        {!vague && (phase < REQS.length + 1 ? phase === 0 ? <Waiting clear /> : <Stacks given={given} /> : <Stacks given={given} done />)}
      </div>
    </div>
  );
}

function Waiting({ clear }: { clear?: boolean }) {
  return (
    <p className="pt-6 text-center text-[11px] font-bold leading-relaxed text-gray-500">
      頭の中の完成イメージは、まだ開発者には見えていない。
      <br />
      {clear ? "→ 条件を1つずつ「要件」として書き出して渡す" : "→ 言葉で伝えてみる"}
    </p>
  );
}

function LostWords() {
  return (
    <div className="text-[11px]" data-testid="req-lost">
      <div className="font-bold text-gray-700">言葉にしたこと</div>
      <div className="mt-1 flex flex-wrap gap-1">
        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-800 ring-1 ring-rose-200">使いやすい</span>
        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-800 ring-1 ring-rose-200">予約システム</span>
      </div>
      <div className="mt-2 font-bold text-gray-500">言葉にしなかったこと（届かない）</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {["日時の選び方", "キャンセル", "スマホで使う", "表示の速さ"].map((t) => (
          <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-400 line-through">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const PHASES = ["要件定義", "設計", "開発", "テスト"];

function Rework() {
  return (
    <div data-testid="req-rework">
      <div className="relative h-7">
        <div className="absolute inset-x-[6%] top-1/2 h-0.5 -translate-y-1/2 bg-gray-200" />
        <div className="relative grid h-full grid-cols-4 items-center">
          {PHASES.map((t) => (
            <span key={t} className="z-10 mx-auto rounded bg-white px-1 text-[10px] font-bold text-gray-700 ring-1 ring-gray-300">
              {t}
            </span>
          ))}
        </div>
        <span className={styles.runner} aria-hidden />
      </div>
      <p className="mt-1 text-center text-[11px] font-bold text-rose-700">↩ 最初の要件定義まで戻ってやり直し（手戻り）</p>
      <div className="mt-1.5 text-center text-[10px] font-bold text-gray-600">誤りを見つけた工程ごとの「直す手間」</div>
      <div className="mt-0.5 grid grid-cols-4 items-end gap-1" aria-label="誤りを見つけた工程ごとの直す手間">
        {PHASES.map((t, i) => (
          <div key={t} className="flex flex-col items-center">
            <div className={`${styles.cost} w-5 rounded-t ${i === 3 ? "bg-rose-500" : "bg-rose-200"}`} style={{ height: 6 + i * 7 }} />
            <span className="mt-0.5 text-[10px] text-gray-500">{t}</span>
          </div>
        ))}
      </div>
      <p className="mt-0.5 text-center text-[10px] text-gray-500">後の工程で見つかるほど、直す範囲も費用も大きくなる</p>
    </div>
  );
}

function Stacks({ given, done }: { given: readonly (typeof REQS)[number][]; done?: boolean }) {
  const col = (kind: "機能" | "非機能") => given.filter((r) => r.kind === kind);
  return (
    <div data-testid="req-stacks">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
        <StackColumn title="機能要件" sub="何ができるか" items={col("機能")} tone="brand" testId="req-stack-func" />
        <div className="flex w-14 flex-col items-center pb-1">
          {done ? (
            <div className="text-center" data-testid="req-product">
              <div className="text-2xl">📱</div>
              <div className="text-[10px] font-bold text-emerald-700">完成物</div>
            </div>
          ) : (
            <div className="text-center text-[10px] text-gray-400">
              <div className="text-xl opacity-40">📱</div>
              製作前
            </div>
          )}
        </div>
        <StackColumn title="非機能要件" sub="速さ・使いやすさ等" items={col("非機能")} tone="amber" testId="req-stack-nonfunc" />
      </div>
      {done && (
        <p className="mt-1.5 text-center text-sm font-bold text-emerald-700" data-testid="req-verdict">
          🙋😊「これこれ！」 手戻りゼロ
        </p>
      )}
    </div>
  );
}

function StackColumn({
  title,
  sub,
  items,
  tone,
  testId,
}: {
  title: string;
  sub: string;
  items: readonly (typeof REQS)[number][];
  tone: "brand" | "amber";
  testId: string;
}) {
  const chip = tone === "brand" ? "bg-brand-50 text-brand-800 ring-brand-200" : "bg-amber-50 text-amber-900 ring-amber-200";
  return (
    <div data-testid={testId}>
      <div className="flex min-h-[52px] flex-col-reverse gap-1">
        {items.map((r) => (
          <span key={r.key} className={`${styles.stackItem} rounded px-1 py-0.5 text-center text-[10px] font-bold leading-tight ring-1 ${chip}`}>
            {r.text}
          </span>
        ))}
      </div>
      <div className="mt-1 border-t-2 border-gray-300 pt-0.5 text-center">
        <div className="text-[10px] font-bold text-gray-800">{title}</div>
        <div className="text-[9px] text-gray-500">{sub}</div>
      </div>
    </div>
  );
}
