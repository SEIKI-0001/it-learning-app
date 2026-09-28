"use client";

import { useState, type ReactNode } from "react";
import { ADDRESS, MemberSiteDioramaScene, PASSWORD, PASSWORD_HASH, type MemberPhase } from "./encryption/MemberSiteDioramaScene";
import { diffCount, hashHex } from "./encryption/toyCrypto";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「暗号化とハッシュ化」専用の体験。
//   ① 通販サイトの裏側（3D模型）… 会員登録で届いた住所は鍵で暗号化、パスワードはハッシュ値だけ保存。
//      発送では住所を鍵で復号して使い（可逆）、ログインでは入力をハッシュして比べるだけ（戻さない）。
//      1文字違いの入力で値が激変すること、DBが盗まれても読めないことまでを実例で見る
//   ② 暗号化 … 鍵で読めなくする → 鍵で元に戻せる（可逆）
//   ③ ハッシュ化 … データをミキサーにかけ固定長のスムージー(値)に → 元に戻せない（一方向）
//   ④ くらべて整理
// 学習用の簡易変換（本物の暗号ではない）で、可逆／不可逆の感覚をつかむ。
// ============================================================================

function encryptHex(text: string, key: number): string {
  return [...text]
    .map((c) => ((c.charCodeAt(0) + key) & 0xffff).toString(16).padStart(4, "0"))
    .join(" ");
}

function DiffDigest({ value, base }: { value: string; base: string }) {
  return (
    <span className="font-mono">
      {[...value].map((c, i) => (
        <span key={i} className={c !== base[i] ? "rounded-sm bg-rose-100 text-rose-700" : undefined}>
          {c}
        </span>
      ))}
    </span>
  );
}

const LOGIN_VARIANTS = ["spring124", "Spring123", PASSWORD] as const;

type MemberStep = { phase: MemberPhase; title: string; detail: ReactNode };

const MEMBER_STEPS: MemberStep[] = [
  {
    phase: "register",
    title: "会員登録：住所とパスワードを送る",
    detail: (
      <>
        通販サイトの会員登録。スマホから<b>住所</b>と<b>パスワード</b>を送ります（通信はhttpsで守られている前提）。
        ここからが本題：<b>届いた2つの情報を、サイトはどんな形で保存するか？</b>
      </>
    ),
  },
  {
    phase: "store",
    title: "住所は暗号化、パスワードはハッシュ化して保存",
    detail: (
      <>
        住所は<b>🔑鍵で暗号化</b>、パスワードは<b>ハッシュ関数</b>に通して保存します。データベースに残るのは
        <b>暗号文とハッシュ値だけ</b>。鍵はデータベースとは別の<b>金庫</b>に保管します。
      </>
    ),
  },
  {
    phase: "ship",
    title: "発送：住所は鍵で元に戻して使う",
    detail: (
      <>
        商品を送るときは住所の<b>中身が必要</b>。倉庫のシステムが<b>同じ鍵で復号</b>すると、暗号文が「{ADDRESS}」に戻り、送り状を印刷できます。
        鍵があれば戻せる＝<b>暗号化は可逆</b>。だから後で中身を使う情報に向いています。
      </>
    ),
  },
  {
    phase: "login",
    title: "ログイン：入力をハッシュして比べるだけ",
    detail: (
      <>
        ログインでは、入力された「{PASSWORD}」を<b>同じハッシュ関数</b>に通し、保存してあるハッシュ値と<b>比べるだけ</b>。
        同じ入力なら必ず同じ値になるので、<b>元のパスワードに戻さなくても本人か確かめられます</b>。
      </>
    ),
  },
  {
    phase: "typo",
    title: "1文字だけ違うと…",
    detail: (
      <>
        入力を<b>1文字だけ</b>変えてみよう（下のボタン）。ハッシュ値は<b>まるごと別物</b>になり、ログインできません。
        この「少しの違いで激変する」性質は、ファイルの<b>改ざん検知</b>にも使われます。
      </>
    ),
  },
  {
    phase: "leak",
    title: "もしデータベースが盗まれたら",
    detail: (
      <>
        攻撃者が手に入れたのは<b>暗号文とハッシュ値だけ</b>。住所は<b>鍵が金庫にあるので読めない</b>、パスワードは
        <b>ハッシュ値から元に戻す計算ができない</b>（一方向）。だからお店の人でさえパスワードは分からず、忘れたときは「教えてもらう」ではなく
        <b>再設定</b>になります。
        ※ ただし「spring123」のような弱いパスワードは、候補を片っ端からハッシュして一致を探す総当たりで当てられる恐れがあります。長く推測されにくいパスワードが大切です。
      </>
    ),
  },
];

