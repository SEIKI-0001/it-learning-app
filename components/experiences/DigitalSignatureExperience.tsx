"use client";

import { useState, type ReactNode } from "react";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import type { CaFlowView } from "./signature/signatureTypes";
import { CaDioramaScene, type CaFocus } from "./signature/CaDioramaScene";
import { SignatureDioramaScene, type SigFocus } from "./signature/SignatureDioramaScene";
import type { SignatureSceneProps } from "./signature/signatureTypes";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「ディジタル署名・認証局(CA)」専用の体験。
//   ① 署名検証ラボ：文書の届き方（そのまま/途中で改ざん/なりすまし）を選び、
//      送信者 → 通信路 → 受信者 で「文書＋署名」を一緒に運び、書く→指紋→署名→送る→
//      （改ざん：横取り→書き換え→届く）→ 検証①署名を開く→②指紋を計算→③比べる と細かく区切って進める。
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
    label: "そのまま届く",
    senderName: "山田さん",
    doc: "1万円 支払います",
    arrived: "1万円 支払います",
    senderHash: "A4-9F",
    sealHash: "A4-9F",
    sigFp: "A4-9F",
    docFp: "A4-9F",
    verdict: "検証OK！本人が送った・改ざんなし",
    why: "署名から取り出した指紋と、文書から計算した指紋がピッタリ一致。安心して受け取れます。",
  },
  {
    key: "tamper",
    label: "途中で書き換え",
    senderName: "山田さん",
    doc: "1万円 支払います",
    arrived: "100万円 支払います",
    senderHash: "A4-9F",
    sealHash: "A4-9F",
    sigFp: "A4-9F",
    docFp: "7C-21",
    verdict: "改ざんを検知！",
    why: "文書が1文字でも変わると指紋も変わります。署名の中の指紋（元の文書のもの）と合わないので、書き換えがバレました。",
  },
  {
    key: "fake",
    label: "別人がなりすまし",
    senderName: "偽の山田さん",
    doc: "100万円 支払います",
    arrived: "100万円 支払います",
    senderHash: "5E-88",
    sealHash: "5E-88",
    sigFp: "??-??",
    docFp: "5E-88",
    verdict: "なりすましを検知！",
    why: "偽者は山田さんの秘密鍵を持っていません。別の鍵で作った署名は、山田さんの公開鍵では正しく開けず、でたらめな指紋になってバレました。",
  },
];

type LabStep = {
  title: string;
  route: string;
  /** 模型の中に出す一言（40字以内）・指す物・色味 */
  caption: ReactNode;
  focus: SigFocus;
  tone?: "info" | "ok" | "danger";
  view: Omit<SignatureSceneProps, "reducedMotion">;
};

