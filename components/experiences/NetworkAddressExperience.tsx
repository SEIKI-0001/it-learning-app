"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, SectionTitle } from "./ui";

type NodeId = "browser" | "dns" | "server";

type FlowStep = {
  title: string;
  eyebrow: string;
  from: NodeId;
  to: NodeId;
  payload: string;
  detail: string;
};

const FLOW_STEPS: FlowStep[] = [
  {
    eyebrow: "INPUT",
    title: "URLを入力する",
    from: "browser",
    to: "browser",
    payload: "example.com",
    detail:
      "人は覚えやすいドメイン名を入力します。この時点では、接続先のIPアドレスはまだ分かっていません。",
  },
  {
    eyebrow: "DNS QUERY",
    title: "DNSへ名前を問い合わせる",
    from: "browser",
    to: "dns",
    payload: "example.com のIPは？",
    detail:
      "ブラウザはDNSへ、ドメイン名に対応するIPアドレスを問い合わせます。DNSはページ本体ではなく「接続先の住所」を返します。",
  },
  {
    eyebrow: "DNS RESPONSE",
    title: "IPアドレスを受け取る",
    from: "dns",
    to: "browser",
    payload: "93.184.216.34",
    detail:
      "DNSからIPアドレスが返ります。ここで初めて、ブラウザは接続すべきサーバのネット上の住所を知ります。",
  },
  {
    eyebrow: "CONNECT",
    title: "IPアドレスを使って接続する",
    from: "browser",
    to: "server",
    payload: "→ 93.184.216.34",
    detail:
      "以降の通信は、取得したIPアドレスを使ってWebサーバへ向かいます。順番は「名前 → DNS → IP → 接続」です。",
  },
  {
    eyebrow: "ARRIVE",
    title: "Webサーバへ到達",
    from: "server",
    to: "server",
    payload: "CONNECTED",
    detail:
      "名前解決は接続前の準備です。DNSがWebページそのものを返しているわけではない、という点が試験でも重要です。",
  },
];

const NODE_POSITIONS: Record<NodeId, number> = {
  browser: 13,
  dns: 50,
  server: 87,
};

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

