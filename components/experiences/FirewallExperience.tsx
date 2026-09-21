"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GateScene, type GateId, type Inspect, type PacketStop } from "./firewall/GateScene";
import { VpnScene, type VpnStop } from "./firewall/VpnScene";
import type { NodeState } from "./network/NetworkSceneBase";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ファイアウォール・VPN・ゼロトラスト」専用の体験。
//   ① ファイアウォール … 通信の門番（許可だけ通す）。2.5D 模型
//      Internet → FW → WAF → Webアプリ に3種類の通信を流し、止まる場所と見るものの違いを見る
//   ② FW と WAF のちがい（比較表＋どっちが止める？）
//   ③ VPN … 自宅 → 公衆回線 → 会社 の模型に暗号トンネルが伸びる（あり/なしで盗み見を比較）
//   ④ ゼロトラスト … 従来の境界防御との対比
// ============================================================================

type TrafficId = "normal" | "badPort" | "sqli";

type Traffic = {
  id: TrafficId;
  label: string;
  sender: string;
  port: string;
  body: string;
  kind: "normal" | "attack";
  /** どこで止まるか（null=アプリまで届く） */
  stoppedAt: GateId | null;
  result: string;
};

const TRAFFIC: Traffic[] = [
  {
    id: "normal",
    label: "正常通信",
    sender: "利用者",
    port: "443",
    body: "GET /items",
    kind: "normal",
    stoppedAt: null,
    result: "ルールで許可された通信なので、FWもWAFも通ってアプリに届く。",
  },
  {
    id: "badPort",
    label: "不正ポート",
    sender: "攻撃者",
    port: "23",
    body: "telnet 接続",
    kind: "attack",
    stoppedAt: "fw",
    result: "許可されていないポートへの接続。境界のFWが入口で遮断する。",
  },
  {
    id: "sqli",
    label: "SQLインジェクション",
    sender: "攻撃者",
    port: "443",
    body: "id=' OR 1=1--",
    kind: "attack",
    stoppedAt: "waf",
    result: "ポート443は許可なのでFWは通過。中身が攻撃なので、アプリ直前のWAFが遮断する。",
  },
];

type GateStep = {
  title: string;
  stop: PacketStop;
  inspect: Inspect;
  blocked: boolean;
  detail: ReactNode;
};

function stepsFor(t: Traffic): GateStep[] {
  const steps: GateStep[] = [
    {
      title: "インターネットから届く",
      stop: "src",
      inspect: null,
      blocked: false,
      detail: (
        <>
          {t.sender}からの通信。<b>宛先ポート {t.port}</b> と <b>中身「{t.body}」</b> を持っています。
        </>
      ),
    },
  ];
  const fwBlocks = t.stoppedAt === "fw";
  steps.push({
    title: fwBlocks ? "FWが遮断" : "FWで確認 → 通過",
    stop: "fw",
    inspect: "port",
    blocked: fwBlocks,
    detail: fwBlocks ? (
      <>FWは<b>送信元・宛先・ポート番号</b>を見る門番。ポート{t.port}は許可リストにないので<b>入口で遮断</b>。</>
    ) : (
      <>FWが見るのは<b>ポート番号</b>だけ。ポート{t.port}は許可されているので<b>通過</b>。中身はまだ見ていません。</>
    ),
  });
  if (fwBlocks) return steps;
  const wafBlocks = t.stoppedAt === "waf";
  steps.push({
    title: wafBlocks ? "WAFが遮断" : "WAFで確認 → 通過",
    stop: "waf",
    inspect: "body",
    blocked: wafBlocks,
    detail: wafBlocks ? (
      <>WAFは<b>リクエストの中身</b>を検査。「{t.body}」はSQLインジェクションの形なので<b>アプリ直前で遮断</b>。FWを通った正規ポートの通信に紛れた攻撃です。</>
    ) : (
      <>WAFが<b>中身</b>を検査。普通の商品一覧の取得なので<b>通過</b>。</>
    ),
  });
  if (wafBlocks) return steps;
  steps.push({
    title: "Webアプリに到達",
    stop: "app",
    inspect: null,
    blocked: false,
    detail: <>FWもWAFも通過して、Webアプリに正常に届きました。</>,
  });
  return steps;
}

