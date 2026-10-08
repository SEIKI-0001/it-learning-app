// 業務プロセス改善の図解の型（BusinessProcessExperience と ProcessDioramaScene で共有）。

import type { IconName } from "@/components/ui/Icon";

export type StationView = {
  name: string;
  icon: IconName;
  minutes: number;
  improved: boolean;
  /** 改善前より遅い（ボトルネック候補） */
  slow: boolean;
  queue: number;
  busy: boolean;
};
