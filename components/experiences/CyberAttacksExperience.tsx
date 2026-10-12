"use client";

import { useState, type ReactNode } from "react";
import { CyberScene } from "./cyber/CyberScene";
import type { CyberBubble, CyberNodeId, CyberSceneProps, ScreenKind, ScreenOwner } from "./cyber/cyberTypes";
import { usePhasePlayer } from "./scene/usePhasePlayer";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";
import Icon, { type IconName } from "@/components/ui/Icon";

// ============================================================================
// 「サイバー攻撃の手口」専用の体験。
//   ① 攻撃ラボ … 机の上の会社の模型（WebGLがあれば Blender 製の3D、なければ2.5D）に、攻撃を1つ選んで撃ち込む。
//      攻撃物がインターネット→Webサーバ→DB／利用者／社員 と手口ごとの道を通り、被害の出る場所が変わる
//   ② 「これはどの攻撃？」仕分けクイズ
//   ③ まとめ
//
// ① は「文章を読む」より「模型の動きを見る」体験にする（CPU・メモリ・ストレージの解説と同じ作り）。
//   - 各 STEP は 1〜2 の場面（フェーズ）に分かれ、場面ごとに模型の状態と短い吹き出し（35文字以内）が1つずつ変わる
//   - STEP に入ると場面が自動で進み、最後の場面で止まる。次の STEP へはユーザーが「次へ」を押したときだけ進む
//   - 手口の説明・対策・試験用語は「詳しく見る」に分け、開いている間は場面の再生を止める
// ============================================================================

type AttackId = "ddos" | "sqli" | "xss" | "targeted" | "social";

type Attack = {
  id: AttackId;
  icon: IconName;
  name: string;
  /** ボタンに出す短い名前 */
  short: string;
  target: "機械を攻める" | "人をだます";
  result: string; // 何が起きたか
  /** 「詳しく見る」の中身（手口・対策・試験で問われる用語） */
  detail: ReactNode;
};

function Terms({ items }: { items: string[] }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-bold text-gray-500">試験で問われる用語</span>
      {items.map((t) => (
        <span key={t} className="rounded-full bg-white px-2 py-0.5 font-bold text-gray-700 ring-1 ring-gray-200">
          {t}
        </span>
      ))}
    </p>
  );
}

