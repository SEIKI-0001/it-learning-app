// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpinionBox from "@/components/opinions/OpinionBox";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(status: number) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: status === 200 }), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OpinionBox", () => {
  it("disables sending until something is written", () => {
    render(<OpinionBox />);
    expect(screen.getByRole("button", { name: "送信する" })).toHaveProperty("disabled", true);
  });

  it("sends the chosen category, body and context, then thanks the user", async () => {
    const fetchMock = stubFetch(200);
    render(<OpinionBox />);

    fireEvent.click(screen.getByRole("button", { name: "間違いを見つけた" }));
    fireEvent.change(screen.getByRole("textbox", { name: "内容" }), {
      target: { value: "正解が違う気がする" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /どの画面・どの問題か/ }), {
      target: { value: "R5 問12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => expect(screen.getByText("ありがとうございます。届きました。")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/opinions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      category: "mistake",
      body: "正解が違う気がする",
      context: "R5 問12",
    });
  });

  it("explains a rate-limit failure and keeps the text", async () => {
    stubFetch(429);
    render(<OpinionBox />);

    const textarea = screen.getByRole("textbox", { name: "内容" });
    fireEvent.change(textarea, { target: { value: "もう一度" } });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("少し時間をおいて"));
    expect((textarea as HTMLTextAreaElement).value).toBe("もう一度");
  });
});
