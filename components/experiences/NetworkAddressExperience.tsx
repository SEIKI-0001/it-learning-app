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
  capsule: { kind: CapsuleKind; tag: string; payload: string; stop: CapsuleStop } | null;
  trail: { from: CapsuleStop; to: CapsuleStop } | null;
  nodes: Record<NetworkNodeId, NodeState>;
  lanes: Record<LaneId, LaneState>;
  showBrowser?: boolean;
  detail: string;
};

// 0.5倍速: 1ステップを読んで目で追えるだけの間を取る
const AUTOPLAY_INTERVAL_MS = 3000;
const DNS_TIMEOUT_MS = 2600;

const IDLE_LANES: Record<LaneId, LaneState> = {
  query: "idle",
  response: "idle",
  web: "idle",
  page: "idle",
};

const FLOW_STEPS: NetworkPhase[] = [
  {
    eyebrow: "入力",
    title: "URLを入力する",
    route: "あなた（入力）",
    capsule: { kind: "input", tag: "入力", payload: "example.com", stop: "input" },
    trail: null,
    nodes: { user: "active", dns: "idle", web: "idle" },
    lanes: IDLE_LANES,
    detail:
      "人は覚えやすいドメイン名を入力します。この時点では、接続先のIPアドレスはまだ分かっていません。",
  },
  {
    eyebrow: "DNS問い合わせ",
    title: "DNSへ名前を問い合わせる",
    route: "あなた → DNS",
    capsule: { kind: "query", tag: "DNS問い合わせ", payload: "example.com → ?", stop: "dnsIn" },
    trail: { from: "userOut", to: "dnsIn" },
    nodes: { user: "sending", dns: "active", web: "idle" },
    lanes: { ...IDLE_LANES, query: "active" },
    detail:
      "ブラウザはDNSへ、ドメイン名に対応するIPアドレスを問い合わせます。DNSはページ本体ではなく「接続先の住所」を返します。",
  },
  {
    eyebrow: "DNS応答",
    title: "IPアドレスを受け取る",
    route: "DNS → あなた",
    capsule: { kind: "response", tag: "DNS応答", payload: "93.184.216.34", stop: "userIn" },
    trail: { from: "dnsOut", to: "userIn" },
    nodes: { user: "active", dns: "sending", web: "idle" },
    lanes: { ...IDLE_LANES, response: "active" },
    detail:
      "DNSからIPアドレスが返ります。ここで初めて、ブラウザは接続すべきサーバのネット上の住所を知ります。",
  },
  {
    eyebrow: "接続",
    title: "IPアドレスを使って接続する",
    route: "あなた → Webサーバ",
    capsule: { kind: "connect", tag: "接続要求", payload: "宛先 93.184.216.34", stop: "webIn" },
    trail: { from: "webOut", to: "webIn" },
    nodes: { user: "sending", dns: "idle", web: "active" },
    lanes: { ...IDLE_LANES, web: "active" },
    detail:
      "取得したIPアドレスを宛先にして、Webサーバへ向かいます。DNSの出番はここまでです。",
  },
  {
    eyebrow: "到達",
    title: "Webサーバが要求を受け取る",
    route: "Webサーバに到達",
    capsule: { kind: "connected", tag: "要求を受信", payload: "ページをください", stop: "webIn" },
    trail: null,
    nodes: { user: "idle", dns: "idle", web: "active" },
    lanes: IDLE_LANES,
    detail:
      "Webサーバに要求が届きました。サーバは要求されたページのデータ（HTMLや画像）を用意します。",
  },
  {
    eyebrow: "ページ受信",
    title: "ページのデータが返ってくる",
    route: "Webサーバ → あなた",
    capsule: { kind: "page", tag: "ページのデータ", payload: "HTML・画像", stop: "pageIn" },
    trail: { from: "pageOut", to: "pageIn" },
    nodes: { user: "active", dns: "idle", web: "sending" },
    lanes: { ...IDLE_LANES, page: "active" },
    detail:
      "Webサーバがページのデータを返します。ページ本体を返すのはDNSではなくWebサーバです。",
  },
  {
    eyebrow: "表示",
    title: "ブラウザがページを表示する",
    route: "あなた（表示）",
    capsule: null,
    trail: null,
    nodes: { user: "active", dns: "idle", web: "idle" },
    lanes: IDLE_LANES,
    showBrowser: true,
    detail:
      "ブラウザが受け取ったデータを組み立てて画面に表示します。「名前 → DNS → IP → 接続 → ページ → 表示」が全体の流れです。",
  },
];