const ATTACKS: Attack[] = [
  {
    id: "ddos",
    icon: "zap",
    name: "DoS / DDoS 攻撃",
    short: "DDoS",
    target: "機械を攻める",
    result: "サーバがパンクしてサービス停止。利用者は誰もつながらない。",
    detail: (
      <>
        <p>
          大量のアクセスを送りつけて、サーバを<b>処理しきれない状態にして止める</b>攻撃です。1台から送るのが <b>DoS攻撃</b>、
          乗っ取った多数の機器（<b>踏み台</b>・ボット）から一斉に送るのが <b>DDoS攻撃</b>。データは盗まれませんが、サービスが使えなくなります。
        </p>
        <p>対策：大量の通信を検知して遮断する仕組み（IPS など）や、通信の分散。</p>
        <Terms items={["DoS攻撃", "DDoS攻撃", "踏み台・ボット", "可用性の侵害"]} />
      </>
    ),
  },
  {
    id: "sqli",
    icon: "database",
    name: "SQLインジェクション",
    short: "SQLインジェクション",
    target: "機械を攻める",
    result: "データベースが命令をうのみにして、会員データが流出。",
    detail: (
      <>
        <p>
          入力欄に「<code>&apos; OR 1=1 --</code>」のような<b>データベースへの命令文（SQL）</b>を混ぜて送り、Webサーバがそれを確かめずに
          DB に渡してしまう弱点を突く攻撃です。DB が「全員分を出せ」と読んでしまい、会員データが盗まれます。
        </p>
        <p>
          対策：入力を命令として扱わない仕組み（<b>プレースホルダ</b>）、入力に含まれる「&apos;」のような特別な意味を持つ文字を、
          ただの文字に置き換えて無害にする（<b>サニタイジング</b>）、WAF。
        </p>
        <Terms items={["SQLインジェクション", "プレースホルダ", "サニタイジング", "WAF"]} />
      </>
    ),
  },
  {
    id: "xss",
    icon: "fishhook",
    name: "クロスサイトスクリプティング(XSS)",
    short: "XSS",
    target: "機械を攻める",
    result: "見に来た利用者のブラウザで罠が動き、その人の情報が盗まれる。",
    detail: (
      <>
        <p>
          掲示板などの書き込みに<b>罠のスクリプト</b>を混ぜておき、そのページを開いた<b>利用者のブラウザ上で</b>実行させる攻撃です。
          被害を受けるのはサイトではなく、見に来た利用者（Cookie などの情報が盗まれる）。
        </p>
        <p>対策：書き込まれた文字をそのまま表示せず、スクリプトとして動かないよう変換する（<b>サニタイジング</b>・エスケープ）。</p>
        <Terms items={["クロスサイトスクリプティング", "サニタイジング", "Cookie"]} />
      </>
    ),
  },
  {
    id: "targeted",
    icon: "target",
    name: "標的型攻撃",
    short: "標的型攻撃",
    target: "人をだます",
    result: "社員が添付を開いてしまい、ウイルスが社内に侵入。",
    detail: (
      <>
        <p>
          <b>特定の組織だけを狙い</b>、取引先や上司を装った、仕事に関係ありそうなメールで添付ファイルを開かせる攻撃です。
          感染した社員のPCを足がかりに、社内のサーバやデータへ侵入を広げます。
        </p>
        <p>対策：不審な添付・リンクを開かない教育と訓練、差出人の確認、ウイルス対策ソフトの更新。</p>
        <Terms items={["標的型攻撃", "なりすましメール", "マルウェア"]} />
      </>
    ),
  },
  {
    id: "social",
    icon: "users",
    name: "ソーシャルエンジニアリング",
    short: "ソーシャルエンジニアリング",
    target: "人をだます",
    result: "技術を使わず、人の思い込みだけでパスワードが漏れた。",
    detail: (
      <>
        <p>
          技術ではなく<b>人の油断や思い込み</b>を突いて情報を聞き出す手口です。「システム部です」と電話してパスワードを聞く、
          肩越しに画面をのぞく（<b>ショルダーハッキング</b>）、捨てた書類をあさる（<b>トラッシング</b>）などがあります。
        </p>
        <p>対策：電話やメールでパスワードを教えない決まり、相手の本人確認、社員教育。</p>
        <Terms items={["ソーシャルエンジニアリング", "ショルダーハッキング", "トラッシング"]} />
      </>
    ),
  },
];

/** 1つの場面：模型の状態＋吹き出し1つ */
type Phase = Omit<CyberSceneProps, "reducedMotion" | "caption" | "bubble" | "from" | "epoch" | "paused"> & {
  bubble: CyberBubble;
  screens?: Partial<Record<ScreenOwner, ScreenKind>>;
};
type AttackStep = { title: string; phases: Phase[] };

const CALM: CyberSceneProps["nodes"] = { attacker: "idle", internet: "idle", web: "idle", db: "idle", user: "idle", staff: "idle" };
const n = (over: Partial<CyberSceneProps["nodes"]>) => ({ ...CALM, ...over });
const say = (target: CyberNodeId, text: string, danger = false): CyberBubble => (danger ? { target, text, tone: "danger" } : { target, text });
const QUIET: Pick<Phase, "lanes" | "flood" | "payload" | "damage"> = { lanes: {}, flood: [], payload: null, damage: [] };

