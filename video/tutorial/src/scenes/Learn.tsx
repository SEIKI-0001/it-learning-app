// 4. 分かる：アプリの解説にある図解を3枚、動かして見せる（内容は実際のレッスンと同じ）。
//   共通鍵暗号方式 / CPU・メモリ・ストレージ / インターネットとプロトコル
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, Kinetic, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

const CARD_AT = [10, 30, 50];

export const learnCues = (): Cue[] => [
  ...CARD_AT.map((at) => ({ at: at + 2, sfx: "pop" as const, volume: 0.5 })),
  { at: CARD_AT[2] + 10 + 53, sfx: "correct", volume: 0.45 },
  { at: 128, sfx: "sparkle", volume: 0.4 },
];

export function Learn({ scene }: { scene: Scene }) {
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from={C.brand400} to={C.brand800} seed={31} />
      <div style={{ position: "absolute", top: 80, width: "100%" }}>
        <Kinetic start={scene.lines[0].from - 8} size={96} align="center" segs={[{ t: "動く図解で、" }, { t: "スッと分かる！", color: C.sun }]} />
      </div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 48, perspective: 1800 }}>
        <Card start={CARD_AT[0]} title="共通鍵暗号方式" tilt={10}>
          <KeyFlow start={CARD_AT[0] + 10} />
        </Card>
        <Card start={CARD_AT[1]} title="CPU・メモリ・ストレージ" tilt={0}>
          <ComputerParts start={CARD_AT[1] + 10} />
        </Card>
        <Card start={CARD_AT[2]} title="プロトコル" tilt={-10}>
          <Protocol start={CARD_AT[2] + 10} />
        </Card>
      </div>
    </AbsoluteFill>
  );
}

