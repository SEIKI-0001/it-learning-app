"use client";

import { Box, Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「新事業の進め方（デザイン思考・リーンスタートアップ）」。
//   同じ例（駅前のお弁当屋さんが始める「お弁当の定期便」）で通して、手法ごとの役割の違いを見せる。
//   ① デザイン思考：共感から始める5つのステップ（静的）
//   ② リーンスタートアップ：MVP → 計測 → 学習 → 続ける／方向転換（静的）
//   ③ 小さく確かめる場：PoC とハッカソン（＋アイデアソンとの違い）
//   ④ ビジネスモデルキャンバス：9つの枠に定期便を書き込んだ例
//   ⑤ 試験ポイント

export default function NewBusinessExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        新しい事業は、作る前に「売れるか」が分かりません。だから<b>小さく作って、確かめて、直す</b>を繰り返します。駅前のお弁当屋さんが始める<b>「お弁当の定期便」</b>を例に見ていきます。
      </Lead>
      <DesignThinkingPanel />
      <LeanPanel />
      <TryPanel />
      <CanvasPanel />
      <PointsPanel
        step={5}
        points={[
          <>デザイン思考＝<b>利用者への共感</b>から始め、<b>試作とテスト</b>を繰り返して課題を解く</>,
          <>リーンスタートアップ＝<b>MVP（必要最小限の製品）</b>で 構築→計測→学習 を<b>短く繰り返す</b></>,
          <>PoC＝本格導入の前に<b>実現できるか・効果があるか</b>を小さく確かめる</>,
          <>ハッカソン＝短期間で<b>試作品まで作る</b>イベント／ビジネスモデルキャンバス＝<b>9つの枠</b>で事業を1枚に</>,
        ]}
        traps={[
          ["リーンスタートアップ＝時間をかけて完璧な製品を作る", "最小限の製品で早く市場に出し、反応から学んで直す"],
          ["ハッカソンとアイデアソンは同じ", "アイデアソンはアイデア出しまで。ハッカソンは試作品を作り上げる"],
          ["PoCは本番稼働後の効果測定", "PoCは本格導入の前に行う小規模な検証"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① デザイン思考
// ---------------------------------------------------------------------------

const DT_STEPS = [
  { name: "共感", ex: "昼休みの会社員を観察。「買いに行く時間がもったいない」と聞く" },
  { name: "問題定義", ex: "本当の困りごとは「並ぶ時間」だと決める" },
  { name: "アイデア", ex: "職場に届ける・予約して受け取るだけ…など案を出す" },
  { name: "試作", ex: "紙のチラシと予約フォームだけ作る" },
  { name: "テスト", ex: "10人に使ってもらい、感想を聞いて直す" },
];

function DesignThinkingPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>デザイン思考 ― 利用者の目線から始める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「何を作れるか」ではなく、<b className="text-gray-800">「使う人は何に困っているか」</b>から始めるのが特徴です。
      </p>
      <ol className="mt-3 space-y-1.5" data-testid="nb-design-thinking">
        {DT_STEPS.map((s, i) => (
          <li key={s.name} className="flex items-stretch gap-2">
            <span className={`grid w-20 flex-none place-items-center rounded-lg py-1.5 text-[13px] font-bold ${i === 0 ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-900 ring-1 ring-brand-200"}`}>
              {i + 1}. {s.name}
            </span>
            <span className="flex flex-1 items-center rounded-lg bg-white px-2.5 py-1.5 text-[12px] leading-snug text-gray-700 ring-1 ring-gray-200">{s.ex}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-[12px] font-bold text-brand-600">↺ テストの結果をもとに、前のステップへ戻って繰り返す</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② リーンスタートアップ
// ---------------------------------------------------------------------------

const LOOP = [
  { name: "構築", ex: "アプリは作らず、LINEで注文を受けるだけの定期便（MVP）を始める" },
  { name: "計測", ex: "2週間の申込み数・解約数を数える" },
  { name: "学習", ex: "昼より「夜の分も届けて」の声が多いと分かる" },
];

function LeanPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>リーンスタートアップ ― 最小限で出して学ぶ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        仮説を確かめるための<b className="text-gray-800">必要最小限の製品（MVP：Minimum Viable Product）</b>を作り、反応を測って学ぶ ― を短い周期で回します。
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5" data-testid="nb-lean-loop">
        {LOOP.map((l, i) => (
          <div key={l.name} className="flex flex-col rounded-xl bg-white p-2 ring-1 ring-gray-300">
            <div className="text-center text-[13px] font-bold text-brand-700">{i + 1}. {l.name}</div>
            <p className="mt-1 text-[11px] leading-snug text-gray-600">{l.ex}</p>
          </div>
        ))}
      </div>
      <div className="mt-1 text-center text-sm font-bold text-brand-500" aria-hidden>↓</div>
      <div className="grid grid-cols-2 gap-1.5">
        <Box tone="ok" sub="手応えがあれば改良を続ける">続ける</Box>
        <Box tone="warn" sub="夜の定期便に切り替える">方向転換（ピボット）</Box>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        <InlineIcon name="lightbulb" />アプリを半年かけて作ってから「誰も使わなかった」と分かるより、2週間で分かる方が損が小さい。これが<b className="text-gray-800">リーン（ムダのない）</b>の意味です。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ PoC とハッカソン
// ---------------------------------------------------------------------------

function TryPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>小さく確かめる・短く作る</SectionTitle>
      <div className="mt-3 space-y-3" data-testid="nb-try">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="text-base font-bold text-gray-900">PoC（Proof of Concept：概念実証）</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-gray-700">新しい技術やアイデアを<b>本格導入する前に</b>、小規模に試して<b>実現できるか・効果があるか</b>を確かめる。</p>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">例：配達ルートをAIで決める仕組みを、まず1店舗・1か月だけ試して、配達時間が本当に短くなるかを測る</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="text-base font-bold text-gray-900">ハッカソン</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-gray-700">「ハック」＋「マラソン」。エンジニアやデザイナーが集まり、<b>1〜2日程度で試作品を作り上げる</b>イベント。</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
            <div>
              <Caption>アイデアソン</Caption>
              <Box tone="muted" sub="アイデアを出して整理する">アイデアまで</Box>
            </div>
            <div>
              <Caption>ハッカソン</Caption>
              <Box tone="brand" sub="動く試作品を完成させる">試作品まで</Box>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ ビジネスモデルキャンバス
// ---------------------------------------------------------------------------

function CanvasCell({ title, body, className = "", strong = false }: { title: string; body: string; className?: string; strong?: boolean }) {
  return (
    <div className={`rounded-md p-1.5 ring-1 ${strong ? "bg-brand-50 ring-brand-300" : "bg-white ring-gray-300"} ${className}`}>
      <div className={`text-[10.5px] font-bold leading-tight ${strong ? "text-brand-800" : "text-gray-800"}`}>{title}</div>
      <div className="mt-0.5 text-[10px] leading-snug text-gray-600">{body}</div>
    </div>
  );
}

function CanvasPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>ビジネスモデルキャンバス ― 事業を1枚に</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">9つの枠</b>を埋めると、「誰に・どんな価値を・どう届けて・どう稼ぐか」が1枚で見渡せます。
      </p>
      <div className="mt-3 grid grid-cols-10 gap-1" data-testid="nb-canvas">
        <CanvasCell className="col-span-2 row-span-2" title="キーパートナー" body="配達の協力会社・農家" />
        <CanvasCell className="col-span-2" title="主要活動" body="調理・配達" />
        <CanvasCell className="col-span-2 row-span-2" strong title="価値提案" body="並ばずに、職場で手作り弁当" />
        <CanvasCell className="col-span-2" title="顧客との関係" body="LINEで好みを聞く" />
        <CanvasCell className="col-span-2 row-span-2" title="顧客セグメント" body="駅前の会社で働く人" />
        <CanvasCell className="col-span-2" title="主要リソース" body="厨房・調理人" />
        <CanvasCell className="col-span-2" title="チャネル" body="LINE・職場への配達" />
        <CanvasCell className="col-span-5" title="コスト構造" body="食材費・人件費・配達費" />
        <CanvasCell className="col-span-5" title="収益の流れ" body="月額の定期便料金" />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        <InlineIcon name="lightbulb" />真ん中の<b className="text-gray-800">価値提案</b>を軸に、右側が「お客さん側」、左側が「作る側」、下が「お金」です。
      </p>
    </Panel>
  );
}
