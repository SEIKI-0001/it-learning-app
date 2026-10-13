"use client";

import { useState, type ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note } from "./calc/CalcParts";
import { Arrow, Box, Caption, Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import Icon, { type IconName } from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「ネットビジネスの戦略（ロングテール・O2O・オムニチャネル）」。
//   ① ロングテール：本80点の売れ行きグラフ。実店舗（棚10点まで）とネット（全点）を切り替え、
//      尾の部分の合計が売れ筋の合計を上回ることを数字で見せる
//   ② ネットと店舗：O2O（ネット→店舗の一方向）とオムニチャネル（全経路を統合）を切り替え
//   ③ ネットで集客する4つのしくみ：検索結果・ブログ・ECの画面の中で SEO／リスティング広告／アフィリエイト／レコメンデーション（静的）
//   ④ 試験ポイント

export default function InternetBusinessExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        ネットでは<b>棚の広さに縛られない</b>ので、実店舗とは違う売り方ができます。さらに、ネットと店舗をつなぐ戦略と、ネットで客を集めるしくみを見ていきます。
      </Lead>
      <LongTailPanel />
      <ChannelPanel />
      <AttractPanel />
      <PointsPanel
        step={4}
        points={[
          <>ロングテール＝売れにくい商品も<b>数多くそろえると、合計の売上が大きくなる</b>（陳列の制約が小さいネット向き）</>,
          <>O2O＝<b>ネットから実店舗へ</b>客を呼ぶ／オムニチャネル＝店舗・EC・アプリを<b>統合</b>してどこでも同じように買える</>,
          <>SEO＝検索結果の上位に出る<b>サイトの工夫</b>／リスティング広告＝<b>検索語に連動</b>する広告</>,
          <>アフィリエイト＝<b>成果報酬型</b>の広告／レコメンデーション＝<b>履歴から好みの商品を薦める</b></>,
        ]}
        traps={[
          ["ロングテール＝売れ筋に絞って売る戦略", "売れ筋（ヘッド）ではなく、売れにくい多数の商品（テール）の合計で稼ぐ"],
          ["O2Oとオムニチャネルは同じ", "O2Oはネット→店舗への送客。オムニチャネルは全経路の在庫・会員情報の統合"],
          ["SEOはお金を払って検索結果に出す広告", "お金を払って出すのはリスティング広告。SEOはサイトそのものの改善"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① ロングテール
// ---------------------------------------------------------------------------

const N = 80;
const SHELF = 10;
// 売れる順に並べた80点の本の月間販売数（べき分布）
const SALES = Array.from({ length: N }, (_, i) => Math.round(120 * Math.pow(i + 1, -0.75)));
const HEAD_SUM = SALES.slice(0, SHELF).reduce((a, b) => a + b, 0);
const TAIL_SUM = SALES.slice(SHELF).reduce((a, b) => a + b, 0);

const GX0 = 28;
const GW = 262;
const GY0 = 128;
const GH = 112;
const BW = GW / N;
const gy = (v: number) => GY0 - (v / SALES[0]) * GH;

type Shop = "store" | "net";

function LongTailPanel() {
  const [shop, setShop] = useState<Shop>("store");
  const net = shop === "net";
  return (
    <Panel>
      <SectionTitle step={1}>ロングテール ― 長いしっぽの合計</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        本80点を、よく売れる順に左から並べた1か月の販売数です。実店舗とネット書店を切り替えてみよう。
      </p>
      <div className="mt-3">
        <Seg
          testId="ib-shop"
          value={shop}
          onChange={setShop}
          options={[
            { value: "store", label: "町の本屋（棚は10点）" },
            { value: "net", label: "ネット書店（80点）" },
          ]}
        />
      </div>

      <svg viewBox="0 0 300 160" className="mx-auto mt-3 w-full max-w-md" role="img" data-testid="ib-longtail" data-shop={shop} aria-label={net ? "80点すべてを売ると、売れにくい70点の合計が売れ筋10点の合計を上回る" : "棚に置ける10点だけを売る実店舗"}>
        <text x="2" y="12" fontSize="11" className="fill-gray-500">販売数</text>
        <line x1={GX0} x2={GX0 + GW} y1={GY0} y2={GY0} className="stroke-gray-400" />
        {SALES.map((v, i) => {
          const head = i < SHELF;
          const cls = head ? "fill-brand-600" : net ? "fill-accent-400" : "fill-gray-200";
          return <rect key={i} x={GX0 + i * BW + 0.4} y={gy(v)} width={Math.max(BW - 0.8, 1)} height={GY0 - gy(v)} className={`${cls} transition-colors duration-500`} />;
        })}
        {/* 棚の限界 */}
        <line x1={GX0 + SHELF * BW} x2={GX0 + SHELF * BW} y1={GY0 - GH} y2={GY0 + 4} className={net ? "stroke-gray-300" : "stroke-rose-500"} strokeDasharray="4 3" strokeWidth="1.5" />
        {!net && (
          <text x={GX0 + SHELF * BW + 5} y={GY0 - GH + 10} fontSize="11" className="fill-rose-700 font-bold">ここから先は棚に置けない</text>
        )}
        <text x={GX0 + (SHELF * BW) / 2} y={GY0 + 16} textAnchor="middle" fontSize="11" className="fill-brand-700 font-bold">売れ筋</text>
        <text x={GX0 + SHELF * BW + (GW - SHELF * BW) / 2} y={GY0 + 16} textAnchor="middle" fontSize="11" className={net ? "fill-accent-800 font-bold" : "fill-gray-400"}>
          1点ずつは売れにくい本（ロングテール）→
        </text>
        <text x={GX0 + 2} y={GY0 + 30} fontSize="10" className="fill-gray-400">← よく売れる</text>
      </svg>

      <div className="mt-1 grid grid-cols-2 gap-1.5 text-center" data-testid="ib-sums">
        <div className="rounded-lg bg-brand-50 px-1 py-1.5 ring-1 ring-brand-200">
          <Caption className="!text-brand-700">売れ筋10点の合計</Caption>
          <div className="text-base font-bold text-brand-800">{HEAD_SUM}冊</div>
        </div>
        <div className={`rounded-lg px-1 py-1.5 ring-1 ${net ? "bg-accent-50 ring-accent-300" : "bg-gray-50 ring-gray-200"}`}>
          <Caption className={net ? "!text-accent-800" : ""}>残り70点の合計</Caption>
          <div className={`text-base font-bold ${net ? "text-accent-800" : "text-gray-400"}`}>{net ? `${TAIL_SUM}冊` : "0冊（置けない）"}</div>
        </div>
      </div>
      {net ? (
        <Note>
          <InlineIcon name="lightbulb" />1点ずつは月に数冊でも、70点を合わせると<b>{TAIL_SUM}冊</b>。売れ筋10点の{HEAD_SUM}冊を上回ります。この「長いしっぽ」で稼ぐ考え方が<b>ロングテール</b>です。
        </Note>
      ) : (
        <p className="mt-3 text-center text-xs text-gray-500">実店舗は棚に置ける数に限りがあるので、売れ筋中心になります。</p>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② O2O とオムニチャネル
// ---------------------------------------------------------------------------

type Channel = "o2o" | "omni";

function ChannelChip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white px-1 py-2 ring-1 ring-gray-300">
      <Icon name={icon} className="h-5 w-5 text-gray-700" />
      <span className="text-[12px] font-bold text-gray-800">{label}</span>
    </div>
  );
}

function ChannelPanel() {
  const [mode, setMode] = useState<Channel>("o2o");
  return (
    <Panel>
      <SectionTitle step={2}>ネットと店舗をつなぐ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">名前が似ている2つを、<b className="text-gray-800">矢印の向き</b>で見分けます。</p>
      <div className="mt-3">
        <Seg
          testId="ib-channel"
          value={mode}
          onChange={setMode}
          options={[
            { value: "o2o", label: "O2O" },
            { value: "omni", label: "オムニチャネル" },
          ]}
        />
      </div>
      <div key={mode} className={`mt-4 ${styles.reveal}`} data-testid="ib-channel-figure" data-mode={mode}>
        {mode === "o2o" ? (
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div>
                <Caption className="mb-1 text-center">オンライン（ネット）</Caption>
                <ChannelChip icon="smartphone" label="アプリのクーポン" />
              </div>
              <Arrow dir="right" label="来店を促す" tone="brand" />
              <div>
                <Caption className="mb-1 text-center">オフライン（実店舗）</Caption>
                <ChannelChip icon="store" label="お店で使う" />
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-700">
              <b>O2O（Online to Offline）</b>は、ネットの情報やクーポンで<b>実店舗へ客を呼び込む</b>施策。矢印は<b>ネット→店舗の一方向</b>です。
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-1.5">
              <ChannelChip icon="store" label="実店舗" />
              <ChannelChip icon="laptop" label="ECサイト" />
              <ChannelChip icon="smartphone" label="アプリ" />
            </div>
            <div className="grid grid-cols-3 text-center text-sm font-bold leading-tight text-brand-500" aria-hidden>
              <span>↕</span>
              <span>↕</span>
              <span>↕</span>
            </div>
            <Box tone="soft" sub="どの経路からでも同じ情報を使う">共通の在庫・会員情報・ポイント</Box>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-700">
              <b>オムニチャネル</b>は、すべての販売経路を<b>統合</b>する戦略。「ネットで注文して店舗で受け取る」「店で在庫がなければアプリで取り寄せる」が、どの経路からでもできます。
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ ネットで集客する4つのしくみ
// ---------------------------------------------------------------------------

function Tag({ children }: { children: ReactNode }) {
  return <span className="ml-1.5 inline-block rounded-full bg-gray-900 px-2 py-0.5 align-middle text-[11px] font-bold text-white">{children}</span>;
}

function AttractPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>ネットで客を集める4つのしくみ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">ふだん見ている画面の中に、4つとも入っています。</p>

      <div className="mt-3 space-y-3" data-testid="ib-attract">
        {/* 検索結果 */}
        <div className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-gray-700 ring-1 ring-gray-300">
            <Icon name="search" className="h-3.5 w-3.5 text-gray-500" />ITパスポート 参考書
          </div>
          <div className="mt-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-amber-300">
            <div className="text-[11px] font-bold text-amber-700">広告</div>
            <div className="text-[13px] font-bold text-gray-800">合格の参考書｜A出版<Tag>リスティング広告</Tag></div>
            <div className="text-[11px] text-gray-500">検索した言葉に連動して表示。クリックされると広告費</div>
          </div>
          <div className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200">
            <div className="text-[13px] font-bold text-gray-800">参考書の選び方まとめ｜B書店<Tag>SEO</Tag></div>
            <div className="text-[11px] text-gray-500">広告費ではなく、サイトの内容・構成を工夫して上位に表示</div>
          </div>
        </div>

        {/* ブログ */}
        <div className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
          <Caption>個人のブログ</Caption>
          <div className="mt-1 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200">
            <div className="text-[13px] text-gray-800">「この参考書で合格しました！」</div>
            <div className="mt-1 text-[13px] font-bold text-brand-700 underline">この本を買う →<Tag>アフィリエイト</Tag></div>
            <div className="text-[11px] text-gray-500">このリンク経由で売れたら、ブログの運営者に報酬（成果報酬型）</div>
          </div>
        </div>

        {/* EC */}
        <div className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
          <Caption>ECサイトの商品ページ</Caption>
          <div className="mt-1 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200">
            <div className="text-[13px] font-bold text-gray-800">この商品を見た人は、こちらも見ています<Tag>レコメンデーション</Tag></div>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {["過去問題集", "単語帳", "模擬試験"].map((t) => (
                <div key={t} className="rounded-md bg-gray-50 py-1.5 text-center text-[11px] font-bold text-gray-600 ring-1 ring-gray-200">{t}</div>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">購買履歴・閲覧履歴から、好みに合いそうな商品を薦める</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
