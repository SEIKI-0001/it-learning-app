"use client";

import type { CSSProperties } from "react";
import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import { Building, Desk, Floor, FloorRoute, Group, Paper, Person, Tree } from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken } from "../scene/DioramaStage";
import { SPOTS, SPOT_META, type Spot, type VennSceneProps } from "./threeCTypes";
import styles from "./threecdiorama.module.css";

// 3C分析の図解：駅前の商圏。
//   顧客＝駅から出てくる放課後の学生たち／競合＝通りの向かいのクレープ店／自社＝こちらのクレープの屋台
// 3つを調べると、それぞれの事実がメモになって真ん中の「作戦ボード」へ集まり、3つそろうと作戦が浮かぶ。
// 「材料費（コスト）」を4つめとして入れようとすると、ボードが受け付けない（3C＝顧客・競合・自社）。

const AT: Record<Spot, Vec3> = {
  customer: { x: 150, y: 250, z: 0 },
  competitor: { x: 640, y: 120, z: 0 },
  company: { x: 610, y: 340, z: 0 },
};
const BOARD: Vec3 = { x: 390, y: 250, z: 0 };
const MEMO_AT: Record<Spot, Vec3> = {
  customer: { x: BOARD.x - 26, y: BOARD.y + 4, z: 70 },
  competitor: { x: BOARD.x, y: BOARD.y + 4, z: 70 },
  company: { x: BOARD.x + 26, y: BOARD.y + 4, z: 70 },
};
const MEMO_START: Record<Spot, Vec3> = {
  customer: { x: AT.customer.x + 30, y: AT.customer.y, z: 60 },
  competitor: { x: AT.competitor.x - 40, y: AT.competitor.y + 50, z: 60 },
  company: { x: AT.company.x - 40, y: AT.company.y - 20, z: 60 },
};
const LABEL_AT: Record<Spot, Vec3> = {
  customer: { x: AT.customer.x, y: AT.customer.y + 40, z: 0 },
  competitor: { x: AT.competitor.x, y: AT.competitor.y - 20, z: 110 },
  company: { x: AT.company.x, y: AT.company.y + 50, z: 0 },
};

const SHOT_WIDE: Camera = { yaw: -16, pitch: 54, zoom: 0.88, fx: 400, fy: 230, fz: 40 };
const SHOT_FOCUS: Record<Spot, Camera> = {
  customer: { yaw: -14, pitch: 52, zoom: 1.08, fx: 230, fy: 230, fz: 50 },
  competitor: { yaw: -18, pitch: 52, zoom: 1.08, fx: 540, fy: 170, fz: 50 },
  company: { yaw: -18, pitch: 52, zoom: 1.08, fx: 520, fy: 300, fz: 50 },
};
const SHOT_BOARD: Camera = { yaw: -16, pitch: 50, zoom: 1.12, fx: 400, fy: 250, fz: 60 };

