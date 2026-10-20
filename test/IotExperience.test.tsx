// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import IotExperience from "@/components/experiences/IotExperience";
import { IotDioramaScene } from "@/components/experiences/iot/IotDioramaScene";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// IoT の解説のうち、過去問の出題に合わせて足したスライド（解説2〜9）。
// 模型の一周は DioramaIotArch.test.tsx で確かめている。

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <IotExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("IoT：過去問の出題に合わせた解説", () => {
  it("has nine slides; sensors convert to electric signals, actuators move things", () => {
    renderDeck();
    expect(screen.getByText("1 / 9")).toBeInTheDocument();
    click("解説2");
    const parts = within(screen.getByTestId("iot-parts")).getAllByRole("listitem");
    expect(parts.map((li) => li.getAttribute("data-role"))).toEqual(["センサー", "IoTゲートウェイ", "IoTサーバ", "アクチュエータ"]);
    expect(parts[0]).toHaveTextContent("電気信号に変換する");
    expect(screen.getByTestId("iot-cases")).toHaveTextContent("天窓を開け閉めする");
  });

  it("edge computing processes near the devices to lighten the IoT server", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("edge-compare")).toHaveTextContent("サーバの負荷を軽減");
    expect(screen.getByTestId("edge-not").querySelector('[data-term="ブロックチェーン"]')).toHaveTextContent("ハッシュ値");
  });

  it("names M2M, telematics, smart meters, PLC, multi-hop and mAh", () => {
    renderDeck();
    click("解説5");
    const sys = screen.getByTestId("iot-systems");
    expect(sys.querySelector('[data-term^="M2M"]')).toHaveTextContent("機械同士");
    expect(sys.querySelector('[data-term="テレマティクス"]')).toHaveTextContent("運転者へ様々な情報をリアルタイムに提供");
    expect(sys.querySelector('[data-term="スマートメーター"]')).toHaveTextContent("供給事業者にデータを送信");
    click("解説6");
    expect(screen.getByTestId("iot-power").querySelector('[data-term="PLC（電力線通信）"]')).toHaveTextContent("電力線に通信用の信号を乗せ");
    expect(screen.getByTestId("mah")).toHaveTextContent("2000mAh ＝ 2000mA の電流を1時間");
  });

  it("tamper resistance obfuscates; secure boot verifies signatures at startup", () => {
    renderDeck();
    click("解説7");
    const protect = screen.getByTestId("iot-protect");
    expect(protect.querySelector('[data-term="耐タンパ性"]')).toHaveTextContent("難読化");
    expect(protect.querySelector('[data-term="セキュアブート"]')).toHaveTextContent("起動時にデジタル署名を検証");
    expect(screen.getByTestId("iot-measures")).toHaveTextContent("不正ログイン");
  });

  it("checks the terms with three choices per question", () => {
    renderDeck();
    click("解説9");
    const quiz = screen.getByTestId("iot-terms-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "センサー" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getByRole("button", { name: "PLC" }));
    expect(quiz).toHaveTextContent("正解は「マルチホップ」");
  });
});

describe("2.5D の模型（WebGL2 が使えない端末）でも、センサーとアクチュエータを名指しする", () => {
  it("labels the sensor at step 1 and the actuator once the room is cooled", () => {
    const { unmount } = render(<IotDioramaScene phase={0} forward reducedMotion />);
    expect(screen.getByTestId("iot-scene")).toHaveTextContent("センサー＝測る");
    unmount();
    render(<IotDioramaScene phase={3} forward={false} reducedMotion />);
    expect(screen.getByTestId("iot-scene")).toHaveAttribute("data-cooled", "true");
    expect(screen.getByTestId("iot-scene")).toHaveTextContent("アクチュエータ＝動かす");
  });
});