function stepsFor(key: Scenario): LabStep[] {
  const s = SCENARIOS.find((x) => x.key === key)!;
  const fake = key === "fake";
  const tamper = key === "tamper";
  const base = {
    senderName: s.senderName,
    forgedSender: fake,
    laneActive: false,
    senderHash: null,
    privateKey: "senderHome" as const,
    publicKey: "receiverHome" as const,
    verify: null,
  };
  const env = (
    stop: "sender" | "mid" | "attacker" | "receiver",
    signed: boolean,
    arrived: boolean,
    rewrite?: "grab" | "done",
  ) => ({
    stop,
    text: arrived ? s.arrived : s.doc,
    tampered: arrived && s.arrived !== s.doc,
    signed,
    sealHash: s.sealHash,
    forged: fake,
    rewrite: rewrite ? { from: s.doc, phase: rewrite } : undefined,
  });
  const idle = { sender: "idle", receiver: "idle", attacker: "idle" } as const;
  const senderState = fake ? "error" : "active";
  const atReceiver = { ...base, nodes: { ...idle, receiver: "active" as const }, envelope: env("receiver", true, true), publicKey: "receiverVerify" as const };

  // --- 送信側：書く → 指紋 → 署名 → 送り出す ---
  const send: LabStep[] = [
    {
      title: "文書を書く",
      route: `${s.senderName}の手元`,
      caption: fake ? <>偽者が山田さんになりすまして文書を作る</> : <>山田さんが「{s.doc}」を書く。これに<b>署名</b>を付ける</>,
      focus: "sender",
      tone: fake ? "danger" : "info",
      view: { ...base, nodes: { ...idle, sender: senderState }, envelope: env("sender", false, false) },
    },
    {
      title: "ハッシュ関数で文書の指紋をとる",
      route: "文書 → ハッシュ関数 → 指紋",
      caption: <>文書を<b>ハッシュ関数</b>に通して<b>指紋</b>（{s.senderHash}）を作る</>,
      focus: "sender",
      view: { ...base, nodes: { ...idle, sender: senderState }, envelope: env("sender", false, false), senderHash: s.senderHash },
    },
    {
      title: fake ? "偽者が自分の秘密鍵で指紋を封じる" : "指紋を自分の秘密鍵で封じる＝署名",
      route: fake ? "偽者の秘密鍵 → 署名" : "山田さんの秘密鍵 → 署名",
      caption: fake ? <>偽者は<b>自分の秘密鍵</b>で封じて「山田です」と名乗る</> : <>指紋を<b>山田さんの秘密鍵</b>で封じる＝<b>署名</b></>,
      focus: "sender",
      tone: fake ? "danger" : "info",
      view: { ...base, nodes: { ...idle, sender: senderState }, envelope: env("sender", true, false), senderHash: s.senderHash, privateKey: "senderSign" },
    },
    {
      title: "文書と署名をセットで送り出す",
      route: "送信者 → 通信路",
      caption: <>文書と署名を<b>セット</b>で送り出す</>,
      focus: "doc",
      view: { ...base, nodes: { ...idle, sender: "sending" }, laneActive: true, envelope: env("mid", true, false) },
    },
  ];

  // --- 通信路：改ざんシナリオだけ「横取り → 書き換え → 素知らぬ顔で届ける」を分けて見せる ---
  const channel: LabStep[] = tamper
    ? [
        {
          title: "第三者が通信の途中で横取り",
          route: "通信路 → 第三者の手元",
          caption: <>通信の途中で、第三者が文書と署名を<b>横取り</b></>,
          focus: "attacker",
          tone: "danger",
          view: { ...base, nodes: { ...idle, attacker: "error" }, laneActive: true, envelope: env("attacker", true, false, "grab") },
        },
        {
          title: `「${s.doc.split(" ")[0]}」を「${s.arrived.split(" ")[0]}」に書き換える`,
          route: "第三者が文書だけ書き換え",
          caption: <>文書だけ書き換えた。<b>署名</b>は秘密鍵がないと作り直せない</>,
          focus: "attacker",
          tone: "danger",
          view: { ...base, nodes: { ...idle, attacker: "error" }, laneActive: true, envelope: env("attacker", true, true, "done") },
        },
        {
          title: "何事もなかったように受信者へ届く",
          route: "第三者 → 通信路 → 受信者",
          caption: <>書き換え済みの文書と元の署名が届く。見た目では気づけない</>,
          focus: "receiver",
          tone: "danger",
          view: { ...base, nodes: { ...idle, receiver: "active" }, envelope: env("receiver", true, true) },
        },
      ]
    : [
        {
          title: "受信者に届く",
          route: "通信路 → あなたの手元",
          caption: <>文書＋署名が届いた。見た目では本物か分からない</>,
          focus: "receiver",
          view: { ...base, nodes: { ...idle, receiver: "active" }, envelope: env("receiver", true, true) },
        },
      ];

  // --- 受信側の検証：① 署名を開く → ② 文書の指紋を計算 → ③ 比べる ---
  const verify: LabStep[] = [
    {
      title: "検証①：山田さんの公開鍵で署名を開く",
      route: "山田さんの公開鍵 → 署名の中の指紋",
      caption: fake ? <><b>公開鍵</b>で開くと<b>でたらめな値</b>。山田さんの鍵で作られていない</> : <>山田さんの<b>公開鍵</b>で署名を開くと、元の指紋（{s.sigFp}）が出る</>,
      focus: "receiver",
      tone: fake ? "danger" : "info",
      view: { ...atReceiver, verify: { sigHash: s.sigFp, docHash: null, verdict: null } },
    },
    {
      title: "検証②：届いた文書から自分で指紋を計算",
      route: "届いた文書 → ハッシュ関数 → 指紋",
      caption: tamper ? <>届いた文書の指紋は<b>{s.docFp}</b>。元の{s.sealHash}と別の値</> : <>届いた文書から自分で指紋を計算 → <b>{s.docFp}</b></>,
      focus: "receiver",
      tone: tamper ? "danger" : "info",
      view: { ...atReceiver, verify: { sigHash: s.sigFp, docHash: s.docFp, verdict: null } },
    },
    {
      title: "検証③：2つの指紋を比べる",
      route: "① 署名の中の指紋 と ② 計算した指紋",
      caption: key === "ok" ? <>指紋が<b>一致</b>。本人が送った・改ざんなし</> : key === "tamper" ? <>指紋が<b>不一致</b>。<b>改ざんを検知</b>！</> : <>指紋が<b>不一致</b>。<b>なりすましを検知</b>！</>,
      focus: "receiver",
      tone: key === "ok" ? "ok" : "danger",
      view: {
        ...atReceiver,
        nodes: { ...idle, receiver: s.sigFp === s.docFp ? "active" : "error" },
        verify: { sigHash: s.sigFp, docHash: s.docFp, verdict: key },
      },
    },
  ];

  return [...send, ...channel, ...verify];
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
        <SignatureDioramaScene
          {...step.view}
          forward={player.forward}
          reducedMotion={reducedMotion}
          caption={{ id: `${scenario}-${player.index}`, text: step.caption, tone: step.tone ?? "info", focus: step.focus }}
        />
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
          本物は通し、改ざんもなりすましも見破れた！これがディジタル署名の
          <b>「改ざん検知」＋「なりすまし防止」</b>です。
        </div>
      )}

      <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="alert" /><b>暗号化とは鍵の使い方が逆</b>。暗号化は「相手の公開鍵で施錠→相手の秘密鍵で開錠」。
        署名は<b>「自分の秘密鍵で署名→相手が公開鍵で検証」</b>です。
      </div>
    </Panel>
  );
}

