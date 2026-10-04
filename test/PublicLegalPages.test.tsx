// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TokushoPage from "@/app/legal/tokusho/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

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

  it("publishes terms that defer pricing to the commercial disclosure", () => {
    vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "利用規約" })).toBeInTheDocument();
    expect(screen.getByText(/制定日：/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "第4条（有料プラン）" })).toBeInTheDocument();
    expect(screen.getByText(/特定商取引法に基づく表示に定めるとおり/)).toBeInTheDocument();
    expect(screen.getByText(/合格や得点を保証するものではありません/)).toBeInTheDocument();
    expect(screen.getByText(/故意または重大な過失による場合を除き/)).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "特定商取引法に基づく表示" })) {
      expect(link).toHaveAttribute("href", "/legal/tokusho");
    }
    expect(screen.getAllByRole("link", { name: "利用規約" })[0]).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "公式LINEへ問い合わせる" })).toHaveAttribute(
      "href",
      "https://line.example/add",
    );
  });
});
