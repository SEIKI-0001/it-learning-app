"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { SceneTimeline } from "@/components/experiences/scene/SceneTimeline";
import { useReducedMotion } from "@/components/experiences/scene/useReducedMotion";
import { useStepPlayer } from "@/components/experiences/scene/useStepPlayer";
import { Scene3DGate, Scene3DLoading } from "@/components/experiences/scene3d/Scene3DGate";
import { layoutScene } from "@/lib/explain3d/layout3d";
import type { GeneratedScene } from "@/lib/explain3d/types";
import GeneratedDiorama from "./GeneratedDiorama";

// AI が組んだ場面の再生。コマの状態とタイムラインをここで持ち、
// WebGL2 が使える端末では部品キットの3D（GeneratedScene3D）、使えない端末では CSS の模型（GeneratedDiorama）へ渡す。

const GeneratedScene3D = dynamic(() => import("./GeneratedScene3D"), { ssr: false, loading: Scene3DLoading });

export default function ExplainPlayer({ scene }: { scene: GeneratedScene }) {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(scene.steps.length, reducedMotion);
  const layout = useMemo(() => layoutScene(scene), [scene]);
  const step = scene.steps[player.index];
  const view = { scene, index: player.index, forward: player.forward, reducedMotion };

  return (
    <div data-testid="explain-generated" data-step={player.index}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-brand-700">
          STEP {player.index + 1} / {scene.steps.length}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="explain-step-title">
          {step.title}
        </p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <Scene3DGate name="ExplainScene3D" flat={<GeneratedDiorama {...view} />} scene3d={<GeneratedScene3D {...view} layout={layout} />} />
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={scene.steps}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel={`${scene.title}を再生`}
          timelineLabel={`${scene.title}のタイムライン`}
        />
      </div>
    </div>
  );
}