// DNS停止中は「問い合わせ」までしか進めない。応答・接続・ページのレーンは最初から塞がっている。
const OUTAGE_LAST_INDEX = 1;
const OUTAGE_LANES: Record<LaneId, LaneState> = {
  query: "idle",
  response: "blocked",
  web: "blocked",
  page: "blocked",
};
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
    eyebrow: "障害シミュレーション",
    title: timedOut ? "DNSが応答しない" : "DNSの応答を待っている…",
    route: timedOut ? "DNS → あなた：応答なし" : "あなた → DNS",
    capsule: timedOut
      ? { kind: "timeout", tag: "DNS応答なし", payload: "IPアドレス不明", stop: "dnsBlocked" }
      : { kind: "query", tag: "DNS問い合わせ", payload: "example.com → ?", stop: "dnsBlocked" },
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

const OCTETS = [
  { decimal: "93", binary: "01011101" },
  { decimal: "184", binary: "10111000" },
  { decimal: "216", binary: "11011000" },
  { decimal: "34", binary: "00100010" },
];

type AddressScope = "private" | "global";

const SCOPE_COPY: Record<AddressScope, { name: string; body: string }> = {
  private: {
    name: "プライベートIPアドレス",
    body: "家や会社の中だけで使う住所。192.168.○.○ などで、よその家と同じ番号でもかまいません。インターネットへ直接は出ていきません。",
  },
  global: {
    name: "グローバルIPアドレス",
    body: "インターネット上で世界に1つだけの住所。中の機器が外と通信するときは、ルータがこの住所に付け替えて送り出します（NAT）。",
  },
};

