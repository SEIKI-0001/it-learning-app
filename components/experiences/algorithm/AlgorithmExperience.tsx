"use client";

import { useState, type ReactNode } from "react";
import AlgorithmStepShell from "./AlgorithmStepShell";
import { ComputerStep, OrderStep, ProcedureStep } from "./AlgorithmSteps";
import {
  COMPUTER_ACTIONS,
  isCorrectNoodleOrder,
  type NoodleActionId,
} from "./learningModel";

const STEP_TITLES = [
  "カップ麺を作る順番を並べよう",
  "順番が違うとどうなる？",
  "コンピュータも順番に動く",
  "数字を入れる箱",
  "同じ処理を繰り返す",
  "フローチャートを読んでみよう",
  "試験で使う正式な表現",
] as const;

export default function AlgorithmExperience() {
  const [step, setStep] = useState(1);
  const [noodleOrder, setNoodleOrder] = useState<NoodleActionId[]>([]);
  const [orderAnswer, setOrderAnswer] = useState<"works" | "fails" | null>(
    null,
  );
  const [executedLines, setExecutedLines] = useState(0);

  let content: ReactNode = null;
  let canContinue = false;
  let blockedHint = "この体験を終えると次へ進めます";

  switch (step) {
    case 1:
      content = (
        <ProcedureStep
          order={noodleOrder}
          onSelect={(action) =>
            setNoodleOrder((current) =>
              current.includes(action) ? current : [...current, action],
            )
          }
          onReset={() => setNoodleOrder([])}
        />
      );
      canContinue = isCorrectNoodleOrder(noodleOrder);
      blockedHint = "正しい順番に並べると次へ進めます";
      break;
    case 2:
      content = <OrderStep answer={orderAnswer} onAnswer={setOrderAnswer} />;
      canContinue = orderAnswer !== null;
      blockedHint = "どちらかを選んでください";
      break;
    case 3:
      content = (
        <ComputerStep
          executedLines={executedLines}
          onExecute={() =>
            setExecutedLines((current) =>
              Math.min(COMPUTER_ACTIONS.length, current + 1),
            )
          }
        />
      );
      canContinue = executedLines === COMPUTER_ACTIONS.length;
      blockedHint = "4行すべてを実行してください";
      break;
    default:
      content = null;
  }

  return (
    <AlgorithmStepShell
      step={step}
      title={STEP_TITLES[step - 1]}
      canContinue={canContinue}
      blockedHint={blockedHint}
      onBack={() => setStep((current) => Math.max(1, current - 1))}
      onNext={() => setStep((current) => Math.min(7, current + 1))}
    >
      {content}
    </AlgorithmStepShell>
  );
}
