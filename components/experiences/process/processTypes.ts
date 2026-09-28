// 業務プロセス改善の図解の型（BusinessProcessExperience と ProcessDioramaScene で共有）。

export type StationView = {
  name: string;
  emoji: string;
  minutes: number;
  improved: boolean;
  /** 改善前より遅い（ボトルネック候補） */
  slow: boolean;
  queue: number;
  busy: boolean;
};
