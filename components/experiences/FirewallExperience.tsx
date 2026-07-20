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
        <div className="w-24 rounded-xl bg-brand-50 px-1 py-2.5 ring-2 ring-brand-300">
          <div className="text-2xl">🛡️</div>
          <div className="text-[11px] font-bold text-brand-700">ファイア<br />ウォール</div>
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

function Placement() {
  const [mode, setMode] = useState<"normal" | "attack">("attack");
  const wafPass = mode === "normal"; // FWは正規ポート(443)なのでどちらも通過、WAFで攻撃を遮断
  return (
    <Panel>
      <SectionTitle step={3}>通信経路のどこに置く？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        FWとWAFは<b className="text-gray-800">置かれる場所がちがいます</b>。リクエストの種類を切り替えて、どこで止まるか見てみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("normal")}
          className={`rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${mode === "normal" ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          正規リクエスト
        </button>
        <button
          onClick={() => setMode("attack")}
          className={`rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${mode === "attack" ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"}`}
        >
          攻撃リクエスト(SQLi)
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        {/* インターネット */}
        <div className="mx-auto max-w-[280px] rounded-lg bg-white px-3 py-2 text-center ring-1 ring-gray-200">
          <span className="text-lg">🌐</span>{" "}
          <span className="text-sm font-bold text-gray-700">インターネット（外部）</span>
        </div>
        <div className="text-center text-[11px] text-gray-400">📨 リクエストが届く ▼</div>

        {/* ファイアウォール（必ず通過：ポート443は許可） */}
        <div className="mx-auto max-w-[280px] rounded-lg bg-brand-50 px-3 py-2 text-center ring-2 ring-brand-300">
          <div className="text-sm font-bold text-brand-700">🚪 ファイアウォール</div>
          <div className="text-[11px] text-gray-600">IP・ポートを確認（境界）</div>
          <div className="mt-1 inline-block rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
            ✅ 通過（ポート443は許可）
          </div>
        </div>
        <div className="text-center text-lg text-emerald-500">▼</div>

        {/* WAF（中身を検査：攻撃なら遮断） */}
        <div className={`mx-auto max-w-[280px] rounded-lg px-3 py-2 text-center ring-2 ${wafPass ? "bg-emerald-50 ring-emerald-300" : "bg-rose-50 ring-rose-300"}`}>
          <div className={`text-sm font-bold ${wafPass ? "text-emerald-700" : "text-rose-700"}`}>🔎 WAF</div>
          <div className="text-[11px] text-gray-600">HTTP/HTTPSの中身を確認（アプリ直前）</div>
          <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${wafPass ? "bg-emerald-500" : "bg-rose-500"}`}>
            {wafPass ? "✅ 通過（中身は正常）" : "⛔ 遮断（中身が攻撃）"}
          </div>
        </div>
        <div className={`text-center text-lg ${wafPass ? "text-emerald-500" : "text-rose-300"}`}>
          {wafPass ? "▼" : "✕"}
        </div>

        {/* Webアプリ */}
        <div className={`mx-auto max-w-[280px] rounded-lg px-3 py-2 text-center ring-1 ${wafPass ? "bg-white ring-gray-200" : "bg-white ring-gray-200 opacity-60"}`}>
          <span className="text-lg">🖥️</span>{" "}
          <span className="text-sm font-bold text-gray-700">Webサーバ／アプリ</span>
          <div className={`text-[11px] font-bold ${wafPass ? "text-emerald-700" : "text-rose-600"}`}>
            {wafPass ? "✅ 正常に到達" : "🛡️ 攻撃は届かない（守られた）"}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">
        {mode === "attack"
          ? "💡 攻撃でも“ポート443”は許可なので FW は通過。でも中身が攻撃なので、アプリ直前の WAF が遮断します。"
          : "正規リクエストは FW も WAF も通過して、Webアプリに届きます。"}
        {" "}並び順は <b>インターネット → FW（境界）→ WAF（アプリ直前）→ アプリ</b>。
      </p>
    </Panel>
  );
}

function Vpn() {
  const [on, setOn] = useState(false);
  return (
    <Panel>
      <SectionTitle step={4}>VPN（安全な通り道＝暗号トンネル）</SectionTitle>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 守り方の整理：<b>ファイアウォール＝通信の門番</b>（許可だけ通す）、
        <b>WAF＝Webアプリの門番</b>（中身を検査）、<b>VPN＝安全な通り道</b>（暗号トンネル）、
        <b>ゼロトラスト＝何も最初から信じない</b>（毎回確認）。
      </div>

      <Firewall />
      <WafCompare />
      <Placement />
      <Vpn />

      <Panel>
        <SectionTitle step={5}>ゼロトラスト（何も信じず、毎回確認）</SectionTitle>
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
