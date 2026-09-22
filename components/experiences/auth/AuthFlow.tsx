import styles from "./auth.module.css";

// 利用者が「認証ゲート → 認可ゲート → 目的の画面」へ進む流れ。
//   パスワード違い … 認証ゲートで止まる（誰か分からない）
//   一般社員 × 管理画面 … 認証は通る（田中さんと分かる）が、認可ゲートで止まる（権限がない）
//   管理者 × 管理画面 / 一般社員 × 自分の給与明細 … 最後まで通る

export type Who = "tanaka" | "sato" | "fake";
export type Where = "payslip" | "admin";

export const PEOPLE: { id: Who; label: string; name: string; role: string; passOk: boolean }[] = [
  { id: "tanaka", label: "田中さん（一般社員）", name: "田中さん", role: "一般社員", passOk: true },
  { id: "sato", label: "佐藤さん（管理者）", name: "佐藤さん", role: "管理者", passOk: true },
  { id: "fake", label: "パスワード違い", name: "？？？", role: "", passOk: false },
];

export const PLACES: { id: Where; label: string; icon: string; allowed: string[] }[] = [
  { id: "payslip", label: "自分の給与明細", icon: "📄", allowed: ["一般社員", "管理者"] },
  { id: "admin", label: "管理画面", icon: "⚙️", allowed: ["管理者"] },
];

/** どこで止まるか：1=認証で止まる 2=認可で止まる 3=目的地に着く */
export function stopAt(who: Who, where: Where) {
  const p = PEOPLE.find((x) => x.id === who)!;
  if (!p.passOk) return 1;
  const place = PLACES.find((x) => x.id === where)!;
  return place.allowed.includes(p.role) ? 3 : 2;
}

const X = [8, 36, 64, 78]; // 利用者・認証・認可・目的地の手前（%）
const GOAL = 91;

export function AuthFlow({ who, where, phase, reducedMotion }: { who: Who; where: Where; phase: number; reducedMotion: boolean }) {
  const p = PEOPLE.find((x) => x.id === who)!;
  const place = PLACES.find((x) => x.id === where)!;
  const stop = stopAt(who, where);
  const at = Math.min(phase, stop);
  const authDone = at >= 1 && phase >= 1;
  const authOk = p.passOk;
  const authzDone = at >= 2 && phase >= 2;
  const authzOk = stop === 3;
  const blocked = phase >= stop && stop < 3;

  return (
    <div
      className={`${styles.stage} ${reducedMotion ? styles.reduced : ""} relative h-[168px] overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-200`}
      data-testid="auth-flow"
      data-at={at}
      data-blocked={blocked ? "true" : "false"}
    >
      {/* 通路 */}
      <div className="absolute left-[6%] right-[6%] top-[58px] h-1.5 rounded-full bg-gray-200" aria-hidden />

      {/* 認証ゲート */}
      <Gate x={X[1]} title="① 認証" sub="あなたは誰？" tone="brand" state={!authDone ? "idle" : authOk ? "ok" : "ng"} testId="auth-gate-authn" />
      {/* 認可ゲート */}
      <Gate x={X[2]} title="② 認可" sub="何をしてよい？" tone="emerald" state={!authzDone ? "idle" : authzOk ? "ok" : "ng"} testId="auth-gate-authz" />
      {/* 目的地 */}
      <div className="absolute top-[34px] -translate-x-1/2 text-center" style={{ left: `${GOAL}%` }}>
        <div className={`grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl ring-2 ${phase >= 3 && stop === 3 ? "ring-emerald-500" : "ring-gray-300"}`}>{place.icon}</div>
        <div className="mt-1 w-16 text-[10px] font-bold leading-tight text-gray-700">{place.label}</div>
      </div>

      {/* 利用者（移動する） */}
      <div className={`${styles.walker} absolute top-[44px] z-20 -translate-x-1/2 text-center`} style={{ left: `${X[at]}%` }} data-testid="auth-walker">
        <div className={`grid h-9 w-9 place-items-center rounded-full bg-white text-xl ring-2 ${blocked ? "ring-rose-500" : "ring-gray-400"} ${blocked ? styles.bump : ""}`}>
          {who === "fake" ? "🕵️" : "🧑"}
        </div>
        {/* 認証が通ると「誰か」の札が付く */}
        {authDone && authOk && (
          <span className={`${styles.pop} absolute top-10 whitespace-nowrap ${at >= 3 ? "right-0" : "left-1/2 -translate-x-1/2"} rounded bg-brand-600 px-1 text-[9px] font-bold text-white`} data-testid="auth-badge">
            {p.name}・{p.role}
          </span>
        )}
      </div>

      {/* 結果 */}
      <div
        className={`absolute inset-x-2 bottom-2 rounded-lg px-2 py-1.5 text-center text-[11px] font-bold leading-snug ${
          phase === 0 ? "bg-white text-gray-500" : blocked ? "bg-rose-50 text-rose-800" : stop === 3 && phase >= 3 ? "bg-emerald-50 text-emerald-800" : "bg-white text-gray-700"
        }`}
        aria-live="polite"
        data-testid="auth-result"
      >
        {phase === 0 && `${p.label} が「${place.label}」を開こうとしています`}
        {phase >= 1 && !authOk && "✕ 認証で止まる：パスワードが違い、本人と確認できない"}
        {phase === 1 && authOk && `⭕ 認証OK：「${p.name}」本人と確認できた`}
        {phase >= 2 && authOk && !authzOk && `✕ 認可で止まる：本人確認はOK。でも${p.role}に「${place.label}」の権限はない`}
        {phase === 2 && authzOk && `⭕ 認可OK：${p.role}は「${place.label}」を見てよい`}
        {phase >= 3 && authzOk && `🎉 「${place.label}」を開けた（認証→認可の両方を通過）`}
      </div>
    </div>
  );
}

function Gate({ x, title, sub, tone, state, testId }: { x: number; title: string; sub: string; tone: "brand" | "emerald"; state: "idle" | "ok" | "ng"; testId: string }) {
  const ring = state === "ok" ? "ring-emerald-500 bg-emerald-50" : state === "ng" ? "ring-rose-500 bg-rose-50" : tone === "brand" ? "ring-brand-300 bg-brand-50" : "ring-emerald-300 bg-emerald-50";
  return (
    <div className="absolute top-2 z-10 -translate-x-1/2 text-center" style={{ left: `${x}%` }} data-testid={testId} data-state={state}>
      <div className={`w-[4.5rem] rounded-lg px-1 py-1 ring-2 transition-colors delay-[850ms] duration-300 ${ring}`}>
        <div className={`text-[11px] font-bold ${tone === "brand" ? "text-brand-700" : "text-emerald-700"}`}>{title}</div>
        <div className="text-[9px] text-gray-600">{sub}</div>
      </div>
      {/* ゲートの棒：通れないときは閉じたまま赤く */}
      <div className={`mx-auto mt-[14px] h-9 w-1.5 rounded-full transition-colors delay-[850ms] duration-300 ${state === "ng" ? "bg-rose-500" : state === "ok" ? "bg-emerald-400" : "bg-gray-300"}`} aria-hidden />
      {state !== "idle" && <div className={`${styles.pop} mt-0.5 text-sm font-bold ${state === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{state === "ok" ? "✓" : "✕"}</div>}
    </div>
  );
}
