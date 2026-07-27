// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TokushoPage from "@/app/legal/tokusho/page";
import PrivacyPage from "@/app/privacy/page";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("public legal pages", () => {
  it("publishes the required commercial terms and disclosure request", () => {
    vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
    render(<TokushoPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "特定商取引法に基づく表示" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3,480円（税込）")).toBeInTheDocument();
    expect(screen.getByText(/自動更新はありません/)).toBeInTheDocument();
    expect(screen.getByText(/購入日を含む7日以内/)).toBeInTheDocument();
    expect(screen.getByText(/遅滞なく提供します/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "公式LINEで開示を請求する" })).toHaveAttribute(
      "href",
      "https://line.example/add",
    );
  });

  it("explains collected data, processors, purposes, and contact", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "プライバシーポリシー" }),
    ).toBeInTheDocument();
    for (const service of ["Google", "LINE", "Stripe", "Supabase"]) {
      expect(screen.getAllByText(new RegExp(service)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/学習履歴/)).toBeInTheDocument();
    expect(screen.getByText(/AI採点履歴/)).toBeInTheDocument();
    expect(screen.getByText(/購入時メールアドレス/)).toBeInTheDocument();
  });
});
