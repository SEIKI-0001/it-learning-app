"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CipherCapsule, type CapsuleState } from "./crypto/CipherCapsule";
import {
  CryptoScene,
  type CryptoLaneId,
  type CryptoLaneState,
  type CryptoNodeId,
  type CryptoSceneProps,
} from "./crypto/CryptoScene";
import { KeyGlyph, KeyTag, KeyToken, type KeyKind } from "./crypto/KeyToken";
import styles from "./crypto/crypto.module.css";
import type { NodeState } from "./network/NetworkSceneBase";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「公開鍵暗号方式」専用の体験。
//   ① 2つの鍵（公開鍵＝配ってよい／秘密鍵＝本人だけ）
//   ② 送信の流れ … ①事前準備：B→Aへ公開鍵 → ②本番：Aが公開鍵で暗号化 → Bが秘密鍵で復号
//   ③ 共通鍵とのちがい
// 郵便受けのたとえ：誰でも投函できる（公開鍵）が、開けられるのは持ち主だけ（秘密鍵）。
// ②は network（IP/DNS）と同じ 2.5D 模型＋タイムラインで、鍵とデータの移動を追う。
// ============================================================================

const AUTOPLAY_INTERVAL_MS = 3000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

// ---------------------------------------------------------------------------
// ① 2つの鍵
// ---------------------------------------------------------------------------

const RECIPIENTS = [
  { id: "A", left: 52, top: 30 },
  { id: "C", left: 67, top: 52 },
  { id: "D", left: 82, top: 26 },
];

