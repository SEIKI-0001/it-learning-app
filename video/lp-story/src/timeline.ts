// 動画側のタイムライン。台本を直して `npm run voice` を回せば、映像側のタイミングも自動で追従する。
import manifest from "./voice-manifest.json";
import { buildScenes, type SceneId } from "./timelineCore";

export * from "./timelineCore";

export const SCENES = buildScenes(manifest.lines);
export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0);
export const sceneOf = (id: SceneId) => SCENES.find((s) => s.id === id)!;
