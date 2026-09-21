"use client";

import { useEffect, useState } from "react";
import type { CapsuleKind } from "./network/DataCapsule";
import {
  NetworkScene,
  type CapsuleStop,
  type LaneId,
  type LaneState,
  type NetworkNodeId,
} from "./network/NetworkScene";
import type { NodeState } from "./network/NetworkSceneBase";
import { Panel, SectionTitle } from "./ui";

type NetworkPhase = {
  eyebrow: string;
  title: string;
  /** 通信の向き。色に頼らず文字でも示す。 */
  route: string;
  capsule: { kind: CapsuleKind; tag: string; payload: string; stop: CapsuleStop };
  trail: { from: CapsuleStop; to: CapsuleStop } | null;
  nodes: Record<NetworkNodeId, NodeState>;
  lanes: Record<LaneId, LaneState>;
  detail: string;
};

const IDLE_LANES: Record<LaneId, LaneState> = { query: "idle", response: "idle", web: "idle" };

const FLOW_STEPS: NetworkPhase[] = [
  {
    eyebrow: "INPUT",
    title: "URLを入力する",
    route: "あなた（入力）",
    capsule: { kind: "input", tag: "INPUT", payload: "example.com", stop: "input" },
    trail: null,
    nodes: { user: "active", dns: "idle", web: "idle" },
    lanes: IDLE_LANES,
    detail:
      "人は覚えやすいドメイン名を入力します。この時点では、接続先のIPアドレスはまだ分かっていません。",
  },
  {
    eyebrow: "DNS QUERY",
    title: "DNSへ名前を問い合わせる",
    route: "あなた → DNS",
    capsule: { kind: "query", tag: "DNS QUERY", payload: "example.com → ?", stop: "dnsIn" },
    trail: { from: "userOut", to: "dnsIn" },
    nodes: { user: "sending", dns: "active", web: "idle" },
    lanes: { ...IDLE_LANES, query: "active" },
    detail:
      "ブラウザはDNSへ、ドメイン名に対応するIPアドレスを問い合わせます。DNSはページ本体ではなく「接続先の住所」を返します。",
  },
  {
    eyebrow: "DNS RESPONSE",
    title: "IPアドレスを受け取る",
    route: "DNS → あなた",
    capsule: { kind: "response", tag: "DNS RESPONSE", payload: "93.184.216.34", stop: "userIn" },
    trail: { from: "dnsOut", to: "userIn" },
    nodes: { user: "active", dns: "sending", web: "idle" },
    lanes: { ...IDLE_LANES, response: "active" },
    detail:
      "DNSからIPアドレスが返ります。ここで初めて、ブラウザは接続すべきサーバのネット上の住所を知ります。",
  },
  {
    eyebrow: "CONNECT",
    title: "IPアドレスを使って接続する",
    route: "あなた → Webサーバ",
    capsule: { kind: "connect", tag: "CONNECT", payload: "93.184.216.34", stop: "webIn" },
    trail: { from: "webOut", to: "webIn" },
    nodes: { user: "sending", dns: "idle", web: "active" },
    lanes: { ...IDLE_LANES, web: "active" },
    detail:
      "以降の通信は、取得したIPアドレスを使ってWebサーバへ向かいます。順番は「名前 → DNS → IP → 接続」です。",
  },
  {
    eyebrow: "ARRIVE",
    title: "Webサーバへ到達",
    route: "Webサーバに到達",
    capsule: { kind: "connected", tag: "CONNECTED", payload: "93.184.216.34", stop: "webIn" },
    trail: null,
    nodes: { user: "idle", dns: "idle", web: "active" },
    lanes: { ...IDLE_LANES, web: "active" },
    detail:
      "名前解決は接続前の準備です。DNSがWebページそのものを返しているわけではない、という点が試験でも重要です。",
  },
];

// DNS停止中は「問い合わせ」までしか進めない。応答レーンとWeb接続レーンは最初から塞がっている。
const OUTAGE_LAST_INDEX = 1;
const OUTAGE_LANES: Record<LaneId, LaneState> = { query: "idle", response: "blocked", web: "blocked" };
const OUTAGE_DETAIL = "IPアドレスが返らないため、この先のWebサーバ接続へ進めません。";

