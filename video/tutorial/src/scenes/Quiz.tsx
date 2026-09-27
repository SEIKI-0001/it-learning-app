// 5. 解く：正解するたびにポップ・XP・コンボ。3連続目からはコンボボーナス（lib/study.ts と同じ +10XP / +2XP）。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, Confetti, Kinetic, Phone, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

const QUESTIONS = [
  { q: "短い期間で小さく作って確認し、改善を繰り返す開発の考え方はどれでしょう？", choices: ["ウォーターフォール開発", "SLA", "正規化", "アジャイル開発"], answer: 3, at: 0, tap: 34 },
  { q: "暗号化と復号に、同じ鍵を使う方式はどれでしょう？", choices: ["公開鍵暗号方式", "共通鍵暗号方式", "ハッシュ関数", "デジタル署名"], answer: 1, at: 62, tap: 86 },
  { q: "電源を切ると内容が消える、コンピュータの「作業机」は？", choices: ["CPU", "ストレージ", "メモリ（主記憶）", "ルータ"], answer: 2, at: 110, tap: 132 },
];
const XP_AFTER = [10, 20, 32];
// コンボ数に応じて熱量が上がる配色（アプリの TopicQuiz と同じ 橙 → 赤 → 紫）
const COMBO_COLOR = [C.orange, C.orange, C.red, C.purple];

export const quizCues = (): Cue[] =>
  QUESTIONS.flatMap((q, i) => [
    { at: q.at + 2, sfx: "whoosh" as const, volume: 0.25 },
    { at: q.tap, sfx: "correct" as const, volume: 0.6 },
    { at: q.tap + 8, sfx: "coin" as const, volume: 0.45 },
    ...(i === 2 ? [{ at: q.tap + 4, sfx: "fanfare" as const, volume: 0.55 }] : []),
  ]);

export function Quiz({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const idx = QUESTIONS.reduce((n, q, i) => (frame >= q.at ? i : n), 0);
  const q = QUESTIONS[idx];
  const answered = frame >= q.tap;
  const combo = QUESTIONS.filter((x) => frame >= x.tap).length;
  const xpTarget = combo ? XP_AFTER[combo - 1] : 0;
  const prevXp = combo > 1 ? XP_AFTER[combo - 2] : 0;
  const lastTap = combo ? QUESTIONS[combo - 1].tap : 0;
  const xp = Math.round(interpolate(frame, [lastTap + 6, lastTap + 18], [prevXp, xpTarget], clamp));
  const slideIn = usePop(q.at, { damping: 14, stiffness: 170 });
  const phoneIn = usePop(0, { damping: 13, stiffness: 110 });
  const comboPop = usePop(lastTap + 2, { damping: 7, stiffness: 220 });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from={C.brand600} to={C.brand950} seed={41} />
      <div style={{ position: "absolute", left: 220, top: 98, perspective: 1600 }}>
        <div style={{ transform: `translateY(${(1 - phoneIn) * 900}px) rotateY(14deg) rotateX(4deg)` }}>
          <Phone scale={1.02}>
            <div style={{ padding: "56px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.gray500 }}>確認問題</div>
                {combo >= 2 && (
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: COMBO_COLOR[combo], color: C.white, fontSize: 15, fontWeight: 800, transform: `scale(${0.7 + comboPop * 0.3})` }}>
                    {combo}コンボ{combo >= 3 ? " +2XP" : ""}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 800, color: C.brand600 }}>正解 {combo} / 4</div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ flex: 1, height: 10, borderRadius: 6, background: i < combo ? C.brand500 : "#E5EAF2" }} />
                ))}
              </div>
              <div style={{ transform: `translateX(${(1 - slideIn) * 420}px)`, opacity: slideIn }}>
                <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.55, marginTop: 26, minHeight: 130 }}>
                  Q{idx + 1}. {q.q}
                </div>
                {q.choices.map((c, i) => {
                  const right = answered && i === q.answer;
                  return (
                    <div
                      key={c}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginTop: 12,
                        padding: "16px 16px",
                        borderRadius: 16,
                        border: `2px solid ${right ? C.green : "#E5EAF2"}`,
                        background: right ? "#DCFCE7" : C.white,
                        transform: right ? `scale(${1 + Math.max(0, 1 - (frame - q.tap) / 8) * 0.06})` : undefined,
                        fontSize: 19,
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: right ? C.green : C.brand50, color: right ? C.white : C.brand600, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
                        {right ? "✓" : "ABCD"[i]}
                      </div>
                      {c}
                      {i === q.answer && <Tap at={q.tap} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </Phone>
        </div>
      </div>

      {/* 右側：コンボと XP を大きく */}
      <div style={{ position: "absolute", left: 900, top: 150, width: 900 }}>
        <Kinetic start={scene.lines[0].from + 2} size={88} segs={[{ t: "解けば、" }]} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 10 }}>
          <div style={{ fontSize: 260, fontWeight: 900, lineHeight: 1, color: COMBO_COLOR[combo] ?? C.white, transform: `scale(${0.6 + comboPop * 0.4}) rotate(${(1 - comboPop) * -10}deg)`, textShadow: "0 12px 30px rgba(0,0,0,0.35)", opacity: combo ? 1 : 0.25 }}>
            {combo || 0}
          </div>
          <div style={{ fontSize: 120, fontWeight: 900, color: C.white }}>コンボ！</div>
        </div>
        <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 18, padding: "18px 40px", borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "3px solid rgba(255,255,255,0.3)" }}>
          <span style={{ fontSize: 60 }}>⭐</span>
          <span style={{ fontSize: 88, fontWeight: 900, color: C.sun, fontVariantNumeric: "tabular-nums" }}>{xp}</span>
          <span style={{ fontSize: 56, fontWeight: 900, color: C.white }}>XP</span>
        </div>
      </div>

      {/* 正解のたびに +XP が舞い上がる */}
      {QUESTIONS.map((x, i) =>
        frame >= x.tap ? <XpFloat key={i} at={x.tap} text={i === 2 ? "+10 +2 XP" : "+10 XP"} /> : null,
      )}
      <Confetti start={QUESTIONS[2].tap + 2} x={1250} y={420} count={90} seed={5} />
    </AbsoluteFill>
  );
}

function Tap({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -14 || t > 16) return null;
  const approach = interpolate(t, [-14, 0], [1, 0], clamp);
  const ring = interpolate(t, [0, 16], [0, 1], clamp);
  return (
    <>
      <div style={{ position: "absolute", right: 40, top: 14, fontSize: 52, transform: `translate(${approach * 60}px, ${approach * 80}px) scale(${t >= 0 && t < 4 ? 0.85 : 1})`, opacity: t > 8 ? 0 : 1 }}>👆</div>
      {t >= 0 && <div style={{ position: "absolute", right: 30, top: 0, width: 80, height: 80, borderRadius: "50%", border: `4px solid ${C.green}`, transform: `scale(${0.3 + ring * 1.6})`, opacity: 1 - ring }} />}
    </>
  );
}

function XpFloat({ at, text }: { at: number; text: string }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t > 34) return null;
  const y = interpolate(t, [0, 34], [0, -220], { ...clamp, easing: (k) => 1 - (1 - k) ** 2 });
  return (
    <div style={{ position: "absolute", left: 700, top: 520 + y, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: C.sun, textShadow: "0 6px 18px rgba(0,0,0,0.4)", opacity: interpolate(t, [0, 4, 26, 34], [0, 1, 1, 0], clamp), transform: `scale(${interpolate(t, [0, 6], [0.5, 1], clamp)})` }}>
      {text}
    </div>
  );
}
