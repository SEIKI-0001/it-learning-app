"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// IoT の解説で、過去問の出題に合わせて足した6枚。クイズ以外は操作不要の静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえ、例は過去問と別の場面にしている。
//   センサーとアクチュエータ（＋IoTゲートウェイ）／エッジコンピューティング／
//   IoTを使った仕組みの言葉（M2M・テレマティクス・スマートメーター）／通信と電源（PLC・マルチホップ・mAh）／
//   IoT機器の守り方（耐タンパ性・セキュアブート）／どの言葉？

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

function TermList({ items, testId, col = "7.5rem" }: { items: { t: string; d: ReactNode }[]; testId: string; col?: string }) {
  return (
    <dl className="mt-2 space-y-1.5" data-testid={testId}>
      {items.map((x) => (
        <div
          key={x.t}
          className="grid items-baseline gap-2 text-[12.5px] leading-snug"
          style={{ gridTemplateColumns: `${col} 1fr` }}
          data-term={x.t}
        >
          <dt className="font-bold text-gray-900">{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// センサーとアクチュエータ ------------------------------------------------------------------
const PARTS = [
  { role: "センサー", tone: "bg-rose-50 ring-rose-200 text-rose-900", what: "温度・水位・明るさなどを測り、電気信号に変換する", io: "現実 → 電気信号" },
  { role: "IoTゲートウェイ", tone: "bg-slate-50 ring-slate-200 text-slate-900", what: "近くのIoTデバイスをまとめて、インターネットへ中継する", io: "つなぐ" },
  { role: "IoTサーバ", tone: "bg-sky-50 ring-sky-200 text-sky-900", what: "集まったデータをもとに判断し、指示を返す", io: "判断する" },
  { role: "アクチュエータ", tone: "bg-emerald-50 ring-emerald-200 text-emerald-900", what: "電気信号を受けて、モーターなどで物を動かす", io: "電気信号 → 動き" },
];
const CASES = [
  { scene: "温室", sensor: "室内の温度を測る", actuator: "天窓を開け閉めする" },
  { scene: "植木", sensor: "土の湿り気を測る", actuator: "ポンプで水をまく" },
  { scene: "倉庫", sensor: "人の動きを測る", actuator: "照明のスイッチを入れる" },
];

export function SensorActuatorPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>測るのがセンサー、動かすのがアクチュエータ</SectionTitle>
      <Lead>
        さっきのエアコンで、室温を測ったのが<b>センサー</b>、風を送ったのが<b>アクチュエータ</b>。IoTの部品は役割で名前が決まります。
      </Lead>
      <ol className="mt-3 space-y-1" data-testid="iot-parts">
        {PARTS.map((p, i) => (
          <li key={p.role} data-role={p.role}>
            <div className={`flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 ring-1 ${p.tone}`}>
              <b className="w-[6.75rem] flex-none text-[13px]">{p.role}</b>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-gray-700">{p.what}</span>
            </div>
            {i < PARTS.length - 1 && (
              <p className="text-center text-[11px] leading-4 text-gray-400" aria-hidden>
                ↓
              </p>
            )}
          </li>
        ))}
      </ol>

      <table className="mt-3 w-full table-fixed border-collapse text-[12px] leading-snug" data-testid="iot-cases">
        <colgroup>
          <col className="w-[3rem]" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-1 py-1 font-bold">場面</th>
            <th className="px-1 py-1 font-bold text-rose-800">センサー</th>
            <th className="px-1 py-1 font-bold text-emerald-800">アクチュエータ</th>
          </tr>
        </thead>
        <tbody className="text-gray-800">
          {CASES.map((c) => (
            <tr key={c.scene} className="border-t border-gray-100 align-top">
              <td className="px-1 py-1 font-bold">{c.scene}</td>
              <td className="px-1 py-1">{c.sensor}</td>
              <td className="px-1 py-1">{c.actuator}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Takeaway>
        「〜を<b>電気信号に変換する</b>」「〜を<b>計測する</b>」ならセンサー。「門を開閉する」「窓を動かす」など<b>物理的に動かす</b>ならアクチュエータ。
      </Takeaway>
    </Panel>
  );
}

// エッジコンピューティング -------------------------------------------------------------------
export function EdgePanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>エッジコンピューティング：近くで処理する</SectionTitle>
      <Lead>
        IoTデバイスが増えると、全部のデータをIoTサーバへ送るとサーバが重くなります。そこで<b>IoTデバイスに近いところ（エッジ）で可能な限りのデータ処理を行い</b>、
        結果だけを送るのがエッジコンピューティングです。
      </Lead>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="edge-compare">
        {[
          { name: "全部サーバで処理", rows: ["生のデータを全部送る", "サーバの負荷が大きい", "返事を待つので遅れる"], tone: "ring-gray-300", head: "text-gray-700" },
          { name: "エッジで処理", rows: ["近くで処理し結果だけ送る", "サーバの負荷を軽減", "その場ですぐ反応できる"], tone: "ring-brand-300 bg-brand-50", head: "text-brand-800" },
        ].map((c) => (
          <div key={c.name} className={`rounded-xl p-2.5 ring-1 ${c.tone}`} data-side={c.name}>
            <p className={`text-[13px] font-bold ${c.head}`}>{c.name}</p>
            <ul className="mt-1 space-y-0.5 text-[12px] leading-snug text-gray-700">
              {c.rows.map((r) => (
                <li key={r}>・{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[13px] font-bold text-gray-800">エッジコンピューティングと並ぶ誤りの選択肢</p>
      <TermList
        testId="edge-not"
        col="8.5rem"
        items={[
          { t: "ブロックチェーン", d: "取引をまとめ、直前のデータのハッシュ値を埋め込んでつなぎ、改ざんを困難にする" },
          { t: "クラウドコンピューティング", d: "データセンターに集約されたコンピュータ資源を、ネットワーク経由で遠隔地から使う" },
          { t: "機械学習", d: "明示的にプログラミングせず、データからコンピュータが知識やルールを獲得する" },
        ]}
      />
    </Panel>
  );
}

// IoTを使った仕組みの言葉 -------------------------------------------------------------------
export function IotSystemsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>IoTを使った仕組みの言葉</SectionTitle>
      <div className="mt-3 space-y-2.5" data-testid="iot-systems">
        {[
          {
            t: "M2M（Machine to Machine）",
            d: "機械同士がネットワークを介して互いに情報をやり取りし、人を介さず自律的に制御や動作を行う仕組み。",
            ex: "例：エレベーターが故障の兆しを、保守会社のコンピュータへ自動で知らせる",
          },
          {
            t: "テレマティクス",
            d: "自動車などの移動体に搭載したセンサや表示機器を通信システムと連動させ、運転者へ様々な情報をリアルタイムに提供する。",
            ex: "例：渋滞や事故の情報がカーナビに届き、別の道を案内する",
          },
          {
            t: "スマートメーター",
            d: "住宅などに設置し、電気やガスの使用量を自動的に計測して、通信回線で供給事業者にデータを送信する。",
            ex: "例：検針員が家を回らなくても、毎月の電気使用量が電力会社に届く",
          },
        ].map((x) => (
          <div key={x.t} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200" data-term={x.t}>
            <p className="text-[14px] font-bold text-gray-900">{x.t}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">{x.d}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">{x.ex}</p>
          </div>
        ))}
      </div>
      <Takeaway>
        紛らわしい選択肢：<b>MOT</b>は技術経営、<b>MRP</b>は資材所要量計画、<b>O2O</b>はネットから実店舗へ客を呼ぶ施策。どれも機械同士の通信ではありません。
      </Takeaway>
    </Panel>
  );
}

// 通信と電源 --------------------------------------------------------------------------------
export function IotNetworkPowerPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>IoTの通信と電源</SectionTitle>
      <Lead>
        IoTデバイスは数が多く、電源やケーブルを引きにくい場所にも置かれます。そのための技術が出ます。
      </Lead>
      <p className="mt-3 text-[13px] font-bold text-gray-800">何で通信する？ 何で電気をとる？</p>
      <TermList
        testId="iot-power"
        col="9rem"
        items={[
          { t: "PLC（電力線通信）", d: <>電気を供給する<b>電力線に通信用の信号を乗せ</b>、電力線を通信にも使う</> },
          { t: "PoE", d: <>逆に、<b>LANケーブルで電力も供給</b>する</> },
          { t: "エネルギー​ハーベスティング", d: "周りの光・振動・熱などのわずかなエネルギーを集めて発電する" },
        ]}
      />

      <p className="mt-4 text-[13px] font-bold text-gray-800">遠くまで届かせる：マルチホップ</p>
      <div className="mt-1.5 flex items-center justify-between gap-1 px-1" data-testid="multihop" aria-hidden>
        {["デバイス", "中継", "中継", "中継", "ゲートウェイ"].map((n, i, arr) => (
          <div key={i} className="flex items-center gap-1">
            <span
              className={`rounded-md px-1.5 py-1 text-[11px] font-bold ${i === 0 || i === arr.length - 1 ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"}`}
            >
              {n}
            </span>
            {i < arr.length - 1 && <span className="text-[11px] text-gray-400">))</span>}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-gray-700">
        IoTデバイスの無線を<b className="text-gray-900">ほかのIoTデバイスが中継することを繰り返し</b>、リレー方式で広い範囲に届ける。
      </p>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] leading-snug text-gray-700 ring-1 ring-slate-200" data-testid="mah">
        <p className="text-[13px] font-bold text-gray-900">バッテリ容量の mAh（ミリアンペア時）</p>
        <p className="mt-0.5">
          「その電流を何時間流せるか」。<b className="text-gray-900">2000mAh ＝ 2000mA の電流を1時間</b>放電できる量。200mA ずつなら10時間もちます。
        </p>
      </div>
    </Panel>
  );
}

// IoT機器の守り方 -------------------------------------------------------------------------
export function IotProtectPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>IoT機器の守り方：耐タンパ性とセキュアブート</SectionTitle>
      <Lead>
        IoT機器は人目のない場所に置かれ、<b>盗まれて分解・解析される</b>ことがあります。だから機器そのものを守る対策が必要です。
      </Lead>
      <div className="mt-3 space-y-2" data-testid="iot-protect">
        <div className="rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200" data-term="耐タンパ性">
          <p className="text-[14px] font-bold text-emerald-900">耐タンパ性</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
            中身を<b>不正に解析・改ざんされにくい</b>性質。内蔵ソフトウェアを<b>難読化</b>して解読に時間をかけさせる、こじ開けると中のデータを消す、など。
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200" data-term="セキュアブート">
          <p className="text-[14px] font-bold text-emerald-900">セキュアブート</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
            OSやファームウェアの<b>起動時にデジタル署名を検証</b>し、正当なときだけ実行する。改ざんされたソフトは起動しない。
          </p>
        </div>
      </div>

      <table className="mt-3 w-full table-fixed border-collapse text-[12px] leading-snug" data-testid="iot-measures">
        <colgroup>
          <col />
          <col className="w-[7.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-1 py-1 font-bold">対策</th>
            <th className="px-1 py-1 font-bold">何への備え</th>
          </tr>
        </thead>
        <tbody className="text-gray-800">
          {[
            ["内蔵ソフトウェアを難読化する", "耐タンパ性"],
            ["接続認証が一定回数失敗したら接続できなくする", "不正ログイン"],
            ["通信するデータを暗号化する", "盗聴（機密性）"],
            ["オンラインで最新のパッチを当てる", "脆弱性"],
          ].map(([a, b]) => (
            <tr key={a} className="border-t border-gray-100 align-top">
              <td className="px-1 py-1">{a}</td>
              <td className="px-1 py-1 font-bold">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// どの言葉？ -------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "IoTデバイスに近いところでデータを処理し、IoTサーバの負荷を軽減する。何コンピューティング？",
    ans: "エッジ",
    opts: ["クラウド", "エッジ", "グリッド"],
    why: "デバイスの近く（エッジ）で処理＝エッジコンピューティング。",
  },
  {
    t: "土の湿り気を電気信号に変換する部品は？",
    ans: "センサー",
    opts: ["センサー", "アクチュエータ", "ゲートウェイ"],
    why: "測って電気信号にする＝センサー。水をまくポンプを動かすのがアクチュエータ。",
  },
  {
    t: "起動時にファームウェアのデジタル署名を検証し、正当なときだけ実行する。",
    ans: "セキュアブート",
    opts: ["リブート", "セキュアブート", "耐タンパ性"],
    why: "起動時に署名を検証＝セキュアブート。",
  },
  {
    t: "無線の通信をほかのデバイスが中継することを繰り返し、広い範囲に届ける。",
    ans: "マルチホップ",
    opts: ["マルチホップ", "PLC", "MIMO"],
    why: "リレー方式で中継＝マルチホップ。PLCは電力線を通信に使う技術。",
  },
  {
    t: "IoTを利用したシステムの事例はどれ？",
    ans: "設備のセンサー情報をスマホで監視",
    opts: ["SNSの書込みから感情を分析", "設備のセンサー情報をスマホで監視", "ネット上の保存場所を貸す"],
    why: "モノ（設備）のセンサー情報をネットで集める＝IoT。感情分析はテキストマイニング、保存場所はクラウドのストレージサービス。",
  },
];

export function IotTermsQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どの言葉？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="iot-terms-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition [word-break:auto-phrase] active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-1.5 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
