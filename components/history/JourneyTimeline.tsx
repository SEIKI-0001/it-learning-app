"use client";

// 「あゆみ」年表（GF-P1-004）。
//
// 日時が確定しているイベントだけを新しい順に並べる。日付が分からない出来事を
// それらしい位置に置くと事実でなくなるため、年表には載せない。

import type { JourneyEvent } from "@/lib/learningHistory";
import Icon, { type IconName } from "@/components/ui/Icon";

const EVENT_ICONS: Record<JourneyEvent["kind"], IconName> = {
  started: "sprout",
  badge: "award",
  checkpoint: "map",
};

function formatDate(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export default function JourneyTimeline({
  events,
  limit = 8,
}: {
  events: JourneyEvent[];
  limit?: number;
}) {
  if (events.length === 0) return null;
  const shown = events.slice(0, limit);

  return (
    <section aria-labelledby="journey-timeline-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="journey-timeline-heading" className="text-sm font-semibold text-gray-900">
          あゆみ
        </h2>
        {events.length > shown.length && (
          <p className="text-xs tabular-nums text-gray-500">直近{shown.length}件</p>
        )}
      </div>
      <ol className="mt-2 divide-y divide-gray-200 border-y border-gray-200">
        {shown.map((event) => (
          <li key={`${event.kind}-${event.at}-${event.label}`} className="flex items-center gap-2.5 py-2.5">
            <Icon name={EVENT_ICONS[event.kind]} className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{event.label}</span>
            <time className="shrink-0 text-xs tabular-nums text-gray-500" dateTime={event.at}>
              {formatDate(event.at)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
