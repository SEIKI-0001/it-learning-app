"use client";

import { useState, type ReactNode } from "react";
import { PacketScene, type PacketSceneProps, type PacketSpot, type RouteId } from "./packet/PacketScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「インターネットとプロトコル」専用の体験。
//   ① プロトコル＝共通ルール … 言語のたとえで「同じルールなら通じる」を体験
//   ② 代表的なプロトコル … HTTP/DNS/TCP-IP/メール の早見
//   ③ データはパケットで運ぶ … 2.5D のネットワーク模型で「HELLO WORLD」を4パケットに分割し、
//      別々の経路 → 順不同で到着（1→3→2→4）→ 番号で並べ直して復元。自分の文字でも分割を試せる
// ============================================================================

const LANGS = [
  { id: "ja", label: "日本語", emo: "🇯🇵" },
  { id: "en", label: "英語", emo: "🇬🇧" },
  { id: "zh", label: "中国語", emo: "🇨🇳" },
];

function ProtocolRule() {
  const [other, setOther] = useState("en");
  const ok = other === "ja";
  return (
    <Panel>
      <SectionTitle step={1}>プロトコル＝通信の「共通ルール」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        通信するには、相手と<b className="text-gray-800">同じルール</b>が必要です。まずは「言葉」でイメージ。
        <b className="text-gray-800">あなたは日本語</b>を話します。相手の言葉を選んでみよう。
      </p>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="w-24 rounded-xl border-2 border-brand-300 bg-brand-50 py-3 text-center">
          <div className="text-2xl">🧑</div>
          <div className="text-xs font-bold text-brand-700">あなた</div>
          <div className="text-[11px] text-gray-500">🇯🇵 日本語</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl ${ok ? "" : "opacity-40"}`}>{ok ? "🔊" : "❓"}</div>
        </div>
        <div className="w-24 rounded-xl border-2 border-gray-300 bg-gray-50 py-3 text-center">
          <div className="text-2xl">🧑‍🦰</div>
          <div className="text-xs font-bold text-gray-700">相手</div>
          <div className="text-[11px] text-gray-500">
            {LANGS.find((l) => l.id === other)?.emo} {LANGS.find((l) => l.id === other)?.label}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setOther(l.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${
              other === l.id ? "bg-brand-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
            }`}
          >
            {l.emo} {l.label}
          </button>
        ))}
      </div>

      <p
        className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-bold ring-1 ${
          ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {ok ? "⭕ 同じ言葉どうし → 通じる！" : "❌ 言葉がちがう → 通じない…"}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ネットでも同じ。機器どうしが通信するための<b>共通の“言葉・約束ごと”がプロトコル</b>（HTTPなど）。
        インターネットは世界中のネットワークの集まりで、みんながこの共通ルールを使うから話が通じます。
      </p>
    </Panel>
  );
}

