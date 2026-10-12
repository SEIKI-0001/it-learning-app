"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  DEVICE_NAME,
  DNS_ADDRESS,
  FIXED_DEVICES,
  PLACEABLE,
  TESTS,
  canConnect,
  connect,
  disconnect,
  initialState,
  kindOf,
  neighbors,
  portLabel,
  portRole,
  removeDevice,
  runTest,
  simulate,
  type DeviceId,
  type DnsChoice,
  type LabState,
  type PlaceableKind,
  type TestId,
  type TestResult,
} from "@/lib/netlab/engine";
import { slotById } from "@/lib/netlab/layout";
import { MISSIONS, autoPlace, freeSlotFor, missionDone, nextCheck, type CheckAction, type FocusField } from "@/lib/netlab/missions";
import { ROLE_CARDS } from "@/lib/netlab/roles";
import OfficeScene, { type SceneHint, type Trace } from "./OfficeScene";

// ネットワーク構築ラボ（プロトタイプ）。
// 操作の手数と、見るものの量を減らす方針：
//   - 置く：パレット（または「次にやること」）→ 役割カードで役割を読み、1問に正解したら決まった場所へ置く
//   - つなぐ：模型の名札から名札へドラッグ。次につなぐ2つの間には「ドラッグの見本」が動く
//   - 次に何をするか：模型の右上（スマホは上）の「次にやること」が、どこをどう操作するかを1行で言う
//   - いまのミッションに関係ない名札・外の人物・パレットの機器・設定欄は出さない
//   - ミッションを達成した瞬間にテストの小包を自動で流す
// 進み具合はこの端末の localStorage にだけ残す（ログイン不要の試作なので）。

const STORAGE_KEY = "netlab:v1";
const LEARNED_KEY = "netlab:learned:v1";

const PALETTE_NOTE: Record<PlaceableKind, string> = {
  switch: "LAN の機器をまとめる",
  router: "社内と外の出入口",
  fileServer: "社内の共有フォルダ",
  ap: "無線LANの親機",
  firewall: "通す通信を選ぶ",
  webServer: "自社サイトを公開",
};

/** 「開く」で連れていく設定欄で、何をすればよいかの一言 */
const FOCUS_TODO: Record<FocusField, string> = {
  "router.dhcp": "設定パネルで「DHCP サーバ」をオンにする",
  "router.range": "設定パネルで DHCP の配布範囲を直す",
  "router.dns": "設定パネルで「DNS サーバ」を1つ選ぶ",
  "router.nat": "設定パネルで「NAT」をオンにする",
  "file.ip": "設定パネルで固定 IP アドレスを配布範囲の外にする",
  "ap.security": "設定パネルで暗号化を WPA2 か WPA3 にする",
  "fw.rules": "設定パネルで「外 → DMZ の 443」だけをオンにする",
};

/** 設定欄を出し始めるミッション（それより前は出さない＝見るものを減らす） */
const FIELD_FROM: Record<FocusField, number> = {
  "router.dhcp": 1,
  "router.dns": 2,
  "router.nat": 2,
  "router.range": 3,
  "file.ip": 3,
  "ap.security": 4,
  "fw.rules": 5,
};

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても遊べる
  }
}

function loadState(): LabState | null {
  const saved = readJson<LabState>(STORAGE_KEY);
  if (!saved) return null;
  // 端末が4台だった頃の保存データから、今はない機器への配線を落とす
  const known = new Set<string>([...FIXED_DEVICES, ...PLACEABLE]);
  return {
    ...initialState(),
    ...saved,
    links: (saved.links ?? []).filter((l) => known.has(l.a) && known.has(l.b)),
  };
}

const firstOpenMission = (s: LabState) => {
  const i = MISSIONS.findIndex((m) => !missionDone(m, s));
  return i < 0 ? MISSIONS.length - 1 : i;
};

