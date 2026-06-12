'use client';

import type { ContentBlock } from '@/data/types';

interface Props {
  blocks: ContentBlock[];
}

function renderBody(text: string) {
  // Bold: **text** and inline code: `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-sm font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === '\n') return <br key={i} />;
    return <span key={i}>{part}</span>;
  });
}

const blockStyles: Record<ContentBlock['type'], string> = {
  intro: 'bg-blue-50 border-blue-200 border',
  concept: 'bg-white border border-gray-200',
  analogy: 'bg-amber-50 border border-amber-200',
  keyterms: 'bg-gray-50 border border-gray-200',
  'career-tip': 'bg-green-50 border border-green-200',
};

export default function LessonContent({ blocks }: Props) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div key={i} className={`rounded-2xl p-5 ${blockStyles[block.type]}`}>
          {(block.title || block.emoji) && (
            <div className="flex items-center gap-2 mb-2">
              {block.emoji && <span className="text-xl">{block.emoji}</span>}
              {block.title && (
                <h3 className="font-bold text-gray-800">{block.title}</h3>
              )}
            </div>
          )}
          {block.body && (
            <p className="text-gray-700 leading-relaxed">{renderBody(block.body)}</p>
          )}
          {block.items && (
            <ul className="mt-2 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="text-gray-700 leading-relaxed flex gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{renderBody(item)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
