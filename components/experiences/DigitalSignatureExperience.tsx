"use client";

import { useState, type ReactNode } from "react";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { CaFlow, type CaFlowView } from "./signature/CaFlow";
import { SignatureScene, type SignatureSceneProps } from "./signature/SignatureScene";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ディジタル署名・認証局(CA)」専用の体験。
//   ① 署名検証ラボ：文書の届き方（そのまま/途中で改ざん/なりすまし）を選び、
//      2.5D の 送信者 → 通信路 → 受信者 で「文書＋署名」を一緒に運んで検証まで進める。
//      指紋（ハッシュ値）の一致/不一致で見破れることを体感。
//   ② 認証局(CA)＝公開鍵が本物だと保証する第三者。本人 → CA → 電子証明書 → 利用者 を
//      本人申請／偽者申請で比べる。PKIのひとこと。
//   ③ 暗号化とのちがい（早見表）。
// ============================================================================

type Scenario = "ok" | "tamper" | "fake";

const SCENARIOS: {
  key: Scenario;
  label: string;
  senderName: string;
  doc: string;
  /** 送信者が作ったときの文書／届いた文書 */
  arrived: string;
  senderHash: string;
  sealHash: string;
  // 署名を山田さんの公開鍵で開いて取り出した指紋 / 届いた文書から計算した指紋
  sigFp: string;
  docFp: string;
  verdict: string;
  why: string;
}[] = [
  {
    key: "ok",
    label: "📮 そのまま届く",
    senderName: "山田さん",
    doc: "1万円 支払います",
    arrived: "1万円 支払います",
    senderHash: "A4-9F",
    sealHash: "A4-9F",
    sigFp: "A4-9F",
    docFp: "A4-9F",
    verdict: "✅ 検証OK！本人が送った・改ざんなし",
    why: "署名から取り出した指紋と、文書から計算した指紋がピッタリ一致。安心して受け取れます。",
  },
  {
    key: "tamper",
    label: "😈 途中で書き換え",
    senderName: "山田さん",
    doc: "1万円 支払います",
    arrived: "100万円 支払います",
    senderHash: "A4-9F",
    sealHash: "A4-9F",
    sigFp: "A4-9F",
    docFp: "7C-21",
    verdict: "❌ 改ざんを検知！",
    why: "文書が1文字でも変わると指紋も変わります。署名の中の指紋（元の文書のもの）と合わないので、書き換えがバレました。",
  },
  {
    key: "fake",
    label: "🎭 別人がなりすまし",
    senderName: "偽の山田さん",
    doc: "100万円 支払います",
    arrived: "100万円 支払います",
    senderHash: "5E-88",
    sealHash: "5E-88",
    sigFp: "??-??",
    docFp: "5E-88",
    verdict: "❌ なりすましを検知！",
    why: "偽者は山田さんの秘密鍵を持っていません。別の鍵で作った署名は、山田さんの公開鍵では正しく開けず、でたらめな指紋になってバレました。",
  },
];

type LabStep = { title: string; route: string; detail: ReactNode; view: Omit<SignatureSceneProps, "reducedMotion"> };

