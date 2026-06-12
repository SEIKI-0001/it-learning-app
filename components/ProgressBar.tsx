'use client';

interface ProgressBarProps {
  value: number; // 0-100
  colorClass?: string;
  height?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  colorClass = 'bg-blue-500',
  height = 'h-2',
  showLabel = false,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${colorClass} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">{value}% complete</p>
      )}
    </div>
  );
}
