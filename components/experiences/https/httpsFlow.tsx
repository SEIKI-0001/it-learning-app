import type { ReactNode } from "react";
import type { NodeState } from "../network/NetworkSceneBase";
import type { HttpsCapsuleStop, HttpsMode, HttpsNodeId } from "./HttpsScene";

// 「HTTPとHTTPS ① 盗み見くらべ」のステップと文言。本番の体験と図解ラボ（/dev/scene-lab）で共有する。

// 見た目用の「暗号化っぽい」変換（本物の暗号ではなく、読めなくなる様子の可視化）
export function scramble(text: string): string {
  const hex = [...text]
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return (hex.match(/.{1,4}/g) ?? []).join(" ");
}

export type FlowStep = {
  title: string;
  stop: HttpsCapsuleStop;
  nodes: Record<HttpsNodeId, NodeState>;
  laneActive: boolean;
  intercepted: boolean;
  moves: boolean;
  detail: Record<HttpsMode, ReactNode>;
};

export const FLOW_STEPS: FlowStep[] = [
  {
    title: "あなたが入力",
    stop: "desk",
    nodes: { user: "active", web: "idle", eve: "idle" },
    laneActive: false,
    intercepted: false,
    moves: false,
    detail: {
      http: <>ログイン画面にパスワードを入力。まだ<b>あなたのPCの中</b>にあるので、誰にも見えていません。</>,
      https: <>ログイン画面にパスワードを入力。まだ<b>あなたのPCの中</b>。ここまでは HTTP と同じです。</>,
    },
  },
  {
    title: "通信路へ送り出す",
    stop: "out",
    nodes: { user: "sending", web: "idle", eve: "idle" },
    laneActive: true,
    intercepted: false,
    moves: false,
    detail: {
      http: <>HTTP は<b>そのまま</b>送り出します。カプセルの中身は入力した文字のまま＝<b>平文</b>。</>,
      https: <>HTTPS は送り出す直前に<b>SSL/TLSで暗号化</b>。同じカプセルが <b>ENCRYPTED DATA</b> に変わり、通信路は暗号のトンネルに包まれます。</>,
    },
  },
  {
    title: "途中で盗み見される",
    stop: "middle",
    nodes: { user: "idle", web: "idle", eve: "error" },
    laneActive: true,
    intercepted: true,
    moves: true,
    detail: {
      http: <>通信路の途中で盗聴者がデータをコピー。<b>パスワードがそのまま読めてしまいます</b>。</>,
      https: <>盗聴者はコピーを取れても、中身は<b>ぐちゃぐちゃの暗号文</b>。鍵がないので読めません。</>,
    },
  },
  {
    title: "サーバに届く",
    stop: "arrived",
    nodes: { user: "idle", web: "active", eve: "error" },
    laneActive: false,
    intercepted: true,
    moves: true,
    detail: {
      http: <>Webサーバに届いた。でも途中で<b>盗聴者にも同じ内容が渡っています</b>。</>,
      https: (
        <>
          正規のWebサーバだけが<b>復号して元の内容</b>を受け取ります。HTTPS が守るのは<b>通信路の途中</b>。
          届け先が詐欺サイトなら、その相手には読まれてしまう点に注意。
        </>
      ),
    },
  },
];

/** 図解（シーン）に渡す内容。描き方が違っても同じものを受け取る。 */
export type HttpsSceneInput = {
  mode: HttpsMode;
  index: number;
  step: FlowStep;
  /** 入力した送信内容（空なら「（空）」） */
  plain: string;
  /** 見た目用の暗号文（scramble 済み） */
  cipher: string;
  /** 前へ進んだ直後か（戻るときは移動アニメを省く） */
  forward: boolean;
  reducedMotion: boolean;
};