export function ThreeCDioramaScene({ researched, focus, costTries, strategy, onResearch, reducedMotion = false }: VennSceneProps & { reducedMotion?: boolean }) {
  const count = SPOTS.filter((s) => researched[s]).length;
  const complete = count === 3;
  const shot = complete ? SHOT_BOARD : focus ? SHOT_FOCUS[focus] : SHOT_WIDE;

  return (
    <DioramaStage
      testId="venn-3c"
      ariaLabel="駅前の商圏の模型。左に駅と放課後の学生（顧客）、右奥に通りの向かいのクレープ店（競合）、右手前に自社のクレープの屋台、真ん中に作戦ボード"
      shot={shot}
      shotKey={`${focus ?? "-"}-${count}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-complete": complete ? "true" : "false" }}
      tokens={Object.fromEntries(
        SPOTS.map((s) => [`memo-${s}`, { at: researched[s] ? MEMO_AT[s] : null, start: MEMO_START[s], path: [MEMO_AT[s]] }]),
      )}
      world={
        <>
          <Floor x={0} y={20} w={800} d={410} h={16} material="asphalt" />
          <Floor x={10} y={30} w={330} d={390} h={4} z={0} material="paving" />
          <Floor x={340} y={180} w={460} d={240} h={4} z={0} material="paving" />

          {/* ---------- 顧客：駅と、放課後の学生 ---------- */}
          <Group z={4} data={{ "data-spot-model": "customer" }}>
            <Building x={130} y={100} w={200} d={100} h={96} kind="tower" color="#d6e0ec" />
            <Person x={AT.customer.x - 30} y={AT.customer.y} pose="stand" shirt="#1e3a8a" size={0.85} />
            <Person x={AT.customer.x} y={AT.customer.y + 16} pose="stand" shirt="#1e3a8a" size={0.85} />
            <Person x={AT.customer.x + 28} y={AT.customer.y - 6} pose="stand" shirt="#334155" size={0.85} />
            <Person x={AT.customer.x - 6} y={AT.customer.y + 60} pose="stand" shirt="#1e3a8a" size={0.85} />
            <Tree x={40} y={390} size={0.8} />
          </Group>
          <FloorRoute
            points={[
              { x: 150, y: 160, z: 3 },
              { x: 200, y: 300, z: 3 },
              { x: 520, y: 330, z: 3 },
            ]}
            width={14}
            z={4.8}
            tone={researched.customer ? "request" : "idle"}
            active={researched.customer}
          />

          {/* ---------- 競合：通りの向かいのクレープ店 ---------- */}
          <Group z={4} data={{ "data-spot-model": "competitor" }}>
            <Building x={AT.competitor.x} y={AT.competitor.y} w={150} d={90} h={80} kind="store" color="#f7e3e6" />
            <Person x={AT.competitor.x - 30} y={AT.competitor.y + 76} pose="back" shirt="#64748b" size={0.8} />
            <Person x={AT.competitor.x} y={AT.competitor.y + 90} pose="back" shirt="#94a3b8" size={0.8} />
          </Group>

          {/* ---------- 自社：こちらのクレープの屋台 ---------- */}
          <Group z={4} data={{ "data-spot-model": "company" }}>
            <Desk x={AT.company.x} y={AT.company.y} w={120} d={50} h={44} tone="counter" />
            <Box x={AT.company.x - 60} y={AT.company.y - 30} z={44} w={4} d={4} h={50} color="#6b7280" />
            <Box x={AT.company.x + 56} y={AT.company.y - 30} z={44} w={4} d={4} h={50} color="#6b7280" />
            <Box x={AT.company.x - 64} y={AT.company.y - 40} z={94} w={128} d={30} h={4} color="#16a37a" faceClass={{ top: styles.awning }} />
            <Person x={AT.company.x + 10} y={AT.company.y - 30} pose="stand" shirt="#16a37a" size={0.9} />
          </Group>

          {/* ---------- 作戦ボード ---------- */}
          <Group z={4} data={{ "data-board": "true" }}>
            <Box x={BOARD.x - 4} y={BOARD.y - 2} w={4} d={4} h={50} color="#6b7280" />
            <Box x={BOARD.x - 54} y={BOARD.y - 4} z={50} w={108} d={6} h={56} color="#f8fafc" faceClass={{ front: styles.boardFace }} />
          </Group>

          {SPOTS.map((s) => (
            <DioramaToken key={s} id={`memo-${s}`}>
              <div className={styles.memo} style={{ "--tone": SPOT_META[s].tone } as CSSProperties}>
                <Paper tone="plain" />
              </div>
            </DioramaToken>
          ))}
        </>
      }
      labels={
        <>
          {/* 真ん中の作戦ボード */}
          <DioramaLabel at={{ ...BOARD, z: 110 }} place="above">
            <div className={styles.board} data-count={count} data-complete={complete ? "true" : "false"} data-testid="strategy-board">
              <span className={styles.boardTitle}>{complete ? "✨ 作戦" : `作戦 ${count}/3`}</span>
              {complete ? (
                <span className={styles.boardStrategy} data-testid="strategy">
                  {strategy}
                </span>
              ) : (
                <span className={styles.boardSlots} aria-hidden>
                  {SPOTS.map((s) => (
                    <span key={s} className={styles.slot} data-filled={researched[s] ? "true" : "false"} style={{ "--tone": SPOT_META[s].tone } as CSSProperties} />
                  ))}
                </span>
              )}
            </div>
          </DioramaLabel>

          {costTries > 0 && (
            <DioramaLabel at={{ ...BOARD, y: BOARD.y + 40, z: 0 }} place="below">
              <span key={costTries} className={styles.reject} role="status" data-testid="cost-reject">
                💰 材料費300円 → ✕ Cost（費用）は3Cに入らない
              </span>
            </DioramaLabel>
          )}

          {/* 3つの調べる場所（押して調べる） */}
          {SPOTS.map((s) => (
            <DioramaLabel key={s} at={LABEL_AT[s]} place={s === "competitor" ? "above" : "below"} interactive pinned>
              <div className={styles.spotBox} data-spot={s} data-focus={focus === s ? "true" : "false"} style={{ "--tone": SPOT_META[s].tone } as CSSProperties}>
                <span className={styles.spotName}>
                  {SPOT_META[s].label}
                  <small>{SPOT_META[s].en}</small>
                </span>
                {researched[s] ? (
                  <button type="button" onClick={() => onResearch(s)} className={styles.fact} data-testid={`fact-${s}`} aria-pressed={focus === s}>
                    {SPOT_META[s].short}
                  </button>
                ) : (
                  <button type="button" onClick={() => onResearch(s)} className={styles.probe} aria-pressed={false}>
                    🔍 {SPOT_META[s].action}
                  </button>
                )}
              </div>
            </DioramaLabel>
          ))}
        </>
      }
    />
  );
}
