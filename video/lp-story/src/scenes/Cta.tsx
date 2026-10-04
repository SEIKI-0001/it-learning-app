// 9. 呼びかけ：サービス名・無料で始められること・URL。音声クレジット（VOICEVOX 規約で必須）もここに出す。
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Paper, Rise, easeOutExpo, progress } from "../parts/motion";
import { BODY, C } from "../theme";
import type { Scene } from "../timeline";

export function Cta({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l] = scene.lines;
  const pop = progress(frame, 0, 26, easeOutExpo);
  const chip = progress(frame, l.onsets[0] + 8, 20, easeOutExpo);
  const url = progress(frame, l.onsets[2], 22, easeOutExpo);
  const credit = progress(frame, 20, 20);

  return (
    <AbsoluteFill>
      <Paper />
      <div style={{ position: "absolute", left: 960 - 130, top: 70, opacity: pop, transform: `translateY(${(1 - pop) * 40}px)` }}>
        <Mochit size={260} mood={frame >= l.from && frame < l.from + l.frames ? "talk" : "smile"} wave={frame > l.onsets[1] && frame < l.onsets[1] + 70} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", justifyContent: "center" }}>
        <Rise runs="ITパスポート学習コーチ" at={4} size={100} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 510, display: "flex", justifyContent: "center", opacity: chip, transform: `translateY(${(1 - chip) * 16}px)` }}>
        <div style={{ padding: "12px 34px", borderRadius: 999, border: `2px solid ${C.wakaba}`, background: "#ecf8f2", color: "#13784f", fontFamily: BODY, fontWeight: 700, fontSize: 38, letterSpacing: "0.06em" }}>
          教材と公式過去問は無料
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 628, display: "flex", justifyContent: "center" }}>
        <Rise runs="今日の一歩を、ここから。" at={l.onsets[1]} size={70} color={C.sub} weight={500} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", opacity: url, transform: `translateY(${(1 - url) * 24}px) scale(${0.96 + url * 0.04})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 64px", borderRadius: 999, background: C.ai, color: C.white, fontFamily: BODY, fontWeight: 700, fontSize: 54, letterSpacing: "0.03em", boxShadow: "0 20px 44px rgba(41,70,206,0.3)" }}>
          shikaku-mochit.com
          <span style={{ fontSize: 46 }}>→</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontFamily: BODY, fontSize: 24, color: C.sub, opacity: credit, letterSpacing: "0.05em" }}>
        音声：VOICEVOX:春日部つむぎ
      </div>
    </AbsoluteFill>
  );
}
