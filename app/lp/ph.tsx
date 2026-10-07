// 見出しなどを文節で折り返す。Safari は word-break: auto-phrase に未対応で、スマホ幅だと
// 「あなたのせいで|はありません」のように語の途中で改行されるため、「|」で区切った文節を
// inline-block（.lp .ph）にして文節の切れ目でだけ折り返させる。
export function ph(text: string) {
  return text.split('|').map((s, i) => (
    <span key={i} className="ph">
      {s}
    </span>
  ));
}