function IpAddressIntro() {
  const [expanded, setExpanded] = useState(false);
  const [scope, setScope] = useState<AddressScope>("private");

  return (
    <Panel>
      <SectionTitle step={1}>IPアドレスは「機械が使う住所」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        人は <b className="text-gray-900">example.com</b> のような名前を覚えますが、
        通信では <b className="text-gray-900">IPアドレス</b> という番号で相手を特定します。
      </p>

      <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-200">
            <p className="text-[11px] font-bold text-gray-500">人が覚える名前</p>
            <p className="mt-0.5 truncate text-sm font-bold text-gray-900">example.com</p>
          </div>
          <div className="flex flex-col items-center text-[10px] font-bold text-brand-700">
            <span>DNSが</span>
            <span aria-hidden className="text-base leading-none">→</span>
            <span>変換</span>
          </div>
          <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-brand-200">
            <p className="text-[11px] font-bold text-brand-700">機械が使う住所</p>
            <p className="mt-0.5 truncate font-mono text-sm font-bold text-gray-900">93.184.216.34</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-xs font-bold text-gray-700 transition hover:bg-gray-50"
          aria-expanded={expanded}
        >
          {expanded ? "IPv4の中身を閉じる" : "IPv4の4つの数字を分解してみる"}
        </button>

        {expanded && (
          <div className="mt-3" data-testid="ip-octets">
            <div className="grid grid-cols-4 gap-1.5">
              {OCTETS.map((octet) => (
                <div key={octet.decimal} className="rounded-lg bg-white px-1 py-2.5 text-center ring-1 ring-gray-200">
                  <div className="font-mono text-base font-bold text-gray-900">{octet.decimal}</div>
                  <div className="mt-1 font-mono text-[9px] text-gray-500">{octet.binary}</div>
                  <div className="mt-1 text-[10px] font-bold text-brand-700">8ビット</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-700">
              <b>8ビット × 4 ＝ 32ビット</b>。8ビットで表せるのは0〜255なので、各部分は必ず0〜255に収まります。
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-gray-900">住所には「中だけ」と「世界共通」の2種類がある</p>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="IPアドレスの種類">
          {(["private", "global"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
              className={`rounded-md px-2 py-1.5 text-xs font-bold transition ${scope === value
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {value === "private" ? "家・会社の中" : "インターネット側"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-1.5 text-center" data-scope={scope} data-testid="address-scope">
          <div
            className={`space-y-1 rounded-lg p-2 ring-1 transition ${scope === "private" ? "bg-brand-50 ring-brand-300" : "bg-white opacity-50 ring-gray-200"}`}
          >
            <p className="text-[10px] font-bold text-gray-600">PC</p>
            <p className="font-mono text-[10px] font-bold text-gray-900">192.168.1.10</p>
            <p className="text-[10px] font-bold text-gray-600">スマホ</p>
            <p className="font-mono text-[10px] font-bold text-gray-900">192.168.1.11</p>
          </div>
          <span aria-hidden className="text-gray-400">→</span>
          <div className="rounded-lg bg-white px-2 py-3 ring-1 ring-gray-300">
            <p className="text-[10px] font-bold text-gray-900">ルータ</p>
            <p className="mt-0.5 text-[9px] text-gray-500">付け替え</p>
          </div>
          <span aria-hidden className="text-gray-400">→</span>
          <div
            className={`space-y-1 rounded-lg p-2 ring-1 transition ${scope === "global" ? "bg-brand-50 ring-brand-300" : "bg-white opacity-50 ring-gray-200"}`}
          >
            <p className="text-[10px] font-bold text-gray-600">インターネット</p>
            <p className="font-mono text-[10px] font-bold text-gray-900">203.0.113.5</p>
            <p className="text-[9px] text-gray-500">世界で1つ</p>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-700 ring-1 ring-gray-200" aria-live="polite">
          <b className="text-gray-900">{SCOPE_COPY[scope].name}</b>：{SCOPE_COPY[scope].body}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
        IPv4（32ビット）は約43億個しかなく不足しているため、128ビットの <b className="text-gray-700">IPv6</b> への移行も進んでいます。
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
      setInspectPacket(false);
      setIndex(next);
      if (next >= lastIndex) setPlaying(false);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, lastIndex, playing, reducedMotion]);

  // 問い合わせがDNSに届いてから、一拍おいてタイムアウトを確定させる。
  useEffect(() => {
    if (!waitingForDns) return;
    const timer = window.setTimeout(() => setTimedOut(true), reducedMotion ? 0 : DNS_TIMEOUT_MS);
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
    forward && phase.trail && phase.capsule && !reducedMotion
      ? { id: `${outage ? "outage" : "flow"}-${index}`, kind: phase.capsule.kind, ...phase.trail }
      : null;

  return (
    <Panel>
      <SectionTitle step={2}>URL入力から表示までを「再生」して追う</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        小さなネットワーク模型の中を、データのカプセルが移動します。
        カプセルを押すと、その瞬間に流れている情報も確認できます。
      </p>

      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-bold ${outage ? "text-rose-700" : "text-brand-700"}`}>
            {outage ? phase.eyebrow : `STEP ${index + 1}・${phase.eyebrow}`}
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">{phase.title}</p>
          <p
            className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700"
            data-testid="network-route"
          >
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
          showBrowser={phase.showBrowser}
          trail={trail}
          outage={outage && timedOut}
          reducedMotion={reducedMotion}
          inspectOpen={inspectPacket}
          onInspect={() => setInspectPacket((current) => !current)}
        />
      </div>

      {inspectPacket && phase.capsule && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="capsule-inspector">
          <p className="text-[11px] font-bold text-brand-700">データの中身</p>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-gray-500">種類</dt>
            <dd className="font-bold text-gray-900">{phase.capsule.tag}</dd>
            <dt className="text-gray-500">向き</dt>
            <dd className="font-bold text-gray-900">{phase.route}</dd>
            <dt className="text-gray-500">中身</dt>
            <dd className="font-mono font-bold text-gray-900">
              {outage && timedOut ? "DNSの応答：タイムアウト" : phase.capsule.payload}
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
          {playing ? "一時停止" : "再生"}
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
        <span>サイト表示</span>
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

const ROLES = [
  { who: "DNS", returns: "IPアドレス", note: "名前 → 住所の変換だけ。ページは返さない" },
  { who: "Webサーバ", returns: "ページのデータ", note: "HTMLや画像を返す" },
  { who: "ブラウザ", returns: "画面に表示", note: "受け取ったデータを組み立てる" },
];

const CHECKS: { id: string; statement: string; answer: boolean; explanation: string }[] = [
  {
    id: "dns-html",
    statement: "DNSはWebページのHTMLを返す",
    answer: false,
    explanation: "DNSが返すのはIPアドレス。HTMLなどのページ本体はWebサーバが返します。",
  },
  {
    id: "dns-down",
    statement: "DNSが止まると、ドメイン名ではサイトを開けなくなる",
    answer: true,
    explanation: "名前からIPアドレスを引けないため、接続先が決まりません。",
  },
  {
    id: "private",
    statement: "192.168.1.10 はインターネット上で世界に1つだけの住所だ",
    answer: false,
    explanation: "192.168.○.○ は家や会社の中だけで使うプライベートIPアドレスです。",
  },
  {
    id: "ipv4",
    statement: "IPv4アドレスは32ビットで、各部分は0〜255の数になる",
    answer: true,
    explanation: "8ビット × 4 ＝ 32ビット。8ビットで表せるのは0〜255です。",
  },
];

function ExamModel() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const correctCount = CHECKS.filter((check) => answers[check.id] === check.answer).length;
  const answeredCount = Object.keys(answers).length;

  return (
    <Panel>
      <SectionTitle step={3}>試験では「誰が何を返すか」で見分ける</SectionTitle>

      <div className="mt-3 divide-y divide-gray-200 rounded-xl ring-1 ring-gray-200">
        {ROLES.map((role) => (
          <div key={role.who} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 px-3 py-2.5">
            <span className="text-xs font-bold text-gray-600">{role.who}</span>
            <span>
              <span className="block text-sm font-bold text-gray-900">{role.returns}</span>
              <span className="block text-[11px] text-gray-500">{role.note}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-gray-900">○×でひっかけを確認</p>
          <p className="text-xs font-bold text-gray-500" aria-live="polite">
            {answeredCount > 0 ? `${correctCount} / ${CHECKS.length} 正解` : `全${CHECKS.length}問`}
          </p>
        </div>
        <ul className="mt-2 space-y-2">
          {CHECKS.map((check) => {
            const picked = answers[check.id];
            const answered = picked !== undefined;
            const correct = picked === check.answer;
            return (
              <li
                key={check.id}
                className={`rounded-xl p-3 ring-1 ${answered
                  ? correct
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-rose-50 ring-rose-200"
                  : "bg-white ring-gray-200"
                }`}
                data-check={check.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold leading-relaxed text-gray-900">{check.statement}</p>
                  <div className="flex flex-none gap-1.5">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [check.id]: value }))}
                        aria-pressed={picked === value}
                        aria-label={`${check.statement}：${value ? "○" : "×"}`}
                        className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-bold transition ${picked === value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {value ? "○" : "×"}
                      </button>
                    ))}
                  </div>
                </div>
                {answered && (
                  <p className={`mt-2 text-[11px] leading-relaxed ${correct ? "text-emerald-700" : "text-rose-700"}`}>
                    <b>{correct ? "正解" : "不正解"}（答え：{check.answer ? "○" : "×"}）</b> {check.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <p className="text-xs font-bold text-gray-500">ひとことで言うと</p>
        <p className="mt-1 text-sm font-bold leading-relaxed text-gray-900">
          名前を入力 → DNSがIPを返す → IPで接続 → Webサーバがページを返す → ブラウザが表示
        </p>
      </div>
    </Panel>
  );
}

export default function NetworkAddressExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3.5">
        <p className="text-xs font-bold text-brand-700">操作して理解する</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          「IPアドレスとDNS」を暗記ではなく、<b className="text-gray-900">データの移動と障害</b>から理解します。
          再生・一時停止・巻き戻し・DNS停止を自由に試してください。
        </p>
      </div>

      <IpAddressIntro />
      <DnsJourney />
      <ExamModel />
    </div>
  );
}