function gateView(t: Traffic, steps: GateStep[], index: number, gate: GateId) {
  const at = steps.findIndex((s) => s.stop === gate);
  if (at < 0 || index < at) return { state: "idle" as NodeState, verdict: null };
  const step = steps[at];
  const verdict = step.blocked
    ? { state: "block" as const, text: gate === "fw" ? `遮断（ポート${t.port}は許可外）` : "遮断（中身が攻撃）" }
    : { state: "pass" as const, text: gate === "fw" ? `通過（ポート${t.port}は許可）` : "通過（中身は正常）" };
  const state: NodeState = step.blocked ? "error" : index === at ? "active" : "idle";
  return { state, verdict };
}

function GateFlow({ traffic, onFinish }: { traffic: Traffic; onFinish: (id: TrafficId) => void }) {
  const reducedMotion = useReducedMotion();
  const steps = stepsFor(traffic);
  const player = useStepPlayer(steps.length, reducedMotion, 1800);
  const step = steps[player.index];
  const done = player.index === steps.length - 1;

  // 選んだら自動で流す（reduced-motion では最後まで一気に見せる）
  // reduced-motion は初回描画の後に確定するので、その値の変化にも追従する
  useEffect(() => {
    if (reducedMotion) player.move(steps.length - 1);
    else player.play();
    // 選び直し（key で再マウント）と reduced-motion の確定時だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  useEffect(() => {
    if (done) onFinish(traffic.id);
  }, [done, onFinish, traffic.id]);

  return (
    <>
      <div className="mt-3 min-w-0">
        <p className="text-[11px] font-bold text-brand-700">
          {traffic.label}・STEP {player.index + 1} / {steps.length}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="gate-step-title">
          {step.title}
        </p>
      </div>
      <div className="-mx-2 mt-2 sm:mx-auto sm:max-w-xl">
        <GateScene
          sender={traffic.sender}
          packet={{ stop: step.stop, port: traffic.port, body: traffic.body, inspect: step.inspect, blocked: step.blocked, kind: traffic.kind }}
          gates={{ fw: gateView(traffic, steps, player.index, "fw"), waf: gateView(traffic, steps, player.index, "waf") }}
          appState={step.stop === "app" ? "active" : "idle"}
          roadState={step.blocked ? "blocked" : player.index > 0 ? "active" : "idle"}
          reducedMotion={reducedMotion}
        />
      </div>
      <div
        className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        aria-live="polite"
      >
        {step.detail}
      </div>
      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={steps}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="通信を再生"
          timelineLabel="通信のタイムライン"
        />
      </div>
    </>
  );
}

function Firewall() {
  const [trafficId, setTrafficId] = useState<TrafficId>("normal");
  const [finished, setFinished] = useState<TrafficId[]>([]);
  const traffic = TRAFFIC.find((t) => t.id === trafficId)!;
  const onFinish = useCallback(
    (id: TrafficId) => setFinished((current) => (current.includes(id) ? current : [...current, id])),
    [],
  );
  const allSeen = finished.length === TRAFFIC.length;

  return (
    <Panel>
      <SectionTitle step={1}>ファイアウォール（通信の門番）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        社内ネットと外部の<b className="text-gray-800">境界（出入口）</b>に立ち、
        <b className="text-gray-800">ルールで許可された通信だけ通し</b>、それ以外を遮断する門番です。
        その奥、アプリの直前には <b className="text-gray-800">WAF</b> がいます。3種類の通信を流して、どこで止まるか見てみよう。
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="流す通信">
        {TRAFFIC.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrafficId(t.id)}
            aria-pressed={t.id === trafficId}
            className={`rounded-lg px-1 py-2 text-xs font-bold leading-tight transition active:scale-95 ${
              t.id === trafficId
                ? t.kind === "normal"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-500 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <GateFlow key={trafficId} traffic={traffic} onFinish={onFinish} />

      <ul className="mt-4 space-y-2" data-testid="traffic-results">
        {TRAFFIC.map((t) => {
          const seen = finished.includes(t.id);
          const ok = t.stoppedAt === null;
          return (
            <li
              key={t.id}
              className={`rounded-xl px-3 py-2.5 ring-1 ${!seen ? "bg-gray-50 ring-gray-200" : ok ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}
              data-traffic={t.id}
              data-seen={seen ? "true" : "false"}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-800">{t.label}</span>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold ${!seen ? "bg-gray-200 text-gray-500" : ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
                >
                  {!seen ? "未確認" : ok ? "✅ アプリに到達" : t.stoppedAt === "fw" ? "⛔ FWで遮断" : "⛔ WAFで遮断"}
                </span>
              </div>
              {seen && <p className="mt-0.5 text-xs text-gray-600">{t.result}</p>}
            </li>
          );
        })}
      </ul>

      {allSeen && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" role="status" data-testid="gate-insight">
          💡 FWとWAFは<b>止める場所も、見るものも違う</b>。FW＝境界で<b>ポート・IP</b>を見る／WAF＝アプリ直前で<b>中身</b>を見る。
          並び順は <b>インターネット → FW（境界）→ WAF（アプリ直前）→ アプリ</b>。
        </div>
      )}
    </Panel>
  );
}

