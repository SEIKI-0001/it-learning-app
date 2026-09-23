/** 84px の相棒に重ねる、手描き風の机・ノート・鉛筆。 */
export default function MochitCompanionScene({ paused }: { paused: boolean }) {
  return <svg data-testid="mochit-study-scene" data-paused={paused} aria-hidden="true" viewBox="0 0 108 108" className="mochit-study-scene pointer-events-none absolute inset-0 h-full w-full overflow-visible">
    <ellipse cx="54" cy="100" rx="37" ry="4" fill="#433024" opacity=".12" />
    <path d="M23 84 21 99M85 84 87 99" stroke="#a16c46" strokeWidth="5" strokeLinecap="round" />
    <path d="M18 77Q54 72 90 77L94 85Q54 90 14 85Z" fill="#e9bf85" stroke="#986d48" strokeWidth="2" strokeLinejoin="round" />
    <path d="M31 72Q43 68 54 74Q65 68 77 72L81 81Q65 77 54 83Q43 77 27 81Z" fill="#fffdf4" stroke="#a99276" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M54 74V82M35 73 48 75M33 76 47 78M61 75 73 73M62 78 75 76" stroke="#98b6c1" strokeWidth="1.1" strokeLinecap="round" />
    <g className="mochit-pencil">
      <path d="m67 75 12-20 4 3-13 19Z" fill="#f4c750" stroke="#ad7931" strokeWidth="1.2" />
      <path d="m67 75-1 6 4-4Z" fill="#efdbb9" /><path d="m66 81 1-3 1 1Z" fill="#4b4140" />
      <path d="m79 55 2-3q1-1 3 1t0 3l-1 2Z" fill="#ef9f9b" />
      <ellipse cx="74" cy="66" rx="5" ry="3.5" fill="#a9dfdb" stroke="#539a96" strokeWidth="1.2" transform="rotate(-32 74 66)" />
    </g>
  </svg>;
}
