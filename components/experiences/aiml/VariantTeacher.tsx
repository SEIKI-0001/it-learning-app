"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "../ui";
import { Chip, NestBox, Takeaway, Term } from "./parts";

// ============================================================================
// 案B「あなたが先生になる」。
//   操作そのものが学ぶ内容（＝正解の印を付ける＝アノテーション）なので、ここだけ手を動かす。
//   ① 6通のメールに「迷惑／ふつう」の印を付ける ② 印から言葉の点数表（＝モデル）ができる
//   ③ 新しいメールを判定。印をまちがえると判定もまちがえる ④ 印がないと仲間分けだけ（教師なし）
//   ⑤ 3つの学び方を「何を渡すか」で並べる（強化学習） ⑥ 点数表の先＝ニューラルネットワーク・生成AI
// ============================================================================

type Label = "spam" | "ham";
type Mail = { id: string; subject: string; words: string[]; truth: Label };

export const TRAIN: Mail[] = [
  { id: "m1", subject: "🎉当選！無料で今すぐ受け取り", words: ["当選", "無料", "今すぐ"], truth: "spam" },
  { id: "m2", subject: "明日の会議の資料です", words: ["会議", "資料"], truth: "ham" },
  { id: "m3", subject: "限定クーポンを無料で配布中", words: ["限定", "無料"], truth: "spam" },
  { id: "m4", subject: "会議室の予約を確認しました", words: ["会議", "予約"], truth: "ham" },
  { id: "m5", subject: "今すぐ確認：あなたが当選しました", words: ["今すぐ", "当選"], truth: "spam" },
  { id: "m6", subject: "請求書の資料を送ります", words: ["請求書", "資料"], truth: "ham" },
];

export const TESTS: Mail[] = [
  { id: "t1", subject: "無料で当選のチャンス", words: ["無料", "当選"], truth: "spam" },
  { id: "t2", subject: "予約の変更について", words: ["予約"], truth: "ham" },
  { id: "t3", subject: "限定：来週の会議のご案内", words: ["限定", "会議"], truth: "ham" },
];

type Labels = Partial<Record<string, Label>>;

/** 印の付いたメールから言葉の点数を作る：迷惑に出た回数 − ふつうに出た回数 */
export function learn(labels: Labels) {
  const table = new Map<string, { spam: number; ham: number }>();
  for (const m of TRAIN) {
    const l = labels[m.id];
    if (!l) continue;
    for (const w of m.words) {
      const row = table.get(w) ?? { spam: 0, ham: 0 };
      row[l] += 1;
      table.set(w, row);
    }
  }
  return [...table.entries()]
    .map(([word, c]) => ({ word, ...c, score: c.spam - c.ham }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word, "ja"));
}

export function judge(model: ReturnType<typeof learn>, mail: Mail) {
  const parts = mail.words.map((w) => ({ word: w, score: model.find((r) => r.word === w)?.score ?? 0 }));
  const total = parts.reduce((s, p) => s + p.score, 0);
  return { parts, total, verdict: total > 0 ? ("spam" as const) : total < 0 ? ("ham" as const) : null };
}

