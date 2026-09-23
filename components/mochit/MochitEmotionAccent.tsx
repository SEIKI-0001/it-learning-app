import type { CSSProperties } from "react";
import type { MochitEvent } from "./mochitEvents";

export default function MochitEmotionAccent({ event }: { event: MochitEvent }) {
  const correct = ["correct", "correctStreak", "allCorrect", "taskComplete", "focusComplete", "badgeEarned", "checkpointClear"].includes(event);
  const affectionate = event === "tap" || event === "wakeUp";
  if (!correct && !affectionate && event !== "incorrect") return null;
  return <div aria-hidden="true" data-testid="mochit-emotion-accent" data-emotion={correct ? "celebrate" : affectionate ? "love" : "care"} className="mochit-emotion-accent pointer-events-none absolute inset-0">
    {correct ? <>
      {[[-1,-1],[1,-1],[-1,0.1],[1,0.1],[-0.6,-1.4],[0.6,-1.4]].map(([x,y], i) => <svg key={i} viewBox="0 0 24 24" className="mochit-spark" style={{ '--spark-x': `${x * 46}px`, '--spark-y': `${y * 32}px`, '--spark-delay': `${i * 65}ms` } as CSSProperties}><path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill={i % 2 ? '#efb83f' : '#6dcac1'} /></svg>)}
      <svg viewBox="0 0 108 108" className="mochit-cheer-rays absolute inset-0 h-full w-full"><path d="m17 38-8-5m14-8-5-8m69 21 8-5m-14-8 5-8M54 12V3" stroke="#eab449" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>
    </> : <span className="mochit-feeling">{affectionate ? '♥' : '…'}</span>}
  </div>;
}
