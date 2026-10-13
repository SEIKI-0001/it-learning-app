'use client';

import { useState } from 'react';

// 切り口別LPの「選ぶと答えが変わる」部品。見た目は lab.css（lb- 接頭辞）。
// サーバー専用の GUIDE_FACTS は読めないので、数字は props で受け取る。

const SCENES = {
  work: { label: '仕事終わりに', time: '19:30', text: '夕飯までのひと息を、自分の時間に。' },
  school: { label: '学校帰りに', time: '17:00', text: '帰宅してひと休み。そのあと、ひとつだけ。' },
} as const;

const ROUTINE = [
  {
    min: 3,
    step: 'まず、思い出す',
    title: '前に迷った1問を解く。',
    body: '忘れていても大丈夫。解説で「あ、そうだった」を取り戻す。復習の順番はアプリが決めています。',
  },
  {
    min: 8,
    step: 'さわって、わかる',
    title: 'ひとつのテーマを体験する。',
    body: 'スイッチや図を動かして、言葉だけではつかめなかった仕組みを理解。教材は1テーマずつ短く区切られています。',
  },
  {
    min: 4,
    step: '確かめて、今日はおしまい',
    title: '確認問題で、わかったを残す。',
    body: '間違えたところは次の復習に。区切りをつけて、自分の時間へ。',
  },
];

export function FifteenMinutes() {
  const [scene, setScene] = useState<keyof typeof SCENES>('work');
  const s = SCENES[scene];
  return (
    <div className="lb-routine">
      <div className="lb-toggle" role="group" aria-label="勉強するタイミング">
        {(Object.keys(SCENES) as (keyof typeof SCENES)[]).map((k) => (
          <button key={k} type="button" aria-pressed={scene === k} onClick={() => setScene(k)}>
            {SCENES[k].label}
          </button>
        ))}
      </div>
      <div className="mock lb-routine-card">
        <div className="mock-head" aria-live="polite">
          <span>
            <span className="lb-clock">{s.time}</span>
            {s.text}
          </span>
          <span className="date">計15分</span>
        </div>
        <ol className="lb-timeline">
          {ROUTINE.map((r, i) => (
            <li key={r.step}>
              <span className="lb-min">
                {r.min}
                <small>分</small>
              </span>
              <div>
                <p className="lb-step">
                  0{i + 1}／{r.step}
                </p>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="pain-note">※ 時間配分は学習の一例です。教材や理解度に応じて変わります。</p>
    </div>
  );
}

type Hurdle = {
  label: string;
  tag: string;
  title: string;
  body: string;
  app: string;
  action: string;
};

export function RetryChoices({ topics, intervals, tryHref }: { topics: number; intervals: number[]; tryHref: string }) {
  const hurdles: Hurdle[] = [
    {
      label: '暗記したのに、解けなかった',
      tag: '理解のしかたを変える',
      title: '「覚えた」を、「説明できる」に。',
      body: '用語の暗記だけでは、聞かれ方が変わると迷います。動かせる教材で仕組みを確かめてから、問題に戻ってみましょう。',
      app: `全${topics}トピックが「操作する→画面の変化で気づく」の順。AI採点で、自分の言葉で説明できるかも試せます。`,
      action: 'まずはCPU・メモリ・ストレージを、模型で体験。',
    },
    {
      label: '苦手な分野が残っていた',
      tag: '復習する場所を絞る',
      title: '全部より、いま迷うところから。',
      body: '過去問を解いて、答えに迷ったテーマを探しましょう。できるところを繰り返すだけでなく、苦手なテーマの体験と解説へ戻れます。',
      app: `間違えたテーマは翌日の復習に入り、正解するたびに${intervals.join('・')}日後と間隔を広げて確かめ直します。`,
      action: 'まずは1テーマ、仕組みから確かめよう。',
    },
    {
      label: '勉強が続かなかった',
      tag: '計画を小さくする',
      title: '気合いより、続けられる分量を。',
      body: '次の計画は、今の生活に合わせて。試験日と使える時間から日々の学習を組み、遅れたら計画を立て直せます。',
      app: '「今日やること」は毎日アプリが決めます。忙しい日はその日だけ短くでき、遅れたら立て直し案が出ます。',
      action: 'まずは今日、教材をひとつ試してみよう。',
    },
  ];
  const [selected, setSelected] = useState(0);
  const h = hurdles[selected];
  return (
    <div className="lb-hurdles">
      <div className="lb-hurdle-list" role="group" aria-label="前回つまずいたこと">
        {hurdles.map((item, i) => (
          <button type="button" key={item.label} onClick={() => setSelected(i)} aria-pressed={selected === i}>
            <span className="no">0{i + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mock lb-hurdle-answer" aria-live="polite">
        <p className="lb-tag">{h.tag}</p>
        <h3>{h.title}</h3>
        <p>{h.body}</p>
        <div className="insight">
          <b>アプリでは</b>
          {h.app}
        </div>
        <p className="lb-action">{h.action}</p>
        <a className="more" href={tryHref}>
          登録せずに教材を試す
        </a>
      </div>
    </div>
  );
}
