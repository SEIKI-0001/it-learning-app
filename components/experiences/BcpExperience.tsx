"use client";

import { useState, type ReactNode } from "react";
import { BcpDioramaScene } from "./bcp/BcpDioramaScene";
import type { BcpNodeId, BcpSceneProps } from "./bcp/bcpTypes";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";
import Icon from "@/components/ui/Icon";

// ============================================================================
// 「BCP（事業継続計画）」専用の体験。
//   ① 備えを選んでから地震を起こす復旧シミュレータ。2.5D の企業模型（本社・システム/データ・
//      社員・代替拠点・バックアップ）で、災害後の復旧経路（連絡→移転→データ復元）を時間軸で見せ、
//      備えの有無で各段階の日数＝営業再開までの時間が変わる
//   ② BCPらしい備えはどれ？ 仕分けクイズ
// ============================================================================

const PREPS = [
  { id: "backup", icon: "save", name: "バックアップ", d: "データを別の場所にも保存" },
  { id: "site", icon: "building", name: "代替拠点", d: "本社がダメでも動ける場所" },
  { id: "contact", icon: "message", name: "連絡手順", d: "誰が・どう連絡し合うか" },
] as const;

type PrepId = (typeof PREPS)[number]["id"];

// 復旧の各段階にかかる日数。備えがあると短く、無いと長く（データは作り直し）なる。
const DURATION: Record<PrepId, { on: number; off: number; stage: string }> = {
  contact: { on: 0.5, off: 3, stage: "連絡・役割分担" },
  site: { on: 1, off: 30, stage: "働く場所の確保" },
  backup: { on: 0.5, off: 60, stage: "データ復元" },
};
const STAGE_ORDER: PrepId[] = ["contact", "site", "backup"];

const VERDICTS = [
  { max: 2, days: "たった2日！", note: "決めておいた優先順位どおり、大事な業務から順に再開できた。", tone: "emerald" },
  { max: 10, days: "約1週間", note: "かなり戻せたが、欠けた備えのぶん遅れた。", tone: "amber" },
  { max: 45, days: "1か月以上", note: "備えが足りず、欠けたところが復旧全体の足を引っぱる。", tone: "rose" },
  { max: Infinity, days: "…めどが立たない", note: "復旧できず、お客も信用も失う。倒産の危機。", tone: "rose" },
] as const;

function daysOf(id: PrepId, on: boolean) {
  return on ? DURATION[id].on : DURATION[id].off;
}

function fmtDays(d: number) {
  return d < 1 ? "半日" : `${d}日`;
}

type Prep = Record<PrepId, boolean>;

