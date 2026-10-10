"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { MISSIONS, autoPlace, freeSlotFor, missionDone, nextCheck, type CheckAction, type FocusField } from "@/lib/netlab/missions";
import OfficeScene, { type Trace } from "./OfficeScene";

// ネットワーク構築ラボ（プロトタイプ）。
// 操作の手数を減らす方針：
//   - 置く：パレットを押すだけ（決まった置き場所へ自動で置く）
//   - つなぐ：模型の名札から名札へドラッグ（選んだ機器の設定欄からワンタップでも可）
//   - 次に何をするか：模型の右上の「次にやること」が教え、ボタン1つでそこへ連れていく
//   - 確かめる：ミッションを達成した瞬間にテストの小包を自動で流す
// 進み具合はこの端末の localStorage にだけ残す（ログイン不要の試作なので）。

const STORAGE_KEY = "netlab:v1";

const PALETTE_NOTE: Record<PlaceableKind, string> = {
  switch: "LAN の機器をまとめる",
  router: "社内と外の出入口",
  fileServer: "社内の共有フォルダ",
  ap: "無線LANの親機",
  firewall: "通す通信を選ぶ",
  webServer: "自社サイトを公開",
};

function loadState(): LabState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...initialState(), ...(JSON.parse(raw) as LabState) };
  } catch {
    return null;
  }
}

const firstOpenMission = (s: LabState) => {
  const i = MISSIONS.findIndex((m) => !missionDone(m, s));
  return i < 0 ? MISSIONS.length - 1 : i;
};