function stepsFor(key: Scenario): LabStep[] {
  const s = SCENARIOS.find((x) => x.key === key)!;
  const fake = key === "fake";
  const base = {
    senderName: s.senderName,
    forgedSender: fake,
    laneActive: false,
    senderHash: null,
    privateKey: "senderHome" as const,
    publicKey: "receiverHome" as const,
    verify: null,
  };
  const env = (stop: "sender" | "mid" | "receiver", signed: boolean, arrived: boolean) => ({
    stop,
    text: arrived ? s.arrived : s.doc,
    tampered: arrived && s.arrived !== s.doc,
    signed,
    sealHash: s.sealHash,
    forged: fake,
  });
  const idle = { sender: "idle", receiver: "idle", attacker: "idle" } as const;
  return [
    {
      title: "文書の指紋（ハッシュ値）をとる",
      route: `${s.senderName}の手元`,
      detail: <>{s.senderName}が「{s.doc}」を書き、文書から<b>指紋（ハッシュ値）{s.senderHash}</b> を計算します。</>,
      view: { ...base, nodes: { ...idle, sender: fake ? "error" : "active" }, envelope: env("sender", false, false), senderHash: s.senderHash },
    },
    {
      title: fake ? "偽者が自分の秘密鍵で署名" : "自分の秘密鍵で署名",
      route: fake ? "偽者の秘密鍵 → 署名" : "山田さんの秘密鍵 → 署名",
      detail: fake ? (
        <>偽者は山田さんの秘密鍵を<b>持っていない</b>ので、<b>自分の秘密鍵</b>で指紋を封じて「山田です」と署名を付けます。</>
      ) : (
        <>指紋を<b>自分（山田さん）の秘密鍵</b>で封じたものが<b>署名</b>。文書と署名を<b>一緒に</b>送ります。</>
      ),
      view: { ...base, nodes: { ...idle, sender: fake ? "error" : "active" }, envelope: env("sender", true, false), senderHash: s.senderHash, privateKey: "senderSign" },
    },
    {
      title: key === "tamper" ? "通信の途中で書き換えられた！" : "文書＋署名を送る",
      route: "送信者 → 通信路 → 受信者",
      detail:
        key === "tamper" ? (
          <>😈 第三者が通信路で「1万円」を<b>「100万円」に書き換え</b>。でも署名の中身（封じた指紋 {s.sealHash}）は秘密鍵が無いので作り直せません。</>
        ) : (
          <>文書と署名がセットで通信路を進みます。</>
        ),
      view: {
        ...base,
        nodes: { sender: "sending", receiver: "idle", attacker: key === "tamper" ? "error" : "idle" },
        laneActive: true,
        envelope: env("mid", true, key === "tamper"),
      },
    },
    {
      title: "受信者に届く",
      route: "あなたの手元",
      detail: <>あなたの手元に「{s.arrived}」＋署名が届きました。見た目だけでは本物かどうか分かりません。</>,
      view: { ...base, nodes: { ...idle, receiver: "active" }, envelope: env("receiver", true, true) },
    },
    {
      title: "山田さんの公開鍵で検証",
      route: "山田さんの公開鍵 → 署名を開いて照合",
      detail: (
        <>
          <b>{s.verdict}</b> {s.why}
        </>
      ),
      view: {
        ...base,
        nodes: { ...idle, receiver: s.sigFp === s.docFp ? "active" : "error" },
        envelope: env("receiver", true, true),
        publicKey: "receiverVerify",
        verify: { sigHash: s.sigFp, docHash: s.docFp, verdict: key },
      },
    },
  ];
}