const CA_STEPS: { title: string; real: CaFlowView; fake: CaFlowView; caption: { real: ReactNode; fake: ReactNode }; focus: CaFocus; tone?: { fake?: "danger" } }[] = [
  {
    title: "その公開鍵、本物？",
    real: { at: "owner", applicant: "real", check: null, certified: false, userVerdict: null, active: ["owner"] },
    fake: { at: "owner", applicant: "fake", check: null, certified: false, userVerdict: null, active: ["owner"] },
    caption: {
      real: <>この「山田の公開鍵」、<b>本当に山田さんのもの</b>？</>,
      fake: <>偽者が<b>自作の鍵</b>に「山田の公開鍵」と名札を付けた</>,
    },
    focus: "owner",
    tone: { fake: "danger" },
  },
  {
    title: "認証局(CA)が本人確認",
    real: { at: "ca", applicant: "real", check: "pass", certified: false, userVerdict: null, active: ["owner", "ca"] },
    fake: { at: "ca", applicant: "fake", check: "reject", certified: false, userVerdict: null, active: ["ca"] },
    caption: {
      real: <>公開鍵を信頼できる<b>認証局(CA)</b>へ申請。<b>本人確認</b>される</>,
      fake: <>偽者は<b>本人確認で不合格</b>。証明書は発行されない</>,
    },
    focus: "ca",
    tone: { fake: "danger" },
  },
  {
    title: "電子証明書を発行",
    real: { at: "cert", applicant: "real", check: "pass", certified: true, userVerdict: null, active: ["ca", "cert"] },
    fake: { at: "cert", applicant: "fake", check: "reject", certified: false, userVerdict: null, active: [] },
    caption: {
      real: <>CAが「本人の鍵」と保証する<b>電子証明書</b>を発行（CAの署名つき）</>,
      fake: <>偽の鍵には<b>CAの印が付かない</b>。証明書のない鍵のまま</>,
    },
    focus: "cert",
    tone: { fake: "danger" },
  },
  {
    title: "利用者が証明書を確認",
    real: { at: "user", applicant: "real", check: "pass", certified: true, userVerdict: "trust", active: ["user"] },
    fake: { at: "user", applicant: "fake", check: "reject", certified: false, userVerdict: "reject", active: ["user"] },
    caption: {
      real: <>利用者は<b>CAの印</b>を確かめ、安心して署名の検証に使える</>,
      fake: <>利用者は<b>証明書がない</b>ので信用しない</>,
    },
    focus: "user",
    tone: { fake: "danger" },
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
          { v: false, label: "本人が申請" },
          { v: true, label: "偽者が申請" },
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
        <CaDioramaScene
          view={view}
          forward={player.forward}
          reducedMotion={reducedMotion}
          caption={{
            id: `${fake ? "f" : "r"}-${player.index}`,
            text: fake ? step.caption.fake : step.caption.real,
            tone: fake ? step.tone?.fake ?? "info" : player.index === CA_STEPS.length - 1 ? "ok" : "info",
            focus: step.focus,
          }}
        />
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
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        <InlineIcon name="flag" />公開鍵・認証局・証明書をまとめて支える仕組みを <b>PKI（公開鍵基盤）</b> と呼びます。
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
              <th className="p-2 font-bold">暗号化</th>
              <th className="p-2 font-bold">ディジタル署名</th>
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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>ディジタル署名</b>は「確かに本人が送った（なりすまし防止）」＋「途中で書き換えられていない（改ざん検知）」を
        証明するしくみ。<b>秘密鍵で署名→公開鍵で検証</b>が要点です。
      </div>

      <SignatureLab />
      <CaPanel />
      <CompareTable />
    </div>
  );
}