function KeyRoles() {
  const reducedMotion = useReducedMotion();
  const [shared, setShared] = useState(false);
  const [refused, setRefused] = useState(0);

  return (
    <Panel>
      <SectionTitle step={1}>2つの鍵（ペアで使う）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Bさんが鍵を<b className="text-gray-900">2本ペア</b>で持っています。
        公開鍵を配ってみて、2本の鍵の「居場所」がどう違うか見てみましょう。
      </p>

      <div
        className={`${styles.stage} mt-3`}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-testid="key-stage"
        data-shared={shared ? "true" : "false"}
      >
        <div className={styles.stageFloor} aria-hidden />

        {/* Bさん（持ち主） */}
        <div className={styles.stagePerson} style={{ left: "18%", top: "86%" }}>
          <svg viewBox="-20 -52 40 56" className="h-[62px] w-[44px]" aria-hidden>
            <ellipse cx={0} cy={2} rx={15} ry={4} fill="#1E2A40" opacity={0.14} />
            <path d="M -10 2 L -10 -20 Q -10 -29 0 -30 Q 10 -29 10 -20 L 10 2 Z" fill="#8B5CF6" />
            <circle cx={0} cy={-38} r={9} fill="#F6D3B8" />
            <path d="M 9.4 -37 A 9.4 9.4 0 0 0 -9.4 -38 L -10.6 -27 Q -7 -26 -6.4 -30 Q -5 -40 1.6 -41.6 Q 6.6 -40.6 9.4 -37 Z" fill="#5A3A22" />
            <circle cx={-3} cy={-36.6} r={1} fill="#2B3140" />
            <circle cx={3} cy={-36.6} r={1} fill="#2B3140" />
          </svg>
          <span className={styles.stagePersonLabel}>Bさん（鍵の持ち主）</span>
        </div>

        {/* 公開鍵を受け取る人たち */}
        {RECIPIENTS.map((r) => (
          <div key={r.id} className={styles.stagePerson} style={{ left: `${r.left}%`, top: `${r.top + 22}%` }}>
            <span className={`${styles.stageAvatar} ${shared ? styles.stageReceived : ""}`}>{r.id}</span>
          </div>
        ))}

        {/* 秘密鍵：B の手元に固定 */}
        <div
          className={`${styles.stageSlot} ${refused ? styles.shake : ""}`}
          style={{ left: "18%", top: "18%" }}
          key={`sk-${refused}`}
          data-testid="stage-private-key"
          data-spot="owner"
        >
          <KeyToken kind="private" at={{ left: "50%", top: "50%" }} spot="owner" caption="Bだけが保持" />
        </div>

        {/* 公開鍵：配る前は B の手元、配ると複製が各自へ */}
        {RECIPIENTS.map((r, i) => (
          <div
            key={r.id}
            className={styles.stageSlot}
            style={shared ? { left: `${r.left}%`, top: `${r.top}%` } : { left: "38%", top: "60%" }}
            data-hidden={!shared && i > 0 ? "true" : "false"}
            data-testid={i === 0 ? "stage-public-key" : undefined}
            data-spot={shared ? "shared" : "owner"}
          >
            <KeyToken kind="public" at={{ left: "50%", top: "50%" }} spot={shared ? "shared" : "owner"} />
          </div>
        ))}

      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShared((current) => !current)}
          aria-pressed={shared}
          className="rounded-full bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
        >
          {shared ? "配る前に戻す" : "公開鍵を配ってみる"}
        </button>
        <button
          type="button"
          onClick={() => setRefused((current) => current + 1)}
          className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
        >
          秘密鍵も配る？
        </button>
      </div>
      {refused > 0 && (
        <p className={`${styles.stageRefuse} ${reducedMotion ? styles.reducedMotion : ""} mt-2`} role="status" key={`refuse-${refused}`}>
          ✕ 秘密鍵は配らない。渡すと、その人も暗号文を開けてしまう
        </p>
      )}

      <ul className="mt-3 space-y-2">
        <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-[30px]"><KeyGlyph kind="public" /></span>
              <KeyTag kind="public" />
            </span>
            <span className="text-sm font-bold text-gray-800">公開鍵</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">配ってOK</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">みんなに渡してよい鍵。<b>暗号化（閉める）専用</b>。これだけでは中身を開けられない。</p>
        </li>
        <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-[30px]"><KeyGlyph kind="private" /></span>
              <KeyTag kind="private" />
            </span>
            <span className="text-sm font-bold text-gray-800">秘密鍵</span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">本人だけ</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">絶対に配らない、自分だけの鍵。<b>復号（開ける）専用</b>。公開鍵で閉めたものを開けられる唯一の鍵。</p>
        </li>
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ よくある勘違い：「公開鍵で何でも開ける」「秘密鍵も相手に配る」は誤り。<b>閉めるのは公開鍵、開けるのは秘密鍵</b>。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 送信の流れ（2.5D 模型＋タイムライン）
// ---------------------------------------------------------------------------

type FlowStep = {
  phase: 1 | 2;
  title: string;
  /** 通信の向き・場所。色に頼らず文字でも示す。 */
  route: string;
  scene: Omit<CryptoSceneProps, "trail" | "reducedMotion">;
  /** このステップで移動が起きるレーン（軌跡を描く） */
  moves: CryptoLaneId | null;
  detail: ReactNode;
};

const nodes = (a: NodeState, b: NodeState, eve: NodeState = "idle"): Record<CryptoNodeId, NodeState> => ({ a, b, eve });
const lanes = (key: CryptoLaneState, data: CryptoLaneState): Record<CryptoLaneId, CryptoLaneState> => ({ key, data });

const FLOW_STEPS: FlowStep[] = [
  {
    phase: 1,
    title: "Bが鍵ペアを持つ",
    route: "Bさんの手元",
    scene: {
      nodes: nodes("idle", "active"),
      lanes: lanes("idle", "idle"),
      publicKey: "bHome",
      privateKey: "bHome",
      capsule: null,
      intercepted: false,
    },
    moves: null,
    detail: (
      <>
        Bさんが鍵を <b>2本ペア</b> で作成。<b>公開鍵</b>（PUBLIC）と<b>秘密鍵</b>（PRIVATE）。
        秘密鍵はBさんにつながれたまま、自分だけが保管します。
      </>
    ),
  },
  {
    phase: 1,
    title: "公開鍵をAへ渡す",
    route: "B → A：公開鍵だけ",
    scene: {
      nodes: nodes("idle", "sending"),
      lanes: lanes("active", "idle"),
      publicKey: "aHome",
      privateKey: "bHome",
      capsule: null,
      intercepted: false,
    },
    moves: "key",
    detail: (
      <>
        ①のレーンで <b>公開鍵だけ</b> が Bさん → Aさんへ移動します。公開鍵は誰に見られてもOK。
        <b>秘密鍵はBさんの手元から動きません</b>。これで事前準備が完了。
      </>
    ),
  },
  {
    phase: 2,
    title: "Aが平文を作る",
    route: "Aさんの手元",
    scene: {
      nodes: nodes("active", "idle"),
      lanes: lanes("done", "idle"),
      publicKey: "aHome",
      privateKey: "bHome",
      capsule: { state: "plain", stop: "aDesk" },
      intercepted: false,
    },
    moves: null,
    detail: (
      <>
        Aさんが送りたいメッセージ「<b>会議は10時</b>」を用意。まだ誰でも読める <b>平文</b>（錠前が開いた状態）です。
      </>
    ),
  },
  {
    phase: 2,
    title: "公開鍵で暗号化",
    route: "Aさんの手元：Bの公開鍵で閉める",
    scene: {
      nodes: nodes("active", "idle"),
      lanes: lanes("done", "idle"),
      publicKey: "aUse",
      privateKey: "bHome",
      capsule: { state: "encrypted", stop: "aDesk" },
      intercepted: false,
    },
    moves: null,
    detail: (
      <>
        受け取った <b>Bさんの公開鍵で暗号化</b>。同じカプセルが錠前つきの <b>暗号文</b>（ENCRYPTED DATA）に変わりました。
      </>
    ),
  },
  {
    phase: 2,
    title: "暗号文をBへ送信",
    route: "A → B：暗号文",
    scene: {
      nodes: nodes("sending", "idle", "error"),
      lanes: lanes("done", "active"),
      publicKey: "aHome",
      privateKey: "bHome",
      capsule: { state: "encrypted", stop: "bDesk" },
      intercepted: true,
    },
    moves: "data",
    detail: (
      <>
        ②のレーンで暗号文が Aさん → Bさんへ。途中で第三者にコピーされても、中身は読めない暗号文。
        <b>公開鍵では開けられず</b>、秘密鍵も持っていないので平文には戻せません。
      </>
    ),
  },
  {
    phase: 2,
    title: "Bが秘密鍵で復号",
    route: "Bさんの手元：秘密鍵で開ける",
    scene: {
      nodes: nodes("idle", "active"),
      lanes: lanes("done", "done"),
      publicKey: "aHome",
      privateKey: "bUse",
      capsule: { state: "decrypted", stop: "bDesk" },
      intercepted: false,
    },
    moves: null,
    detail: (
      <>
        Bさんが <b>対の秘密鍵で復号</b>。「会議は10時」が元どおり読めた！
        ①先に公開鍵を配る → ②その鍵で暗号通信。<b>秘密鍵は一度も通信路に出ていません</b>。
      </>
    ),
  },
];

const PHASES = [
  { id: 1, label: "① 事前準備：公開鍵を渡す" },
  { id: 2, label: "② 本番：暗号化して送る" },
] as const;

function Flow() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [forward, setForward] = useState(true);
  const reducedMotion = useReducedMotion();
  const lastIndex = FLOW_STEPS.length - 1;
  const step = FLOW_STEPS[index];

  useEffect(() => {
    if (!playing || reducedMotion || index >= lastIndex) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(index + 1, lastIndex);
      setForward(true);
      setIndex(next);
      if (next >= lastIndex) setPlaying(false);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, lastIndex, playing, reducedMotion]);

  function move(next: number) {
    const clamped = Math.max(0, Math.min(next, lastIndex));
    setPlaying(false);
    setForward(clamped >= index);
    setIndex(clamped);
  }

  function togglePlay() {
    if (!playing && index >= lastIndex) {
      setForward(false);
      setIndex(0);
    }
    setPlaying((current) => !current);
  }

  const trail =
    forward && step.moves && !reducedMotion ? { id: `step-${index}`, lane: step.moves } : null;

  return (
    <Panel>
      <SectionTitle step={2}>送信の流れ（2段階：鍵を配る → 暗号通信）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AさんからBさんへ秘密のメッセージを送ります。<b className="text-gray-800">先に公開鍵を渡してから</b>通信する流れを、
        再生または矢印で1歩ずつ追いましょう。
      </p>

      {/* フェーズ表示（2段階） */}
      <div className="mt-3 flex gap-2 text-center text-[11px] font-bold" data-testid="crypto-phase" data-phase={step.phase}>
        {PHASES.map((p) => (
          <div
            key={p.id}
            className={`flex-1 rounded-lg px-2 py-1.5 ring-1 transition ${step.phase === p.id ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}
            aria-current={step.phase === p.id ? "step" : undefined}
          >
            {p.label}
          </div>
        ))}
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[11px] font-bold text-brand-700">STEP {index + 1} / {FLOW_STEPS.length}</p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="crypto-step-title">{step.title}</p>
        <p
          className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700"
          data-testid="crypto-route"
        >
          {step.route}
        </p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <CryptoScene {...step.scene} trail={trail} reducedMotion={reducedMotion} />
      </div>

      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {step.detail}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => move(index - 1)}
          disabled={index === 0}
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-800 disabled:opacity-30"
          aria-label="1ステップ戻る"
        >
          ←
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={reducedMotion}
          className="flex-none rounded-full bg-gray-900 px-3.5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "再生を一時停止" : "暗号通信を再生"}
        >
          {playing ? "一時停止" : "再生"}
        </button>
        <input
          type="range"
          min={0}
          max={lastIndex}
          step={1}
          value={index}
          onChange={(event) => move(Number(event.target.value))}
          className="min-w-0 flex-1 accent-brand-600"
          aria-label="暗号通信のタイムライン"
          aria-valuetext={`STEP ${index + 1}：${step.title}`}
        />
        <button
          type="button"
          onClick={() => move(index + 1)}
          disabled={index >= lastIndex}
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-800 disabled:opacity-30"
          aria-label="1ステップ進む"
        >
          →
        </button>
      </div>
      <ol className="mt-2 grid grid-cols-6 gap-1" aria-label="ステップ一覧">
        {FLOW_STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => move(i)}
              aria-label={`STEP ${i + 1}：${s.title}`}
              aria-current={i === index ? "step" : undefined}
              className={`h-1.5 w-full rounded-full transition ${i === index ? (s.phase === 1 ? "bg-emerald-500" : "bg-indigo-500") : i < index ? "bg-gray-400" : "bg-gray-200"}`}
            />
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500">
        <span>鍵ペアを作る</span>
        <span>秘密鍵で復号</span>
      </div>
      {reducedMotion && (
        <p className="mt-2 text-[10px] text-gray-500">
          端末の「視差効果を減らす」設定に合わせ、自動再生は停止しています。矢印またはスライダーで進められます。
        </p>
      )}

      <WhichKey />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 理解補助：どの鍵で開ける？
// ---------------------------------------------------------------------------

function WhichKey() {
  const [picked, setPicked] = useState<KeyKind | null>(null);
  const reducedMotion = useReducedMotion();
  const capsuleState: CapsuleState = picked === "private" ? "decrypted" : picked === "public" ? "failed" : "encrypted";

  return (
    <div className="mt-5 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200" data-testid="which-key">
      <p className="text-sm font-bold text-gray-900">確かめ：Bさんに届いた暗号文、どの鍵で開ける？</p>
      <p className="mt-0.5 text-[11px] text-gray-500">Bさんの公開鍵で閉めた暗号文です。鍵を選んで差し込んでみましょう。</p>

      <div className={`${styles.trySlot} ${reducedMotion ? styles.reducedMotion : ""} mt-2`}>
        <CipherCapsule
          key={`${picked ?? "none"}`}
          state={capsuleState}
          label={capsuleState === "decrypted" ? "復号されたメッセージ：会議は10時" : "暗号化されたメッセージ"}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="使う鍵を選ぶ">
        {(["public", "private"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setPicked(kind)}
            aria-pressed={picked === kind}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${picked === kind
              ? kind === "private"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-rose-400 bg-rose-50 text-rose-800"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="inline-block w-[26px]"><KeyGlyph kind={kind} /></span>
            {kind === "public" ? "Bの公開鍵" : "Bの秘密鍵"}
          </button>
        ))}
      </div>

      {picked && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ring-1 ${picked === "private" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}`}
          role="status"
          data-testid="which-key-result"
        >
          {picked === "private" ? (
            <><b>復号成功</b>：「会議は10時」に戻りました。公開鍵で暗号化したものは、<b>対になる秘密鍵</b>で復号します。</>
          ) : (
            <><b>復号失敗</b>：公開鍵は閉める（暗号化）専用。だから公開鍵を持っている第三者にも開けられません。</>
          )}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ③ 共通鍵とのちがい
// ---------------------------------------------------------------------------

function Comparison() {
  const rows = [
    { k: "鍵の数", c: "1本（同じ鍵を共有）", p: "2本ペア（公開鍵＋秘密鍵）" },
    { k: "暗号化／復号", c: "同じ鍵で両方", p: "公開鍵で暗号化→秘密鍵で復号" },
    { k: "鍵を配る悩み", c: "あり（同じ鍵を安全に渡す必要）", p: "小さい（公開鍵は配ってよい）" },
    { k: "速さ", c: "速い", p: "遅め" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>共通鍵方式とのちがい</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        鍵が1本だけの<b className="text-gray-800">共通鍵方式</b>とくらべると、違いがはっきりします。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 px-2 py-2.5 ring-1 ring-gray-200">
          <p className="text-xs font-bold text-gray-700">共通鍵</p>
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500">
            <span>閉める</span>
            <svg viewBox="0 0 44 20" className="h-[14px] w-[30px]" aria-hidden>
              <circle cx={9} cy={10} r={8} fill="#94A3B8" />
              <rect x={15} y={7.8} width={25} height={4.4} rx={1.2} fill="#94A3B8" />
              <path d="M 28 12 L 28 16 L 31 16 L 31 12 Z M 35 12 L 35 15 L 38 15 L 38 12 Z" fill="#94A3B8" />
            </svg>
            <span>開ける</span>
          </div>
          <p className="mt-1 text-[10px] text-gray-500">同じ1本で両方</p>
        </div>
        <div className="rounded-xl bg-brand-50 px-2 py-2.5 ring-1 ring-brand-200">
          <p className="text-xs font-bold text-brand-700">公開鍵</p>
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500">
            <span>閉める</span>
            <span className="inline-block w-[30px]"><KeyGlyph kind="public" /></span>
            <span className="inline-block w-[30px]"><KeyGlyph kind="private" /></span>
            <span>開ける</span>
          </div>
          <p className="mt-1 text-[10px] text-gray-500">ペアの2本で役割分担</p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 text-left font-bold"> </th>
              <th className="px-3 py-2 text-center font-bold text-gray-700">共通鍵</th>
              <th className="px-3 py-2 text-center font-bold text-brand-700">公開鍵</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.c}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ 公開鍵暗号は<b>デジタル署名</b>にも使われます（こちらは逆に、秘密鍵で署名し公開鍵で確認）。
      </p>
    </Panel>
  );
}

export default function PublicKeyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📮 たとえると<b>郵便受け</b>。<b>公開鍵＝投入口</b>（誰でも手紙を入れられる＝暗号化できる）、
        <b>秘密鍵＝持ち主だけの開錠鍵</b>（中身を取り出せる＝復号できる）。鍵は<b>2本でペア</b>です。
      </div>

      <KeyRoles />
      <Flow />
      <Comparison />
    </div>
  );
}
