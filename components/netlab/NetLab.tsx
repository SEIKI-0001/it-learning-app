"use client";

import { useEffect, useMemo, useState } from "react";
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
  place,
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
import { SLOTS } from "@/lib/netlab/layout";
import { MISSIONS, missionDone } from "@/lib/netlab/missions";
import OfficeScene, { type Trace } from "./OfficeScene";

// ネットワーク構築ラボ（プロトタイプ）。
// 左：オフィスの模型（置く・つなぐ・テストの小包）。右：ミッション／選んだ機器の設定／テストの記録。
// 進み具合はこの端末の localStorage にだけ残す（ログイン不要の試作なので）。

const STORAGE_KEY = "netlab:v1";

const PALETTE_NOTE: Record<PlaceableKind, string> = {
  switch: "LAN の機器をまとめる",
  router: "LAN とインターネットの出入口",
  fileServer: "社内の共有フォルダ",
  ap: "無線LANの親機",
  firewall: "通してよい通信だけ通す",
  webServer: "自社サイトを公開する",
};

function loadState(): LabState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LabState;
    return { ...initialState(), ...parsed };
  } catch {
    return null;
  }
}

export default function NetLab() {
  // ブラウザでだけ描く（NetLabClient が ssr:false で読む）ので、保存した進み具合を最初から使える
  const [state, setState] = useState<LabState>(() => loadState() ?? initialState());
  const [selected, setSelected] = useState<DeviceId | null>(null);
  const [placing, setPlacing] = useState<PlaceableKind | null>(null);
  const [wiringFrom, setWiringFrom] = useState<DeviceId | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [log, setLog] = useState<(TestResult & { key: number })[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [missionIdx, setMissionIdx] = useState(() => {
    const firstOpen = MISSIONS.findIndex((m) => !missionDone(m, state));
    return firstOpen < 0 ? MISSIONS.length - 1 : firstOpen;
  });
  const [hintOpen, setHintOpen] = useState(false);

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
  const done = MISSIONS.map((m) => missionDone(m, state));

  const present = (id: DeviceId) => FIXED_DEVICES.includes(id) || state.placed[id as PlaceableKind] !== undefined;
  const allDevices: DeviceId[] = [...FIXED_DEVICES, ...PLACEABLE].filter(present);
  const wireTargets = wiringFrom ? allDevices.filter((id) => canConnect(state, wiringFrom, id).ok) : [];

  function update(next: LabState) {
    setState(next);
    setTrace(null);
  }

  function choosePalette(kind: PlaceableKind) {
    setWiringFrom(null);
    setNotice(null);
    const free = SLOTS.filter((s) => s.accepts.includes(kind) && !Object.values(state.placed).includes(s.id));
    if (free.length === 0) {
      setNotice("置き場所が空いていません。ほかの機器を片付けてください。");
      return;
    }
    setPlacing((cur) => (cur === kind ? null : kind));
  }

  function onSlot(slotId: string) {
    if (!placing) return;
    update(place(state, placing, slotId));
    setSelected(placing);
    setNotice(`${DEVICE_NAME[placing]}を置きました。名札を押して、ケーブルをつなぎましょう。`);
    setPlacing(null);
  }

  function onDevice(id: DeviceId) {
    if (wiringFrom) {
      if (id === wiringFrom) {
        setWiringFrom(null);
        return;
      }
      const c = canConnect(state, wiringFrom, id);
      if (!c.ok) {
        setNotice(c.reason);
        return;
      }
      update(connect(state, wiringFrom, id));
      setNotice(`${DEVICE_NAME[wiringFrom]}（${portLabel(c.roleA)}）と ${DEVICE_NAME[id]}（${portLabel(c.roleB)}）をつなぎました。`);
      setWiringFrom(null);
      return;
    }
    setPlacing(null);
    setSelected(id);
    setNotice(null);
  }

  function test(id: TestId) {
    const result = runTest(state, id, sim);
    const key = (trace?.key ?? 0) + 1 + log.length;
    setTrace({ key, result });
    setLog((l) => [{ ...result, key }, ...l].slice(0, 8));
  }

  function reset() {
    setState(initialState());
    setSelected(null);
    setPlacing(null);
    setWiringFrom(null);
    setTrace(null);
    setLog([]);
    setMissionIdx(0);
    setNotice("最初からやり直します。");
  }

  function solve() {
    let s = state;
    for (const m of MISSIONS.slice(0, missionIdx + 1)) s = m.solve(s);
    update(s);
    setNotice(`「${mission.title}」の完成形にしました。テストで動きを確かめてみましょう。`);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 lg:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600">プロトタイプ ・ テスト環境</p>
          <h1 className="text-2xl font-bold text-gray-900">オフィスネットワーク構築ラボ</h1>
          <p className="mt-1 text-sm text-gray-600">
            小さな会社のオフィスに、機器を置いてケーブルでつなぎ、設定して、通信が届くか確かめます。壊しても本物には影響しません。
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          最初からやり直す
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 右の列を読み進めても、模型（テストの小包）はいつも見えているようにする */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <OfficeScene
            state={state}
            sim={sim}
            selected={selected}
            placing={placing}
            wiringFrom={wiringFrom}
            wireTargets={wireTargets}
            trace={trace}
            onSlot={onSlot}
            onDevice={onDevice}
          />

          {(placing || wiringFrom || notice) && (
            <div
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                placing || wiringFrom ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700"
              }`}
              role="status"
            >
              <span>
                {placing
                  ? `${DEVICE_NAME[placing]}の置き場所を、模型の「＋ ここに置く」から選んでください。`
                  : wiringFrom
                    ? `${DEVICE_NAME[wiringFrom]}のつなぎ先を選んでください（青く光る名札）。`
                    : notice}
              </span>
              {(placing || wiringFrom) && (
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold underline"
                  onClick={() => {
                    setPlacing(null);
                    setWiringFrom(null);
                  }}
                >
                  やめる
                </button>
              )}
            </div>
          )}

          <section aria-labelledby="palette-h" className="rounded-xl border border-gray-200 bg-white p-3">
            <h2 id="palette-h" className="mb-2 text-sm font-semibold text-gray-800">
              機器を置く
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {PLACEABLE.map((k) => {
                const isPlaced = !!state.placed[k];
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={isPlaced}
                    onClick={() => choosePalette(k)}
                    data-testid={`palette-${k}`}
                    className={`rounded-lg border px-3 py-2 text-left transition disabled:cursor-default disabled:opacity-45 ${
                      placing === k ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-gray-900">{DEVICE_NAME[k]}</span>
                    <span className="block text-[11px] text-gray-500">{isPlaced ? "設置済み" : PALETTE_NOTE[k]}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
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
                    setHintOpen(false);
                  }}
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
            <div className="mt-2 flex flex-wrap gap-1">
              {mission.terms.map((t) => (
                <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                  {t}
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5" data-testid="mission-checks">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-2 text-sm">
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      c.ok ? "bg-emerald-500 text-white" : "border border-gray-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={c.ok ? "text-gray-500 line-through decoration-gray-300" : "text-gray-800"}>
                    {c.label}
                    {!c.ok && hintOpen && c.hint && <span className="mt-0.5 block text-xs text-brand-700">{c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {done[missionIdx] ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span className="font-semibold">ミッション達成</span>
                {missionIdx < MISSIONS.length - 1 && (
                  <button type="button" className="text-xs font-semibold underline" onClick={() => setMissionIdx(missionIdx + 1)}>
                    次へ進む
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-3 flex gap-3 text-xs">
                <button type="button" className="font-semibold text-brand-700 underline" onClick={() => setHintOpen((v) => !v)}>
                  {hintOpen ? "ヒントを隠す" : "ヒントを見る"}
                </button>
                <button type="button" className="text-gray-500 underline" onClick={solve}>
                  答えを見る（完成形にする）
                </button>
              </div>
            )}
          </section>

          <Inspector
            state={state}
            sim={sim}
            id={selected}
            wiring={wiringFrom === selected && selected !== null}
            wireTargets={wireTargets}
            onStartWire={() => {
              setPlacing(null);
              setWiringFrom(selected);
            }}
            onPickTarget={onDevice}
            onDisconnect={(a, b) => update(disconnect(state, a, b))}
            onRemove={(k) => {
              update(removeDevice(state, k));
              setSelected(null);
              setWiringFrom(null);
            }}
            onChange={update}
          />

          {/* テスト */}
          <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="test-h">
            <h2 id="test-h" className="text-sm font-semibold text-gray-800">
              通信テスト
            </h2>
            <p className="mb-2 text-xs text-gray-500">押すと、模型の中を小包が流れます。届かなければ止まった所で理由を表示します。</p>
            <div className="flex flex-wrap gap-1.5">
              {TESTS.map((t) => {
                const focus = mission.tests.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => test(t.id)}
                    data-testid={`test-${t.id}`}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      focus ? "border-gray-900 bg-gray-900 text-white hover:bg-black" : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
            {log.length > 0 && (
              <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-lg bg-gray-950 p-3 font-mono text-[12px] leading-relaxed text-gray-200" data-testid="test-log">
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
          </section>
        </aside>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange, note }: { label: string; on: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-800">
        {label}
        {note && <span className="block text-[11px] text-gray-500">{note}</span>}
      </span>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-gray-900" checked={on} onChange={(e) => onChange(e.target.checked)} />
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

function Inspector({
  state,
  sim,
  id,
  wiring,
  wireTargets,
  onStartWire,
  onPickTarget,
  onDisconnect,
  onRemove,
  onChange,
}: {
  state: LabState;
  sim: ReturnType<typeof simulate>;
  id: DeviceId | null;
  wiring: boolean;
  wireTargets: DeviceId[];
  onStartWire: () => void;
  onPickTarget: (id: DeviceId) => void;
  onDisconnect: (a: DeviceId, b: DeviceId) => void;
  onRemove: (k: PlaceableKind) => void;
  onChange: (s: LabState) => void;
}) {
  if (!id) {
    return (
      <section className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        模型の名札を押すと、その機器の設定とケーブルの状態がここに出ます。
      </section>
    );
  }
  const k = kindOf(id);
  const h = sim.hosts[id];
  const ns = neighbors(state, id);
  const removable = (PLACEABLE as string[]).includes(id);
  const r = state.router;
  const setRouter = (patch: Partial<typeof r>) => onChange({ ...state, router: { ...r, ...patch } });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="inspector-h" data-testid="inspector">
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
          <dt className="text-gray-500">取得方法</dt>
          <dd className="text-gray-900">{h?.source === "dhcp" ? "DHCP（自動）" : h?.source === "static" ? "固定" : h?.source === "public" ? "公開用（DMZ）" : "—"}</dd>
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
          <Field label="LAN 側 IP アドレス" value={r.lanIp} onChange={(v) => setRouter({ lanIp: v })} testId="router-lanip" />
          <Toggle label="DHCP サーバ" note="LAN の機器に IP アドレスを自動で配る" on={r.dhcp} onChange={(v) => setRouter({ dhcp: v })} />
          {r.dhcp && (
            <>
              <Field label="配布範囲（始め）" value={r.dhcpStart} onChange={(v) => setRouter({ dhcpStart: v })} />
              <Field label="配布範囲（終わり）" value={r.dhcpEnd} onChange={(v) => setRouter({ dhcpEnd: v })} />
              {sim.dhcpProblem && <p className="py-1 text-xs text-rose-600">{sim.dhcpProblem}</p>}
            </>
          )}
          <label className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-gray-800">
              DNS サーバ
              <span className="block text-[11px] text-gray-500">名前 → IP アドレスに変換する先</span>
            </span>
            <select
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              value={r.dns}
              onChange={(e) => setRouter({ dns: e.target.value as DnsChoice })}
              data-testid="router-dns"
            >
              <option value="">未設定</option>
              <option value="router">ルータに任せる</option>
              <option value="isp">プロバイダの DNS</option>
              <option value="public">パブリック DNS（8.8.8.8）</option>
            </select>
          </label>
          <Toggle label="NAT" note="社内のプライベート IP を、外に出るときグローバル IP に付け替える" on={r.nat} onChange={(v) => setRouter({ nat: v })} />
          <p className="pt-2 text-[11px] text-gray-500">サブネットマスクは 255.255.255.0（/24）で固定しています。</p>
        </div>
      )}

      {k === "fileServer" && (
        <div className="mt-2">
          <Field label="固定 IP アドレス" value={state.fileServer.ip} onChange={(v) => onChange({ ...state, fileServer: { ip: v } })} testId="file-ip" />
          {r.dhcp && (
            <p className="text-[11px] text-gray-500">
              参考：DHCP の配布範囲は {r.dhcpStart} 〜 {r.dhcpEnd}
            </p>
          )}
        </div>
      )}

      {k === "ap" && (
        <div className="mt-2 divide-y divide-gray-100">
          <label className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm text-gray-800">SSID（ネットワーク名）</span>
            <input
              className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
              value={state.ap.ssid}
              onChange={(e) => onChange({ ...state, ap: { ...state.ap, ssid: e.target.value } })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-gray-800">暗号化</span>
            <select
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              value={state.ap.security}
              onChange={(e) => onChange({ ...state, ap: { ...state.ap, security: e.target.value as typeof state.ap.security } })}
              data-testid="ap-security"
            >
              <option value="none">なし（パスワードなし）</option>
              <option value="wpa2">WPA2</option>
              <option value="wpa3">WPA3</option>
            </select>
          </label>
        </div>
      )}

      {k === "firewall" && (
        <div className="mt-2 divide-y divide-gray-100">
          <p className="pb-1 text-[11px] text-gray-500">上から順に照らし合わせ、どれにも当たらない通信は拒否します。</p>
          <Toggle label="社内 → インターネット：許可" on={state.firewall.outbound} onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, outbound: v } })} />
          <Toggle
            label="インターネット → DMZ の 443（HTTPS）：許可"
            on={state.firewall.inHttps}
            onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, inHttps: v } })}
          />
          <Toggle
            label="インターネット → DMZ の全ポート：許可"
            note="SSH（22）など管理用の口まで開く"
            on={state.firewall.inOther}
            onChange={(v) => onChange({ ...state, firewall: { ...state.firewall, inOther: v } })}
          />
          <p className="pt-1.5 text-[11px] text-gray-500">インターネット → 社内 LAN：常に拒否</p>
        </div>
      )}

      {k === "onu" && <p className="mt-2 text-sm text-gray-600">光回線の終端装置。ここから先がプロバイダ（インターネット）です。</p>}
      {k === "switch" && <p className="mt-2 text-sm text-gray-600">8口。つないだ機器を1つの LAN にまとめ、宛先の機器にだけデータを届けます。</p>}

      {/* ケーブル */}
      {k !== "laptop" ? (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <h3 className="mb-1.5 text-xs font-semibold text-gray-500">ケーブル</h3>
          {ns.length === 0 && <p className="text-sm text-gray-500">まだ何もつながっていません。</p>}
          <ul className="space-y-1">
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
          {wiring ? (
            <div className="mt-2">
              <p className="mb-1 text-xs text-brand-700">つなぎ先（模型の青い名札でも選べます）</p>
              <div className="flex flex-wrap gap-1">
                {wireTargets.length === 0 && <span className="text-xs text-gray-500">つなげる相手がありません（ポートが空いていない）。</span>}
                {wireTargets.map((t) => (
                  <button key={t} type="button" className="rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-xs text-brand-800" onClick={() => onPickTarget(t)}>
                    {DEVICE_NAME[t]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Button variant="soft" size="sm" className="mt-2 w-full" onClick={onStartWire} data-testid="start-wire">
              ケーブルをつなぐ
            </Button>
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
