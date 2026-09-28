"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import {
  Coin,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Person,
  Phone,
  Plant,
  Safe,
  ServerRack,
  Wall,
  WallWindow,
  type RouteTone,
} from "../scene/DioramaParts";
import { Callout, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { MoneySpot, TransactionSceneProps, TxLaneId } from "./transactionTypes";
import styles from "./transactiondiorama.module.css";

// トランザクションの図解：ネットバンキングの振込（口座A → 口座B に500円）。
// 手前の自宅でスマホの銀行アプリから振込を頼むと、銀行のデータセンターの勘定系システム（Transaction Engine）が
// 口座Aの金庫から500円を引き（debit）、口座Bの金庫へ足す（credit）。2つは「まとめて確定（コミット）」か「まとめて取消（ロールバック）」。
// 途中で障害が起きると片方だけ更新された危険な状態になり、再起動後に巻き戻して元に戻す。

const AT: Record<"a" | "engine" | "b", Vec3> = {
  a: { x: 300, y: 200, z: 0 },
  engine: { x: 460, y: 110, z: 0 },
  b: { x: 620, y: 200, z: 0 },
};
const MONEY_AT: Record<MoneySpot, Vec3> = {
  a: { x: AT.a.x, y: AT.a.y + 40, z: 74 },
  engine: { x: AT.engine.x + 30, y: AT.engine.y + 62, z: 40 },
  b: { x: AT.b.x, y: AT.b.y + 40, z: 74 },
};
const G = 3;
const LANE: Record<TxLaneId, Vec3[]> = {
  debit: [
    { x: AT.a.x + 26, y: AT.a.y + 44, z: G },
    { x: 400, y: 212, z: G },
    { x: AT.engine.x + 10, y: AT.engine.y + 72, z: G },
  ],
  credit: [
    { x: AT.engine.x + 50, y: AT.engine.y + 72, z: G },
    { x: 540, y: 212, z: G },
    { x: AT.b.x - 26, y: AT.b.y + 44, z: G },
  ],
};

/** お金が今の場所へ動くときに通る道（巻き戻しは逆向き） */
function moneyPath(to: MoneySpot, reverse: boolean, fromB: boolean): Vec3[] {
  const lift = (p: Vec3[]) => p.map((q) => ({ ...q, z: 20 }));
  // B 側から戻ってくるとき（巻き戻し・Bへ足した後の障害）は credit の車線を逆にたどる
  if (to === "engine") return reverse || fromB ? [...lift([...LANE.credit].reverse()), MONEY_AT.engine] : [...lift(LANE.debit), MONEY_AT.engine];
  if (to === "b") return [...lift(LANE.credit), MONEY_AT.b];
  return [...lift([...LANE.debit].reverse()), MONEY_AT.a];
}

const SHOT: Camera = { yaw: -16, pitch: 54, zoom: 0.92, fx: 400, fy: 220, fz: 50 };
const SHOT_ENGINE: Camera = { yaw: -16, pitch: 50, zoom: 1.2, fx: 460, fy: 170, fz: 60 };

const MONEY_WORD = { settled: "確定", crashed: "障害で停止", returning: "巻き戻し", pending: "未確定" } as const;

export function TransactionDioramaScene({ nodes, accounts, lanes, reverse, money, alert, reducedMotion }: TransactionSceneProps) {
  const crashed = nodes.engine === "error";
  const shot = crashed || money?.spot === "engine" ? SHOT_ENGINE : SHOT;
  const laneTone = (id: TxLaneId): RouteTone =>
    lanes[id] !== "active" ? "idle" : crashed ? "danger" : reverse ? "warn" : id === "debit" ? "request" : "response";

  return (
    <DioramaStage
      testId="tx-scene"
      ariaLabel="ネットバンキングの振込の模型。手前の自宅でスマホの銀行アプリを操作する人、奥の銀行のデータセンターに勘定系システム（トランザクションエンジン）と、口座Aと口座Bの金庫が並ぶ"
      shot={shot}
      shotKey={`${money?.spot ?? "-"}-${money?.state ?? ""}-${nodes.engine}-${reverse ? "r" : ""}`}
      forward
      reducedMotion={reducedMotion}
      tokens={{ money: { at: money ? MONEY_AT[money.spot] : null, path: money ? moneyPath(money.spot, reverse, money.state === "crashed") : undefined } }}
      world={
        <>
          <Floor x={0} y={20} w={800} d={410} h={16} material="plain" />

          {/* ---------- 自宅：スマホの銀行アプリで振込 ---------- */}
          <Floor x={16} y={270} w={220} d={150} h={5} z={4} material="wood" />
          <Group z={4}>
            <Desk x={110} y={336} w={96} d={50} tone="wood" />
            <Phone x={124} y={330} z={44} scale={0.8} glow screen={<div className={styles.bankApp}>振込 500円</div>} />
            <Person x={96} y={392} pose="sit" shirt="#e0803a" size={0.9} />
            <Plant x={36} y={292} size={0.8} />
          </Group>

          {/* ---------- 銀行のデータセンター（勘定系システムと金庫室） ---------- */}
          <Floor x={240} y={36} w={560} d={300} h={5} z={4} material="dc" />
          <Wall x={240} y={36} length={560} h={130} tone="dc">
            <WallWindow left={30} top={20} w={80} h={40} />
          </Wall>
          <Group z={4}>
            <Group data={{ "data-illustration": "tx-engine", "data-node": "engine", "data-state": nodes.engine }}>
              <ServerRack x={AT.engine.x} y={AT.engine.y} state={nodes.engine} accent={crashed ? "#e11d48" : "#2f6fdb"} />
              <ServerRack x={AT.engine.x + 66} y={AT.engine.y} state={nodes.engine === "active" ? "active" : nodes.engine} />
            </Group>
            <Safe x={AT.a.x} y={AT.a.y} state={nodes.a} data={{ "data-illustration": "vault-A", "data-node": "a", "data-state": nodes.a }} />
            <Safe x={AT.b.x} y={AT.b.y} state={nodes.b} data={{ "data-illustration": "vault-B", "data-node": "b", "data-state": nodes.b }} />
          </Group>

          {(["debit", "credit"] as TxLaneId[]).map((id) => (
            <FloorRoute
              key={id}
              points={reverse ? [...LANE[id]].reverse() : LANE[id]}
              width={9}
              z={9}
              tone={laneTone(id)}
              active={lanes[id] === "active"}
              data={{ "data-lane": id, "data-state": lanes[id] }}
            />
          ))}
          {/* 自宅のスマホから銀行へ（振込の依頼） */}
          <FloorRoute
            points={[
              { x: 160, y: 318, z: G },
              { x: 260, y: 300, z: G },
              { x: AT.engine.x, y: AT.engine.y + 90, z: G },
            ]}
            width={5}
            z={4.8}
            tone={nodes.engine === "idle" ? "idle" : "request"}
          />

          <DioramaToken id="money">
            {money && <Coin tone={money.state === "crashed" ? "danger" : money.state === "returning" ? "muted" : "warn"} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {money && (
            <DioramaLabel token="money" dz={10} place="above">
              <div
                className={styles.money}
                data-spot={money.spot}
                data-money-state={money.state}
                data-testid="money"
                role="img"
                aria-label={`500円（${MONEY_WORD[money.state]}）`}
              >
                ¥500 <span className={styles.moneyState}>{MONEY_WORD[money.state]}</span>
              </div>
            </DioramaLabel>
          )}

          {alert && (
            <DioramaLabel at={{ ...AT.engine, x: AT.engine.x + 33, z: 150 }} place="above">
              <div role="status" data-testid="tx-alert">
                <Callout tone={alert.tone === "ok" ? "ok" : "danger"} title={alert.title} body={alert.body} />
              </div>
            </DioramaLabel>
          )}

          {(["a", "b"] as const).map((id) => {
            const acc = accounts[id];
            return (
              <DioramaLabel key={id} at={{ ...AT[id], x: AT[id].x + (id === "a" ? -40 : 40), z: 40 }} place={id === "a" ? "left" : "right"}>
                <div
                  className={styles.balance}
                  data-account={id}
                  data-pending={acc.pending ? "true" : "false"}
                  data-settled={acc.settled ? "true" : "false"}
                  data-testid={`balance-${id}`}
                >
                  <span className={styles.balanceHead}>
                    口座{id.toUpperCase()}
                    {acc.locked && (
                      <span className={styles.lockChip} data-testid={`lock-${id}`}>
                        🔒 ロック中
                      </span>
                    )}
                  </span>
                  <span key={acc.balance} className={styles.balanceValue}>
                    {acc.balance.toLocaleString()}円
                  </span>
                  {acc.pending && <span className={styles.balanceNote}>未確定</span>}
                  {acc.settled && <span className={`${styles.balanceNote} ${styles.balanceNoteOk}`}>確定</span>}
                </div>
              </DioramaLabel>
            );
          })}

          <DioramaLabel at={{ ...AT.engine, x: AT.engine.x + 33, z: 124 }} place="above" optional>
            <div data-state={nodes.engine}>
              <NameChip name="Transaction Engine" sub="勘定系・まとめて確定／取消" tone={crashed ? "danger" : nodes.engine === "idle" ? "muted" : "info"} status={crashed ? "障害" : undefined} />
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ x: 110, y: 400, z: 0 }} place="below" optional>
            <NameChip name="あなた" sub="銀行アプリで振込" tone="info" />
          </DioramaLabel>
        </>
      }
    />
  );
}