function SignatureLab() {
  const reducedMotion = useReducedMotion();
  const [scenario, setScenario] = useState<Scenario>("ok");
  const [tried, setTried] = useState<Set<Scenario>>(new Set());
  const steps = stepsFor(scenario);
  const player = useStepPlayer(steps.length, reducedMotion);
  const step = steps[player.index];
  const verified = player.index === player.lastIndex;
  const allTried = tried.size === SCENARIOS.length;
  const match = step.view.verify?.verdict === "ok";

  // 検証まで見たシナリオを記録（描画中の派生 state 更新＝同じ値なら何もしない）
  if (verified && !tried.has(scenario)) setTried(new Set(tried).add(scenario));

  const pick = (key: Scenario) => {
    setScenario(key);
    player.reset();
  };

  return (
    <Panel>
      <SectionTitle step={1}>署名検証ラボ ― ニセモノを見破れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        山田さんが「支払います」という文書に<b className="text-gray-800">署名</b>して送ります。
        あなたは受信者。<b className="text-gray-800">届き方を選んで、検証まで進めて</b>みましょう。
      </p>

      {/* 届き方の選択 */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {SCENARIOS.map((x) => (
          <button
            key={x.key}
            onClick={() => pick(x.key)}
            aria-pressed={scenario === x.key}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
              scenario === x.key ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
            {tried.has(x.key) && <span className="ml-0.5">✓</span>}
          </button>
        ))}
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[11px] font-bold text-brand-700">
          STEP {player.index + 1} / {steps.length}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="sig-step-title">
          {step.title}
        </p>
        <p className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">{step.route}</p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <SignatureScene {...step.view} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 [&_b]:font-bold ${
          !verified
            ? "bg-gray-50 text-gray-700 ring-gray-200"
            : match
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-rose-50 text-rose-900 ring-rose-200"
        }`}
        aria-live="polite"
        data-testid="sig-detail"
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
          playLabel="署名の流れを再生"
          timelineLabel="署名の流れのタイムライン"
          startCaption="署名"
          endCaption="検証"
          stepTone={(i) => (i === steps.length - 1 ? (match ? "bg-emerald-500" : "bg-rose-500") : "bg-brand-600")}
        />
      </div>

      {allTried && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200" data-testid="sig-all-tried">
          🎉 本物は通し、改ざんもなりすましも見破れた！これがディジタル署名の
          <b>「改ざん検知」＋「なりすまし防止」</b>です。
        </div>
      )}

      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 しくみ：送信者は文書の指紋（<b>ハッシュ値</b>）を<b>自分の秘密鍵</b>で暗号化して添付＝署名。
        受信者は<b>送信者の公開鍵</b>で署名を開き、自分で計算した指紋と照合します。
      </div>
      <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ <b>暗号化とは鍵の使い方が逆</b>。暗号化は「相手の公開鍵で施錠→相手の秘密鍵で開錠」。
        署名は<b>「自分の秘密鍵で署名→相手が公開鍵で検証」</b>です。
      </div>
    </Panel>
  );
}

const CA_STEPS: { title: string; real: CaFlowView; fake: CaFlowView; detail: { real: ReactNode; fake: ReactNode } }[] = [
  {
    title: "その公開鍵、本物？",
    real: { at: "owner", applicant: "real", check: null, certified: false, userVerdict: null, active: ["owner"] },
    fake: { at: "owner", applicant: "fake", check: null, certified: false, userVerdict: null, active: ["owner"] },
    detail: {
      real: <>署名の検証には「山田さんの公開鍵」を使います。でも公開鍵は誰でも作れる。<b>「山田の公開鍵です」と名乗る鍵が本当に山田さんのものか</b>、どう確かめる？</>,
      fake: <>🎭 偽者が<b>自分で作った鍵</b>に「山田の公開鍵です」と名札を付けました。見た目では本物と区別できません。</>,
    },
  },
  {
    title: "認証局(CA)が本人確認",
    real: { at: "ca", applicant: "real", check: "pass", certified: false, userVerdict: null, active: ["owner", "ca"] },
    fake: { at: "ca", applicant: "fake", check: "reject", certified: false, userVerdict: null, active: ["ca"] },
    detail: {
      real: <>山田さんが公開鍵を<b>信頼できる第三者＝認証局(CA)</b>へ申請。CAは身分証などで<b>本人確認</b>します。</>,
      fake: <>偽者がCAに申請しても、<b>本人確認で不合格</b>。CAは証明書を発行しません。</>,
    },
  },
  {
    title: "電子証明書を発行",
    real: { at: "cert", applicant: "real", check: "pass", certified: true, userVerdict: null, active: ["ca", "cert"] },
    fake: { at: "cert", applicant: "fake", check: "reject", certified: false, userVerdict: null, active: [] },
    detail: {
      real: <>CAが「この公開鍵は確かに山田さんのもの」と保証する<b>電子証明書</b>を発行。公開鍵に<b>CAの印（署名）</b>が付きます。</>,
      fake: <>偽の鍵には<b>CAの印が付かない</b>まま。証明書のない「自称・山田の公開鍵」です。</>,
    },
  },
  {
    title: "利用者が証明書を確認",
    real: { at: "user", applicant: "real", check: "pass", certified: true, userVerdict: "trust", active: ["user"] },
    fake: { at: "user", applicant: "fake", check: "reject", certified: false, userVerdict: "reject", active: ["user"] },
    detail: {
      real: <>利用者は<b>CAの印</b>を確かめて「山田さんの公開鍵だ」と安心して署名の検証に使えます。</>,
      fake: <>利用者は<b>証明書（CAの印）がない</b>ので信用しません。偽の鍵で作った署名は通りません。</>,
    },
  },
];

function CaPanel() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(CA_STEPS.length, reducedMotion);
  const [fake, setFake] = useState(false);
  const step = CA_STEPS[player.index];
  const view = fake ? step.fake : step.real;
  return (
    <Panel>
      <SectionTitle step={2}>その公開鍵、本物？＝認証局(CA)</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        署名の検証には「送信者の公開鍵」を使います。でも、その公開鍵が
        <b className="text-gray-800">本当に本人のもの</b>か、誰が保証する？
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {[
          { v: false, label: "🙋 本人が申請" },
          { v: true, label: "🎭 偽者が申請" },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={fake === o.v}
            onClick={() => {
              setFake(o.v);
              player.reset();
            }}
            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${
              fake === o.v ? (o.v ? "bg-rose-600 text-white" : "bg-brand-600 text-white") : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="ca-step-title">
        STEP {player.index + 1}：{step.title}
      </p>
      <div className="mt-2">
        <CaFlow view={view} reducedMotion={reducedMotion} />
      </div>
      <div
        className={`mt-3 min-h-[3em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          fake && player.index > 0 ? "bg-rose-50 ring-rose-200" : "bg-gray-50 ring-gray-200"
        }`}
        aria-live="polite"
      >
        {fake ? step.detail.fake : step.detail.real}
      </div>
      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={CA_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="認証局の流れを再生"
          timelineLabel="認証局の流れのタイムライン"
          startCaption="本人"
          endCaption="利用者"
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        信頼できる第三者＝<b className="text-gray-800">認証局(CA)</b>が「この公開鍵は確かに本人のもの」と保証し、
        <b className="text-gray-800">電子証明書</b>を発行します。
      </p>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 公開鍵・認証局・証明書をまとめて支える仕組みを <b>PKI（公開鍵基盤）</b> と呼びます。
        身近な例：<b>https</b> のサイトもこの証明書で本物だと確認しています。
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "目的", enc: "中身を読まれないようにする", sig: "本人確認＋改ざん検知" },
    { k: "署名/暗号化する人", enc: "送る人（相手の公開鍵で）", sig: "送る人（自分の秘密鍵で）" },
    { k: "開く/検証する人", enc: "受け取る人（自分の秘密鍵で）", sig: "受け取る人（相手の公開鍵で）" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>暗号化との違い</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="p-2 font-bold"></th>
              <th className="p-2 font-bold">🔒 暗号化</th>
              <th className="p-2 font-bold">✍️ ディジタル署名</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-gray-200">
                <td className="bg-gray-50 p-2 font-bold text-gray-700">{r.k}</td>
                <td className="p-2 text-gray-600">{r.enc}</td>
                <td className="p-2 text-gray-600">{r.sig}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ どちらも公開鍵＋秘密鍵のペアを使いますが、<b>「どっちの鍵で・誰が」</b>処理するかが逆。ここが試験の狙い目です。
      </p>
    </Panel>
  );
}

export default function DigitalSignatureExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✍️ <b>ディジタル署名</b>は「確かに本人が送った（なりすまし防止）」＋「途中で書き換えられていない（改ざん検知）」を
        証明するしくみ。<b>秘密鍵で署名→公開鍵で検証</b>が要点です。
      </div>

      <SignatureLab />
      <CaPanel />
      <CompareTable />
    </div>
  );
}