function NetworkNode({
  id,
  label,
  sub,
  active,
  danger,
}: {
  id: NodeId;
  label: string;
  sub: string;
  active: boolean;
  danger?: boolean;
}) {
  return (
    <div
      data-node={id}
      className={`relative z-10 rounded-2xl border p-3 text-center shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition-all duration-500 ${danger
        ? "border-rose-400 bg-rose-50"
        : active
          ? "border-sky-400 bg-white shadow-[0_18px_38px_rgba(14,165,233,0.22)]"
          : "border-slate-200 bg-white/90"
      }`}
      style={{
        transform: active
          ? "perspective(520px) rotateX(4deg) translateY(-4px)"
          : "perspective(520px) rotateX(4deg)",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className={`mx-auto grid h-9 w-9 place-items-center rounded-xl text-[10px] font-black tracking-wide ${danger
          ? "bg-rose-100 text-rose-700"
          : active
            ? "bg-sky-100 text-sky-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {id === "browser" ? "WWW" : id === "dns" ? "DNS" : "WEB"}
      </div>
      <p className="mt-2 text-xs font-black text-slate-900">{label}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{sub}</p>
    </div>
  );
}

function DnsJourney() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [outage, setOutage] = useState(false);
  const [inspectPacket, setInspectPacket] = useState(false);
  const reducedMotion = useReducedMotion();

  const step = FLOW_STEPS[index];
  const packetPosition = outage ? NODE_POSITIONS.dns : NODE_POSITIONS[step.to];
  const activeNodes = useMemo(() => {
    if (outage) return new Set<NodeId>(["browser", "dns"]);
    return new Set<NodeId>([step.from, step.to]);
  }, [outage, step.from, step.to]);

  useEffect(() => {
    if (!playing || outage || reducedMotion) return;
    if (index >= FLOW_STEPS.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, FLOW_STEPS.length - 1));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [index, outage, playing, reducedMotion]);

  function toggleOutage() {
    setPlaying(false);
    setInspectPacket(false);
    setOutage((current) => {
      const next = !current;
      if (next) setIndex(1);
      return next;
    });
  }

  function move(next: number) {
    setPlaying(false);
    setOutage(false);
    setInspectPacket(false);
    setIndex(Math.max(0, Math.min(next, FLOW_STEPS.length - 1)));
  }

  function togglePlay() {
    setOutage(false);
    setInspectPacket(false);
    if (index >= FLOW_STEPS.length - 1) setIndex(0);
    setPlaying((current) => !current);
  }

  return (
    <Panel>
      <SectionTitle step={2}>名前解決を「再生」して追う</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        静止図ではなく、データがどこへ動くかを時間軸で追います。
        カプセルを押すと、その瞬間に流れている情報も確認できます。
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-sky-300">
              {outage ? "FAULT SIMULATION" : step.eyebrow}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {outage ? "DNSが応答しない" : step.title}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleOutage}
            aria-pressed={outage}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${outage
              ? "bg-rose-500 text-white"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {outage ? "正常に戻す" : "DNSを止める"}
          </button>
        </div>

        <div className="relative mt-4 min-h-[210px] rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-8">
          <div
            aria-hidden
            className="absolute top-[48%] h-px bg-gradient-to-r from-sky-500/20 via-sky-300/70 to-emerald-400/30"
            style={{ left: "13%", right: "13%" }}
          />
          <div className="relative grid grid-cols-3 items-center gap-3">
            <NetworkNode
              id="browser"
              label="あなた"
              sub="ブラウザ"
              active={activeNodes.has("browser")}
            />
            <NetworkNode
              id="dns"
              label="DNS"
              sub="名前 → IP"
              active={activeNodes.has("dns")}
              danger={outage}
            />
            <NetworkNode
              id="server"
              label="Webサーバ"
              sub="93.184.216.34"
              active={activeNodes.has("server")}
            />
          </div>

          <button
            type="button"
            onClick={() => setInspectPacket((current) => !current)}
            className={`absolute top-[54%] z-20 max-w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-[10px] font-black shadow-lg ${outage
              ? "border-rose-300 bg-rose-500 text-white"
              : "border-sky-300 bg-sky-400 text-slate-950"
            }`}
            style={{
              left: `${packetPosition}%`,
              transition: reducedMotion ? "none" : "left 560ms cubic-bezier(.2,.8,.2,1)",
            }}
            aria-expanded={inspectPacket}
            aria-label="流れているデータの中身を見る"
          >
            {outage ? "応答なし" : step.payload}
          </button>

          {inspectPacket && (
            <div className="absolute inset-x-3 bottom-3 z-30 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-left shadow-xl">
              <p className="text-[10px] font-black tracking-[0.14em] text-sky-300">DATA CAPSULE</p>
              <p className="mt-1 font-mono text-xs font-bold text-white">
                {outage ? "DNS response: timeout" : step.payload}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {outage
                  ? "IPアドレスが返らないため、この先のWebサーバ接続へ進めません。"
                  : step.detail}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-3" aria-live="polite">
          <p className="text-xs leading-relaxed text-slate-200">
            {outage ? (
              <>
                <b className="text-rose-300">DNS応答なし → IPアドレス不明 → 接続先を決められない。</b>
                ドメイン名でWebサイトへ到達できません。
              </>
            ) : (
              step.detail
            )}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => move(index - 1)}
            disabled={index === 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white disabled:opacity-30"
            aria-label="1ステップ戻る"
          >
            ←
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={reducedMotion}
            className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="min-w-0 flex-1 accent-sky-400"
            aria-label="名前解決のタイムライン"
          />
          <button
            type="button"
            onClick={() => move(index + 1)}
            disabled={index === FLOW_STEPS.length - 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white disabled:opacity-30"
            aria-label="1ステップ進む"
          >
            →
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>URL入力</span>
          <span>{index + 1} / {FLOW_STEPS.length}</span>
          <span>サーバ到達</span>
        </div>
        {reducedMotion && (
          <p className="mt-2 text-[10px] text-slate-500">
            端末の「視差効果を減らす」設定に合わせ、自動再生は停止しています。矢印またはスライダーで進められます。
          </p>
        )}
      </div>
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
