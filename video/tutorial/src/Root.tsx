import { Composition } from "remotion";
import { Tutorial } from "./Tutorial";
import { FPS, H, W } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

export function Root() {
  return <Composition id="Tutorial" component={Tutorial} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />;
}