export default function NetLab() {
  // ブラウザでだけ描く（NetLabClient が ssr:false で読む）ので、保存した進み具合を最初から使える
  const [state, setState] = useState<LabState>(() => loadState() ?? initialState());
  const [selected, setSelected] = useState<DeviceId | null>(null);
  const [focus, setFocus] = useState<FocusField | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [log, setLog] = useState<(TestResult & { key: number })[]>([]);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "ng" | "ok" } | null>(null);
  const [missionIdx, setMissionIdx] = useState(() => firstOpenMission(state));
  const traceKey = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 保存できなくても遊べる
    }
  }, [state]);

  const sim = useMemo(() => simulate(state), [state]);
  const mission = MISSIONS[missionIdx];
  const checks = mission.checks(state);
  const next = nextCheck(mission, state);
  const done = MISSIONS.map((m) => missionDone(m, state));

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
      play(nextState, m.tests[0]);
      setMissionIdx(justDone);
      setNotice({ text: `ミッション達成：${m.title.replace(/^\d+\.\s*/, "")}。小包の流れで確かめてみましょう。`, tone: "ok" });
      return;
    }
    setTrace(null);
    if (message) setNotice({ text: message, tone: "info" });
  }

  function placeDevice(kind: PlaceableKind) {
    if (!freeSlotFor(state, kind)) {
      setNotice({ text: "置き場所が空いていません。ほかの機器を片付けてください。", tone: "ng" });
      return;
    }
    update(autoPlace(state, kind), `${DEVICE_NAME[kind]}を置きました。名札をほかの機器の名札へドラッグすると、ケーブルをつなげます。`);
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
    if (a.run) {
      const before = new Set(Object.keys(state.placed));
      const after = a.run(state);
      const added = (Object.keys(after.placed) as PlaceableKind[]).find((k) => !before.has(k));
      update(after, added ? `${DEVICE_NAME[added]}を置きました。` : `${a.label.replace(/をつなぐ$/, "をつなぎました").replace(/を外す$/, "を外しました")}。`);
      if (added) setSelected(added);
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
    setNotice({ text: "最初からやり直します。", tone: "info" });
  }

  function solve() {
    let s = state;
    for (const m of MISSIONS.slice(0, missionIdx + 1)) s = m.solve(s);
    update(s, `「${mission.title}」の完成形にしました。`);
  }

  const guide = (
    <GuideCard
      missionIdx={missionIdx}
      done={done[missionIdx]}
      next={next}
      onAction={doAction}
      onNextMission={() => setMissionIdx(Math.min(MISSIONS.length - 1, missionIdx + 1))}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 lg:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600">プロトタイプ ・ テスト環境</p>
          <h1 className="text-2xl font-bold text-gray-900">オフィスネットワーク構築ラボ</h1>
          <p className="mt-1 text-sm text-gray-600">
            機器を置いて、名札から名札へドラッグしてケーブルをつなぐ。迷ったら「次にやること」のボタンを押すだけで進めます。
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          最初からやり直す
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 右の列を読み進めても、模型（テストの小包）はいつも見えているようにする */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <OfficeScene
            state={state}
            sim={sim}
            selected={selected}
            highlight={next?.action?.highlight ?? []}
            trace={trace}
            guide={guide}
            checkWire={(a, b) => canConnect(state, a, b)}
            onConnect={wire}
            onSelect={(id) => {
              setSelected(id);
              setFocus(null);
            }}
          />

          {notice && (
            <div
              role="status"
              className={`rounded-lg px-3 py-2 text-sm ${
                notice.tone === "ng" ? "bg-rose-50 text-rose-800" : notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {notice.text}
            </div>
          )}

          <section aria-label="機器を置く" className="grid grid-cols-3 gap-2 xl:grid-cols-6">
            {PLACEABLE.map((k) => {
              const isPlaced = !!state.placed[k];
              const suggested = !isPlaced && next?.action?.run && next.action.label === `${DEVICE_NAME[k]}を置く`;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (!isPlaced) return placeDevice(k);
                    setSelected(k);
                    setFocus(null);
                  }}
                  data-testid={`palette-${k}`}
                  className={`rounded-lg border px-2.5 py-2 text-left transition ${
                    isPlaced
                      ? "border-gray-100 bg-gray-50 hover:bg-gray-100"
                      : suggested
                        ? "border-accent-400 bg-accent-50 hover:bg-accent-100"
                        : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${isPlaced ? "text-gray-400" : "text-gray-900"}`}>
                    {isPlaced ? "✓ " : "＋ "}
                    {DEVICE_NAME[k]}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">{isPlaced ? "設置済み（押すと設定）" : PALETTE_NOTE[k]}</span>
                </button>
              );
            })}
          </section>
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
                  onClick={() => setMissionIdx(i)}
                  className={`h-8 flex-1 rounded-md text-xs font-bold transition ${
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
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{mission.story}</p>
            <ul className="mt-3 space-y-1" data-testid="mission-checks">
              {checks.map((c) => {
                const isNext = c === next;
                return (
                  <li key={c.label} className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-sm ${isNext ? "bg-accent-50" : ""}`}>
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        c.ok ? "bg-emerald-500 text-white" : isNext ? "border-2 border-accent-500" : "border border-gray-300"
                      }`}
                    >
                      {c.ok ? "✓" : ""}
                    </span>
                    <span className={`flex-1 ${c.ok ? "text-gray-400" : "text-gray-800"}`}>{c.label}</span>
                    {!c.ok && c.action && (
                      <button
                        type="button"
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                        onClick={() => doAction(c.action!)}
                      >
                        {c.action.test ? "確かめる" : c.action.focus ? "開く" : "やる"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
              <span className="flex flex-wrap gap-1">
                {mission.terms.map((t) => (
                  <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
              </span>
              {!done[missionIdx] && (
                <button type="button" className="ml-auto underline" onClick={solve}>
                  答えを見る
                </button>
              )}
            </div>
          </section>

          <Inspector
            state={state}
            sim={sim}
            id={selected}
            focus={focus}
            onWire={wire}
            onDisconnect={(a, b) => update(disconnect(state, a, b), `${DEVICE_NAME[a]}と${DEVICE_NAME[b]}のケーブルを外しました。`)}
            onRemove={(k) => {
              update(removeDevice(state, k), `${DEVICE_NAME[k]}を片付けました。`);
              setSelected(null);
            }}
            onChange={(s) => update(s)}
          />

          {/* テストの記録（ミッションのテストは「次にやること」・チェックリストから流せる。ここは自由に試す用） */}
          <details className="rounded-xl border border-gray-200 bg-white p-4" open={log.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">
              通信テスト
              <span className="ml-2 text-xs font-normal text-gray-500">自由に試す・記録を見る</span>
            </summary>
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
            {log.length > 0 && (
              <ol className="mt-3 space-y-2 rounded-lg bg-gray-950 p-3 font-mono text-[12px] leading-relaxed text-gray-200" data-testid="test-log">
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
        </aside>
      </div>
    </div>
  );
}

/** 模型の右上（スマホでは上）に出す「次にやること」。ボタン1つでその操作をする／設定を開く／テストを流す */
function GuideCard({
  missionIdx,
  done,
  next,
  onAction,
  onNextMission,
}: {
  missionIdx: number;
  done: boolean;
  next: ReturnType<typeof nextCheck>;
  onAction: (a: CheckAction) => void;
  onNextMission: () => void;
}) {
  const last = missionIdx === MISSIONS.length - 1;
  return (
    <div
      className="w-[290px] rounded-xl bg-white/95 p-3 text-left shadow-[0_6px_20px_rgba(15,23,42,0.14)] ring-1 ring-black/5 max-sm:w-full"
      data-no-drag=""
      data-testid="guide"
    >
      {done ? (
        <>
          <p className="text-[11px] font-semibold text-emerald-700">ミッション {missionIdx + 1} 達成</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">{last ? "オフィスのネットワークが完成しました" : "次のミッションへ進もう"}</p>
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
          <p className="text-[11px] font-semibold text-accent-700">
            ミッション {missionIdx + 1} ・ 次にやること
          </p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900">{next.label}</p>
          {next.hint && <p className="mt-1 text-xs leading-relaxed text-gray-600">{next.hint}</p>}
          {next.action && (
            <button
              type="button"
              onClick={() => onAction(next.action!)}
              className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              data-testid="guide-action"
            >
              {next.action.label}
            </button>
          )}
          {next.action?.highlight && next.action.run && (
            <p className="mt-1.5 text-[11px] text-gray-500">光っている名札どうしをドラッグしてもつなげます</p>
          )}
        </>
      ) : null}
    </div>
  );
}

/** 「開く」で連れてきた設定欄を目立たせ、見える位置までスクロールする */
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
  onWire,
  onDisconnect,
  onRemove,
  onChange,
}: {
  state: LabState;
  sim: ReturnType<typeof simulate>;
  id: DeviceId | null;
  focus: FocusField | null;
  onWire: (a: DeviceId, b: DeviceId) => void;
  onDisconnect: (a: DeviceId, b: DeviceId) => void;
  onRemove: (k: PlaceableKind) => void;
  onChange: (s: LabState) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (id) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [id]);

  if (!id) {
    return (
      <section className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        模型の名札を押すと、その機器の設定がここに出ます。
      </section>
    );
  }
  const k = kindOf(id);
  const h = sim.hosts[id];
  const ns = neighbors(state, id);
  const removable = (PLACEABLE as string[]).includes(id);
  const r = state.router;
  const setRouter = (patch: Partial<typeof r>) => onChange({ ...state, router: { ...r, ...patch } });
  const present = (d: DeviceId) => FIXED_DEVICES.includes(d) || state.placed[d as PlaceableKind] !== undefined;
  const targets = ([...FIXED_DEVICES, ...PLACEABLE] as DeviceId[]).filter((d) => present(d) && canConnect(state, id, d).ok);

  return (
    <section ref={ref} className="scroll-mt-4 rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="inspector-h" data-testid="inspector">
      <div className="flex items-start justify-between gap-2">
        <h2 id="inspector-h" className="text-base font-bold text-gray-900">
          {DEVICE_NAME[id]}
        </h2>
        {removable && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={() => onRemove(id as PlaceableKind)}>
            片付ける
          </button>
        )}
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
          <Spot on={focus === "router.dhcp"}>
            <Toggle label="DHCP サーバ" note="LAN の機器に IP アドレスを自動で配る" on={r.dhcp} onChange={(v) => setRouter({ dhcp: v })} testId="router-dhcp" />
          </Spot>
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
          <Spot on={focus === "router.nat"}>
            <Toggle label="NAT" note="外へ出るとき、プライベート IP をグローバル IP に付け替える" on={r.nat} onChange={(v) => setRouter({ nat: v })} />
          </Spot>
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
        </div>
      )}

      {k === "fileServer" && (
        <Spot on={focus === "file.ip"}>
          <div className="mt-2">
            <Field label="固定 IP アドレス" value={state.fileServer.ip} onChange={(v) => onChange({ ...state, fileServer: { ip: v } })} testId="file-ip" />
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
              onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, outbound: v } })}
            />
            <Toggle
              label="外 → DMZ の 443（HTTPS）"
              note="お客さんが自社サイトを見る口"
              on={state.firewall.inHttps}
              onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, inHttps: v } })}
              testId="fw-https"
            />
            <Toggle
              label="外 → DMZ の全ポート"
              note="SSH（22）など管理用の口まで開く"
              on={state.firewall.inOther}
              onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, inOther: v } })}
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
                    <span className="mr-1.5 rounded bg-gray-100 px-1 font-mono text-[10px] text-gray-600">{portLabel(portRole(id, n))}</span>
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
