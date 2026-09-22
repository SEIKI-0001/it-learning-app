import styles from "./logic.module.css";

// 入力スイッチ → 論理ゲート → 出力ランプ の回路図。
// 1 の信号は線が「入力側から」黄色く満たされていき、ゲートに届いてから出力線、最後にランプが点く。
// 入力や演算を変えるたびに key が変わり、その順番をもう一度たどる（reduced-motion では即座に最終状態）。

export type Op = "AND" | "OR" | "NOT" | "XOR";

export const W = 320;
export const H = 170;
const GX = 150; // ゲート左端
const GW = 64;
const CY = 85;
const LAMP = { x: 282, y: CY, r: 24 };
export const SWITCH_Y = { a: 45, b: 125 };

function gatePath(op: Op) {
  const x = GX;
  const r = GX + GW;
  switch (op) {
    case "AND":
      return `M${x},${CY - 30} H${x + 30} A30,30 0 0 1 ${x + 30},${CY + 30} H${x} Z`;
    case "OR":
    case "XOR":
      return `M${x},${CY - 30} Q${x + 40},${CY - 30} ${r},${CY} Q${x + 40},${CY + 30} ${x},${CY + 30} Q${x + 14},${CY} ${x},${CY - 30} Z`;
    case "NOT":
      return `M${x},${CY - 26} L${r - 10},${CY} L${x},${CY + 26} Z`;
  }
}

function inputPath(which: "a" | "b", op: Op) {
  const y0 = SWITCH_Y[which];
  const y1 = op === "NOT" ? CY : which === "a" ? CY - 18 : CY + 18;
  const end = op === "XOR" ? GX - 6 : GX + (op === "OR" ? 6 : 0);
  return `M68,${y0} H108 V${y1} H${end}`;
}

const TONE_ON = "#f59e0b";
const TONE_OFF = "#d1d5db";

function Wire({ d, on, delay, reducedMotion, testId }: { d: string; on: boolean; delay: number; reducedMotion: boolean; testId: string }) {
  return (
    <g data-testid={testId} data-on={on ? "1" : "0"}>
      <path d={d} fill="none" stroke={TONE_OFF} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {on && (
        <path
          d={d}
          fill="none"
          stroke={TONE_ON}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={100}
          className={reducedMotion ? undefined : styles.flow}
          style={reducedMotion ? undefined : { animationDelay: `${delay}ms` }}
        />
      )}
    </g>
  );
}

export const IN_MS = 450;
export const OUT_MS = 350;

export function GateCircuit({ op, a, b, out, runKey, reducedMotion }: { op: Op; a: number; b: number; out: number; runKey: string; reducedMotion: boolean }) {
  const usesB = op !== "NOT";
  const outD = `M${GX + GW},${CY} H${LAMP.x - LAMP.r - 2}`;
  const lampDelay = reducedMotion ? 0 : IN_MS + OUT_MS;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" data-testid="logic-circuit" data-op={op} data-out={out}>
      <g key={runKey}>
        <Wire d={inputPath("a", op)} on={a === 1} delay={0} reducedMotion={reducedMotion} testId="logic-wire-a" />
        {usesB ? (
          <Wire d={inputPath("b", op)} on={b === 1} delay={0} reducedMotion={reducedMotion} testId="logic-wire-b" />
        ) : (
          <path d={inputPath("b", "AND")} fill="none" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="4 4" />
        )}
        <Wire d={outD} on={out === 1} delay={IN_MS} reducedMotion={reducedMotion} testId="logic-wire-out" />

        {/* 入力が届いた位置に 0/1 を書く */}
        <text x={120} y={(op === "NOT" ? CY : CY - 18) - 6} fontSize={11} fontWeight={700} fill={a ? "#b45309" : "#9ca3af"}>
          {a}
        </text>
        {usesB && (
          <text x={120} y={CY + 18 + 14} fontSize={11} fontWeight={700} fill={b ? "#b45309" : "#9ca3af"}>
            {b}
          </text>
        )}
        <text x={GX + GW + 8} y={CY - 8} fontSize={11} fontWeight={700} fill={out ? "#b45309" : "#9ca3af"} className={reducedMotion ? undefined : styles.fadeIn} style={reducedMotion ? undefined : { animationDelay: `${IN_MS}ms` }}>
          {out}
        </text>

      </g>

      {/* ランプ：信号が届いてから点く（再描画せずに色だけ遅れて変える） */}
      <circle
        cx={LAMP.x}
        cy={LAMP.y}
        r={LAMP.r}
        strokeWidth={5}
        className={styles.lamp}
        style={{ fill: out ? "#fcd34d" : "#e5e7eb", stroke: out ? "#fde68a" : "#f3f4f6", transitionDelay: `${lampDelay}ms` }}
        data-testid="logic-lamp"
        data-lit={out ? "true" : "false"}
      />
      <text x={LAMP.x} y={LAMP.y} textAnchor="middle" dominantBaseline="central" fontSize={20} className={styles.lampIcon} style={{ opacity: out ? 1 : 0, transitionDelay: `${lampDelay}ms` }}>
        💡
      </text>
      <text x={LAMP.x} y={LAMP.y} textAnchor="middle" dominantBaseline="central" fontSize={16} fill="#9ca3af" className={styles.lampIcon} style={{ opacity: out ? 0 : 1, transitionDelay: `${lampDelay}ms` }}>
        ○
      </text>

      {/* ゲート本体（演算を変えると形が変わる） */}
      {op === "XOR" && <path d={`M${GX - 8},${CY - 30} Q${GX + 6},${CY} ${GX - 8},${CY + 30}`} fill="none" stroke="#4f46e5" strokeWidth={2.5} />}
      <path d={gatePath(op)} fill="#eef2ff" stroke="#4f46e5" strokeWidth={2.5} className={styles.gate} />
      {op === "NOT" && <circle cx={GX + GW - 5} cy={CY} r={5} fill="#eef2ff" stroke="#4f46e5" strokeWidth={2.5} />}
      <text x={GX + (op === "NOT" ? 18 : 26)} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800} fill="#4338ca">
        {op}
      </text>
      <text x={LAMP.x} y={LAMP.y + LAMP.r + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151">
        出力
      </text>
    </svg>
  );
}
