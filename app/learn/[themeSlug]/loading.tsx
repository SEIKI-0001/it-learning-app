export default function ThemeLoading() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-5 w-24 rounded bg-gray-200" />
        <div className="h-10 w-64 rounded bg-gray-200" />
        <div className="h-28 rounded-xl bg-gray-200" />
        <div className="h-40 rounded-xl bg-gray-200" />
      </div>
    </main>
  );
}
