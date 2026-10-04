import { Composition } from "remotion";
import { LpStory } from "./LpStory";
import { FPS, H, W } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

export function Root() {
  return <Composition id="LpStory" component={LpStory} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />;
}
