import type { LearningDiagram } from "@/types/content";
import DiagramRenderer from "@/components/diagrams/DiagramRenderer";

// ============================================================================
// 「図で理解」カード。1テーマ＝1図解の単位（LearningDiagram）を、
//   タイトル → 図解本体 → ひとことで言うと → 重要ポイント → 試験で問われやすい観点
// の決まった並びで表示する。状態を持たない表示専用＝Server Component。
//
// 図解本体の描画は DiagramRenderer に委譲し、ここは「学習者向けの読み方」を組み立てる。
// ============================================================================

export default function DiagramCard({
  diagram,
  showHeading = true,
}: {
  diagram: LearningDiagram;
  /** 「図で理解」の小見出しを出すか（一覧で連続表示するときは false にできる） */
  showHeading?: boolean;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {showHeading && (
        <p className="mb-1 flex items-center gap-1 text-xs font-bold text-brand-500">
          <span aria-hidden>📊</span> 図で理解
        </p>
      )}
      <h3 className="text-base font-bold text-gray-800">{diagram.title}</h3>

      {/* 図解本体 */}
      <div className="mt-3">
        <DiagramRenderer spec={diagram.spec} />
      </div>
      {diagram.caption && (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          {diagram.caption}
        </p>
      )}

      {/* ひとことで言うと */}
      <div className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5">
        <p className="text-xs font-bold text-brand-600">ひとことで言うと</p>
        <p className="mt-0.5 text-sm leading-relaxed text-brand-900">
          {diagram.oneLine}
        </p>
      </div>

      {/* 重要ポイント */}
      <Block label="重要ポイント">
        {diagram.keyPoints.map((p, i) => (
          <Item key={i} icon="✓" iconClass="text-brand-500">
            {p}
          </Item>
        ))}
      </Block>

      {/* 試験で問われやすい観点 */}
      <Block label="試験で問われやすい観点">
        {diagram.examPoints.map((p, i) => (
          <Item key={i} icon="🎯" iconClass="text-gray-400">
            {p}
          </Item>
        ))}
      </Block>
    </article>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-bold text-gray-500">{label}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Item({
  icon,
  iconClass,
  children,
}: {
  icon: string;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2 text-sm leading-snug text-gray-700">
      <span aria-hidden className={`shrink-0 ${iconClass}`}>
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