function stepsFor(on: Prep): { title: string; view: Omit<BcpSceneProps, "reducedMotion" | "prep">; caption: ReactNode; ok: boolean | null; focus: BcpNodeId }[] {
  const base = { hq: "error", system: "error", staff: "idle", alt: "idle", vault: "idle" } as const;
  return [
    {
      title: "大地震発生：本社とシステムが停止",
      view: { nodes: { ...base }, disaster: true, lanes: {}, staffToken: { at: "staff", text: "社員", tone: "idle" }, dataToken: null, shake: true, named: ["hq", "system"] },
      caption: <><b>大地震</b>で本社とシステムが停止。復旧は事前の備えで決まる</>,
      ok: null,
      focus: "hq",
    },
    {
      title: "① 連絡・役割分担",
      view: {
        nodes: { ...base, staff: on.contact ? "active" : "error" },
        disaster: true,
        lanes: {},
        staffToken: on.contact ? { at: "staff", text: "安否OK・担当決定", tone: "ok" } : { at: "staff", text: "誰に連絡？", tone: "ng" },
        dataToken: null,
        shake: false,
        named: ["staff"],
      },
      caption: on.contact ? (
        <><b>連絡手順</b>どおり安否確認と役割分担（{fmtDays(DURATION.contact.on)}）</>
      ) : (
        <>連絡手順がなく<b>大混乱</b>。{DURATION.contact.off}日かかった</>
      ),
      ok: on.contact,
      focus: "staff",
    },
    {
      title: "② 働く場所を移す",
      view: {
        nodes: { ...base, staff: on.site ? "sending" : "error", alt: on.site ? "active" : "disabled" },
        disaster: true,
        lanes: on.site ? { move: "active" } : { move: "blocked" },
        staffToken: on.site ? { at: "alt", text: "代替拠点へ移動", tone: "ok" } : { at: "staff", text: "働く場所がない", tone: "ng" },
        dataToken: null,
        shake: false,
        named: on.site ? ["staff", "alt"] : ["staff"],
      },
      caption: on.site ? (
        <><b>代替拠点</b>へ移って営業を準備（{fmtDays(DURATION.site.on)}）</>
      ) : (
        <><b>代替拠点</b>がなく働く場所なし。{DURATION.site.off}日待つだけ</>
      ),
      ok: on.site,
      focus: on.site ? "alt" : "staff",
    },
    {
      title: "③ データを復元",
      view: {
        nodes: { ...base, alt: on.site ? "active" : "disabled", vault: on.backup ? "sending" : "disabled", staff: on.site ? "idle" : "error" },
        disaster: true,
        lanes: on.backup ? { restore: on.site ? "active" : "blocked", move: on.site ? undefined : "blocked" } : {},
        staffToken: on.site ? { at: "alt", text: "代替拠点で作業", tone: "ok" } : { at: "staff", text: "働く場所がない", tone: "ng" },
        dataToken: on.backup
          ? on.site
            ? { at: "alt", text: "データ復元", tone: "ok" }
            : { at: "vault", text: "移す先を待つ", tone: "idle" }
          : { at: "lost", text: "顧客データ消失", tone: "ng" },
        shake: false,
        named: [...(on.site ? ["alt" as const] : ["staff" as const]), ...(on.backup ? ["vault" as const] : ["system" as const])],
      },
      caption: !on.backup ? (
        <><b>バックアップ</b>がなく顧客データが消失。作り直しに{DURATION.backup.off}日</>
      ) : on.site ? (
        <><b>バックアップ</b>から代替拠点へデータを復元（{fmtDays(DURATION.backup.on)}）</>
      ) : (
        <><b>バックアップ</b>は無事でも、移す先がなく復元できない</>
      ),
      ok: on.backup,
      focus: !on.backup ? "system" : on.site ? "alt" : "vault",
    },
    {
      title: "営業再開",
      view: {
        nodes: { hq: "error", system: "error", staff: "idle", alt: on.site ? "active" : "disabled", vault: on.backup ? "idle" : "disabled" },
        disaster: true,
        lanes: {},
        staffToken: on.site ? { at: "alt", text: "営業再開", tone: "ok" } : { at: "staff", text: "再開待ち", tone: "ng" },
        dataToken: on.backup ? (on.site ? { at: "alt", text: "データOK", tone: "ok" } : { at: "vault", text: "データは無事", tone: "idle" }) : { at: "lost", text: "顧客データ消失", tone: "ng" },
        shake: false,
        named: [on.site ? "alt" : "staff"],
      },
      caption: on.site ? (
        <>代替拠点で<b>営業再開</b>。結末を分けたのは事前の備え（<b>BCP</b>）</>
      ) : (
        <>働く場所がなく再開できない。<b>BCP</b>は災害の前に備える計画</>
      ),
      ok: on.site,
      focus: on.site ? "alt" : "staff",
    },
  ];
}

