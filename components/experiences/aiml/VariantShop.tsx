"use client";

import { Panel, SectionTitle } from "../ui";
import { Chip, NestBox, Takeaway, Term } from "./parts";

// ============================================================================
// 案A「1軒のパン屋で通して読む」。
//   同じ店の5つの困りごとを、それぞれ別の学び方のAIで解く。例が節ごとに変わらないので、
//   最後の「入れ子の地図」に全部が1枚で収まる（財務諸表のカフェ型と同じ考え方）。
//   ① ルールを書く vs 例から学ぶ ② 教師あり（分類・回帰／アノテーション） ③ 教師なし（クラスタリング）
//   ④ 強化学習 ⑤ ディープラーニングと生成AI（ハルシネーション） ⑥ 入れ子の地図＋データの偏り
// ============================================================================

const SHOP = "駅前のパン屋";

function RuleVsLearn() {
  const tests = [
    { subject: "当選おめでとうございます！", rule: "迷惑", ok: true },
    { subject: "今だけ特別価格。今すぐクリック", rule: "ふつう", ok: false, why: "すり抜け" },
    { subject: "パン教室の抽選に当選した者です。日程の相談を…", rule: "迷惑", ok: false, why: "お客さんを迷惑扱い" },
  ];
  return (
    <Panel>
      <SectionTitle step={1}>ルールを書くか、例から学ばせるか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {SHOP}のお問い合わせフォームに、迷惑メールが毎日届きます。自動で仕分けたい。やり方は2つあります。
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl p-3 ring-1 ring-gray-300" data-testid="shop-rule">
          <div className="text-[12px] font-bold text-gray-500">やり方1：人がルールを書く</div>
          <div className="mt-1.5 rounded-lg bg-gray-900 px-2.5 py-1.5 font-mono text-[12px] text-white">もし「当選」を含む → 迷惑</div>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-snug">
            {tests.map((t) => (
              <li key={t.subject} className="flex items-start gap-1.5">
                <span className={`mt-px flex-none font-bold ${t.ok ? "text-emerald-600" : "text-rose-600"}`}>{t.ok ? "○" : "×"}</span>
                <span className="text-gray-700">
                  「{t.subject}」→ {t.rule}
                  {t.why && <span className="ml-1 font-bold text-rose-600">（{t.why}）</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-gray-500">例外が出るたびにルールを足す。いつまでも追いつかない。</p>
        </div>

        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-300" data-testid="shop-learn">
          <div className="text-[12px] font-bold text-brand-700">やり方2：例から学ばせる</div>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] font-bold text-gray-800">
            <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-brand-200">過去のメール1,000通<br />＋「迷惑／ふつう」の印</span>
            <span className="text-brand-600">→</span>
            <span className="rounded-lg bg-brand-600 px-2 py-1 text-white">判断の型<br />（モデル）</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-700">
            「知らない送り主」「リンクが多い」「『今すぐ』がある」など、<b>どこを見れば迷惑らしいか</b>をコンピュータが例から見つけます。
            人がするのは、例を集めて印を付けることだけ。
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
        やり方1も「AI」の一種です（専門家の知識をルールにした<b className="text-gray-700">エキスパートシステム</b>など）。やり方2だけが機械学習です。
      </p>
      <Takeaway>ルールを人が全部書く代わりに、例（データ）から判断の型を作らせる ＝ 機械学習</Takeaway>
    </Panel>
  );
}

function DataTable({
  head,
  rows,
  testId,
}: {
  head: string[];
  rows: string[][];
  testId: string;
}) {
  const last = head.length - 1;
  return (
    <table className="w-full border-collapse text-[12px]" data-testid={testId}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`px-1.5 py-1 text-left font-bold ${i === last ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.join()} className="border-b border-gray-100">
            {r.map((c, i) => (
              <td key={i} className={`px-1.5 py-1 ${i === last ? "bg-brand-50 font-bold text-brand-900" : "text-gray-700"}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Supervised() {
  return (
    <Panel>
      <SectionTitle step={2}>答え付きの例から学ぶ ＝ 教師あり学習</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        店の困りごと2つ。どちらも、過去のデータに<b className="text-gray-800">答えの列</b>（青）が付いています。
      </p>

      <div className="mt-3 space-y-3">
        <div className="rounded-xl p-3 ring-1 ring-gray-200">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900">迷惑メールを見分けたい</span>
            <Chip tone="brand">答えが「種類」→ 分類</Chip>
          </div>
          <div className="mt-2">
            <DataTable
              testId="shop-classify"
              head={["件名", "答え"]}
              rows={[
                ["当選おめでとうございます！", "迷惑"],
                ["明日クロワッサン10個予約したい", "ふつう"],
                ["今すぐクリックで特典", "迷惑"],
              ]}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-gray-600">→ 新しいメール「限定特典のお知らせ」は <b>迷惑（96%）</b></p>
        </div>

        <div className="rounded-xl p-3 ring-1 ring-gray-200">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900">明日のクロワッサンを何個焼くか</span>
            <Chip tone="brand">答えが「数」→ 回帰</Chip>
          </div>
          <div className="mt-2">
            <DataTable
              testId="shop-regress"
              head={["曜日", "天気", "気温", "売れた数"]}
              rows={[
                ["土", "晴れ", "22℃", "48個"],
                ["月", "雨", "15℃", "21個"],
                ["水", "晴れ", "18℃", "33個"],
              ]}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-gray-600">→ 明日（金・晴れ・20℃）は <b>およそ38個</b></p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
        過去のメールに「迷惑／ふつう」と<b className="text-gray-800">正解の印を付ける作業</b>を <Term>アノテーション</Term> といいます。
        印がまちがっていれば、学んだ型もまちがえます。
      </p>
      <Takeaway>データに「答えの列」がある → 教師あり。答えが種類なら分類、数なら回帰</Takeaway>
    </Panel>
  );
}

// 会員300人の散布図（見やすさのため各グループ12人に間引いて描く）。値は固定の擬似乱数。
const GROUPS = [
  { name: "朝の食パン派", cx: 0.16, cy: 0.2, color: "#2563eb" },
  { name: "昼のサンド派", cx: 0.5, cy: 0.45, color: "#059669" },
  { name: "夕方の甘いもの派", cx: 0.8, cy: 0.8, color: "#db2777" },
];
function jitter(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}
const MEMBERS = GROUPS.flatMap((g, gi) =>
  Array.from({ length: 12 }, (_, i) => ({
    g: gi,
    x: g.cx + jitter(gi * 40 + i) * 0.22,
    y: g.cy + jitter(gi * 40 + i + 17) * 0.24,
  })),
);

function Scatter({ colored, testId }: { colored: boolean; testId: string }) {
  const W = 150;
  const H = 120;
  const px = (x: number) => 14 + x * (W - 22);
  const py = (y: number) => H - 16 - y * (H - 32);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={colored ? "3つのまとまりに色分けされた散布図" : "色のない散布図"} data-testid={testId}>
      <line x1={12} y1={H - 14} x2={W - 4} y2={H - 14} stroke="#9ca3af" />
      <line x1={12} y1={H - 14} x2={12} y2={4} stroke="#9ca3af" />
      <text x={W - 4} y={H - 3} textAnchor="end" fontSize={8} fill="#6b7280">来店時刻 →</text>
      <text x={16} y={9} fontSize={8} fill="#6b7280">↑ 甘いパンの割合</text>
      {colored &&
        GROUPS.map((g) => (
          <ellipse key={g.name} cx={px(g.cx)} cy={py(g.cy)} rx={21} ry={17} fill={g.color} opacity={0.1} stroke={g.color} strokeDasharray="3 2" />
        ))}
      {MEMBERS.map((m, i) => (
        <circle key={i} cx={px(m.x)} cy={py(m.y)} r={2.6} fill={colored ? GROUPS[m.g].color : "#6b7280"} />
      ))}
    </svg>
  );
}

function Unsupervised() {
  return (
    <Panel>
      <SectionTitle step={3}>答えなしで仲間分け ＝ 教師なし学習</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会員300人の「来店時刻」と「甘いパンを買う割合」。今度は<b className="text-gray-800">答えの列がありません</b>。
        「この人は○○派」という正解は、誰も知らないからです。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl p-2 ring-1 ring-gray-200">
          <div className="text-center text-[12px] font-bold text-gray-500">AIに渡すデータ</div>
          <Scatter colored={false} testId="shop-scatter-raw" />
        </div>
        <div className="rounded-xl p-2 ring-1 ring-brand-200">
          <div className="text-center text-[12px] font-bold text-brand-700">AIが見つけたまとまり</div>
          <Scatter colored testId="shop-scatter-grouped" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[12px]">
        {GROUPS.map((g) => (
          <span key={g.name} className="flex items-center gap-1 font-bold text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
            {g.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
        AIがするのは「近いもの同士をまとめる」ところまで。<b className="text-gray-800">「朝の食パン派」という名前を付けるのは人</b>です。
        この仲間分けを <Term>クラスタリング</Term> といいます。
      </p>
      <Takeaway>「答えの列」がない → 似たもの同士でまとめる ＝ 教師なし学習</Takeaway>
    </Panel>
  );
}

function Reinforcement() {
  const days = [
    { day: "1日目", act: "17時に半額", result: "全部売れたが、安すぎ", reward: +2 },
    { day: "2日目", act: "値引きしない", result: "12個売れ残って廃棄", reward: -5 },
    { day: "3日目", act: "19時に3割引", result: "売れ残り2個", reward: +6 },
    { day: "100日目", act: "天気を見て18時半に2〜3割引", result: "ほぼ売り切り", reward: +9 },
  ];
  return (
    <Panel>
      <SectionTitle step={4}>やってみて、ごほうびで上達 ＝ 強化学習</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        閉店前、<b className="text-gray-800">いつ・どれだけ値引きするか</b>。これには「正解の表」がありません。
        そこでAIに毎日<b className="text-gray-800">試させて</b>、結果に点数（報酬）を付けます。
      </p>
      <table className="mt-3 w-full border-collapse text-[12px]" data-testid="shop-rl">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">日</th>
            <th className="px-1.5 py-1 font-bold">AIの行動</th>
            <th className="px-1.5 py-1 font-bold">結果</th>
            <th className="px-1.5 py-1 text-right font-bold">報酬</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day} className="border-b border-gray-100 align-top">
              <td className="whitespace-nowrap px-1.5 py-1 font-bold text-gray-700">{d.day}</td>
              <td className="px-1.5 py-1 text-gray-800">{d.act}</td>
              <td className="px-1.5 py-1 text-gray-600">{d.result}</td>
              <td className={`px-1.5 py-1 text-right font-bold tabular-nums ${d.reward > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {d.reward > 0 ? `+${d.reward}` : d.reward}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-gray-500">報酬 ＝ その日の売上 − 捨てたパンの損（と決めておく）</p>
      <div className="mt-3 flex items-center justify-center gap-1 text-center text-[12px] font-bold text-gray-700" aria-hidden>
        {["行動する", "結果を見る", "報酬をもらう", "次の行動を変える"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded-lg bg-gray-100 px-2 py-1">{s}</span>
            {i < arr.length - 1 && <span className="text-gray-400">→</span>}
          </span>
        ))}
      </div>
      <Takeaway>正解の表ではなく、試した結果の「報酬」が大きくなる行動を覚える ＝ 強化学習</Takeaway>
    </Panel>
  );
}

function DeepAndGenerative() {
  return (
    <Panel>
      <SectionTitle step={5}>ディープラーニングと生成AI</SectionTitle>

      <h4 className="mt-3 text-sm font-bold text-gray-900">レジのカメラで、トレーのパンを見分けたい</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 text-[12px] leading-relaxed">
        <div className="rounded-xl p-3 ring-1 ring-gray-300">
          <div className="font-bold text-gray-500">これまでの機械学習</div>
          <p className="mt-1 text-gray-700">
            どこを見るか（<b>丸さ・色・大きさ</b>）は<b>人が決めて</b>渡す。あんパンとクリームパンのように似たものは苦手。
          </p>
        </div>
        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-300" data-testid="shop-deep">
          <div className="font-bold text-brand-700">ディープラーニング（深層学習）</div>
          <p className="mt-1 text-gray-700">
            写真を大量に見せるだけ。<b>見分けるための特徴も自分で見つける</b>。
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-gray-700">
            <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-brand-200">線・色</span>→
            <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-brand-200">模様・形</span>→
            <span className="rounded bg-brand-600 px-1.5 py-0.5 text-white">パンの種類</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
        脳の神経のつながりをまねた計算のしくみ <Term>ニューラルネットワーク</Term> を、何層にも重ねて使います（「深層」の由来）。
      </p>

      <h4 className="mt-4 text-sm font-bold text-gray-900">新作パンのPOPを、生成AIに書かせる</h4>
      <div className="mt-2 space-y-1.5 text-[12px]" data-testid="shop-genai">
        <div className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
          <span className="font-bold text-gray-500">指示：</span>新作メロンパンの店頭POPを、50字で書いて
        </div>
        <div className="rounded-lg px-3 py-2 ring-1 ring-gray-300">
          <span className="font-bold text-gray-500">生成AI：</span>外はさくさく、中はふんわり。
          <mark className="rounded bg-rose-100 px-0.5 text-rose-800 ring-1 ring-rose-300">北海道産バター100%使用</mark>の自信作です！
        </div>
        <p className="text-rose-700">
          ↑ この店はそのバターを使っていません。もっともらしいのに事実と違う ＝ <Term>ハルシネーション</Term>
        </p>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
        生成AIは、大量のデータで学んだことをもとに<b className="text-gray-800">新しい文章や画像を作ります</b>。
        お店の事実を知っているわけではないので、<b className="text-gray-800">出す前に人が確かめます</b>。
        欲しい答えが出るよう指示の書き方を工夫することを <b className="text-gray-800">プロンプトエンジニアリング</b> といいます。
      </p>
      <Takeaway>深層学習は「見るべき特徴」まで自分で学ぶ。生成AIは新しく作るが、正しいとは限らない</Takeaway>
    </Panel>
  );
}

function ShopMap() {
  return (
    <Panel>
      <SectionTitle step={6}>このパン屋のAIを、1枚の地図に</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">ここまでの5つは、全部この入れ子のどこかに入ります。</p>
      <div className="mt-3" data-testid="shop-map">
        <NestBox depth={0} label="AI（人工知能）" note="知的な判断をコンピュータで">
          <Chip>① 人が書いたルールで迷惑判定</Chip>
          <NestBox depth={1} label="機械学習" note="データから学ぶ">
            <div className="grid gap-1.5 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-2 ring-1 ring-gray-200">
                <div className="text-[11px] font-bold text-gray-500">教師あり</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Chip>② 迷惑メール＝分類</Chip>
                  <Chip>② 焼く数＝回帰</Chip>
                </div>
              </div>
              <div className="rounded-lg bg-white p-2 ring-1 ring-gray-200">
                <div className="text-[11px] font-bold text-gray-500">教師なし</div>
                <div className="mt-1">
                  <Chip>③ お客さんの仲間分け</Chip>
                </div>
              </div>
              <div className="rounded-lg bg-white p-2 ring-1 ring-gray-200">
                <div className="text-[11px] font-bold text-gray-500">強化学習</div>
                <div className="mt-1">
                  <Chip>④ 値引きのタイミング</Chip>
                </div>
              </div>
            </div>
            <NestBox depth={2} label="ディープラーニング" note="特徴も自分で見つける">
              <Chip>⑤ レジでパンを見分ける</Chip>
              <NestBox depth={3} label="生成AI" note="新しく作る">
                <Chip>⑤ POPの文章</Chip>
              </NestBox>
            </NestBox>
          </NestBox>
        </NestBox>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ ②の焼く数を<b>晴れの日のデータだけ</b>で学ばせると、雨の日は作りすぎます。データの<b>偏り（バイアス）</b>はそのまま結果の偏りになる。AIはデータ以上のことは知りません。
      </div>
      <Takeaway>見分け方：答えの列がある → 教師あり／ない → 教師なし／報酬で覚える → 強化学習</Takeaway>
    </Panel>
  );
}

export default function VariantShop() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        {SHOP}の5つの困りごとを、AIで1つずつ解いていきます。<b>困りごとごとに、AIの学び方が違う</b>のがポイントです。
      </div>
      <RuleVsLearn />
      <Supervised />
      <Unsupervised />
      <Reinforcement />
      <DeepAndGenerative />
      <ShopMap />
    </div>
  );
}