function outagePhase(index: number, timedOut: boolean): NetworkPhase {
  if (index === 0) {
    return {
      ...FLOW_STEPS[0],
      nodes: { user: "active", dns: "error", web: "disabled" },
      lanes: OUTAGE_LANES,
    };
  }
  return {
    eyebrow: "FAULT SIMULATION",
    title: timedOut ? "DNSが応答しない" : "DNSの応答を待っている…",
    route: timedOut ? "DNS → あなた：応答なし" : "あなた → DNS",
    capsule: timedOut
      ? { kind: "timeout", tag: "DNS TIMEOUT", payload: "IP = ?", stop: "dnsBlocked" }
      : { kind: "query", tag: "DNS QUERY", payload: "example.com → ?", stop: "dnsBlocked" },
    trail: { from: "userOut", to: "dnsBlocked" },
    nodes: { user: "sending", dns: "error", web: "disabled" },
    lanes: { ...OUTAGE_LANES, query: timedOut ? "idle" : "active" },
    detail: OUTAGE_DETAIL,
  };
}

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

function IpAddressIntro() {
  const [expanded, setExpanded] = useState(false);
  const octets = [
    { decimal: "93", binary: "01011101" },
    { decimal: "184", binary: "10111000" },
    { decimal: "216", binary: "11011000" },
    { decimal: "34", binary: "00100010" },
  ];

  return (
    <Panel>
      <SectionTitle step={1}>IPアドレスは「機械が使う住所」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        人は <b className="text-gray-900">example.com</b> のような名前を覚えますが、
        通信では <b className="text-gray-900">IPアドレス</b> を使って相手を特定します。
        まず「名前」と「住所」を別物としてつかみます。
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-sky-300">HUMAN FRIENDLY</p>
            <p className="mt-1 text-lg font-bold">example.com</p>
          </div>
          <div className="text-xl text-slate-500">→</div>
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-[0.18em] text-emerald-300">NETWORK ADDRESS</p>
            <p className="mt-1 font-mono text-lg font-bold">93.184.216.34</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-white/10"
          aria-expanded={expanded}
        >
          {expanded ? "IPv4の中身を閉じる" : "IPv4の4つの数字を分解してみる"}
        </button>

        {expanded && (
          <div className="mt-3 grid grid-cols-4 gap-2" data-testid="ip-octets">
            {octets.map((octet) => (
              <div
                key={octet.decimal}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center"
              >
                <div className="font-mono text-lg font-black text-white">{octet.decimal}</div>
                <div className="mt-1 font-mono text-[9px] text-slate-400">{octet.binary}</div>
                <div className="mt-1 text-[10px] text-slate-500">8 bit</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-100">
        IPv4は4つの8ビット値を「.」で区切ったもの。各部分は0〜255です。
      </p>
    </Panel>
  );
}

function DnsJourney() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [outage, setOutage] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [inspectPacket, setInspectPacket] = useState(false);
  const [forward, setForward] = useState(true);
  const reducedMotion = useReducedMotion();

  const lastIndex = outage ? OUTAGE_LAST_INDEX : FLOW_STEPS.length - 1;
  const phase = outage ? outagePhase(index, timedOut) : FLOW_STEPS[index];
  const waitingForDns = outage && index === OUTAGE_LAST_INDEX && !timedOut;

  useEffect(() => {
    if (!playing || reducedMotion || index >= lastIndex) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(index + 1, lastIndex);
      setForward(true);
      setIndex(next);
      if (next >= lastIndex) setPlaying(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [index, lastIndex, playing, reducedMotion]);

  // 問い合わせがDNSに届いてから、一拍おいてタイムアウトを確定させる。
  useEffect(() => {
    if (!waitingForDns) return;
    const timer = window.setTimeout(() => setTimedOut(true), reducedMotion ? 0 : 1300);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, waitingForDns]);

  function goTo(next: number, limit = lastIndex) {
    const clamped = Math.max(0, Math.min(next, limit));
    setForward(clamped >= index);
    setTimedOut(false);
    setIndex(clamped);
  }

  function toggleOutage() {
    setPlaying(false);
    setInspectPacket(false);
    const next = !outage;
    setOutage(next);
    goTo(1, next ? OUTAGE_LAST_INDEX : FLOW_STEPS.length - 1);
    setForward(true);
  }

  function move(next: number) {
    setPlaying(false);
    setInspectPacket(false);
    goTo(next);
  }

  function togglePlay() {
    setInspectPacket(false);
    if (!playing && index >= lastIndex) goTo(0);
    setPlaying((current) => !current);
  }

  const trail =
    forward && phase.trail && !reducedMotion
      ? { id: `${outage ? "outage" : "flow"}-${index}`, kind: phase.capsule.kind, ...phase.trail }
      : null;

  return (
    <Panel>
      <SectionTitle step={2}>名前解決を「再生」して追う</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        小さなネットワーク模型の中を、データのカプセルが移動します。
        カプセルを押すと、その瞬間に流れている情報も確認できます。
      </p>

      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold tracking-[0.16em] ${outage ? "text-rose-700" : "text-brand-700"}`}
          >
            {phase.eyebrow}
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">{phase.title}</p>
          <p className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-700" data-testid="network-route">
            {phase.route}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOutage}
          aria-pressed={outage}
          className={`flex-none rounded-full px-3 py-1.5 text-[11px] font-bold transition ${outage
            ? "bg-rose-600 text-white"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {outage ? "正常に戻す" : "DNSを止める"}
        </button>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <NetworkScene
          nodes={phase.nodes}
          lanes={phase.lanes}
          capsule={phase.capsule}
          trail={trail}
          outage={outage && timedOut}
          reducedMotion={reducedMotion}
          inspectOpen={inspectPacket}
          onInspect={() => setInspectPacket((current) => !current)}
        />
      </div>

      {inspectPacket && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="capsule-inspector">
          <p className="text-[10px] font-bold tracking-[0.14em] text-brand-700">DATA CAPSULE</p>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-gray-500">種類</dt>
            <dd className="font-mono font-bold text-gray-900">{phase.capsule.tag}</dd>
            <dt className="text-gray-500">向き</dt>
            <dd className="font-bold text-gray-900">{phase.route}</dd>
            <dt className="text-gray-500">中身</dt>
            <dd className="font-mono font-bold text-gray-900">
              {outage && timedOut ? "DNS response: timeout" : phase.capsule.payload}
            </dd>
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-600">{phase.detail}</p>
        </div>
      )}

      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" aria-live="polite">
        <p className="text-xs leading-relaxed text-gray-700">
          {outage ? (
            <>
              <b className="text-rose-700">DNS応答なし → IPアドレス不明 → 接続先を決められない。</b>
              ドメイン名でWebサイトへ到達できません。
            </>
          ) : (
            phase.detail
          )}
        </p>
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
          aria-label={playing ? "再生を一時停止" : "名前解決を再生"}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={FLOW_STEPS.length - 1}
          step={1}
          value={index}
          onChange={(event) => move(Number(event.target.value))}
          className="min-w-0 flex-1 accent-brand-600"
          aria-label="名前解決のタイムライン"
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
      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-500">
        <span>URL入力</span>
        <span>{index + 1} / {FLOW_STEPS.length}</span>
        <span>サーバ到達</span>
      </div>
      {outage && (
        <p className="mt-2 text-[11px] font-bold text-rose-700">
          DNSが止まっているため、問い合わせより先へは進めません。
        </p>
      )}
      {reducedMotion && (
        <p className="mt-2 text-[10px] text-gray-500">
          端末の「視差効果を減らす」設定に合わせ、自動再生は停止しています。矢印またはスライダーで進められます。
        </p>
      )}
    </Panel>
  );
}

function ExamModel() {
  return (
    <Panel>
      <SectionTitle step={3}>試験では「何を返す仕組みか」で見分ける</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-black tracking-[0.12em] text-emerald-700">DNS DOES</p>
          <p className="mt-1 text-sm font-black text-emerald-950">ドメイン名 → IPアドレス</p>
          <p className="mt-2 text-xs leading-relaxed text-emerald-900">
            「example.com はどのIP？」に答える。接続先を見つけるための名前解決です。
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[11px] font-black tracking-[0.12em] text-rose-700">DNS DOES NOT</p>
          <p className="mt-1 text-sm font-black text-rose-950">Webページ本体を返す</p>
          <p className="mt-2 text-xs leading-relaxed text-rose-900">
            HTMLや画像を返すのはWebサーバ側。DNSとWebサーバの役割を混同しないのがポイントです。
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
        <p className="text-xs font-black text-slate-500">ONE-LINE MODEL</p>
        <p className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
          人が名前を入力 → DNSがIPを返す → ブラウザがそのIPへ接続する
        </p>
      </div>
    </Panel>
  );
}

export default function NetworkAddressExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3.5">
        <p className="text-xs font-black tracking-[0.12em] text-sky-700">INTERACTIVE EXPLANATION</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          「IPアドレスとDNS」を暗記ではなく、<b className="text-slate-950">データの移動と障害</b>から理解します。
          再生・停止・巻き戻し・DNS停止を自由に試してください。
        </p>
      </div>

      <IpAddressIntro />
      <DnsJourney />
      <ExamModel />
    </div>
  );
}
