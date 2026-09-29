// ニューラルネットワークの静的図。上＝予測の向き、下＝誤差を逆向きに伝えて重みを直す（バックプロパゲーション）。

export function NeuralNet() {
  const L = [
    [30, 40, 70, 100],
    [120, 30, 60, 90, 120],
    [210, 55, 95],
  ] as const;
  const nodes = L.map(([x, ...ys]) => ys.map((y) => ({ x, y })));
  return (
    <svg viewBox="0 0 250 172" className="mx-auto w-full max-w-sm" role="img" aria-label="入力層・中間層・出力層のニューラルネットワーク" data-testid="ml-nn">
      {nodes.slice(0, -1).flatMap((layer, li) =>
        layer.flatMap((a, ai) => nodes[li + 1].map((b, bi) => <line key={`${li}-${ai}-${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" />)),
      )}
      {nodes.flat().map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={7} fill="#fff" stroke="#1d4ed8" strokeWidth={2} />
      ))}
      <text x={30} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">入力</text>
      <text x={120} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">中間層（何層も）</text>
      <text x={210} y={138} textAnchor="middle" fontSize={9} fill="#6b7280">出力</text>
      <path d="M40 14 H200" stroke="#1d4ed8" strokeWidth={1.5} markerEnd="url(#nn-f)" />
      <text x={120} y={10} textAnchor="middle" fontSize={8.5} fill="#1d4ed8" fontWeight="bold">予測する →</text>
      <path d="M205 152 H45" stroke="#e11d48" strokeWidth={1.5} markerEnd="url(#nn-b)" strokeDasharray="4 2" />
      <text x={125} y={168} textAnchor="middle" fontSize={8.5} fill="#e11d48" fontWeight="bold">← 誤差を逆向きに伝えて重みを直す</text>
      <defs>
        <marker id="nn-f" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#1d4ed8" />
        </marker>
        <marker id="nn-b" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#e11d48" />
        </marker>
      </defs>
    </svg>
  );
}