const LABEL_TEXT: Record<Label, string> = { spam: "迷惑", ham: "ふつう" };
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function Labeling({ labels, setLabel, fillAll }: { labels: Labels; setLabel: (id: string, l: Label) => void; fillAll: () => void }) {
  const done = TRAIN.filter((m) => labels[m.id]).length;
  return (
    <Panel>
      <SectionTitle step={1}>あなたが先生。正解の印を付けよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        迷惑メールを見分けるAIを作ります。まず、過去のメール6通に<b className="text-gray-800">「迷惑」か「ふつう」か</b>、あなたが印を付けてください。
      </p>
      <ul className="mt-3 space-y-1.5" data-testid="teach-train">
        {TRAIN.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1 ring-gray-200">
            <span className="min-w-0 flex-1 text-[13px] text-gray-800">{m.subject}</span>
            {(["spam", "ham"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={labels[m.id] === l}
                aria-label={`${m.subject}を${LABEL_TEXT[l]}にする`}
                onClick={() => setLabel(m.id, l)}
                className={`flex-none rounded-md px-2 py-1 text-[12px] font-bold transition active:scale-95 ${
                  labels[m.id] === l
                    ? l === "spam"
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "bg-white text-gray-500 ring-1 ring-gray-300"
                }`}
              >
                {LABEL_TEXT[l]}
              </button>
            ))}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between text-[12px]">
        <span className="font-bold text-gray-500" data-testid="teach-count">
          {done} / {TRAIN.length} 通に印
        </span>
        <button type="button" onClick={fillAll} className="rounded-md px-2 py-1 font-bold text-brand-700 ring-1 ring-brand-200">
          おまかせで付ける
        </button>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
        いまあなたがした「データに正解の印を付ける作業」を <Term>アノテーション</Term> といいます。
        正解付きのデータで学ばせるのが <b className="text-gray-800">教師あり学習</b>。先生＝正解を教える人、です。
      </p>
      <Takeaway>正解の印を付けたデータで学ぶ ＝ 教師あり学習</Takeaway>
    </Panel>
  );
}

function Model({ labels }: { labels: Labels }) {
  const model = learn(labels);
  const done = TRAIN.filter((m) => labels[m.id]).length;
  return (
    <Panel>
      <SectionTitle step={2}>印から「言葉の点数表」ができる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        コンピュータは、あなたの印だけを見て数えます。<b className="text-gray-800">迷惑メールに出てきた言葉は＋1、ふつうのメールに出てきた言葉は−1</b>。
      </p>
      {done === 0 ? (
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-4 text-center text-sm text-gray-500 ring-1 ring-gray-200" data-testid="teach-empty">
          まだ印がないので、何も学べません。①に戻って印を付けてください。
        </p>
      ) : (
        <table className="mt-3 w-full border-collapse text-[13px]" data-testid="teach-model">
          <thead>
            <tr className="bg-gray-100 text-left text-[12px] text-gray-600">
              <th className="px-2 py-1 font-bold">言葉</th>
              <th className="px-2 py-1 text-right font-bold">迷惑で</th>
              <th className="px-2 py-1 text-right font-bold">ふつうで</th>
              <th className="px-2 py-1 text-right font-bold">点数</th>
            </tr>
          </thead>
          <tbody>
            {model.map((r) => (
              <tr key={r.word} className="border-b border-gray-100" data-testid={`teach-word-${r.word}`}>
                <td className="px-2 py-1 font-bold text-gray-800">{r.word}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-600">{r.spam}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-600">{r.ham}</td>
                <td
                  className={`px-2 py-1 text-right font-bold tabular-nums ${
                    r.score > 0 ? "text-rose-600" : r.score < 0 ? "text-emerald-700" : "text-gray-400"
                  }`}
                >
                  {signed(r.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
        「当選は迷惑っぽい」というルールを、<b className="text-gray-800">誰も書いていません</b>。印の付いた例から数えただけです。
        この点数表が<b className="text-gray-800">モデル（判断の型）</b>。学習が終われば、元のメールはもう要りません。
      </p>
      <Takeaway>人はルールを書かず、例を渡すだけ。例から判断の型を作る ＝ 機械学習</Takeaway>
    </Panel>
  );
}

function Verdict({ v }: { v: "spam" | "ham" | null }) {
  if (v === null) return <Chip>決めきれない</Chip>;
  return <Chip tone={v === "spam" ? "ng" : "ok"}>{LABEL_TEXT[v]}</Chip>;
}

function Predict({ labels }: { labels: Labels }) {
  const [mistake, setMistake] = useState(false);
  const used: Labels = mistake ? { ...labels, m2: "spam" } : labels;
  const model = learn(used);
  const meetingBefore = learn(labels).find((r) => r.word === "会議")?.score ?? 0;
  const meetingAfter = model.find((r) => r.word === "会議")?.score ?? 0;
  return (
    <Panel>
      <SectionTitle step={3}>初めて見るメールを判定する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        点数表で、言葉の点数を足すだけ。<b className="text-gray-800">合計がプラスなら迷惑、マイナスならふつう</b>。
      </p>
      <ul className="mt-3 space-y-2" data-testid="teach-tests">
        {TESTS.map((t) => {
          const r = judge(model, t);
          return (
            <li key={t.id} className="rounded-xl p-2.5 ring-1 ring-gray-200" data-testid={`teach-${t.id}`} data-verdict={r.verdict ?? "none"}>
              <div className="text-[13px] font-bold text-gray-900">{t.subject}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] tabular-nums text-gray-600">
                {r.parts.map((p, i) => (
                  <span key={p.word}>
                    {i > 0 && " ＋ "}
                    {p.word}
                    <b className={p.score > 0 ? "text-rose-600" : p.score < 0 ? "text-emerald-700" : "text-gray-400"}>({signed(p.score)})</b>
                  </span>
                ))}
                <span>
                  ＝ <b className="text-gray-900">{signed(r.total)}</b> →
                </span>
                <Verdict v={r.verdict} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
        <label className="flex items-start gap-2 text-[13px] font-bold text-amber-900">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 flex-none accent-amber-600"
            checked={mistake}
            onChange={(e) => setMistake(e.target.checked)}
            data-testid="teach-mistake"
          />
          <span>
            先生がまちがえたら？「明日の会議の資料です」を<span className="text-rose-700">迷惑</span>と教えてしまった
          </span>
        </label>
        <p className="mt-1.5 text-[12px] leading-relaxed text-amber-900">
          {mistake
            ? `「会議」の点数が ${signed(meetingBefore)} → ${signed(meetingAfter)} に。まちがった印1つで、判定が変わります。AIは教わった例以上のことは知りません。`
            : "チェックを入れると、同じしくみのまま学び直します。"}
        </p>
      </div>
      <Takeaway>正解の印がまちがっている・偏っていると、AIもそのまままちがえる</Takeaway>
    </Panel>
  );
}

// 共通する言葉でつながるメールをまとめる（教師なしの仲間分けの素朴な版）
export function clusters(mails: Mail[]) {
  const parent = new Map(mails.map((m) => [m.id, m.id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));
  for (const a of mails)
    for (const b of mails)
      if (a.id < b.id && a.words.some((w) => b.words.includes(w))) parent.set(find(a.id), find(b.id));
  const groups = new Map<string, Mail[]>();
  for (const m of mails) groups.set(find(m.id), [...(groups.get(find(m.id)) ?? []), m]);
  return [...groups.values()];
}

function NoTeacher() {
  const groups = clusters(TRAIN);
  return (
    <Panel>
      <SectionTitle step={4}>印がなかったら？ ＝ 教師なし学習</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ6通を、<b className="text-gray-800">印なし</b>で渡します。コンピュータにできるのは、<b className="text-gray-800">同じ言葉を使っているメール同士をまとめる</b>ことです。
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="teach-clusters">
        {groups.map((g, i) => (
          <div key={g[0].id} className="rounded-xl p-2.5 ring-1 ring-gray-300">
            <div className="text-[12px] font-bold text-gray-500">グループ{i + 1}（名前はまだない）</div>
            <ul className="mt-1.5 space-y-1 text-[12px] text-gray-700">
              {g.map((m) => (
                <li key={m.id}>・{m.subject}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
        分かれ方は①と同じになりました。でもAIは、どちらが「迷惑」かを知りません。<b className="text-gray-800">名前を付けるのは人</b>です。
        この仲間分けを <Term>クラスタリング</Term> といいます。
      </p>
      <Takeaway>正解の印なしで、似たもの同士をまとめる ＝ 教師なし学習</Takeaway>
    </Panel>
  );
}

function ThreeWays() {
  const rows = [
    { type: "教師あり", give: "問題 ＋ 正解", learn: "正解を当てるコツ", ex: "泣き声と「泣く理由」の組から、理由を推測" },
    { type: "教師なし", give: "問題だけ", learn: "似たもの同士のまとまり", ex: "服の画像から、客の好みの傾向をつかむ" },
    { type: "強化学習", give: "やってみた結果の点数（報酬）", learn: "点数が増える行動", ex: "盛り付けを何度も試して、上手になるロボット" },
  ];
  return (
    <Panel>
      <SectionTitle step={5}>3つの学び方は「何を渡すか」で分かれる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ③までが教師あり、④が教師なし。もう1つ、<b className="text-gray-800">先生はいないけれど点数だけはもらえる</b>学び方があります。
        それが <b className="text-gray-800">強化学習</b>。ゲームやロボットのように、試しては結果の点数で上達します。
      </p>
      <table className="mt-3 w-full border-collapse text-[12px]" data-testid="teach-three">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">学び方</th>
            <th className="px-1.5 py-1 font-bold">渡すもの</th>
            <th className="px-1.5 py-1 font-bold">試験での例</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.type} className="border-b border-gray-100 align-top">
              <td className="whitespace-nowrap px-1.5 py-1.5 font-bold text-gray-900">{r.type}</td>
              <td className="px-1.5 py-1.5 font-bold text-brand-800">{r.give}</td>
              <td className="px-1.5 py-1.5 text-gray-600">{r.ex}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
        ひっかけ：「人があらかじめ用意したルールで判断する」は、どれでもありません（学んでいない＝ルールベース）。
      </p>
      <Takeaway>正解がある → 教師あり／ない → 教師なし／報酬 → 強化学習</Takeaway>
    </Panel>
  );
}

export function NeuralNet() {
  const L = [
    [30, 40, 70, 100],
    [120, 30, 60, 90, 120],
    [210, 55, 95],
  ] as const;
  const nodes = L.map(([x, ...ys]) => ys.map((y) => ({ x, y })));
  return (
    <svg viewBox="0 0 250 172" className="mx-auto w-full max-w-sm" role="img" aria-label="入力層・中間層・出力層のニューラルネットワーク" data-testid="teach-nn">
      {nodes.slice(0, -1).flatMap((layer, li) =>
        layer.flatMap((a, ai) => nodes[li + 1].map((b, bi) => <line key={`${li}-${ai}-${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" />)),
      )}
      {nodes.flat().map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={7} fill="#fff" stroke="#1d4ed8" strokeWidth={2} />
      ))}
      <text x={30} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">入力</text>
      <text x={120} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">中間層（何層も）</text>
      <text x={210} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">出力</text>
      <path d="M40 14 H200" stroke="#1d4ed8" strokeWidth={1.5} markerEnd="url(#nn-f)" />
      <text x={120} y={10} textAnchor="middle" fontSize={8.5} fill="#1d4ed8" fontWeight="bold">予測する →</text>
      <path d="M205 152 H45" stroke="#e11d48" strokeWidth={1.5} markerEnd="url(#nn-b)" strokeDasharray="4 2" />
      <text x={125} y={168} textAnchor="middle" fontSize={8.5} fill="#e11d48" fontWeight="bold">← 誤差を逆向きに伝えて重みを直す</text>
      <defs>
        <marker id="nn-f" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#1d4ed8" />
        </marker>
        <marker id="nn-b" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#e11d48" />
        </marker>
      </defs>
    </svg>
  );
}

function Beyond() {
  return (
    <Panel>
      <SectionTitle step={6}>点数表の先：ディープラーニングと生成AI</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ②の点数表は、見る言葉を<b className="text-gray-800">こちらが用意した</b>1段だけの型でした。
        <b className="text-gray-800">ディープラーニング</b>は、脳の神経をまねた <Term>ニューラルネットワーク</Term> を何層も重ね、
        <b className="text-gray-800">どこを見れば見分けられるか（特徴）まで自分で見つけます</b>。
      </p>
      <div className="mt-3">
        <NeuralNet />
      </div>
      <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-gray-700">
        <li>
          ・1つの丸（ニューロン）が受け取った値から、次へ渡す値を決める計算 ＝ <b>活性化関数</b>
        </li>
        <li>
          ・出力と正解のずれ（誤差）を逆向きに伝え、つながりの重みを少しずつ直す ＝ <b>バックプロパゲーション</b>
        </li>
      </ul>
      <div className="mt-3 rounded-xl p-3 ring-1 ring-gray-200 text-[12px] leading-relaxed text-gray-700">
        <b className="text-gray-900">生成AI</b>は、こうして大量の文章や画像で学んだモデルで、<b>新しい文章や画像を作ります</b>。
        ただし「もっともらしいけれど事実と違う」ことも書きます ＝ <Term>ハルシネーション</Term>。使う前に人が確かめます。
      </div>
      <div className="mt-3">
        <NestBox depth={0} label="AI">
          <NestBox depth={1} label="機械学習" note="①〜⑤">
            <NestBox depth={2} label="ディープラーニング" note="特徴も自分で">
              <NestBox depth={3} label="生成AI" note="新しく作る" />
            </NestBox>
          </NestBox>
        </NestBox>
      </div>
      <Takeaway>AI ⊃ 機械学習 ⊃ ディープラーニング ⊃ 生成AI</Takeaway>
    </Panel>
  );
}

export default function VariantTeacher() {
  const [labels, setLabels] = useState<Labels>({});
  const setLabel = (id: string, l: Label) => setLabels((cur) => ({ ...cur, [id]: l }));
  const fillAll = () => setLabels(Object.fromEntries(TRAIN.map((m) => [m.id, m.truth])));
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        AIは、人がルールを全部書かなくても判断できるようになります。どうやって？ <b>あなたが先生になって、迷惑メールを見分けるAIを育ててみましょう</b>。
      </div>
      <Labeling labels={labels} setLabel={setLabel} fillAll={fillAll} />
      <Model labels={labels} />
      <Predict labels={labels} />
      <NoTeacher />
      <ThreeWays />
      <Beyond />
    </div>
  );
}
