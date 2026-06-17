"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw } from "lucide-react";

const correctSteps = [
  "ブラウザに example.com を入力する",
  "DNSリゾルバにIPアドレスを問い合わせる",
  "ルートDNSから担当のTLD DNSをたどる",
  "権威DNSから example.com のIPアドレスを受け取る",
  "取得したIPアドレスのWebサーバへアクセスする"
];

const initialSteps = [
  correctSteps[0],
  correctSteps[3],
  correctSteps[1],
  correctSteps[4],
  correctSteps[2]
];

export function DnsMiniGame() {
  const [steps, setSteps] = useState(initialSteps);
  const [checked, setChecked] = useState(false);
  const isCorrect = steps.every((step, index) => step === correctSteps[index]);

  function move(index: number, direction: -1 | 1) {
    setChecked(false);
    setSteps((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return (
    <div className="card card-pad dns-board">
      <div>
        <span className="pill">5分ミニゲーム</span>
        <h2 style={{ marginTop: 10 }}>DNS名前解決ならべかえ</h2>
        <p className="learning-copy">
          Webサイトを見るまでの順番に並べ替えてください。言葉だけだとぼんやりしやすいDNSを、通信の流れとして掴みます。
        </p>
      </div>

      <div className="dns-steps">
        {steps.map((step, index) => (
          <div className="dns-step" key={step}>
            <span className="dns-step-index">{index + 1}</span>
            <strong>{step}</strong>
            <span className="mini-buttons">
              <button
                aria-label={`${step}を上へ`}
                className="icon-button button-secondary"
                disabled={index === 0}
                type="button"
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} aria-hidden />
              </button>
              <button
                aria-label={`${step}を下へ`}
                className="icon-button button-secondary"
                disabled={index === steps.length - 1}
                type="button"
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} aria-hidden />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="button button-primary" type="button" onClick={() => setChecked(true)}>
          <Check size={17} aria-hidden />
          答え合わせ
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setSteps(initialSteps);
            setChecked(false);
          }}
        >
          <RotateCcw size={17} aria-hidden />
          リセット
        </button>
      </div>

      {checked ? (
        <div className="card card-pad" style={{ boxShadow: "none" }}>
          <span className={isCorrect ? "pill" : "pill pill-danger"}>
            {isCorrect ? "正解" : "まだ順番が違います"}
          </span>
          <p className="learning-copy" style={{ marginTop: 12 }}>
            {isCorrect
              ? "名前からIPアドレスを見つけて、その住所へアクセスする流れです。DNSはWebページ本体ではなく、行き先を調べる役割だと覚えましょう。"
              : "ヒント: まず近くのDNSリゾルバに聞き、そこから担当のDNSをたどっていきます。"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
