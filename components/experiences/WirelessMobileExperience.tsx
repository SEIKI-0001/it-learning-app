"use client";

import { useState, type ReactNode } from "react";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";
import { WifiScene, type WifiMode, type WifiPhase } from "./wireless/WifiScene";

// ============================================================================
// 「無線LAN・モバイル通信」専用の体験。
//   ① 無線LAN：SSID＝電波の名前。2.5Dのカフェで、ノートPCの電波が周り全部へ広がり盗聴者にも届く様子を見せ、
//      暗号化なし（ID/PASSが読める）／WPA2・WPA3（受信はされるが読めない）／有線（比較）を切り替えて比べる。
//   ② モバイル用語の早見（5G / テザリング / MVNO）。
//   ③ フリーWi-Fiの安全/危険 仕分けクイズ。
// ============================================================================

const WIFI_STEPS: { phase: WifiPhase; title: string }[] = [
  { phase: "connect", title: "SSIDを選んでつなぐ" },
  { phase: "send", title: "ID / PASSWORD を送信" },
  { phase: "arrive", title: "届いた先を確かめる" },
];

const MODES: { v: WifiMode; label: string; on: string }[] = [
  { v: "open", label: "🔓 暗号化なし", on: "bg-rose-500 text-white" },
  { v: "wpa", label: "🔒 WPA2/WPA3", on: "bg-emerald-500 text-white" },
  { v: "wired", label: "🔌 比較：有線", on: "bg-gray-700 text-white" },
];

function wifiDetail(mode: WifiMode, phase: WifiPhase): ReactNode {
  if (phase === "connect") {
    return mode === "wired" ? (
      <>比較のため、ノートPCとアクセスポイントを<b>ケーブル</b>でつないだ場合も見てみます。</>
    ) : (
      <>
        一覧から <b>SSID「cafe-wifi-2F」</b>を選んでつなぎます。SSIDは<b>電波の名前</b>にすぎません。
        暗号化されているかどうかは、名前の横の<b>鍵マーク（{mode === "wpa" ? "WPA2/WPA3" : "なし"}）</b>で決まります。
      </>
    );
  }
  if (phase === "send") {
    return mode === "wired" ? (
      <>データは<b>ケーブルの中だけ</b>を通ってアクセスポイントへ向かいます。</>
    ) : (
      <>
        データは<b>電波</b>になってノートPCから<b>周り全部へ広がります</b>。ケーブルと違い、アクセスポイントだけを狙って届くわけではありません。
        {mode === "wpa" ? "ただし送る前に暗号化してあります。" : "しかも暗号化されていません。"}
      </>
    );
  }
  if (mode === "wired") return <>アクセスポイントには届き、盗聴者には<b>何も届きません</b>。電波が出ていないからです。</>;
  return mode === "wpa" ? (
    <>
      盗聴者も<b>電波の受信自体はできました</b>。でも中身は<b>暗号文で読めません</b>。正しい鍵を持つアクセスポイントだけが復号できます。
    </>
  ) : (
    <>
      アクセスポイントにも盗聴者にも<b>同じ電波</b>が届き、盗聴者の画面には <b>ID / PASSWORD がそのまま</b>。暗号化なしのWi-Fiは入力内容を盗み見られます。
    </>
  );
}

