"use client";

import { useState } from "react";
import s from "./experiment.module.css";

export function FifteenMinutes() {
  const [scene, setScene] = useState<"work" | "school">("work");
  return (
    <div className={s.routine}>
      <div className={s.choices} role="group" aria-label="勉強するタイミング">
        <button
          type="button"
          aria-pressed={scene === "work"}
          onClick={() => setScene("work")}
        >
          仕事終わりに
        </button>
        <button
          type="button"
          aria-pressed={scene === "school"}
          onClick={() => setScene("school")}
        >
          学校帰りに
        </button>
      </div>
      <div aria-live="polite" className={s.routineIntro}>
        <span>{scene === "work" ? "19:30" : "17:00"}</span>
        <p>
          {scene === "work"
            ? "夕飯までのひと息を、自分の時間に。"
            : "帰宅してひと休み。そのあと、ひとつだけ。"}
        </p>
      </div>
      <ol className={s.timeline}>
        <li>
          <span className={s.minutes}>
            3<small>min</small>
          </span>
          <div>
            <span className={s.stepLabel}>01 / まず、思い出す</span>
            <h3>前に迷った1問を解く。</h3>
            <p>忘れていても大丈夫。解説で「あ、そうだった」を取り戻す。</p>
          </div>
        </li>
        <li>
          <span className={s.minutes}>
            8<small>min</small>
          </span>
          <div>
            <span className={s.stepLabel}>02 / さわって、わかる</span>
            <h3>ひとつのテーマを体験する。</h3>
            <p>
              スイッチや図を動かして、言葉だけではつかめなかった仕組みを理解。
            </p>
          </div>
        </li>
        <li>
          <span className={s.minutes}>
            4<small>min</small>
          </span>
          <div>
            <span className={s.stepLabel}>03 / 確かめて、今日はおしまい</span>
            <h3>確認問題で、わかったを残す。</h3>
            <p>間違えたところは次の復習に。区切りをつけて、自分の時間へ。</p>
          </div>
        </li>
      </ol>
      <p className={s.micro}>
        時間配分は学習例です。教材や理解度に応じて調整できます。
      </p>
    </div>
  );
}

const hurdles = [
  {
    label: "暗記したのに、解けなかった",
    title: "「覚えた」を、「説明できる」に。",
    body: "用語の暗記だけでは、聞かれ方が変わると迷うことも。動かせる教材で仕組みを確かめてから、問題に戻ってみましょう。",
    action: "まずはAND・ORを、スイッチで体験。",
    tag: "理解のしかたを変える",
  },
  {
    label: "苦手な分野が残っていた",
    title: "全部より、いま迷うところから。",
    body: "過去問を解いて、答えに迷ったテーマを探しましょう。できるところを繰り返すだけでなく、苦手なテーマの体験と解説へ戻れます。",
    action: "まずは1テーマ、仕組みから確かめよう。",
    tag: "復習する場所を絞る",
  },
  {
    label: "勉強が続かなかった",
    title: "気合いより、続けられる分量を。",
    body: "次の計画は、今の生活に合わせて。試験日と使える時間から日々の学習を組み、遅れたら計画を立て直せます。",
    action: "まずは今日、教材をひとつ試してみよう。",
    tag: "計画を小さくする",
  },
];

export function RetryChoices() {
  const [selected, setSelected] = useState(0);
  const hurdle = hurdles[selected];
  return (
    <div className={s.hurdles}>
      <div
        className={s.hurdleButtons}
        role="group"
        aria-label="前回つまずいたこと"
      >
        {hurdles.map((item, i) => (
          <button
            type="button"
            key={item.label}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
          >
            <span>0{i + 1}</span>
            {item.label}
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <div className={s.hurdleAnswer} aria-live="polite">
        <span className={s.answerTag}>{hurdle.tag}</span>
        <h3>{hurdle.title}</h3>
        <p>{hurdle.body}</p>
        <strong>{hurdle.action}</strong>
        <a href="/lp/try?utm_source=lp_lab&utm_medium=landing&utm_campaign=retry">
          登録せずに教材を試す <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