const WAF_ITEMS: { t: string; ans: "FW" | "WAF"; why: string }[] = [
  { t: "使っていないポートへの接続を止める", ans: "FW", why: "通信の出入口（ポート）で判断＝ファイアウォール。" },
  { t: "入力フォームに不正なSQL文を仕込む攻撃を防ぐ", ans: "WAF", why: "Webアプリの中身を検査＝WAF（SQLインジェクション対策）。" },
  { t: "許可していないIPアドレスからのアクセスを遮断", ans: "FW", why: "送信元IPで判断＝ファイアウォール。" },
  { t: "Web入力欄の不正なスクリプト(XSS)を防ぐ", ans: "WAF", why: "Webアプリ特有の攻撃を中身で防ぐ＝WAF。" },
];

function WafCompare() {
  const [answers, setAnswers] = useState<Record<number, "FW" | "WAF">>({});
  const rows = [
    { k: "守る対象", fw: "ネットワーク全体の出入口", waf: "Webアプリ（HTTP/HTTPSの中身）" },
    { k: "見るところ", fw: "送信元・宛先・ポート番号", waf: "リクエストの中身（何をしようとするか）" },
    { k: "防ぐ攻撃の例", fw: "不正な接続・不要ポート", waf: "SQLインジェクション・XSS" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>ファイアウォール と WAF のちがい</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        名前が似ていて混同しがち。<b className="text-gray-800">WAF＝Web Application Firewall</b>＝
        <b className="text-gray-800">Webアプリ専用の門番</b>です。守る“層”がちがいます。
      </p>

      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
        🚪 <b>ファイアウォール</b>＝建物の入口の警備員（<b>どこから来た通信か</b>で通す/止める）<br />
        🔎 <b>WAF</b>＝Web受付の持ち物検査（<b>リクエストの中身があやしくないか</b>を見る）
      </div>

      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 text-left font-bold"> </th>
              <th className="px-3 py-2 text-center font-bold text-brand-700">🚪 ファイアウォール</th>
              <th className="px-3 py-2 text-center font-bold text-emerald-700">🔎 WAF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.fw}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.waf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 mb-1 text-sm font-bold text-gray-700">どっちが止める？</p>
      <ul className="space-y-2.5">
        {WAF_ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 text-sm font-bold text-gray-800">{it.t}</span>
                <div className="flex gap-1.5">
                  {(["FW", "WAF"] as const).map((opt) => {
                    const picked = chosen === opt;
                    const tone = !chosen
                      ? "text-gray-600 ring-1 ring-gray-300"
                      : picked
                        ? opt === it.ans
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500 text-white"
                        : opt === it.ans
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
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${it.ans}」。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        💡 役割が違うので<b>両方つかう</b>のがふつう。FWを通った正規の通信(ポート443など)に紛れた攻撃を、WAFが中身で止めます。
      </p>
    </Panel>
  );
}

const VPN_STOPS: VpnStop[] = ["home", "mid", "office"];

function Vpn() {
  const reducedMotion = useReducedMotion();
  const [on, setOn] = useState(false);
  const [stop, setStop] = useState<VpnStop>("home");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!sending) return;
    const i = VPN_STOPS.indexOf(stop);
    if (i >= VPN_STOPS.length - 1) return;
    const timer = window.setTimeout(() => {
      const next = VPN_STOPS[i + 1];
      setStop(next);
      if (next === "office") setSending(false);
    }, stop === "home" ? 200 : 1500);
    return () => window.clearTimeout(timer);
  }, [sending, stop]);

  function send() {
    if (reducedMotion) {
      setStop("office");
      return;
    }
    setStop("home");
    setSending(true);
  }

  function toggle(next: boolean) {
    setOn(next);
    setSending(false);
    setStop("home");
  }
  return (
    <Panel>
      <SectionTitle step={3}>VPN（安全な通り道＝暗号トンネル）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        VPNは、みんなが使う<b className="text-gray-800">公衆回線（インターネット）の上に、暗号化された専用トンネル</b>を作る仕組み。
        外出先から会社へ安全につなげます。あり/なしで比べてみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => toggle(false)}
          aria-pressed={!on}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${!on ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          VPNなし
        </button>
        <button
          onClick={() => toggle(true)}
          aria-pressed={on}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${on ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          VPNあり 🔒
        </button>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <VpnScene vpn={on} stop={stop} sending={sending} reducedMotion={reducedMotion} />
      </div>

      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="mt-3 w-full rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
      >
        {stop === "office" ? "📤 もう一度送る" : "📤 会議資料を会社へ送る"}
      </button>

      <div className={`mt-3 rounded-xl px-4 py-3 ring-1 ${on ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
        <div className="text-xs font-bold text-gray-500">😈 盗聴者に見える内容（途中の公衆回線）：</div>
        <div className="mt-1 font-mono text-sm font-bold text-gray-800">
          {on ? "🔒 暗号化トンネルの中（読めない）" : "会議資料.pdf／パスワード（丸見え）"}
        </div>
        <div className={`mt-2 text-sm font-bold ${on ? "text-emerald-700" : "text-rose-700"}`}>
          {on ? "✅ トンネルで暗号化 → 盗まれても読めない" : "⚠️ そのまま流れる → 公衆Wi-Fiなどで盗まれる危険"}
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ よくある勘違い：「VPNならすべて安全」ではありません。VPNが守るのは<b>通り道</b>。
        つなぐ先が危険なサイトなら別問題です。
      </p>
    </Panel>
  );
}

export default function FirewallExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 守り方の整理：<b>ファイアウォール＝通信の門番</b>（許可だけ通す）、
        <b>WAF＝Webアプリの門番</b>（中身を検査）、<b>VPN＝安全な通り道</b>（暗号トンネル）、
        <b>ゼロトラスト＝何も最初から信じない</b>（毎回確認）。
      </div>

      <Firewall />
      <WafCompare />
      <Vpn />

      <Panel>
        <SectionTitle step={4}>ゼロトラスト（何も信じず、毎回確認）</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          昔は「社外は危険・社内は安全」と考えました（境界防御）。でもクラウドやリモートワークで
          <b className="text-gray-800">「社内＝安全」が崩れた</b>ため、新しい考え方が広まりました。
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-sm font-bold text-gray-700">🏰 従来（境界防御）</div>
            <p className="mt-1 text-sm text-gray-600">
              「外は危険／中（社内）は安全」とみなす。<b>一度入れば信用</b>される。
              → 中に侵入されると一気に弱い。
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
            <div className="text-sm font-bold text-brand-700">🚦 ゼロトラスト</div>
            <p className="mt-1 text-sm text-gray-700">
              <b>だれも・何も最初から信じない</b>。社内・社外を問わず、アクセスのたびに
              本人確認（認証）と権限確認（認可）を行う。
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ ゼロトラストは特定の製品名ではなく<b>「考え方（方針）」</b>。多要素認証やアクセス制御などを組み合わせて実現します。
        </p>
      </Panel>
    </div>
  );
}