function WifiFlow() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<WifiMode>("open");
  const player = useStepPlayer(WIFI_STEPS.length, reducedMotion);
  const step = WIFI_STEPS[player.index];
  const last = player.index === player.lastIndex;
  const [tried, setTried] = useState<Set<WifiMode>>(new Set());
  if (last && !tried.has(mode)) setTried(new Set(tried).add(mode));

  return (
    <Panel>
      <SectionTitle step={1}>無線LANは「名前」と「暗号化」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Wi-Fiの電波は空中を飛ぶので、誰でも受信できてしまいます。つなぐ相手を選ぶ名前が
        <b className="text-gray-800">SSID</b>、中身を守るのが<b className="text-gray-800">暗号化（WPA2/WPA3）</b>です。
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {MODES.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={mode === o.v}
            onClick={() => {
              setMode(o.v);
              if (reducedMotion) player.reset();
              else player.play();
            }}
            className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
              mode === o.v ? o.on : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {o.label}
            {tried.has(o.v) && " ✓"}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="wifi-step-title">
        STEP {player.index + 1}：{step.title}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <WifiScene mode={mode} phase={step.phase} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          last && mode === "open" ? "bg-rose-50 ring-rose-200" : last && mode === "wpa" ? "bg-emerald-50 ring-emerald-200" : "bg-sky-50 ring-sky-200"
        }`}
        aria-live="polite"
      >
        {wifiDetail(mode, step.phase)}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={WIFI_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="Wi-Fiの送信を再生"
          timelineLabel="Wi-Fiの送信のタイムライン"
          startCaption="つなぐ"
          endCaption="届いた先"
        />
      </div>

      {tried.has("open") && tried.has("wpa") && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="wifi-insight">
          💡 電波は<b>誰でも受信できる</b>のが前提。だから守るのは「受信させないこと」ではなく<b>中身を暗号化（WPA2/WPA3）すること</b>。
          SSIDはただの名前なので、<b>同じ名前でも暗号化なしのことがある</b>点に注意。
        </div>
      )}
    </Panel>
  );
}

const TERMS = [
  {
    emo: "🚀",
    name: "5G",
    tag: "次世代モバイル回線",
    d: "高速・大容量／低遅延（遅れが少ない）／多数同時接続が特徴。4G(LTE)の次の世代。",
  },
  {
    emo: "📲",
    name: "テザリング",
    tag: "スマホを親機に",
    d: "スマホのモバイル回線を中継して、パソコンやタブレットをインターネットにつなぐ機能。",
  },
  {
    emo: "💴",
    name: "MVNO（格安SIM）",
    tag: "回線を借りて提供",
    d: "大手キャリアの通信網を借りて、自社ブランドで安く通信サービスを提供する事業者。",
  },
];

function MobileTerms() {
  return (
    <Panel>
      <SectionTitle step={2}>モバイル通信の用語</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {TERMS.map((t) => (
          <li key={t.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">{t.emo}</span>
              <span className="text-sm font-bold text-gray-800">{t.name}</span>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {t.tag}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{t.d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 覚え方：<b>5G＝速い・遅延少・多数接続</b>／<b>テザリング＝スマホ経由でネット共有</b>／
        <b>MVNO＝回線を借りる格安SIM</b>。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "安全寄り" | "危険寄り"; why: string }[] = [
  {
    t: "鍵マークのない無料Wi-Fiで、ネット銀行にログインしてお金を振り込んだ。",
    ans: "危険寄り",
    why: "暗号化なしのWi-Fiでは入力内容を盗まれる恐れ。重要な操作は避けるべき。",
  },
  {
    t: "自宅のWi-Fiに、WPA3のパスワードを設定して使っている。",
    ans: "安全寄り",
    why: "暗号化（WPA3）＋パスワードで保護されており、安全度が高い。",
  },
  {
    t: "公共Wi-Fiでも、httpsのサイトやVPNを使って通信を暗号化している。",
    ans: "安全寄り",
    why: "通信そのものを暗号化していれば、Wi-Fiが心配でも中身は守られやすい。",
  },
  {
    t: "『Free_WiFi』という、誰が用意したか分からない電波に自動でつないだ。",
    ans: "危険寄り",
    why: "正体不明のSSIDは、わざと盗聴用に置かれた“偽アクセスポイント”の可能性がある。",
  },
];

function WifiQuiz() {
  const [answers, setAnswers] = useState<Record<number, "安全寄り" | "危険寄り">>({});
  return (
    <Panel>
      <SectionTitle step={3}>フリーWi-Fi、安全？危険？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["安全寄り", "危険寄り"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
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

export default function WirelessMobileExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📶 無線LANは電波が飛ぶぶん<b>暗号化が大切</b>。モバイルは<b>5G・テザリング・MVNO</b>の
        意味をセットで覚えましょう。
      </div>

      <WifiFlow />
      <MobileTerms />
      <WifiQuiz />
    </div>
  );
}