export default function NetLab() {
  // ブラウザでだけ描く（NetLabClient が ssr:false で読む）ので、保存した進み具合を最初から使える
  const [state, setState] = useState<LabState>(() => loadState() ?? initialState());
  const [learned, setLearned] = useState<PlaceableKind[]>(() => readJson<PlaceableKind[]>(LEARNED_KEY) ?? []);
  const [selected, setSelected] = useState<DeviceId | null>(null);
  const [focus, setFocus] = useState<FocusField | null>(null);
  const [roleKind, setRoleKind] = useState<PlaceableKind | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [log, setLog] = useState<(TestResult & { key: number })[]>([]);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "info" | "ng" | "ok";
  } | null>(null);
  const [missionIdx, setMissionIdx] = useState(() => firstOpenMission(state));
  const traceKey = useRef(0);

  // 「その他」から来たとき、前のページのスクロール位置のまま開かないよう先頭に戻す（模型は後から読み込むので Next の自動スクロールが効かない）
  useEffect(() => window.scrollTo(0, 0), []);
  useEffect(() => writeJson(STORAGE_KEY, state), [state]);
  useEffect(() => writeJson(LEARNED_KEY, learned), [learned]);

  const sim = useMemo(() => simulate(state), [state]);
  const mission = MISSIONS[missionIdx];
  const checks = mission.checks(state);
  const next = nextCheck(mission, state);
  const done = MISSIONS.map((m) => missionDone(m, state));
  const allDone = done.every(Boolean);
  const action = next?.action;

  // 模型の上での「次の操作」の見せ方
  const hint: SceneHint = !action
    ? null
    : action.wire
      ? { wire: action.wire }
      : action.place
        ? {
            place: {
              kind: action.place,
              slot: freeSlotFor(state, action.place) ?? "",
            },
          }
        : action.focus && selected !== action.focus.device
          ? { select: action.focus.device }
          : action.run && action.highlight && selected !== action.highlight[0]
            ? { select: action.highlight[0] }
            : null;

  function play(s: LabState, id: TestId) {
    const result = runTest(s, id);
    traceKey.current += 1;
    const key = traceKey.current;
    setTrace({ key, result });
    setLog((l) => [{ ...result, key }, ...l].slice(0, 8));
  }

  /** state を変える操作はすべてここを通す。ミッションを達成した瞬間は、そのテストを自動で流して見せる */
  function update(nextState: LabState, message?: string) {
    const justDone = MISSIONS.findIndex((m, i) => !done[i] && missionDone(m, nextState));
    setState(nextState);
    if (justDone >= 0) {
      const m = MISSIONS[justDone];
      if (m.tests[0]) play(nextState, m.tests[0]);
      else setTrace(null);
      setMissionIdx(justDone);
      setFocus(null);
      setNotice({
        text: `ミッション達成：${m.title.replace(/^\d+\.\s*/, "")}。小包の流れで確かめてみましょう。`,
        tone: "ok",
      });
      return;
    }
    setTrace(null);
    if (message) setNotice({ text: message, tone: "info" });
  }

  /** 役割カードを開く（置き場所がなければ断る） */
  function askPlace(kind: PlaceableKind) {
    if (!freeSlotFor(state, kind)) {
      setNotice({
        text: "置き場所が空いていません。ほかの機器を片付けてください。",
        tone: "ng",
      });
      return;
    }
    setRoleKind(kind);
  }

  function confirmPlace(kind: PlaceableKind) {
    setRoleKind(null);
    setLearned((l) => (l.includes(kind) ? l : [...l, kind]));
    update(autoPlace(state, kind), `${DEVICE_NAME[kind]}を置きました。`);
    setSelected(kind);
    setFocus(null);
  }

  function wire(a: DeviceId, b: DeviceId) {
    const c = canConnect(state, a, b);
    if (!c.ok) {
      setNotice({ text: c.reason, tone: "ng" });
      return;
    }
    update(connect(state, a, b), `${DEVICE_NAME[a]}（${portLabel(c.roleA)}）と ${DEVICE_NAME[b]}（${portLabel(c.roleB)}）をつなぎました。`);
  }

  function doAction(a: CheckAction) {
    if (a.place) return askPlace(a.place);
    if (a.run) {
      update(
        a.run(state),
        a.wire ? `${DEVICE_NAME[a.wire[0]]}と${DEVICE_NAME[a.wire[1]]}をつなぎました。` : `${a.label.replace(/を外す$/, "を外しました")}。`,
      );
    } else if (a.focus) {
      setSelected(a.focus.device);
      setFocus(a.focus.field);
    } else if (a.test) {
      play(state, a.test);
    }
  }

  function reset() {
    setState(initialState());
    setSelected(null);
    setFocus(null);
    setTrace(null);
    setLog([]);
    setMissionIdx(0);
    setNotice(null);
  }

  function solve() {
    let s = state;
    for (const m of MISSIONS.slice(0, missionIdx + 1)) s = m.solve(s);
    update(s, `「${mission.title}」の完成形にしました。`);
  }

  // パレットに出す機器：置いた物と、いま置くべき物だけ（全ミッション達成後は全部）
  const paletteKinds = PLACEABLE.filter((k) => allDone || state.placed[k] || action?.place === k);
  // 設定欄は、いまのミッションまでに使うものだけ出す
  const fieldLevel = allDone ? MISSIONS.length : missionIdx;

  const guide = (
    <GuideCard
      missionIdx={missionIdx}
      done={done[missionIdx]}
      next={next}
      selected={selected}
      onAction={doAction}
      onNextMission={() => {
        setMissionIdx(Math.min(MISSIONS.length - 1, missionIdx + 1));
        setSelected(null);
        setFocus(null);
        setTrace(null);
        setNotice(null);
      }}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 lg:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/more" className="text-xs font-semibold text-gray-500 hover:text-gray-700">
            ← その他へ戻る
          </Link>
          <p className="mt-2 text-xs font-semibold tracking-wide text-brand-600">β版 ・ ネットワークを作って学ぶ</p>
          <h1 className="text-2xl font-bold text-gray-900">オフィスネットワーク構築ラボ</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          最初からやり直す
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 右の列を読み進めても、模型（テストの小包）はいつも見えているようにする */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="relative">
            <OfficeScene
              state={state}
              sim={sim}
              selected={selected}
              hint={hint}
              visible={allDone ? null : mission.focus}
              externals={allDone ? ["internet", "customer", "attacker", "outsider"] : mission.externals}
              trace={trace}
              guide={guide}
              checkWire={(a, b) => canConnect(state, a, b)}
              onConnect={wire}
              onSelect={(id) => {
                setSelected(id);
                setFocus(null);
              }}
            />
            {roleKind && (
              <RoleDialog
                kind={roleKind}
                learned={learned.includes(roleKind)}
                where={slotById(freeSlotFor(state, roleKind) ?? "")?.label ?? ""}
                onPlace={() => confirmPlace(roleKind)}
                onClose={() => setRoleKind(null)}
              />
            )}
          </div>

          {notice && (
            <div
              role="status"
              className={`rounded-lg px-3 py-2 text-sm ${
                notice.tone === "ng"
                  ? "bg-rose-50 text-rose-800"
                  : notice.tone === "ok"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {notice.text}
            </div>
          )}

          {paletteKinds.length > 0 && (
            <section aria-label="機器を置く" className="flex flex-wrap gap-2">
              {paletteKinds.map((k) => {
                const isPlaced = !!state.placed[k];
                const suggested = action?.place === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (!isPlaced) return askPlace(k);
                      setSelected(k);
                      setFocus(null);
                    }}
                    data-testid={`palette-${k}`}
                    className={`relative min-w-[140px] flex-1 rounded-lg border px-3 py-2 text-left transition sm:flex-none ${
                      isPlaced
                        ? "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        : suggested
                          ? "border-accent-500 bg-accent-50 shadow-[0_0_0_3px_rgba(224,138,52,0.18)] hover:bg-accent-100"
                          : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    {suggested && (
                      <span className="absolute -top-2.5 right-2 rounded bg-accent-500 px-1.5 text-[10px] font-bold text-white">
                        ここを押す
                      </span>
                    )}
                    <span className={`block text-sm font-semibold ${isPlaced ? "text-gray-400" : "text-gray-900"}`}>
                      {isPlaced ? "✓ " : "＋ "}
                      {DEVICE_NAME[k]}
                    </span>
                    <span className="block text-[11px] text-gray-500">{isPlaced ? "設置済み" : PALETTE_NOTE[k]}</span>
                  </button>
                );
              })}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
          {/* ミッション */}
          <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="mission-h">
            <div className="mb-3 flex gap-1.5" role="tablist" aria-label="ミッション">
              {MISSIONS.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={i === missionIdx}
                  aria-label={`${m.title}${done[i] ? "（達成）" : ""}`}
                  onClick={() => {
                    setMissionIdx(i);
                    setFocus(null);
                  }}
                  className={`h-7 flex-1 rounded-md text-xs font-bold transition ${
                    i === missionIdx
                      ? "bg-gray-900 text-white"
                      : done[i]
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {done[i] ? "✓" : i + 1}
                </button>
              ))}
            </div>
            <h2 id="mission-h" className="text-base font-bold text-gray-900">
              {mission.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{mission.story}</p>
            <ol className="mt-3 space-y-0.5" data-testid="mission-checks">
              {checks.map((c) => {
                const isNext = c === next;
                return (
                  <li
                    key={c.label}
                    className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-sm ${isNext ? "bg-accent-50 font-semibold" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        c.ok ? "bg-emerald-500 text-white" : isNext ? "border-2 border-accent-500" : "border border-gray-300"
                      }`}
                    >
                      {c.ok ? "✓" : ""}
                    </span>
                    <span className={c.ok ? "text-gray-400" : isNext ? "text-gray-900" : "text-gray-500"}>{c.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
              <span>用語：{mission.terms.join("・")}</span>
              {!done[missionIdx] && (
                <button type="button" className="shrink-0 underline" onClick={solve}>
                  答えを見る
                </button>
              )}
            </div>
          </section>

          {selected && (
            <Inspector
              state={state}
              sim={sim}
              id={selected}
              focus={focus}
              level={fieldLevel}
              onWire={wire}
              onDisconnect={(a, b) => update(disconnect(state, a, b), `${DEVICE_NAME[a]}と${DEVICE_NAME[b]}のケーブルを外しました。`)}
              onRemove={(k) => {
                update(removeDevice(state, k), `${DEVICE_NAME[k]}を片付けました。`);
                setSelected(null);
              }}
              onClose={() => {
                setSelected(null);
                setFocus(null);
              }}
              onChange={(s) => update(s)}
            />
          )}

          {/* 自由に試すテストと記録。最初は出さない（ミッションのテストはガイドから流れる） */}
          {(log.length > 0 || allDone) && (
            <details className="rounded-xl border border-gray-200 bg-white p-4" open={log.length > 0}>
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">テストの記録</summary>
              {allDone && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {TESTS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => play(state, t.id)}
                      data-testid={`test-${t.id}`}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 transition hover:border-gray-400"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
              {log.length > 0 && (
                <ol
                  className="mt-3 space-y-2 rounded-lg bg-gray-950 p-3 font-mono text-[12px] leading-relaxed text-gray-200"
                  data-testid="test-log"
                >
                  {log.map((r) => (
                    <li key={r.key} className="border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                      <div className={`font-bold ${r.ok ? "text-emerald-400" : "text-rose-400"}`}>
                        {r.ok ? "OK " : "NG "} {r.title}
                      </div>
                      {r.steps.map((s, i) => (
                        <div key={i} className={s.ok ? "text-gray-300" : "text-rose-300"}>
                          {s.ok ? "  ✓ " : "  ✕ "}
                          {s.text}
                        </div>
                      ))}
                    </li>
                  ))}
                </ol>
              )}
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}

/** 機器を置く前の役割カード。役割を読んで1問に正解したら置ける（一度正解した機器は確認なしで置ける） */
function RoleDialog({
  kind,
  learned,
  where,
  onPlace,
  onClose,
}: {
  kind: PlaceableKind;
  learned: boolean;
  where: string;
  onPlace: () => void;
  onClose: () => void;
}) {
  const card = ROLE_CARDS[kind];
  const [picked, setPicked] = useState<number[]>([]);
  const correct = learned || picked.includes(card.answer);
  const wrong = !correct && picked.length > 0;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center rounded-[18px] bg-gray-950/35 p-3"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-h"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        data-testid="role-dialog"
      >
        <p className="text-[11px] font-semibold text-accent-700">置く前に、役割を確認しよう</p>
        <h2 id="role-h" className="mt-0.5 text-lg font-bold text-gray-900">
          {DEVICE_NAME[kind]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-800">{card.role}</p>
        <dl className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm">
          <div>
            <dt className="text-[11px] font-semibold text-gray-500">たとえると</dt>
            <dd className="text-gray-800">{card.analogy}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-gray-500">つなぐ先</dt>
            <dd className="text-gray-800">{card.connects}</dd>
          </div>
        </dl>

        {!learned && (
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-900">{card.question}</p>
            <div className="mt-2 space-y-1.5" role="group" aria-label={card.question}>
              {card.choices.map((c, i) => {
                const isPicked = picked.includes(i);
                const isRight = i === card.answer;
                return (
                  <button
                    key={c}
                    ref={i === 0 ? first : undefined}
                    type="button"
                    disabled={correct || isPicked}
                    onClick={() => setPicked((p) => [...p, i])}
                    data-testid={`role-choice-${i}`}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      isPicked && isRight
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : isPicked
                          ? "border-rose-200 bg-rose-50 text-rose-400 line-through"
                          : "border-gray-200 text-gray-800 hover:border-gray-400 disabled:opacity-50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {wrong && <p className="mt-2 text-xs text-rose-700">ちがいます。上の役割をもう一度読んで、選び直してみよう。</p>}
            {correct && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-900">正解。{card.why}</p>}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            ref={learned ? first : undefined}
            type="button"
            disabled={!correct}
            onClick={onPlace}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:bg-gray-200 disabled:text-gray-400"
            data-testid="role-place"
          >
            {correct ? `${where}に置く` : "正解すると置けます"}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 underline">
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}

/** 模型の右上（スマホでは上）に出す「次にやること」。どこをどう操作するかを1行で言い、ボタン1つで手伝う */
function GuideCard({
  missionIdx,
  done,
  next,
  selected,
  onAction,
  onNextMission,
}: {
  missionIdx: number;
  done: boolean;
  next: ReturnType<typeof nextCheck>;
  selected: DeviceId | null;
  onAction: (a: CheckAction) => void;
  onNextMission: () => void;
}) {
  const last = missionIdx === MISSIONS.length - 1;
  const a = next?.action;
  // 「どこを・どう操作するか」の一言
  let howTo: ReactNode = null;
  if (a?.place)
    howTo = (
      <>
        下の［{DEVICE_NAME[a.place]}
        ］ボタンを押して、役割を確認してから置きます。
      </>
    );
  else if (a?.wire)
    howTo = (
      <>
        模型の<b>［{DEVICE_NAME[a.wire[0]]}］</b>の名札をつかんで、
        <b>［{DEVICE_NAME[a.wire[1]]}］</b>の名札まで引っぱって離す。
      </>
    );
  else if (a?.focus)
    howTo =
      selected === a.focus.device ? (
        FOCUS_TODO[a.focus.field]
      ) : (
        <>
          模型の［{DEVICE_NAME[a.focus.device]}］の名札を押して、
          {FOCUS_TODO[a.focus.field].replace("設定パネルで", "")}。
        </>
      );
  else if (a?.run && a.highlight)
    howTo = (
      <>
        ［{DEVICE_NAME[a.highlight[0]]}
        ］の名札を押し、設定パネルの「ケーブル」から外します。
      </>
    );
  else if (a?.test) howTo = "ボタンを押すと、模型の中を小包が流れます。";

  // 主ボタン：置く・設定・テストは押させる。つなぐは自分でドラッグしてほしいので控えめに
  const primary =
    a &&
    (a.place
      ? `${DEVICE_NAME[a.place]}の役割を見る`
      : a.focus
        ? selected === a.focus.device
          ? null
          : "設定を開く"
        : a.test
          ? "テストして確かめる"
          : a.wire
            ? null
            : a.label);

  return (
    <div
      className="w-[280px] rounded-xl bg-white/95 p-3 text-left shadow-[0_6px_20px_rgba(15,23,42,0.14)] ring-1 ring-black/5 max-sm:w-full"
      data-no-drag=""
      data-testid="guide"
    >
      {done ? (
        <>
          <p className="text-[11px] font-semibold text-emerald-700">ミッション {missionIdx + 1} 達成</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            {last ? "オフィスのネットワークが完成しました" : "次のミッションへ進もう"}
          </p>
          {!last && (
            <button
              type="button"
              onClick={onNextMission}
              className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              data-testid="guide-next"
            >
              ミッション {missionIdx + 2} へ
            </button>
          )}
        </>
      ) : next ? (
        <>
          <p className="text-[11px] font-semibold text-accent-700">次にやること</p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900">{next.label}</p>
          {howTo && <p className="mt-1.5 rounded-md bg-accent-50 px-2 py-1.5 text-xs leading-relaxed text-gray-800">{howTo}</p>}
          {next.hint && <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{next.hint}</p>}
          {a && primary && (
            <button
              type="button"
              onClick={() => onAction(a)}
              className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              data-testid="guide-action"
            >
              {primary}
            </button>
          )}
          {a?.wire && (
            <button
              type="button"
              onClick={() => onAction(a)}
              className="mt-1.5 text-[11px] text-gray-500 underline"
              data-testid="guide-action"
            >
              ドラッグが難しいときは、ボタンでつなぐ
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

function Spot({ on, children }: { on: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (on) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [on]);
  return (
    <div ref={ref} className={`-mx-2 rounded-lg px-2 transition ${on ? "bg-accent-50 ring-2 ring-accent-400" : ""}`}>
      {children}
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
  note,
  testId,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  note?: string;
  testId?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-800">
        {label}
        {note && <span className="block text-[11px] text-gray-500">{note}</span>}
      </span>
      {/* 大きめのスイッチ（チェックボックスより押しやすい） */}
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
        <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Field({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-gray-800">{label}</span>
      <input
        className="w-36 rounded-md border border-gray-300 px-2 py-1 font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        data-testid={testId}
      />
    </label>
  );
}

/** 選択肢を横並びのボタンで（プルダウンを開く手間をなくす） */
function Choice<T extends string>({
  label,
  note,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  note?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testId?: string;
}) {
  return (
    <div className="py-1.5" role="radiogroup" aria-label={label} data-testid={testId}>
      <p className="text-sm text-gray-800">
        {label}
        {note && <span className="ml-1 text-[11px] text-gray-500">{note}</span>}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            data-value={o.value}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              value === o.value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Inspector({
  state,
  sim,
  id,
  focus,
  level,
  onWire,
  onDisconnect,
  onRemove,
  onClose,
  onChange,
}: {
  state: LabState;
  sim: ReturnType<typeof simulate>;
  id: DeviceId;
  focus: FocusField | null;
  /** いまのミッション番号（0始まり）。それまでに使う設定欄だけ出す */
  level: number;
  onWire: (a: DeviceId, b: DeviceId) => void;
  onDisconnect: (a: DeviceId, b: DeviceId) => void;
  onRemove: (k: PlaceableKind) => void;
  onClose: () => void;
  onChange: (s: LabState) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  // PC（右の列が独立スクロール）のときだけ、選んだ機器の設定を見える位置へ。
  // スマホでは画面ごと流れて模型（ドラッグの見本）が見えなくなるので動かさない
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [id]);
  const show = (f: FocusField) => focus === f || FIELD_FROM[f] <= level;
  const k = kindOf(id);
  const h = sim.hosts[id];
  const ns = neighbors(state, id);
  const removable = (PLACEABLE as string[]).includes(id);
  const r = state.router;
  const setRouter = (patch: Partial<typeof r>) => onChange({ ...state, router: { ...r, ...patch } });
  const present = (d: DeviceId) => FIXED_DEVICES.includes(d) || state.placed[d as PlaceableKind] !== undefined;
  const targets = ([...FIXED_DEVICES, ...PLACEABLE] as DeviceId[]).filter((d) => present(d) && canConnect(state, id, d).ok);

  return (
    <section
      ref={ref}
      className="scroll-mt-4 rounded-xl border border-gray-200 bg-white p-4"
      aria-labelledby="inspector-h"
      data-testid="inspector"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="inspector-h" className="text-base font-bold text-gray-900">
          {DEVICE_NAME[id]}
        </h2>
        <div className="flex items-center gap-3">
          {removable && (
            <button type="button" className="text-xs text-gray-500 underline" onClick={() => onRemove(id as PlaceableKind)}>
              片付ける
            </button>
          )}
          <button
            type="button"
            className="text-lg leading-none text-gray-400 hover:text-gray-700"
            onClick={onClose}
            aria-label="設定を閉じる"
          >
            ×
          </button>
        </div>
      </div>

      {(k === "pc" || k === "laptop" || k === "fileServer" || k === "webServer") && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-gray-50 p-2.5 text-sm">
          <dt className="text-gray-500">IP アドレス</dt>
          <dd className={`font-mono ${h?.conflict ? "text-rose-600" : "text-gray-900"}`}>
            {h?.ip ?? "なし"}
            {h?.conflict && "（重複）"}
          </dd>
          {h?.source === "dhcp" && (
            <>
              <dt className="text-gray-500">ゲートウェイ</dt>
              <dd className="font-mono text-gray-900">{r.lanIp}</dd>
              <dt className="text-gray-500">DNS</dt>
              <dd className="text-gray-900">{r.dns ? DNS_ADDRESS[r.dns] : "未設定"}</dd>
            </>
          )}
          {h?.problem && <dd className="col-span-2 text-xs text-accent-700">{h.problem}</dd>}
        </dl>
      )}

      {k === "router" && (
        <div className="mt-2 divide-y divide-gray-100">
          {!show("router.dhcp") && <p className="py-1.5 text-sm text-gray-600">社内と外をつなぐ出入口。設定は次のミッションで使います。</p>}
          {show("router.dhcp") && (
            <Spot on={focus === "router.dhcp"}>
              <Toggle
                label="DHCP サーバ"
                note="LAN の機器に IP アドレスを自動で配る"
                on={r.dhcp}
                onChange={(v) => setRouter({ dhcp: v })}
                testId="router-dhcp"
              />
            </Spot>
          )}
          {show("router.dns") && (
            <Spot on={focus === "router.dns"}>
              <Choice<DnsChoice>
                label="DNS サーバ"
                note="名前 → IP アドレスに変える先"
                value={r.dns}
                onChange={(v) => setRouter({ dns: v })}
                testId="router-dns"
                options={[
                  { value: "", label: "未設定" },
                  { value: "router", label: "ルータに任せる" },
                  { value: "isp", label: "プロバイダ" },
                  { value: "public", label: "8.8.8.8" },
                ]}
              />
            </Spot>
          )}
          {show("router.nat") && (
            <Spot on={focus === "router.nat"}>
              <Toggle
                label="NAT"
                note="外へ出るとき、プライベート IP をグローバル IP に付け替える"
                on={r.nat}
                onChange={(v) => setRouter({ nat: v })}
              />
            </Spot>
          )}
          {(show("router.range") || !!sim.dhcpProblem) && (
            <Spot on={focus === "router.range"}>
              <details open={focus === "router.range" || !!sim.dhcpProblem} className="py-1.5">
                <summary className="cursor-pointer text-xs text-gray-500">アドレスの詳細設定</summary>
                <Field label="LAN 側 IP アドレス" value={r.lanIp} onChange={(v) => setRouter({ lanIp: v })} testId="router-lanip" />
                <Field label="配布範囲（始め）" value={r.dhcpStart} onChange={(v) => setRouter({ dhcpStart: v })} />
                <Field label="配布範囲（終わり）" value={r.dhcpEnd} onChange={(v) => setRouter({ dhcpEnd: v })} />
                {sim.dhcpProblem && <p className="py-1 text-xs text-rose-600">{sim.dhcpProblem}</p>}
                <p className="pt-1 text-[11px] text-gray-500">サブネットマスクは 255.255.255.0（/24）固定。</p>
              </details>
            </Spot>
          )}
        </div>
      )}

      {k === "fileServer" && (
        <Spot on={focus === "file.ip"}>
          <div className="mt-2">
            <Field
              label="固定 IP アドレス"
              value={state.fileServer.ip}
              onChange={(v) => onChange({ ...state, fileServer: { ip: v } })}
              testId="file-ip"
            />
            <div className="flex flex-wrap items-center gap-1 pb-1.5">
              <span className="text-[11px] text-gray-500">候補：</span>
              {["192.168.1.10", "192.168.1.150", "192.168.2.10"].map((ip) => (
                <button
                  key={ip}
                  type="button"
                  className="rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 hover:border-gray-400"
                  onClick={() => onChange({ ...state, fileServer: { ip } })}
                  data-testid={`file-ip-${ip}`}
                >
                  {ip}
                </button>
              ))}
            </div>
            {r.dhcp && (
              <p className="pb-1 text-[11px] text-gray-500">
                DHCP の配布範囲：{r.dhcpStart} 〜 {r.dhcpEnd}
              </p>
            )}
          </div>
        </Spot>
      )}

      {k === "ap" && (
        <Spot on={focus === "ap.security"}>
          <Choice
            label="暗号化"
            value={state.ap.security}
            onChange={(v) => onChange({ ...state, ap: { ...state.ap, security: v } })}
            testId="ap-security"
            options={[
              { value: "none", label: "なし" },
              { value: "wpa2", label: "WPA2" },
              { value: "wpa3", label: "WPA3" },
            ]}
          />
        </Spot>
      )}

      {k === "firewall" && (
        <Spot on={focus === "fw.rules"}>
          <div className="mt-1 divide-y divide-gray-100">
            <Toggle
              label="社内 → インターネット"
              note="社員が外のサイトを見る"
              on={state.firewall.outbound}
              onChange={(v) =>
                onChange({
                  ...state,
                  firewall: { ...state.firewall, outbound: v },
                })
              }
            />
            <Toggle
              label="外 → DMZ の 443（HTTPS）"
              note="お客さんが自社サイトを見る口"
              on={state.firewall.inHttps}
              onChange={(v) =>
                onChange({
                  ...state,
                  firewall: { ...state.firewall, inHttps: v },
                })
              }
              testId="fw-https"
            />
            <Toggle
              label="外 → DMZ の全ポート"
              note="SSH（22）など管理用の口まで開く"
              on={state.firewall.inOther}
              onChange={(v) =>
                onChange({
                  ...state,
                  firewall: { ...state.firewall, inOther: v },
                })
              }
            />
            <p className="py-1.5 text-[11px] text-gray-500">外 → 社内 LAN は常に拒否</p>
          </div>
        </Spot>
      )}

      {k === "onu" && <p className="mt-2 text-sm text-gray-600">光回線の終端装置。ここから先がプロバイダ（インターネット）です。</p>}
      {k === "switch" && <p className="mt-2 text-sm text-gray-600">8口。つないだ機器を1つの LAN にまとめます。</p>}

      {/* ケーブル：つながっている相手と、ワンタップでつなげる相手 */}
      {k !== "laptop" ? (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <h3 className="mb-1.5 text-xs font-semibold text-gray-500">ケーブル</h3>
          {ns.length > 0 && (
            <ul className="mb-2 space-y-1">
              {ns.map((n) => (
                <li key={n} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-1.5 rounded bg-gray-100 px-1 font-mono text-[10px] text-gray-600">
                      {portLabel(portRole(id, n))}
                    </span>
                    {DEVICE_NAME[n]}
                  </span>
                  <button type="button" className="text-xs text-gray-500 underline" onClick={() => onDisconnect(id, n)}>
                    外す
                  </button>
                </li>
              ))}
            </ul>
          )}
          {targets.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-gray-500">つなぐ：</span>
              {targets.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs text-brand-800 hover:bg-brand-100"
                  onClick={() => onWire(id, t)}
                  data-testid={`wire-${t}`}
                >
                  ＋ {DEVICE_NAME[t]}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">つなげる相手がありません（ポートが空いていないか、相手がまだ置かれていない）。</p>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
          {sim.wifiJoined ? `無線AP「${state.ap.ssid}」に接続しています。` : "無線で接続します。LAN に無線APを置いてください。"}
        </p>
      )}
    </section>
  );
}