function MemberSite() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(MEMBER_STEPS.length, reducedMotion);
  const step = MEMBER_STEPS[player.index];
  const [variant, setVariant] = useState<(typeof LOGIN_VARIANTS)[number]>(LOGIN_VARIANTS[0]);
  const loginInput = step.phase === "typo" ? variant : PASSWORD;
  const changed = diffCount(hashHex(loginInput), PASSWORD_HASH);

  return (
    <Panel>
      <SectionTitle step={1}>通販サイトは、住所とパスワードをどう守る？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ登録フォームから来た情報でも、<b className="text-gray-800">後で中身を使うものは暗号化</b>、
        <b className="text-gray-800">照合できれば十分なものはハッシュ化</b>。実際のサイトの裏側で確かめます。
      </p>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="member-step-title">
        STEP {player.index + 1}：{step.title}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <MemberSiteDioramaScene phase={step.phase} loginInput={loginInput} reducedMotion={reducedMotion} />
      </div>

      {step.phase === "typo" && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="hash-compare">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-gray-500">ログインの入力：</span>
            {LOGIN_VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={variant === v}
                onClick={() => setVariant(v)}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition active:scale-95 ${
                  variant === v ? "bg-teal-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <dl className="mt-2.5 space-y-1 text-[11px] leading-relaxed">
            <div className="flex gap-2">
              <dt className="w-20 flex-none font-mono font-bold text-gray-500">{PASSWORD}</dt>
              <dd className="break-all font-mono text-gray-700">{PASSWORD_HASH}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 flex-none font-mono font-bold text-teal-700">{variant}</dt>
              <dd className="break-all text-gray-900" data-testid="hash-compare-digest">
                <DiffDigest value={hashHex(variant)} base={PASSWORD_HASH} />
              </dd>
            </div>
          </dl>
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-center text-xs font-bold ${changed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}
            data-testid="hash-compare-result"
          >
            {changed
              ? `入力は1文字の違いなのに、ハッシュ値は16桁中${changed}桁が変わった（似てさえいない）`
              : "同じ入力なら、何度ハッシュしても完全に同じ値 → ログインできる"}
          </p>
        </div>
      )}

      <div className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {step.detail}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={MEMBER_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="通販サイトの裏側を再生"
          timelineLabel="通販サイトの裏側のタイムライン"
          startCaption="登録"
          endCaption="盗まれたら"
          stepTone={(i) => (i === 2 ? "bg-emerald-700" : i >= 3 && i <= 4 ? "bg-blue-700" : "bg-brand-600")}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
        ※ 学習用の簡易変換です（本物の暗号・ハッシュではありません）。実際のハッシュ値は SHA-256 なら64桁など、もっと長くなります。
      </p>
    </Panel>
  );
}

function Encryption() {
  const [text, setText] = useState("ひみつのメモ");
  const [key, setKey] = useState(3);
  const [mode, setMode] = useState<"plain" | "cipher">("plain");
  const shown = mode === "cipher" ? encryptHex(text, key) : text;

  return (
    <Panel>
      <SectionTitle step={2}>暗号化（鍵で戻せる＝可逆）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        暗号化は<b className="text-gray-800">鍵</b>を使って読めなくする処理。
        <b className="text-gray-800">同じ鍵で元に戻せます（復号）</b>。鍵付きの箱のイメージ。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">文章：</span>
        <input
          value={text}
          maxLength={16}
          onChange={(e) => {
            setText(e.target.value);
            setMode("plain");
          }}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-gray-500">🔑 鍵：</span>
        {[1, 3, 5].map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`h-8 w-8 rounded-lg font-mono font-bold active:scale-95 ${
              key === k ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("cipher")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "cipher" ? "bg-brand-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔒 鍵で暗号化
        </button>
        <button
          onClick={() => setMode("plain")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "plain" ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔑 鍵で復号
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 ring-1 ${
          mode === "cipher" ? "bg-brand-50 ring-brand-200" : "bg-emerald-50 ring-emerald-200"
        }`}
      >
        <div className="text-xs font-bold text-gray-500">{mode === "cipher" ? "暗号文（読めない）" : "平文（元に戻った）"}</div>
        <div className="mt-1 break-all font-mono text-sm text-gray-800">{shown || "（空）"}</div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        🔒↔🔑 を押すと行き来できます。<b>鍵があれば必ず元に戻せる</b>のが暗号化（＝可逆）。通信(HTTPS)やデータ保存の秘匿に使います。
      </p>
    </Panel>
  );
}

function Hashing() {
  const [a, setA] = useState("password");
  const [b, setB] = useState("password");
  const same = a === b;
  const fields = [
    { label: "入力①", value: a, set: setA },
    { label: "入力②", value: b, set: setB },
  ];

  return (
    <Panel>
      <SectionTitle step={3}>ハッシュ化（戻せない＝一方向）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ハッシュ化の大事な性質は、<b className="text-gray-800">同じ入力なら、いつ・何回やっても、必ず同じ値</b>になること。
        2つの欄に<b className="text-gray-800">同じ文章</b>を入れて、値がそろうか確かめよう。
      </p>

      <div className="mt-3 space-y-3">
        {fields.map((f) => {
          const h = hashHex(f.value);
          return (
            <div key={f.label}>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold text-gray-500">{f.label}</span>
                <input
                  value={f.value}
                  maxLength={20}
                  onChange={(e) => f.set(e.target.value)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div
                className={`mt-1 ml-12 rounded-lg px-3 py-2 ring-1 ${
                  same ? "bg-emerald-50 ring-emerald-300" : "bg-gray-900 ring-gray-700"
                }`}
              >
                <div className={`break-all font-mono text-xs ${same ? "text-emerald-700" : "text-emerald-300"}`}>
                  {h}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-bold ring-1 ${
          same ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {same
          ? "✅ 入力が同じ → ハッシュ値も完全に一致！（同じ材料なら必ず同じ味）"
          : "❌ 入力が1文字でも違うと → まったく別の値（似てさえいない）"}
      </div>

      <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
        <li>・<b>同じ入力なら同じ値</b>：何回やっても結果は変わらない。だから<b>パスワード照合</b>に使える（保存したハッシュと、入力のハッシュが一致すれば本人）。</li>
        <li>・<b>1文字で激変</b>：少しの違いでまるで別の値に → <b>改ざん検知</b>に使える。</li>
        <li>・<b>戻せない・固定長</b>：値から元の文章は復元できず、長さはいつも同じ（コップ1杯ぶん）。</li>
      </ul>
    </Panel>
  );
}

export default function EncryptionHashExperience() {
  const rows = [
    { k: "元に戻せる？", e: "戻せる（鍵で復号）", h: "戻せない（一方向）" },
    { k: "鍵", e: "使う", h: "使わない" },
    { k: "出力の長さ", e: "元の長さしだい", h: "いつも固定長" },
    { k: "主な用途", e: "通信・保存の秘匿", h: "パスワード保存・改ざん検知" },
  ];
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        ふたつは似て非なるもの。通販サイトでは<b>住所は暗号化</b>（発送のとき鍵で元に戻して使う＝戻せる）、
        <b>パスワードはハッシュ化</b>（照合できれば十分なので、戻せない値だけ保存する）。使い道で使い分けます。
      </div>

      <MemberSite />
      <Encryption />
      <Hashing />

      <Panel>
        <SectionTitle step={4}>くらべて整理</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-brand-700">🔒 暗号化</th>
                <th className="px-3 py-2 text-center font-bold text-emerald-700">🥤 ハッシュ化</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.e}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「ハッシュ化も復号できる」は誤り。戻せないのがハッシュ化です。また暗号化と圧縮（容量を小さくする）も別物。
        </p>
      </Panel>
    </div>
  );
}
