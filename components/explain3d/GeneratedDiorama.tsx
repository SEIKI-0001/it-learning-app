"use client";

import { Box } from "@/components/experiences/scene/Diorama3D";
import {
  Appliance,
  Building,
  Coin,
  Database,
  Desk,
  Envelope,
  Floor,
  FloorRoute,
  Group,
  KeyGlyph,
  Laptop,
  Monitor,
  Paper,
  Parcel,
  Person,
  Phone,
  Safe,
  ServerRack,
  Truck,
  WifiRouter,
  type CarryTone,
  type PartState,
  type RouteTone,
} from "@/components/experiences/scene/DioramaParts";
import { DataTag, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "@/components/experiences/scene/DioramaStage";
import { SceneTimeline } from "@/components/experiences/scene/SceneTimeline";
import { useReducedMotion } from "@/components/experiences/scene/useReducedMotion";
import { useStepPlayer } from "@/components/experiences/scene/useStepPlayer";
import {
  OVERVIEW,
  WORLD,
  actorTop,
  movePath,
  placeActors,
  stepCamera,
  stepFocus,
  type PlacedActor,
} from "@/lib/explain3d/layout";
import type { GeneratedScene, SceneMove, StepTone } from "@/lib/explain3d/types";

// AI が決まった部品と動きだけで組んだ場面を、共通の舞台（DioramaStage）で再生する。
// 置き方・道・カメラは lib/explain3d/layout が決める。AI の文は名札・札・吹き出しの文字としてだけ使う。

const TONE_CARRY: Record<StepTone, CarryTone> = { info: "info", ok: "ok", danger: "danger" };
const TONE_ROUTE: Record<StepTone, RouteTone> = { info: "request", ok: "response", danger: "danger" };
const TONE_TAG: Record<StepTone, "info" | "ok" | "danger"> = { info: "info", ok: "ok", danger: "danger" };

function Actor({ actor, state }: { actor: PlacedActor; state: PartState }) {
  const { x, y } = actor.at;
  const on = state === "active";
  switch (actor.kind) {
    case "pc":
      return (
        <>
          <Desk x={x} y={y} w={92} d={56} />
          <Monitor x={x} y={y} glow={on} tone={state === "error" ? "dark" : "light"} />
        </>
      );
    case "laptop":
      return (
        <>
          <Desk x={x} y={y} w={84} d={54} tone="wood" />
          <Laptop x={x} y={y} glow={on} tone={state === "error" ? "dark" : "light"} />
        </>
      );
    case "phone":
      return (
        <>
          <Box x={x - 16} y={y - 12} w={32} d={24} h={30} color="#9aa3b0" />
          <Phone x={x} y={y} z={30} glow={on} tone={state === "error" ? "dark" : "light"} />
        </>
      );
    case "server":
      return <ServerRack x={x} y={y} state={state} />;
    case "database":
      return <Database x={x} y={y} state={state} />;
    case "router":
    case "switch":
    case "firewall":
      return <Appliance x={x} y={y} kind={actor.kind} stand={34} state={state} />;
    case "wifi":
      return (
        <>
          <Box x={x - 18} y={y - 12} w={36} d={24} h={44} color="#8a93a1" />
          <WifiRouter x={x} y={y} z={44} on={state !== "error"} />
        </>
      );
    case "person":
      return <Person x={x} y={y} active={on} />;
    case "attacker":
      return <Person x={x} y={y} pose="attacker" active={on || state === "error"} />;
    case "safe":
      return <Safe x={x} y={y} state={state} />;
    case "truck":
      return <Truck x={x} y={y} />;
    case "house":
      return <Building x={x} y={y} w={90} d={76} h={66} kind="house" state={state} />;
    default:
      return <Building x={x} y={y} w={96} d={80} h={88} kind={actor.kind} state={state} />;
  }
}

function Carry({ move, tone }: { move: SceneMove; tone: StepTone }) {
  const t = move.locked ? "secure" : TONE_CARRY[tone];
  switch (move.item) {
    case "envelope":
      return <Envelope tone={t} sealed={move.locked} />;
    case "paper":
      return <Paper tone={t} />;
    case "key":
      return <KeyGlyph kind="common" />;
    case "coin":
      return <Coin />;
    default:
      return <Parcel tone={t} mark={move.locked ? "lock" : tone === "danger" ? "alert" : tone === "ok" ? "check" : "none"} />;
  }
}

export default function GeneratedDiorama({ scene }: { scene: GeneratedScene }) {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(scene.steps.length, reducedMotion);
  const step = scene.steps[player.index];
  const placed = placeActors(scene);
  const path = step.move ? movePath(step.move, placed) : [];
  const focus = stepFocus(step, placed);
  const stateOf = (id: string): PartState => (step.alert.includes(id) ? "error" : step.active.includes(id) ? "active" : "idle");
  const actorNames = scene.actors.map((a) => a.name).join("・");

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
        <DioramaStage
          testId="explain-scene"
          ariaLabel={`${scene.title}の模型。${actorNames}が並んでいる`}
          // 最初のコマは全体（登場する物をひととおり見せる）、あとは動きの両端か主役へ寄る
          shot={player.index === 0 ? OVERVIEW : stepCamera(step, placed)}
          shotKey={player.index}
          forward={player.forward}
          reducedMotion={reducedMotion}
          caption={{ id: player.index, text: step.caption, tone: step.tone, ...(focus ? { at: focus } : {}) }}
          tokens={{ carry: { at: path.length ? path[path.length - 1] : null, path: path.length ? path : undefined } }}
          world={
            <>
              <Floor x={0} y={-10} w={WORLD.w} d={WORLD.d} h={16} material="plain" />
              {path.length > 1 && step.move && (
                <FloorRoute points={path} width={7} z={4.8} tone={step.move.locked ? "secure" : TONE_ROUTE[step.tone]} active />
              )}
              {placed.map((a) => (
                <Group key={a.id} data={{ "data-actor": a.id, "data-kind": a.kind, "data-state": stateOf(a.id) }}>
                  <Actor actor={a} state={stateOf(a.id)} />
                </Group>
              ))}
              <DioramaToken id="carry">{step.move && <Carry move={step.move} tone={step.tone} />}</DioramaToken>
            </>
          }
          labels={
            <>
              {step.move && (
                <DioramaLabel token="carry" dz={14} place="above">
                  <div data-testid="explain-carry">
                    <DataTag tag={step.move.tag} body={step.move.body} tone={step.move.locked ? "secure" : TONE_TAG[step.tone]} />
                  </div>
                </DioramaLabel>
              )}
              {placed.map((a) => {
                const state = stateOf(a.id);
                return (
                  <DioramaLabel key={a.id} at={{ x: a.at.x, y: a.at.y, z: actorTop(a.kind) + 6 }} place="above" optional={state === "idle"}>
                    <NameChip name={a.name} tone={state === "error" ? "danger" : state === "active" ? "info" : "muted"} />
                  </DioramaLabel>
                );
              })}
            </>
          }
        />
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