// 攻撃ごとの「通り道」と「被害の出る場所」。場面を追うと攻撃物が道を移動する。
const ROUTES: Record<AttackId, AttackStep[]> = {
  ddos: [
    {
      title: "乗っ取った機器から一斉アクセス",
      phases: [
        { ...QUIET, nodes: n({ attacker: "active" }), bubble: say("attacker", "攻撃者が、乗っ取った多数の機器に合図を送る") },
        { ...QUIET, nodes: n({ attacker: "active", internet: "sending" }), lanes: { ai: "attack" }, flood: ["ai"], bubble: say("internet", "世界中の機器から、一斉にアクセスが届く") },
      ],
    },
    {
      title: "Webサーバに殺到",
      phases: [
        { ...QUIET, nodes: n({ internet: "sending", web: "active" }), lanes: { ai: "attack", iw: "attack" }, flood: ["ai", "iw"], bubble: say("web", "大量のアクセスがWebサーバに集中する") },
        {
          ...QUIET,
          nodes: n({ internet: "sending", web: "error" }),
          lanes: { ai: "attack", iw: "attack" },
          flood: ["ai", "iw"],
          damage: [{ at: "web", text: "ダウン" }],
          bubble: say("web", "処理が追いつかず、サーバが止まる", true),
        },
      ],
    },
    {
      title: "利用者もつながらない",
      phases: [
        {
          ...QUIET,
          nodes: n({ web: "error", user: "active" }),
          lanes: { ai: "attack", iw: "attack", ui: "normal" },
          flood: ["ai", "iw"],
          damage: [{ at: "web", text: "ダウン" }],
          bubble: say("user", "いつもの利用者がサイトを開こうとすると…"),
        },
        {
          ...QUIET,
          nodes: n({ web: "error", user: "error" }),
          lanes: { ai: "attack", iw: "attack", ui: "blocked" },
          flood: ["ai", "iw"],
          damage: [
            { at: "web", text: "ダウン" },
            { at: "user", text: "つながらない" },
          ],
          screens: { user: "down" },
          bubble: say("user", "サーバが止まっていて、誰もつながらない", true),
        },
      ],
    },
  ],
  sqli: [
    {
      title: "入力欄に命令文を混ぜる",
      phases: [
        { ...QUIET, nodes: n({ attacker: "active" }), payload: { stop: "attacker", tone: "attack", text: "' OR 1=1 --" }, bubble: say("attacker", "ログイン欄に、DBへの命令文を混ぜて入力する") },
        {
          ...QUIET,
          nodes: n({ internet: "sending", web: "active" }),
          lanes: { ai: "attack", iw: "attack" },
          payload: { stop: "web", tone: "attack", text: "' OR 1=1 --" },
          bubble: say("web", "入力がそのままWebサーバへ届く"),
        },
      ],
    },
    {
      title: "DBが命令をうのみにする",
      phases: [
        { ...QUIET, nodes: n({ web: "sending", db: "active" }), lanes: { wd: "attack" }, payload: { stop: "db", tone: "attack", text: "' OR 1=1 --" }, bubble: say("db", "Webサーバが確かめないまま、DBへ渡してしまう") },
        { ...QUIET, nodes: n({ db: "error" }), payload: { stop: "db", tone: "attack", text: "' OR 1=1 --" }, bubble: say("db", "DBが「全員分を出せ」と読んでしまう", true) },
      ],
    },
    {
      title: "会員データが流出",
      phases: [
        {
          ...QUIET,
          nodes: n({ db: "error", web: "sending", internet: "sending" }),
          lanes: { wd: "leak", iw: "leak", ai: "leak" },
          payload: { stop: "attacker", tone: "leak", text: "会員データ" },
          damage: [{ at: "db", text: "データ流出" }],
          bubble: say("db", "会員データが外へ送り出される", true),
        },
        {
          ...QUIET,
          nodes: n({ db: "error", attacker: "active" }),
          lanes: { wd: "leak", iw: "leak", ai: "leak" },
          payload: { stop: "attacker", tone: "leak", text: "会員データ" },
          damage: [{ at: "db", text: "データ流出" }],
          screens: { attacker: "loot" },
          bubble: say("attacker", "攻撃者の手元に、会員データが届いた", true),
        },
      ],
    },
  ],
  xss: [
    {
      title: "掲示板に罠を書き込む",
      phases: [
        { ...QUIET, nodes: n({ attacker: "active" }), payload: { stop: "attacker", tone: "attack", text: "<script>" }, bubble: say("attacker", "掲示板への書き込みに、罠のスクリプトを混ぜる") },
        {
          ...QUIET,
          nodes: n({ internet: "sending", web: "active" }),
          lanes: { ai: "attack", iw: "attack" },
          payload: { stop: "web", tone: "attack", text: "<script>" },
          bubble: say("web", "罠は掲示板のページの一部として保存される"),
        },
      ],
    },
    {
      title: "利用者が掲示板を開く",
      phases: [
        {
          ...QUIET,
          nodes: n({ user: "active", web: "sending" }),
          lanes: { ui: "normal", iw: "normal" },
          payload: { stop: "web", tone: "attack", text: "<script>" },
          screens: { user: "board" },
          bubble: say("user", "利用者が、いつもどおり掲示板を開く"),
        },
        {
          ...QUIET,
          nodes: n({ user: "active", web: "sending", internet: "sending" }),
          lanes: { iw: "attack", ui: "attack" },
          payload: { stop: "user", tone: "attack", text: "<script>" },
          screens: { user: "board" },
          bubble: say("user", "ページと一緒に、罠もブラウザに届く"),
        },
      ],
    },
    {
      title: "利用者のブラウザで罠が動く",
      phases: [
        { ...QUIET, nodes: n({ user: "error" }), payload: { stop: "user", tone: "attack", text: "<script>" }, screens: { user: "trap" }, bubble: say("user", "利用者のブラウザ上で、罠が実行される", true) },
        {
          ...QUIET,
          nodes: n({ user: "error", attacker: "active" }),
          lanes: { ui: "leak", ai: "leak" },
          payload: { stop: "attacker", tone: "leak", text: "利用者の情報" },
          damage: [{ at: "user", text: "情報を盗まれた" }],
          screens: { user: "trap" },
          bubble: say("attacker", "利用者の情報が、攻撃者へ送られる", true),
        },
      ],
    },
  ],
  targeted: [
    {
      title: "取引先を装ったメール",
      phases: [
        { ...QUIET, nodes: n({ attacker: "active" }), payload: { stop: "attacker", tone: "attack", text: "請求書.zip" }, bubble: say("attacker", "取引先を名乗り、この会社の社員だけにメールを送る") },
        {
          ...QUIET,
          nodes: n({ internet: "sending", staff: "active" }),
          lanes: { ai: "attack", is: "attack" },
          payload: { stop: "staff", tone: "attack", text: "請求書.zip" },
          screens: { staff: "mail" },
          bubble: say("staff", "件名は「請求書の件」。仕事のメールに見える"),
        },
      ],
    },
    {
      title: "社員が添付を開く",
      phases: [
        {
          ...QUIET,
          nodes: n({ staff: "error" }),
          payload: { stop: "staff", tone: "attack", text: "ウイルス" },
          damage: [{ at: "staff", text: "感染" }],
          screens: { staff: "virus" },
          bubble: say("staff", "添付を開いた瞬間、PCがウイルスに感染", true),
        },
      ],
    },
    {
      title: "社内のサーバへ広がる",
      phases: [
        {
          ...QUIET,
          nodes: n({ staff: "error", web: "error" }),
          lanes: { sw: "attack" },
          payload: { stop: "web", tone: "attack", text: "ウイルス" },
          damage: [{ at: "staff", text: "感染" }],
          screens: { staff: "virus" },
          bubble: say("web", "感染したPCから、社内のサーバへ侵入する", true),
        },
        {
          ...QUIET,
          nodes: n({ staff: "error", web: "error", db: "error" }),
          lanes: { wd: "attack" },
          payload: { stop: "db", tone: "attack", text: "ウイルス" },
          damage: [
            { at: "staff", text: "感染" },
            { at: "db", text: "侵入" },
          ],
          screens: { staff: "virus" },
          bubble: say("db", "社内のデータベースまで入り込まれる", true),
        },
      ],
    },
  ],
  social: [
    {
      title: "システム部を名乗る電話",
      phases: [
        { ...QUIET, nodes: n({ attacker: "active" }), payload: { stop: "attacker", tone: "phone", text: "システム部です" }, bubble: say("attacker", "「システム部です」と社員に電話をかける") },
        {
          ...QUIET,
          nodes: n({ attacker: "active", staff: "active" }),
          lanes: { as: "phone" },
          payload: { stop: "staff", tone: "phone", text: "システム部です" },
          bubble: say("staff", "社員の電話が鳴る。声は本物らしい"),
        },
      ],
    },
    {
      title: "社員が信じてしまう",
      phases: [
        { ...QUIET, nodes: n({ staff: "error" }), lanes: { as: "phone" }, payload: { stop: "staff", tone: "phone", text: "パスワードは…" }, bubble: say("staff", "社員が本物だと信じ、パスワードを話す", true) },
        {
          ...QUIET,
          nodes: n({ staff: "error", attacker: "active" }),
          lanes: { as: "leak" },
          payload: { stop: "attacker", tone: "leak", text: "パスワード" },
          damage: [{ at: "staff", text: "パスワード流出" }],
          bubble: say("attacker", "技術を使わず、パスワードが盗まれた", true),
        },
      ],
    },
  ],
};

