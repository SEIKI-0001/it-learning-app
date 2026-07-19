"use client";

import { useEffect, useState, type ReactNode } from "react";
import AlgorithmStepShell from "./AlgorithmStepShell";
import {
  BoxStep,
  ComputerStep,
  ExamExpressionStep,
  FlowchartStep,
  OrderStep,
  ProcedureStep,
  RepetitionStep,
} from "./AlgorithmSteps";
import {
  addCurrentNumber,
  COMPUTER_ACTIONS,
  FLOW_ACTIONS,
  isRepetitionComplete,
  isCorrectNoodleOrder,
  MINI_QUESTIONS,
  type NoodleActionId,
  type RepetitionState,
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
  const [boxAdds, setBoxAdds] = useState(0);
  const [repetition, setRepetition] = useState<RepetitionState>({
    total: 0,
    current: 1,
  });
  const [flowIndex, setFlowIndex] = useState(0);
  const [isFlowModalOpen, setFlowModalOpen] = useState(false);
  const [miniQuestionIndex, setMiniQuestionIndex] = useState(0);
  const [miniAnswers, setMiniAnswers] = useState<(string | null)[]>(() =>
    MINI_QUESTIONS.map(() => null),
  );

  useEffect(() => {
    if (!isFlowModalOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFlowModalOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isFlowModalOpen]);

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
    case 4:
      content = (
        <BoxStep
          adds={boxAdds}
          onAdd={() => setBoxAdds((current) => Math.min(2, current + 1))}
        />
      );
      canContinue = boxAdds >= 2;
      blockedHint = "箱へ1と2を順番に足してください";
      break;
    case 5:
      content = (
        <RepetitionStep
          state={repetition}
          onAdd={() => setRepetition(addCurrentNumber)}
        />
      );
      canContinue = isRepetitionComplete(repetition);
      blockedHint = "1から5まで足してください";
      break;
    case 6:
      content = (
        <FlowchartStep
          flowIndex={flowIndex}
          isModalOpen={isFlowModalOpen}
          onPrevious={() =>
            setFlowIndex((current) => Math.max(0, current - 1))
          }
          onNext={() =>
            setFlowIndex((current) =>
              Math.min(FLOW_ACTIONS.length - 1, current + 1),
            )
          }
          onOpenModal={() => setFlowModalOpen(true)}
          onCloseModal={() => setFlowModalOpen(false)}
        />
      );
      canContinue = true;
      break;
    case 7:
      content = (
        <ExamExpressionStep
          questionIndex={miniQuestionIndex}
          answers={miniAnswers}
          onAnswer={(answer) =>
            setMiniAnswers((current) =>
              current.map((value, index) =>
                index === miniQuestionIndex ? answer : value,
              ),
            )
          }
          onNextQuestion={() =>
            setMiniQuestionIndex((current) =>
              Math.min(MINI_QUESTIONS.length - 1, current + 1),
            )
          }
        />
      );
      canContinue = miniAnswers.every((answer) => answer !== null);
      blockedHint = "3問のミニ確認に答えてください";
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
