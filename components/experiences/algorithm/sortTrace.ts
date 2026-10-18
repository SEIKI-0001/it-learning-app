// 並べ替え・探索の1手ずつの記録。表示（ArrayPanels）とテストで共用する。
// 要素番号は試験と同じく 1 から数える（idx も 1 始まり）。

export type BubbleStep = {
  n: number;
  m: number;
  before: number[];
  after: number[];
  swapped: boolean;
  /** この比較のあと、右端から確定している要素の数 */
  fixed: number;
};

// 試験と同じ形：n を 1〜(要素数−1)、m を 1〜(要素数−n) で、隣どうしを比べて入れ替える
export function bubbleSteps(input: readonly number[]): BubbleStep[] {
  const a = [...input];
  const len = a.length;
  const steps: BubbleStep[] = [];
  for (let n = 1; n <= len - 1; n++) {
    for (let m = 1; m <= len - n; m++) {
      const before = [...a];
      const swapped = a[m - 1] > a[m];
      if (swapped) [a[m - 1], a[m]] = [a[m], a[m - 1]];
      steps.push({ n, m, before, after: [...a], swapped, fixed: m === len - n ? n : n - 1 });
    }
  }
  return steps;
}

export type SelectionStep = {
  j: number;
  minIndex: number;
  before: number[];
  after: number[];
};

// 試験と同じ形：j 番目から末尾までで最小の要素を探し、j 番目と入れ替える
export function selectionSteps(input: readonly number[]): SelectionStep[] {
  const a = [...input];
  const steps: SelectionStep[] = [];
  for (let j = 1; j <= a.length - 1; j++) {
    let minIndex = j;
    for (let k = j + 1; k <= a.length; k++) if (a[k - 1] < a[minIndex - 1]) minIndex = k;
    const before = [...a];
    [a[j - 1], a[minIndex - 1]] = [a[minIndex - 1], a[j - 1]];
    steps.push({ j, minIndex, before, after: [...a] });
  }
  return steps;
}

/** 線形探索：先頭から順に調べた要素番号 */
export function linearProbes(sorted: readonly number[], target: number): number[] {
  const probes: number[] = [];
  for (let i = 1; i <= sorted.length; i++) {
    probes.push(i);
    if (sorted[i - 1] === target) break;
  }
  return probes;
}

/** 2分探索：中央（(下端＋上端)÷2 の商）を調べた要素番号 */
export function binaryProbes(sorted: readonly number[], target: number): number[] {
  const probes: number[] = [];
  let lo = 1;
  let hi = sorted.length;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes.push(mid);
    const v = sorted[mid - 1];
    if (v === target) break;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return probes;
}
