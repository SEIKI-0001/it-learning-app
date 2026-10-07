'use client';

import { useState } from 'react';
import { ph } from './ph';

export type CompareRow = {
  label: string;
  you: string;
  plain?: boolean;
  others: [string, string, string];
};

const OTHERS = [
  { name: '参考書', short: '参考書' },
  { name: '無料の過去問サイト', short: '過去問サイト' },
  { name: '動画講座', short: '動画講座' },
];

// 比較表。PC幅では全列を並べ、スマホ幅では「項目｜このアプリ｜選んだ1つ」の3列にして、
// 比べる相手を切り替えボタンで選ぶ（横スクロールなしで1行ずつ見比べられるように）。
// セルの「|」は ph の折り返し位置。
export default function CompareTable({ rows }: { rows: CompareRow[] }) {
  const [vs, setVs] = useState(0);
  const other = (i: number) => (i === vs ? 'other on' : 'other');

  return (
    <>
      <div className="cmp-tabs" role="group" aria-label="比べる相手">
        <span className="cmp-tabs-label">比べる相手</span>
        {OTHERS.map(({ short }, i) => (
          <button key={short} type="button" aria-pressed={i === vs} onClick={() => setVs(i)}>
            {short}
          </button>
        ))}
      </div>
      <div className="tbl-scroll">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col" className="you">
                このアプリ
              </th>
              {OTHERS.map(({ name }, i) => (
                <th key={name} scope="col" className={other(i)}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, you, plain, others }) => (
              <tr key={label}>
                <th scope="row">{ph(label)}</th>
                <td className={plain ? 'you plain' : 'you'}>{ph(you)}</td>
                {others.map((v, i) => (
                  <td key={OTHERS[i].name} className={other(i)}>
                    {ph(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
