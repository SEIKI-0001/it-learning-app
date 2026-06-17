export function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="progress-bar" aria-label={`進捗 ${percent}%`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
