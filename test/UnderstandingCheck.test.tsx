// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnderstandingCheck from "@/components/themeExam/UnderstandingCheck";
import type { AiGradingResponse } from "@/lib/ai/gradingClient";

const requestAiGrading = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<AiGradingResponse>>());
vi.mock("@/lib/ai/gradingClient", () => ({ requestAiGrading }));
vi.mock("@/lib/userSession", () => ({ getUserId: () => "user-1" }));

const examQuestions = [{ topicId: "tech-email-protocol", isCorrect: false }];
const longAnswer = "SMTPでメールを送信し、POPやIMAPで受信します。IMAPはサーバ上で管理します。";

function renderCheck(onGraded = vi.fn()) {
  render(
    <UnderstandingCheck themeSlug="network" examQuestions={examQuestions} progress={null} onGraded={onGraded} />,
  );
  return onGraded;
}

function answerAndSubmit() {
  fireEvent.change(screen.getByLabelText("あなたの説明"), { target: { value: longAnswer } });
  fireEvent.click(screen.getByRole("button", { name: "AIに確認してもらう" }));
}

beforeEach(() => requestAiGrading.mockReset());
afterEach(() => cleanup());

describe("UnderstandingCheck", () => {
  it("誤答したトピックから出題し、合否に影響しないと明示する", () => {
    renderCheck();
    expect(screen.getByText(/総まとめ試験で間違えた「電子メールのしくみ」/)).toBeInTheDocument();
    expect(screen.getByText(/合否には影響しません/)).toBeInTheDocument();
  });

  it("20文字未満では送信できない", () => {
    renderCheck();
    fireEvent.change(screen.getByLabelText("あなたの説明"), { target: { value: "SMTPで送る" } });
    expect(screen.getByRole("button", { name: "AIに確認してもらう" })).toBeDisabled();
  });

  it("点数ではなく3段階と、良い点・不足点・補足・模範的な説明を見せる", async () => {
    requestAiGrading.mockResolvedValue({
      ok: true,
      result: {
        score: 72,
        grade: "B",
        isCorrect: false,
        summary: "",
        goodPoints: ["SMTPが送信を担う点"],
        missingPoints: ["IMAPとPOPの違いの説明が抜けています"],
        feedback: "IMAPはメールをサーバに残したまま複数端末で同期できます。",
        modelAnswer: "模範的な説明の本文",
        nextReviewTheme: "",
      },
      meta: { plan: "free", provider: "gemini", model: "m", fallback: false, usage: { used: 1, limit: 3, remaining: 2 } },
    });
    const onGraded = renderCheck();
    answerAndSubmit();

    expect(await screen.findByText("あと一歩")).toBeInTheDocument();
    expect(screen.getByText("理解できていること")).toBeInTheDocument();
    expect(screen.getByText("SMTPが送信を担う点")).toBeInTheDocument();
    expect(screen.getByText("もう一段理解したいところ")).toBeInTheDocument();
    expect(screen.getByText("IMAPとPOPの違いの説明が抜けています")).toBeInTheDocument();
    expect(screen.getByText("正確に理解すると")).toBeInTheDocument();
    expect(screen.getByText("模範的な説明の本文")).toBeInTheDocument();
    expect(screen.queryByText(/72/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /この部分を復習する/ })).toHaveAttribute(
      "href",
      expect.stringContaining("tech-email-protocol"),
    );
    expect(requestAiGrading).toHaveBeenCalledWith(expect.objectContaining({ mode: "understanding_check" }));
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0].topicId).toBe("tech-email-protocol");
  });

  it("未ログインでは、模範的な説明との自己確認に切り替えて学習を止めない", async () => {
    requestAiGrading.mockResolvedValue({ ok: false, reason: "login_required", error: "AI採点を使うにはログインが必要です。" });
    const onGraded = renderCheck();
    answerAndSubmit();

    expect(await screen.findByText(/AIの確認はログインすると使えます/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?next=%2Ftheme-exam%2Fnetwork",
    );
    expect(screen.getByText("説明に入っているか確かめよう")).toBeInTheDocument();
    expect(screen.getByText(longAnswer)).toBeInTheDocument();
    expect(onGraded).not.toHaveBeenCalled();
  });

  it("上限到達時はメッセージを出し、自己確認できる", async () => {
    requestAiGrading.mockResolvedValue({ ok: false, reason: "rate_limited", error: "本日のAI採点の上限（3回）に達しました。" });
    renderCheck();
    answerAndSubmit();
    expect(await screen.findByText(/上限（3回）/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "もう一度AIに確認してもらう" })).not.toBeInTheDocument();
  });

  it("採点の失敗時は再試行でき、入力は残る", async () => {
    requestAiGrading.mockResolvedValueOnce({ ok: false, reason: "failed", error: "採点に失敗しました。" });
    renderCheck();
    answerAndSubmit();
    fireEvent.click(await screen.findByRole("button", { name: "もう一度AIに確認してもらう" }));
    expect(screen.getByLabelText("あなたの説明")).toHaveValue(longAnswer);
  });

  it("入力の問題（400）は入力画面のままメッセージを出す", async () => {
    requestAiGrading.mockResolvedValue({ ok: false, reason: "invalid", error: "もう少し詳しく書いてください。" });
    renderCheck();
    answerAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("もう少し詳しく書いてください。");
    await waitFor(() => expect(screen.getByRole("button", { name: "AIに確認してもらう" })).toBeEnabled());
  });

  it("スキップでき、あとから挑戦し直せる", () => {
    renderCheck();
    fireEvent.click(screen.getByRole("button", { name: "今回はスキップする" }));
    expect(screen.getByText("AI理解チェックはスキップしました。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "やっぱり挑戦する" }));
    expect(screen.getByLabelText("あなたの説明")).toBeInTheDocument();
  });
});
