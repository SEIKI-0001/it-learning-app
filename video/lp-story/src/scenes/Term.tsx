// 2. 悩み①「分からない」：用語が語に合わせて現れ、奥へ沈んで「仕組みが浮かばない」へ。
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Eyebrow, Night, Rise, easeInOutCubic, progress } from "../parts/motion";
import { BODY, C, DISP } from "../theme";
import type { Scene } from "../timeline";

const SHU_ON_DARK = "#ff8a73";

const TERMS = [
  { t: "TCP/IP", x: 230, y: 230, size: 150, drift: [-1, 0.6] },
  { t: "正規化", x: 1240, y: 190, size: 140, drift: [1, 0.4] },
  { t: "公開鍵暗号", x: 640, y: 640, size: 140, drift: [0.4, -1] },
] as const;

export function Term({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l1, l2] = scene.lines;
  const sink = progress(frame, l2.from - 6, 26, easeInOutCubic);

  return (
    <AbsoluteFill>
      <Night />
      <div style={{ position: "absolute", left: 150, top: 110 }}>
        <Eyebrow text="つまずき 1 ｜ 分からない" at={4} color={C.mist} size={30} />
      </div>

      {TERMS.map((term, i) => {
        const at = l1.onsets[i];
        const p = progress(frame, at, 24);
        const t = frame - at;
        return (
          <div
            key={term.t}
            style={{
              position: "absolute",
              left: term.x + term.drift[0] * t * 0.35 + (term.x - 760) * sink * 0.35,
              top: term.y + term.drift[1] * t * 0.25 + (term.y - 470) * sink * 0.5,
              fontFamily: DISP,
              fontWeight: 600,
              fontSize: term.size,
              letterSpacing: "0.04em",
              color: C.white,
              opacity: p * (1 - sink * 0.92),
              transform: `scale(${(0.94 + p * 0.06) * (1 - sink * 0.1)})`,
              filter: `blur(${(1 - p) * 14 + sink * 10}px)`,
              whiteSpace: "nowrap",
            }}
          >
            {term.t}
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Rise runs="文字だけでは、" at={l2.onsets[0] + 2} size={84} color={C.mist} weight={500} />
        <Rise runs="仕組みが浮かばない。" at={l2.onsets[0] + 16} size={112} color={C.white} style={{ marginTop: 10 }} />
        <div style={{ marginTop: 44 }}>
          <Rise runs={[{ t: "そして、" }, { t: "丸暗記", color: SHU_ON_DARK }, { t: "になりがち。" }]} at={l2.onsets[1]} size={50} font={BODY} weight={500} color={C.mist} stagger={0.6} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