/** 攻撃を選ぶ前の模型（全部しずか・名札は地図として全部） */
const IDLE_VIEW: Omit<CyberSceneProps, "reducedMotion"> = { nodes: CALM, lanes: {}, flood: [], payload: null, damage: [], bubble: null };

/** 1つ前の場面で運ぶ物が止まっていた場所（STEP をまたいでも続きから動かす） */
function previousStop(steps: AttackStep[], step: number, phase: number): CyberNodeId | null {
  const prev = phase > 0 ? steps[step].phases[phase - 1] : step > 0 ? steps[step - 1].phases[steps[step - 1].phases.length - 1] : null;
  return prev?.payload?.stop ?? null;
}

function AttackLab() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<AttackId | null>(null);
  const [tried, setTried] = useState<Set<AttackId>>(new Set());
  const [showDetail, setShowDetail] = useState(false);
  /** 「停止」を押して止めている（「再開」で続きから） */
  const [stopped, setStopped] = useState(false);
  const cur = ATTACKS.find((a) => a.id === sel) ?? null;
  const steps = sel ? ROUTES[sel] : [];
  const player = usePhasePlayer(sel ? steps.map((s) => s.phases.length) : [1], !sel || stopped || showDetail);
  const idx = player.step;
  const step = sel ? steps[idx] : null;
  const phase = step ? step.phases[player.phase] : null;
  const atEnd = sel !== null && idx === steps.length - 1 && player.done;
  const allTried = tried.size >= ATTACKS.length;

  // 被害まで見届けた手口を記録（描画中の派生 state 更新）
  if (atEnd && sel && !tried.has(sel)) setTried(new Set(tried).add(sel));

  const fire = (id: AttackId) => {
    setSel(id);
    setStopped(false);
    player.move(0);
  };
  const move = (next: number) => {
    setStopped(false);
    player.move(next);
  };
  const replay = () => {
    setStopped(false);
    player.replay();
  };

  // 再生ボタンは状況で役割が変わる：再生中＝停止 / 停止中＝再開 / 見終わった＝もう一度見る
  const playState: "playing" | "stopped" | "done" = player.done ? "done" : stopped ? "stopped" : "playing";

  const view: Omit<CyberSceneProps, "reducedMotion"> = phase
    ? { ...phase, from: previousStop(steps, idx, player.phase), epoch: player.run, paused: stopped || showDetail }
    : IDLE_VIEW;

  const navBtn =
    "inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 text-xs font-bold transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";

  return (
    <Panel>
      <SectionTitle step={1}>攻撃ラボ ― 撃ってみると違いが分かる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        机の上の会社に、5つの手口を撃ち込んでみよう。<b className="text-gray-800">どこを通って・どこに被害が出るか</b>が手口ごとに違います。
      </p>

      {/* 攻撃の選択 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ATTACKS.map((a) => {
          const on = sel === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => fire(a.id)}
              aria-pressed={on}
              aria-label={a.name}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                on ? "bg-brand-600 text-white" : tried.has(a.id) ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon name={a.icon} className="h-3.5 w-3.5" />
                {a.short}
                {tried.has(a.id) && !on && <Icon name="check" className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold text-rose-700">
            {cur ? `STEP ${idx + 1} / ${steps.length}　${cur.name}` : "机の上の会社"}
            {cur && (
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${cur.target === "人をだます" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                data-testid="cyber-target"
              >
                狙い：{cur.target === "人をだます" ? "人" : "機械"}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-base font-bold text-gray-900" data-testid="cyber-step-title">
            {step ? step.title : "↑ 攻撃を選ぶと、通り道と被害が模型に出ます"}
          </p>
        </div>
        {step && step.phases.length > 1 && (
          <div className="flex flex-none items-center gap-1 pb-1" aria-label={`場面 ${player.phase + 1} / ${step.phases.length}`} role="img">
            {step.phases.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === player.phase ? "w-4 bg-brand-600" : i < player.phase ? "w-1.5 bg-brand-300" : "w-1.5 bg-gray-300"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="-mx-2 mt-2 sm:mx-0">
        <CyberScene {...view} reducedMotion={reducedMotion} />
      </div>

      {cur && (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => move(idx - 1)} disabled={idx === 0} className={`${navBtn} bg-white text-gray-700 ring-1 ring-gray-300`} aria-label="前のSTEPへ">
              ← 戻る
            </button>
            <button
              type="button"
              onClick={playState === "playing" ? () => setStopped(true) : playState === "stopped" ? () => setStopped(false) : replay}
              className={`${navBtn} min-w-[8.5rem] bg-white text-gray-700 ring-1 ring-gray-300`}
              data-testid="cyber-play"
              data-state={playState}
            >
              {playState === "playing" ? "⏸ 停止" : playState === "stopped" ? "▶ 再開" : "↻ もう一度見る"}
            </button>
            {/* 場面が残っている間は押せない（途中で押して見逃さないように） */}
            <button
              type="button"
              onClick={() => move(idx + 1)}
              disabled={idx === steps.length - 1 || !player.done}
              className={`${navBtn} bg-gray-900 text-white`}
              aria-label="次のSTEPへ"
            >
              {!player.done ? "再生中…" : "次へ →"}
            </button>
          </div>

          {atEnd && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-200" data-testid="cyber-result">
              <b>
                <span className="inline-flex items-center gap-1">
                  <Icon name={cur.icon} className="h-3.5 w-3.5" />
                  {cur.name}
                </span>
              </b>
              ：{cur.result}
            </div>
          )}

          <details
            className="group mt-3 rounded-xl bg-gray-50 ring-1 ring-gray-200 [&_b]:text-gray-900"
            open={showDetail}
            onToggle={(e) => setShowDetail((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-700">
              詳しく見る（手口・対策・試験の用語）{showDetail && "　再生を一時停止中"}
              <span className="text-gray-400 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-2 px-4 pb-3 text-sm leading-relaxed text-gray-700" data-testid="cyber-detail">
              {cur.detail}
            </div>
          </details>
        </>
      )}

      {allTried && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200" data-testid="cyber-insight">
          <InlineIcon name="lightbulb" />
          <b>気づいた？</b>　<b>DoS・SQLインジェクション・XSSは「機械」を攻める</b>ので仕組み（設定や修正）で防ぎ、
          <b>標的型・ソーシャルエンジニアリングは「人」をだます</b>のでルールと教育で防ぎます。 狙いがどちらかを見分けるのが第一歩。
        </div>
      )}
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "問い合わせフォームに『' OR 1=1 --』と入力され、会員データが丸見えになった。",
    ans: "SQLインジェクション",
    opts: ["SQLインジェクション", "DoS攻撃", "ソーシャルエンジニアリング"],
    why: "入力欄からデータベースへの命令を送り込む手口＝SQLインジェクション。",
  },
  {
    t: "深夜に世界中の機器から一斉にアクセスが殺到し、サイトがつながらなくなった。",
    ans: "DDoS攻撃",
    opts: ["DDoS攻撃", "XSS", "標的型攻撃"],
    why: "多数の機器から大量アクセスでサービスを停止させる＝DDoS攻撃。",
  },
  {
    t: "「システム部です。確認のためパスワードを教えてください」と電話がかかってきた。",
    ans: "ソーシャルエンジニアリング",
    opts: ["ソーシャルエンジニアリング", "SQLインジェクション", "ランサムウェア"],
    why: "技術でなく“人”をだまして聞き出す手口＝ソーシャルエンジニアリング。",
  },
  {
    t: "取引先を装い、業務に関係ありそうな件名のメールで添付を開かせ、自社だけを狙ってきた。",
    ans: "標的型攻撃",
    opts: ["標的型攻撃", "DoS攻撃", "XSS"],
    why: "特定の組織を狙い撃ちする巧妙なメール攻撃＝標的型攻撃。",
  },
];

function AttackQuiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>これはどの攻撃？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        場面を読んで、当てはまる攻撃を選んでみましょう。
      </p>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
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

export default function CyberAttacksExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        攻撃は<b>「機械（システム）を攻める」</b>ものと<b>「人をだます」</b>ものがあります。
        名前と<b>特徴のキーワード</b>をセットで覚えるのがコツ。
      </div>

      <AttackLab />
      <AttackQuiz />

      <Panel>
        <SectionTitle icon="check">まとめ</SectionTitle>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
          <li>・<b>DoS / DDoS</b>：大量アクセスでサービスを停止させる。</li>
          <li>・<b>SQLインジェクション</b>：入力欄からDBへ不正な命令を送り込む。</li>
          <li>・<b>XSS</b>：罠のスクリプトを仕込み、見に来た人のブラウザで実行。</li>
          <li>・<b>標的型攻撃</b>：特定組織を狙う巧妙ななりすましメール。</li>
          <li>・<b>ソーシャルエンジニアリング</b>：技術でなく人の隙を突いて情報を得る。</li>
        </ul>
      </Panel>
    </div>
  );
}
