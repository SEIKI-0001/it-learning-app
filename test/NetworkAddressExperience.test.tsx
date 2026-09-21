// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NetworkAddressExperience from "@/components/experiences/NetworkAddressExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

describe("NetworkAddressExperience", () => {
  it("presents the next-generation DNS journey as three explanation slides", () => {
    render(
      <ExperienceSlideDeck>
        <NetworkAddressExperience />
      </ExperienceSlideDeck>,
    );

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1IPアドレスは「機械が使う住所」" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説2" }));

    expect(
      screen.getByRole("heading", { name: "2名前解決を「再生」して追う" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("lets learners scrub the flow, inspect data, and simulate a DNS outage", () => {
    render(
      <ExperienceSlideDeck>
        <NetworkAddressExperience />
      </ExperienceSlideDeck>,
    );
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));

    const packet = screen.getByRole("button", {
      name: "流れているデータの中身を見る",
    });
    expect(packet).toHaveTextContent("example.com");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("example.com のIPは？");

    fireEvent.click(packet);
    expect(
      screen.getByText(/DNSはページ本体ではなく「接続先の住所」を返します/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "DNSを止める" }));
    expect(screen.getByRole("button", { name: "正常に戻す" })).toBeInTheDocument();
    expect(screen.getByText(/DNS応答なし → IPアドレス不明 → 接続先を決められない/)).toBeInTheDocument();
  });
});