function RecoveryBar({ on, upTo }: { on: Prep; upTo: number }) {
  const total = STAGE_ORDER.reduce((sum, id) => sum + daysOf(id, on[id]), 0);
  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200" data-testid="bcp-recovery-bar">
      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
        <span>復旧にかかった時間</span>
        <span className="text-gray-800">
          合計 {upTo >= STAGE_ORDER.length ? `${total}日` : "…"}
        </span>
      </div>
      <div className="mt-1.5 flex h-5 w-full overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
        {STAGE_ORDER.map((id, i) => {
          const d = daysOf(id, on[id]);
          const shown = i < upTo;
          return (
            <span
              key={id}
              className={`flex items-center justify-center overflow-hidden text-[9px] font-bold text-white transition-[flex-grow] duration-700 ${
                on[id] ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ flexGrow: shown ? Math.sqrt(d) : 0, flexBasis: 0 }}
              data-stage={id}
              data-days={d}
            >
              {shown && Math.sqrt(d) > 1.2 ? fmtDays(d) : ""}
            </span>
          );
        })}
        {upTo < STAGE_ORDER.length && <span className="flex-1" />}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] leading-tight">
        {STAGE_ORDER.map((id, i) => (
          <span key={id} className={i < upTo ? (on[id] ? "font-bold text-emerald-700" : "font-bold text-rose-700") : "text-gray-400"}>
            <Icon name={PREPS.find((p) => p.id === id)!.icon} className="mr-0.5 inline h-3 w-3 align-[-1px]" />{DURATION[id].stage}
            {i < upTo && `：${fmtDays(daysOf(id, on[id]))}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function Lab() {
  const reducedMotion = useReducedMotion();
  const [on, setOn] = useState<Prep>({
    backup: false,
    site: false,
    contact: false,
  });
  const [struck, setStruck] = useState(false);
  const steps = stepsFor(on);
  const player = useStepPlayer(steps.length, reducedMotion, 2600);
  const step = steps[player.index];
  const total = STAGE_ORDER.reduce((sum, id) => sum + daysOf(id, on[id]), 0);
  const verdict = VERDICTS.find((v) => total <= v.max)!;
  const done = struck && player.index === player.lastIndex;
  const verdictTone =
    verdict.tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : verdict.tone === "amber"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-rose-50 text-rose-800 ring-rose-200";

  const strike = () => {
    setStruck(true);
    if (reducedMotion) player.reset();
    else player.play();
  };
  const retry = () => {
    setStruck(false);
    player.reset();
  };

  const calm: Omit<BcpSceneProps, "reducedMotion" | "prep"> = {
    nodes: { hq: "active", system: "active", staff: "idle", alt: on.site ? "idle" : "disabled", vault: on.backup ? "idle" : "disabled" },
    disaster: false,
    lanes: {},
    staffToken: { at: "hq", text: "本社で仕事中", tone: "idle" },
    dataToken: null,
    shake: false,
  };

  return (
    <Panel>
      <SectionTitle step={1}>備えてから、地震を起こしてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはお店の店長。<b className="text-gray-800">平常時にどこまで備えるか</b>を選んでから、
        大地震を起こして結末を見てみよう。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <BcpDioramaScene
          {...(struck ? step.view : calm)}
          caption={
            struck
              ? { id: `${player.index}-${on.backup}${on.site}${on.contact}`, text: step.caption, tone: player.index === 0 ? "danger" : step.ok === null ? "info" : step.ok ? "ok" : "danger", focus: step.focus }
              : null
          }
          prep={on} forward={player.forward} reducedMotion={reducedMotion} />
      </div>

      {/* 備えトグル */}
      {!struck && (
        <div className="mt-3 space-y-2">
          {PREPS.map((p) => {
            const active = on[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setOn((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                aria-pressed={active}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-2 transition active:scale-[0.98] ${
                  active ? "bg-emerald-50 ring-emerald-400" : "bg-gray-50 ring-gray-200"
                }`}
              >
                <Icon name={p.icon} className="h-7 w-7 flex-none text-gray-700" />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-gray-800">{p.name}</span>
                  <span className="block text-[11px] leading-relaxed text-gray-500">{p.d}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {active ? "備えた" : "なし"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 地震発生ボタン */}
      {!struck ? (
        <button onClick={strike} className="mt-4 w-full rounded-xl bg-rose-600 py-3 text-base font-bold text-white transition active:scale-95">
          大地震発生！
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-rose-700">
              復旧 STEP {player.index + 1} / {steps.length}
            </p>
            <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="bcp-step-title">
              {step.title}
            </p>
          </div>
          <RecoveryBar on={on} upTo={Math.max(0, player.index)} />
          <SceneTimeline
            index={player.index}
            steps={steps}
            playing={player.playing}
            reducedMotion={reducedMotion}
            onMove={player.move}
            onTogglePlay={player.togglePlay}
            playLabel="復旧の流れを再生"
            timelineLabel="復旧の流れのタイムライン"
            startCaption="災害発生"
            endCaption="営業再開"
          />
          {done && (
            <>
              {/* 総合結果 */}
              <div className={`rounded-xl px-4 py-3 text-center ring-1 ${verdictTone}`} data-testid="bcp-verdict">
                <div className="text-xs font-bold opacity-70">営業再開まで</div>
                <div className="mt-0.5 text-lg font-bold">{verdict.days}</div>
                <p className="mt-1 text-xs font-medium leading-relaxed">{verdict.note}</p>
              </div>
            </>
          )}
          <button onClick={retry} className="w-full rounded-xl py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 transition active:scale-95">
            ↺ 備えを選び直してもう一度
          </button>
        </div>
      )}
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "データを毎日、別拠点にもバックアップしておく", ok: true, why: "止めない備え＝BCPらしい行動。" },
  { t: "災害が起きてから初めて対応を考える", ok: false, why: "BCPは事前準備。起きてからでは遅い。" },
  { t: "本社が被災したときの代替オフィスを決めておく", ok: true, why: "代替拠点の準備＝BCPの基本。" },
  { t: "バックアップさえあれば連絡手順は不要", ok: false, why: "復旧には連絡・体制も必要。データだけでは足りない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>BCPの備えとして正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "正しい" },
                  { v: false, label: "ちがう" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : "残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function BcpExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>BCP（事業継続計画）</b>は、災害や事故が起きても<b>重要な仕事を止めない・早く再開する</b>ための計画。
        カギは「起きる前の備え」です。
      </div>

      <Lab />
      <Quiz />
    </div>
  );
}