function Card({ start, title, tilt, children }: { start: number; title: string; tilt: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const p = usePop(start, { damping: 12, stiffness: 120 });
  const bob = Math.sin((frame + start * 3) / 16) * 8;
  return (
    <div
      style={{
        width: 520,
        height: 600,
        borderRadius: 40,
        background: C.white,
        boxShadow: "0 40px 80px rgba(8,20,50,0.4)",
        padding: "36px 34px",
        transform: `translateY(${(1 - p) * 700 + bob}px) rotateY(${tilt * (1 - p * 0.6)}deg) rotateZ(${(1 - p) * tilt}deg)`,
        opacity: Math.min(1, p * 2),
        color: C.ink,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: C.brand600 }}>図解</div>
      <div style={{ fontSize: 34, fontWeight: 800, marginTop: 6, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ position: "relative", marginTop: 34, height: 420 }}>{children}</div>
    </div>
  );
}

function Box({ label, sub, color, style }: { label: string; sub?: string; color: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 150, padding: "18px 0", borderRadius: 22, border: `3px solid ${color}`, background: `${color}14`, textAlign: "center", ...style }}>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{label}</div>
      {sub && <div style={{ fontSize: 18, fontWeight: 700, color: C.gray500, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// 平文 →（同じ鍵で暗号化）→ 暗号文 →（同じ鍵で復号）→ 平文
function KeyFlow({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const t = frame - start;
  const enc = interpolate(t, [10, 40], [0, 1], clamp);
  const dec = interpolate(t, [50, 80], [0, 1], clamp);
  const scramble = "#$%&@*!?";
  const cipher = Array.from({ length: 4 }, (_, i) => scramble[(Math.floor(t / 3) + i * 3) % scramble.length]).join("");
  return (
    <>
      <Box label="平文" sub="会議は10時" color={C.brand600} style={{ left: 0, top: 0 }} />
      <div style={{ position: "absolute", left: 170, top: 30, fontSize: 56, transform: `translateX(${enc * 70}px) rotate(${enc * 360}deg)`, opacity: interpolate(enc, [0.75, 1], [1, 0], clamp) }}>🔑</div>
      <Box label="暗号文" sub={enc > 0.5 ? cipher : "…"} color={C.purple} style={{ left: 300, top: 0, opacity: interpolate(enc, [0.4, 0.8], [0.25, 1], clamp), transform: `scale(${0.9 + enc * 0.1})` }} />
      <div style={{ position: "absolute", left: 335, top: 190, fontSize: 56, transform: `translate(${-dec * 150}px, ${0}px) rotate(${-dec * 360}deg)`, opacity: interpolate(t, [44, 50], [0, 1], clamp) }}>🔑</div>
      <Box label="平文" sub="会議は10時" color={C.green} style={{ left: 0, top: 200, opacity: interpolate(dec, [0.5, 1], [0.2, 1], clamp) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, textAlign: "center", fontSize: 30, fontWeight: 800, color: C.brand700, opacity: interpolate(t, [84, 92], [0, 1], clamp) }}>
        鍵は<span style={{ color: C.orange }}>まったく同じ1本</span>
      </div>
    </>
  );
}

// 頭脳・作業机・引き出し
function ComputerParts({ start }: { start: number }) {
  const items = [
    { icon: "🧠", name: "CPU", role: "頭脳", c: "#E11D48" },
    { icon: "📝", name: "メモリ", role: "作業机", c: C.brand600 },
    { icon: "🗄️", name: "ストレージ", role: "引き出し", c: C.green },
  ];
  return (
    <>
      {items.map((it, i) => (
        <PartRow key={it.name} item={it} start={start + i * 14} top={i * 128} />
      ))}
    </>
  );
}

function PartRow({ item, start, top }: { item: { icon: string; name: string; role: string; c: string }; start: number; top: number }) {
  const frame = useCurrentFrame();
  const p = usePop(start, { damping: 8, stiffness: 180 });
  const wiggle = Math.sin((frame - start) / 4) * 6 * Math.max(0, 1 - (frame - start) / 30);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", alignItems: "center", gap: 20, padding: "16px 20px", borderRadius: 22, background: C.brand50, transform: `translateX(${(1 - p) * 500}px)` }}>
      <div style={{ fontSize: 60, transform: `rotate(${wiggle}deg) scale(${0.6 + p * 0.4})` }}>{item.icon}</div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{item.name}</div>
      </div>
      <div style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 999, background: item.c, color: C.white, fontSize: 26, fontWeight: 800 }}>{item.role}</div>
    </div>
  );
}

// 言葉がちがうと通じない → 共通ルール（プロトコル）なら通じる
function Protocol({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const t = frame - start;
  const agree = t > 52;
  const shake = !agree && t > 16 ? Math.sin(t * 1.4) * 6 : 0;
  const ok = usePop(start + 54, { damping: 8 });
  return (
    <>
      <Person x={10} face="🙂" lang="日本語" flag="🇯🇵" />
      <Person x={290} face="🙂" lang={agree ? "日本語" : "英語"} flag={agree ? "🇯🇵" : "🇬🇧"} />
      <div style={{ position: "absolute", left: 180, top: 60, fontSize: 64, transform: `translateX(${shake}px)`, opacity: agree ? 0 : interpolate(t, [10, 16], [0, 1], clamp) }}>❓</div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 250,
          padding: "20px 0",
          textAlign: "center",
          borderRadius: 22,
          fontSize: 32,
          fontWeight: 800,
          background: agree ? "#DCFCE7" : "#FEE2E2",
          color: agree ? C.green : C.red,
          transform: agree ? `scale(${0.8 + ok * 0.2})` : `translateX(${shake}px)`,
          opacity: interpolate(t, [14, 20], [0, 1], clamp),
        }}
      >
        {agree ? "✓ 同じルールで通じた！" : "✕ 言葉がちがう…"}
      </div>
    </>
  );
}

function Person({ x, face, lang, flag }: { x: number; face: string; lang: string; flag: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: 0, width: 150, padding: "18px 0", borderRadius: 24, border: `3px solid ${C.brand300}`, textAlign: "center", background: C.white }}>
      <div style={{ fontSize: 60 }}>{face}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>
        {flag} {lang}
      </div>
    </div>
  );
}
