// 業務フローの小さな待ち行列シミュレーション。
// 注文（書類）が一定間隔で届き、各工程は1件ずつ順番に処理する（担当は1人）。
// 遅い工程の前に書類が溜まる＝ボトルネックが「見える」。

export const DOC_COUNT = 6;
export const ARRIVAL_INTERVAL = 10;

export type DocTimeline = { arrive: number; start: number[]; finish: number[] };

export function schedule(times: number[], count = DOC_COUNT, interval = ARRIVAL_INTERVAL): DocTimeline[] {
  const free = times.map(() => 0);
  const docs: DocTimeline[] = [];
  for (let k = 0; k < count; k++) {
    const arrive = k * interval;
    const start: number[] = [];
    const finish: number[] = [];
    let ready = arrive;
    times.forEach((t, s) => {
      start[s] = Math.max(ready, free[s]);
      finish[s] = start[s] + t;
      free[s] = finish[s];
      ready = finish[s];
    });
    docs.push({ arrive, start, finish });
  }
  return docs;
}

export type DocSpot =
  | { kind: "incoming" }
  | { kind: "queue"; station: number; slot: number }
  | { kind: "work"; station: number; progress: number }
  | { kind: "done"; slot: number };

/** 時刻 t における各書類の居場所。待ち行列内の順番（slot）も返す。 */
export function spotsAt(docs: DocTimeline[], t: number): DocSpot[] {
  const queueCount: number[] = [];
  let doneCount = 0;
  return docs.map((d) => {
    if (t < d.arrive) return { kind: "incoming" };
    const last = d.finish.length - 1;
    if (t >= d.finish[last]) return { kind: "done", slot: doneCount++ };
    for (let s = 0; s <= last; s++) {
      const readyAt = s === 0 ? d.arrive : d.finish[s - 1];
      if (t >= readyAt && t < d.start[s]) {
        const slot = queueCount[s] ?? 0;
        queueCount[s] = slot + 1;
        return { kind: "queue", station: s, slot };
      }
      if (t >= d.start[s] && t < d.finish[s]) {
        const span = d.finish[s] - d.start[s];
        return { kind: "work", station: s, progress: span > 0 ? (t - d.start[s]) / span : 1 };
      }
    }
    return { kind: "done", slot: doneCount++ };
  });
}

export function makespan(docs: DocTimeline[]) {
  const last = docs[docs.length - 1];
  return last.finish[last.finish.length - 1];
}

export function queueLengths(spots: DocSpot[], stations: number) {
  const q = Array.from({ length: stations }, () => 0);
  spots.forEach((s) => {
    if (s.kind === "queue") q[s.station] += 1;
  });
  return q;
}
