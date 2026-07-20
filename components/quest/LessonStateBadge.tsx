// レッスン/テーマの5状態(未着手/学習中/復習待ち/習得済み/完全習得)を
// アイコン+テキストで表示する共通バッジ。色のみで区別しない。

import Icon, { type IconName } from "@/components/ui/Icon";
import {
  LESSON_STATE_LABELS,
  type LessonMasterState,
} from "@/lib/lessonState";

const STATE_STYLE: Record<
  LessonMasterState,
  { icon: IconName; textClass: string }
> = {
  not_started: { icon: "circle", textClass: "text-gray-400" },
  in_progress: { icon: "circle-dot", textClass: "text-brand-700" },
  review_due: { icon: "rotate", textClass: "text-accent-700" },
  mastered: { icon: "circle-check", textClass: "text-emerald-700" },
  fully_mastered: {
    icon: "check-double",
    textClass: "text-emerald-700 font-medium",
  },
};

export default function LessonStateBadge({
  state,
  className = "",
}: {
  state: LessonMasterState;
  className?: string;
}) {
  const style = STATE_STYLE[state];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-[11px] ${style.textClass} ${className}`}
    >
      <Icon name={style.icon} className="h-3.5 w-3.5" />
      {LESSON_STATE_LABELS[state]}
    </span>
  );
}
