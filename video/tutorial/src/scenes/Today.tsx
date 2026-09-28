// 3. 毎日：開くと今日やることがもう用意されている（アプリの Today 画面を再現）。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Backdrop, Kinetic, Phone, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

const TASKS = [
  { title: "開発プロセス", tag: "新規", min: 8, color: C.brand500 },
  { title: "システムの運用と保守", tag: "新規", min: 8, color: C.brand400 },
  { title: "確認問題 4問", tag: "復習", min: 5, color: C.orange },
];
const TASK_AT = [34, 46, 58];
const COUNT_FROM = 18;
const COUNT_TO = 21;

export const todayCues = (): Cue[] => [
  ...Array.from({ length: 8 }, (_, i) => ({ at: COUNT_FROM + i * 2, sfx: "tick" as const, volume: 0.35 })),
  ...TASK_AT.map((at) => ({ at: at + 4, sfx: "thud" as const, volume: 0.55 })),
  { at: 92, sfx: "pop", volume: 0.5 },
];

export function Today({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const phoneIn = usePop(2, { damping: 13, stiffness: 110 });
  const minutes = Math.round(interpolate(frame, [COUNT_FROM, COUNT_FROM + 16], [0, COUNT_TO], clamp));
  const peek = usePop(90, { damping: 9 });
  const float = Math.sin(frame / 14) * 10;

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from={C.brand500} to={C.brand800} seed={21} />
      <div style={{ position: "absolute", left: 130, top: 300 }}>
        <div style={{ color: C.mint, fontSize: 40, fontWeight: 800, marginBottom: 18 }}>開けば、もう決まってる</div>
        <Kinetic start={scene.lines[0].from - 6} size={104} segs={[{ t: "今日やることは" }, { t: "\n" }, { t: "ぼくが用意", color: C.sun }, { t: "するよ" }]} />
      </div>

      <div style={{ position: "absolute", left: 1080, top: 40, perspective: 1600 }}>
        <div style={{ transform: `translateX(${(1 - phoneIn) * 900}px) translateY(${float}px) rotateY(${-22 + phoneIn * 6}deg) rotateX(6deg) rotateZ(${(1 - phoneIn) * 10}deg)` }}>
          <Phone scale={1.14}>
            <div style={{ padding: "54px 24px 0" }}>
              <div style={{ fontSize: 15, color: C.gray500, fontWeight: 600 }}>今日の学習　9月27日(日)</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10, lineHeight: 1.4 }}>
                あと<span style={{ color: C.brand600, fontSize: 44, display: "inline-block", transform: `scale(${1 + (frame >= COUNT_FROM && frame < COUNT_FROM + 18 ? 0.12 : 0)})` }}>{minutes}</span>分で、
                <br />
                今日のぶんが終わります。
              </div>
              <div style={{ fontSize: 14, color: C.gray500, marginTop: 8 }}>3件のうち0件完了　予定 {COUNT_TO}分</div>
              {/* 時間の帯 */}
              <div style={{ display: "flex", gap: 4, marginTop: 18, height: 34 }}>
                {TASKS.map((t, i) => {
                  const p = interpolate(frame, [TASK_AT[i] - 10, TASK_AT[i] + 4], [0, 1], clamp);
                  return <div key={t.title} style={{ flex: t.min * p + 0.001, background: t.color, borderRadius: 8, opacity: p }} />;
                })}
              </div>
              <div style={{ marginTop: 26, fontSize: 16, fontWeight: 800 }}>今日の順番</div>
              {TASKS.map((t, i) => (
                <TaskRow key={t.title} task={t} index={i} start={TASK_AT[i]} />
              ))}
              <div style={{ marginTop: 18, borderRadius: 18, background: C.brand50, padding: "16px 18px", fontSize: 15, fontWeight: 700, color: C.brand800, opacity: interpolate(frame, [70, 80], [0, 1], clamp) }}>
                🎯 今日のミッション　3つそろうと宝箱 (+10 XP)
              </div>
            </div>
          </Phone>
        </div>
        <div style={{ position: "absolute", left: -190, top: 720, transform: `translateY(${(1 - peek) * 300}px) rotate(${-8 + Math.sin(frame / 8) * 4}deg)` }}>
          <Mochit size={300} mood="smile" look={0.8} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TaskRow({ task, index, start }: { task: (typeof TASKS)[number]; index: number; start: number }) {
  const p = usePop(start, { damping: 10, stiffness: 170 });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 12,
        padding: "16px 16px",
        borderRadius: 18,
        border: `2px solid ${index === 0 ? C.brand300 : "#E5EAF2"}`,
        background: index === 0 ? C.brand50 : C.white,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${(1 - p) * -120}px) scale(${0.8 + p * 0.2})`,
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${task.color}`, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{task.title}</div>
        <div style={{ fontSize: 13, color: task.tag === "復習" ? C.orange : C.brand600, fontWeight: 700, marginTop: 4 }}>{task.tag}</div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.gray500 }}>{task.min}分</div>
    </div>
  );
}