function ProtocolTable() {
  const rows = [
    { k: "HTTP / HTTPS", d: "Webページを見る通信（HTTPSは暗号化されて安全 🔒）" },
    { k: "DNS", d: "ドメイン名（example.com）を IPアドレスに変換する" },
    { k: "TCP / IP", d: "インターネットの土台。データを相手まで順番どおり届ける" },
    { k: "SMTP / POP / IMAP", d: "電子メールの送信(SMTP)・受信(POP/IMAP)" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>代表的なプロトコル</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        試験でよく出るものだけ覚えればOK。<b className="text-gray-800">名前と役割</b>をセットで。
      </p>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={`${i ? "border-t border-gray-200" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-sm font-bold text-brand-700">
                  {r.k}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-700">{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ よくある勘違い：「インターネット＝Web」ではありません。Webはインターネットの<b>使い方の一つ</b>（HTTPを使う）。
      </p>
    </Panel>
  );
}

const MESSAGE = "HELLO WORLD";
const CHUNKS: { no: number; data: string; route: RouteId }[] = [
  { no: 1, data: "HEL", route: "top" },
  { no: 2, data: "LO ", route: "bot" },
  { no: 3, data: "WOR", route: "mid" },
  { no: 4, data: "LD", route: "top" },
];
/** 届いた順番（2番が混んだ道を通って遅れる） */
const ARRIVAL = [1, 3, 2, 4];

const IDLE_NODES: PacketSceneProps["nodes"] = { sender: "idle", rTop: "idle", rMid: "idle", rBot: "idle", receiver: "idle" };
const ROAD: Record<number, PacketSpot> = {
  1: { kind: "road", route: "top", leg: 1, t: 0.35 },
  2: { kind: "road", route: "bot", leg: 0, t: 0.7 },
  3: { kind: "road", route: "mid", leg: 1, t: 0.2 },
  4: { kind: "road", route: "top", leg: 0, t: 0.45 },
};

const PACKET_STEPS: { title: string; detail: ReactNode; view: Omit<PacketSceneProps, "reducedMotion"> }[] = [
  {
    title: "送りたいデータ",
    detail: <>送信者が「{MESSAGE}」を受信者Bへ送ります。このまま大きな塊では送りません。</>,
    view: { nodes: { ...IDLE_NODES, sender: "active" }, routes: {}, whole: MESSAGE, packets: [], trayMode: null, restored: null },
  },
  {
    title: "パケットに分割",
    detail: (
      <>
        データを<b>小さな箱（パケット）</b>に分けます。各パケットには<b>番号</b>・<b>宛先（B）</b>・<b>データ</b>が付きます。
      </>
    ),
    view: {
      nodes: { ...IDLE_NODES, sender: "active" },
      routes: {},
      whole: null,
      packets: CHUNKS.map((c, i) => ({ ...c, spot: { kind: "stack", slot: i } })),
      trayMode: null,
      restored: null,
    },
  },
  {
    title: "それぞれ別の経路でネットワークへ",
    detail: <>パケットは<b>ばらばらの道</b>を通ってかまいません。ルータが宛先を見て、空いている道へ次々に転送します。</>,
    view: {
      nodes: { sender: "sending", rTop: "active", rMid: "active", rBot: "active", receiver: "idle" },
      routes: { top: "active", mid: "active", bot: "active" },
      whole: null,
      packets: CHUNKS.map((c) => ({ ...c, spot: ROAD[c.no] })),
      trayMode: null,
      restored: null,
    },
  },
  {
    title: "届く順番はバラバラ",
    detail: (
      <>
        下の道が混んでいて<b>2番が遅れ</b>、届いた順は <b>1 → 3 → 2 → 4</b>。このままつなげると「HELWORLO LD」になってしまいます。
      </>
    ),
    view: {
      nodes: { ...IDLE_NODES, receiver: "active" },
      routes: {},
      whole: null,
      packets: CHUNKS.map((c) => ({ ...c, spot: { kind: "tray", slot: ARRIVAL.indexOf(c.no) }, arrived: ARRIVAL.indexOf(c.no) + 1 })),
      trayMode: "arrival",
      restored: null,
    },
  },
  {
    title: "番号を見て並べ直す",
    detail: <>受信側はパケットの<b>番号</b>を見て <b>1 → 2 → 3 → 4</b> に並べ直します。</>,
    view: {
      nodes: { ...IDLE_NODES, receiver: "active" },
      routes: {},
      whole: null,
      packets: CHUNKS.map((c) => ({ ...c, spot: { kind: "tray", slot: c.no - 1 } })),
      trayMode: "sorted",
      restored: null,
    },
  },
  {
    title: "元のデータに復元",
    detail: <>つなげると「{MESSAGE}」に元通り！ 大きなデータは<b>パケットに分けて運び、受信側で再構築</b>しています。</>,
    view: {
      nodes: { ...IDLE_NODES, receiver: "active" },
      routes: {},
      whole: null,
      packets: CHUNKS.map((c) => ({ ...c, spot: { kind: "tray", slot: c.no - 1 } })),
      trayMode: "sorted",
      restored: MESSAGE,
    },
  },
];

function PacketFlow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(PACKET_STEPS.length, reducedMotion);
  const step = PACKET_STEPS[player.index];
  return (
    <>
      <p className="mt-3 text-[11px] font-bold text-brand-700">
        STEP {player.index + 1} / {PACKET_STEPS.length}
      </p>
      <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="packet-step-title">
        {step.title}
      </p>
      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <PacketScene {...step.view} reducedMotion={reducedMotion} />
      </div>
      <p className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {step.detail}
      </p>
      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={PACKET_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="パケット通信を再生"
          timelineLabel="パケット通信のタイムライン"
          startCaption="分割"
          endCaption="復元"
        />
      </div>
    </>
  );
}

function PacketSplit() {
  const [text, setText] = useState("こんにちは");
  const chars = [...text];
  const size = 3;
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += size) groups.push(chars.slice(i, i + size).join(""));
  return (
    <Panel>
      <SectionTitle step={3}>データは「パケット」で運ぶ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大きなデータも、そのまま送らず<b className="text-gray-800">小さな箱（パケット）に分けて</b>送ります。
        箱には<b className="text-gray-800">通し番号</b>が付き、届いた側が番号順に組み立て直します。
      </p>

      <PacketFlow />

      <p className="mt-4 text-xs font-bold text-gray-700">✍️ 自分のデータでも分けてみよう</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-gray-500">送るデータ：</span>
        <input
          value={text}
          maxLength={15}
          onChange={(e) => setText(e.target.value)}
          aria-label="送るデータ"
          className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {groups.length === 0 ? (
          <span className="text-sm text-gray-400">文字を入れてみよう。</span>
        ) : (
          groups.map((g, i) => (
            <div key={i} className="rounded-xl border-2 border-brand-300 bg-white px-3 py-2 text-center">
              <div className="rounded bg-brand-100 px-1.5 text-[11px] font-bold text-brand-700">
                No.{i + 1}/{groups.length}
              </div>
              <div className="mt-1 text-base font-bold">{g}</div>
            </div>
          ))
        )}
      </div>
      {groups.length > 0 && (
        <p className="mt-3 text-center text-xs text-gray-500">
          {groups.length}個のパケットに分割 → 受け取った側が <b className="text-emerald-700">No.順に組み立て</b>て「{text}」に復元。
        </p>
      )}
    </Panel>
  );
}

export default function InternetProtocolExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤝 ちがう学校どうしでも、<b>同じルールブック</b>を使うから試合が成り立つ——通信も同じ。
        機器どうしが正しくやり取りするための<b>共通ルール＝プロトコル</b>です。
      </div>

      <ProtocolRule />
      <ProtocolTable />
      <PacketSplit />
    </div>
  );
}
