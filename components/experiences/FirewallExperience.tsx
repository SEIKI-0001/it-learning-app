"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ファイアウォール・VPN・ゼロトラスト」専用の体験。
//   ① ファイアウォール … 通信の門番（許可だけ通す）
//   ② VPN … 公衆回線の上に暗号化トンネル（あり/なしで盗み見を比較）
//   ③ ゼロトラスト … 従来の境界防御との対比
// ============================================================================

const TRAFFIC = [
  { t: "社員のWeb閲覧（許可された通信）", ok: true, why: "ルールで許可された通信なので通す。" },
  { t: "外部からの不審なアクセス", ok: false, why: "許可されていないので遮断。" },
  { t: "許可されていないポートへの接続", ok: false, why: "ルール外なので遮断。" },
];

function Firewall() {
  return (
    <Panel>
      <SectionTitle step={1}>ファイアウォール（通信の門番）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        社内ネットと外部の<b className="text-gray-800">境界（出入口）</b>に立ち、
        <b className="text-gray-800">ルールで許可された通信だけ通し</b>、それ以外を遮断する門番です。
      </p>

      <div className="mt-4 flex items-center justify-center gap-1 text-center">
        <div className="w-20 rounded-xl bg-gray-50 px-1 py-2.5 ring-1 ring-gray-200">
          <div className="text-2xl">🌐</div>
          <div className="text-[11px] font-bold text-gray-700">社外</div>
        </div>
        <span className="text-gray-300">→</span>
        <div className="w-24 rounded-xl bg-indigo-50 px-1 py-2.5 ring-2 ring-indigo-300">
          <div className="text-2xl">🛡️</div>
          <div className="text-[11px] font-extrabold text-indigo-700">ファイア<br />ウォール</div>
        </div>
        <span className="text-gray-300">→</span>
        <div className="w-20 rounded-xl bg-gray-50 px-1 py-2.5 ring-1 ring-gray-200">
          <div className="text-2xl">🏢</div>
          <div className="text-[11px] font-bold text-gray-700">社内</div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {TRAFFIC.map((r, i) => (
          <li key={i} className={`rounded-xl px-3 py-2.5 ring-1 ${r.ok ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-800">{r.t}</span>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${r.ok ? "bg-emerald-500" : "bg-rose-500"}`}>
                {r.ok ? "✅ 通過" : "⛔ 遮断"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-600">{r.why}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Vpn() {
  const [on, setOn] = useState(false);
  return (
    <Panel>
      <SectionTitle step={2}>VPN（安全な通り道＝暗号トンネル）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        VPNは、みんなが使う<b className="text-gray-800">公衆回線（インターネット）の上に、暗号化された専用トンネル</b>を作る仕組み。
        外出先から会社へ安全につなげます。あり/なしで比べてみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setOn(false)}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${!on ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          VPNなし
        </button>
        <button
          onClick={() => setOn(true)}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${on ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          VPNあり 🔒
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1 text-center">
        <div className="w-16 rounded-xl bg-gray-50 px-1 py-2 ring-1 ring-gray-200">
          <div className="text-xl">🏠</div>
          <div className="text-[10px] font-bold text-gray-700">自宅</div>
        </div>
        <div className="flex-1">
          <div className={`h-0.5 w-full rounded ${on ? "bg-emerald-500" : "bg-rose-400"}`} />
          <div className="mt-1 text-[11px] text-gray-400">公衆回線（途中に😈）</div>
        </div>
        <div className="w-16 rounded-xl bg-gray-50 px-1 py-2 ring-1 ring-gray-200">
          <div className="text-xl">🏢</div>
          <div className="text-[10px] font-bold text-gray-700">会社</div>
        </div>
      </div>

      <div className={`mt-3 rounded-xl px-4 py-3 ring-1 ${on ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
        <div className="text-xs font-bold text-gray-500">😈 盗聴者に見える内容：</div>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 3つの守り方：<b>ファイアウォール＝通信の門番</b>（許可だけ通す）、
        <b>VPN＝安全な通り道</b>（暗号トンネル）、<b>ゼロトラスト＝何も最初から信じない</b>（毎回確認）。
      </div>

      <Firewall />
      <Vpn />

      <Panel>
        <SectionTitle step={3}>ゼロトラスト（何も信じず、毎回確認）</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          昔は「社外は危険・社内は安全」と考えました（境界防御）。でもクラウドやリモートワークで
          <b className="text-gray-800">「社内＝安全」が崩れた</b>ため、新しい考え方が広まりました。
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-sm font-extrabold text-gray-700">🏰 従来（境界防御）</div>
            <p className="mt-1 text-sm text-gray-600">
              「外は危険／中（社内）は安全」とみなす。<b>一度入れば信用</b>される。
              → 中に侵入されると一気に弱い。
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
            <div className="text-sm font-extrabold text-indigo-700">🚦 ゼロトラスト</div>
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
