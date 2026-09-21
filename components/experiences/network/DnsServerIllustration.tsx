import { isoBox, leftFaceTransform, rightFaceTransform, type NodeState } from "./NetworkSceneBase";
import styles from "./network.module.css";

// DNSサーバ: 背の低い紺色の小型ラック。3段の太いユニット＋「名前→IP」の台帳グリフで、
// 背の高い白いWebサーバと形・明度・段数の3点で見分けられるようにする。

const W = 15; // x: -W..W
const D = 15; // y: -D..D
const H = 46;
const box = isoBox({ x0: -W, x1: W, y0: -D, y1: D, z0: 0, z1: H });

const UNIT_TOPS = [11, 22.5, 34];

export function DnsServerIllustration({ state }: { state: NodeState }) {
  const led = styles[`led_${state}`];
  return (
    <g data-illustration="dns">
      <polygon points={box.left} fill="#2C3B57" />
      <polygon points={box.right} fill="#1E2A40" />
      <polygon points={box.top} fill="#4B5C7C" />
      {/* 上面の縁取りと天板の吸気グリル */}
      <polygon points={box.top} fill="none" stroke="#6C7FA2" strokeWidth={0.8} />

      {/* 正面（左前面）: 識別プレート＋3段のユニット */}
      <g transform={leftFaceTransform(-W, D, H)}>
        <rect x={2.5} y={2.5} width={25} height={6.5} rx={1.5} fill="#1B2538" />
        <text
          x={5}
          y={7.6}
          fontSize={5.2}
          fontWeight={700}
          letterSpacing={0.6}
          fill="#9CC3FF"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          DNS
        </text>
        {/* 名前→IP の台帳グリフ */}
        <g stroke="#9CC3FF" strokeWidth={0.7} strokeLinecap="round" opacity={0.85}>
          <line x1={17.5} y1={4.3} x2={20.5} y2={4.3} />
          <line x1={22.5} y1={4.3} x2={25.5} y2={4.3} />
          <line x1={17.5} y1={6.9} x2={20.5} y2={6.9} />
          <line x1={22.5} y1={6.9} x2={25.5} y2={6.9} />
        </g>
        {UNIT_TOPS.map((top, i) => (
          <g key={top}>
            <rect x={2.5} y={top} width={25} height={9.5} rx={1.4} fill="#223049" stroke="#3A4B6B" strokeWidth={0.6} />
            <circle cx={6} cy={top + 3.4} r={1.35} className={led} style={{ animationDelay: `${i * 180}ms` }} />
            <circle cx={6} cy={top + 6.6} r={1.35} className={led} style={{ animationDelay: `${i * 180 + 90}ms` }} />
            {/* 通気スリット */}
            <g stroke="#51638A" strokeWidth={0.8} strokeLinecap="round">
              {[11, 13.5, 16, 18.5, 21, 23.5].map((x) => (
                <line key={x} x1={x} y1={top + 2.6} x2={x} y2={top + 7} />
              ))}
            </g>
          </g>
        ))}
      </g>

      {/* 側面: 縦の放熱スリット */}
      <g transform={rightFaceTransform(W, D, H)} stroke="#2C3B57" strokeWidth={1} strokeLinecap="round">
        {[6, 10, 14, 18, 22, 26].map((u) => (
          <line key={u} x1={u} y1={8} x2={u} y2={38} />
        ))}
      </g>
    </g>
  );
}
