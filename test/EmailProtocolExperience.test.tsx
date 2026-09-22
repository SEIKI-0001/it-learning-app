// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmailProtocolExperience from "@/components/experiences/EmailProtocolExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <EmailProtocolExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");

describe("EmailProtocolExperience", () => {
  it("keeps the delivery flow, POP/IMAP and the To/CC/BCC quiz", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("To / CC / BCC を使い分け")).toBeInTheDocument();
  });

  it("moves the mail along the route: SMTP for the two sending hops, POP/IMAP for receiving", () => {
    renderDeck();
    const mail = () => screen.getByTestId("route-mail");
    expect(mail()).toHaveAttribute("data-tone", "draft");
    next();
    expect(screen.getByTestId("seg-send")).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("seg-send")).toHaveTextContent("SMTP");
    expect(screen.getByTestId("mail-proto")).toHaveTextContent("SMTP");
    next();
    expect(screen.getByTestId("seg-relay")).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("seg-relay")).toHaveTextContent("SMTP");
    next();
    expect(screen.getByTestId("seg-fetch")).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("seg-fetch")).toHaveTextContent("POP / IMAP");
    expect(mail()).toHaveAttribute("data-tone", "recv");
  });

  it("POP moves the mail to the phone, so the PC finds nothing", () => {
    renderDeck();
    click("解説2");
    click("📱 スマホで受信する");
    expect(screen.getByTestId("inbox-server")).toHaveAttribute("data-has-mail", "false");
    expect(screen.getByTestId("inbox-phone")).toHaveAttribute("data-has-mail", "true");
    click("💻 PCでも確認する");
    expect(screen.getByTestId("inbox-pc")).toHaveAttribute("data-has-mail", "false");
    expect(screen.getByTestId("inbox-pc")).toHaveTextContent("メールがない");
  });

  it("IMAP keeps the mail on the server and syncs the read state to the PC; both tried shows the insight", () => {
    renderDeck();
    click("解説2");
    click("📱 スマホで受信する");
    click("💻 PCでも確認する");
    click(/IMAP/);
    click("📱 スマホで受信する");
    expect(screen.getByTestId("inbox-server")).toHaveAttribute("data-has-mail", "true");
    expect(screen.getByTestId("inbox-server")).toHaveTextContent("既読");
    click("💻 PCでも確認する");
    expect(screen.getByTestId("inbox-pc")).toHaveAttribute("data-has-mail", "true");
    expect(screen.getByTestId("inbox-pc")).toHaveTextContent("既読");
    expect(screen.getByTestId("popimap-insight")).toHaveTextContent("メールの置き場所");
  });
});
