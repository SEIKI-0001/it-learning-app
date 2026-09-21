import { isoBox, leftFaceTransform, rightFaceTransform, type NodeState } from "./NetworkSceneBase";
import styles from "./network.module.css";

// Webサーバ: 背の高い白いラック。薄いブレード6枚＋地球儀の WEB 識別。
// DNS（低い・紺・太い3段）と並べても一目で別物と分かるシルエットにする。

const W = 13;
const D = 16;
const H = 64;
const box = isoBox({ x0: -W, x1: W, y0: -D, y1: D, z0: 0, z1: H });

const BLADE_TOPS = [13, 21, 29, 37, 45, 53];

export function WebServerIllustration({ state }: { state: NodeState }) {
  const led = styles[`led_${state}`];
  return (
    <g data-illustration="web">
      <polygon points={box.left} fill="#F6F7FA" />
      <polygon points={box.right} fill="#DCE2EC" />
      <polygon points={box.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />

      <g transform={leftFaceTransform(-W, D, H)}>
        {/* WEB 識別プレート */}
        <rect x={2.5} y={2.5} width={27} height={8} rx={1.6} fill="#FFF4E8" stroke="#F1C79A" strokeWidth={0.6} />
        <g fill="none" stroke="#D0782B" strokeWidth={0.7}>
          <circle cx={7.2} cy={6.5} r={2.6} />
          <ellipse cx={7.2} cy={6.5} rx={1.1} ry={2.6} />
          <line x1={4.6} y1={6.5} x2={9.8} y2={6.5} />
        </g>
        <text
          x={11.8}
          y={8.4}
          fontSize={5.2}
          fontWeight={700}
          letterSpacing={0.6}
          fill="#B4611C"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          WEB
        </text>
        {BLADE_TOPS.map((top, i) => (
          <g key={top}>
            <rect x={2.5} y={top} width={27} height={6.2} rx={1.1} fill="#E9EDF4" stroke="#D2D9E5" strokeWidth={0.5} />
            <circle cx={5.6} cy={top + 3.1} r={1.2} className={led} style={{ animationDelay: `${i * 120}ms` }} />
            <line x1={9.5} y1={top + 3.1} x2={26.5} y2={top + 3.1} stroke="#C4CDDB" strokeWidth={1.1} strokeLinecap="round" />
          </g>
        ))}
      </g>

      <g transform={rightFaceTransform(W, D, H)} stroke="#C8D0DD" strokeWidth={0.9} strokeLinecap="round">
        {BLADE_TOPS.map((top) => (
          <line key={top} x1={4} y1={top + 3} x2={28} y2={top + 3} />
        ))}
      </g>
    </g>
  );
}
