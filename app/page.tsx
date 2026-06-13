import Link from "next/link";

// ランディングページ。世界観を伝えて「冒険を始める」へ誘導する。
export default function Home() {
  const points = [
    { emoji: "🔰", text: "IT未経験でもOK" },
    { emoji: "⏱️", text: "毎日3問だけ" },
    { emoji: "🗺️", text: "RPG風マップで進む" },
    { emoji: "🌱", text: "間違えてもやさしく解説" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide">
          FE Quest ・ 7日間体験版
        </span>

        <div className="mb-4 text-6xl" aria-hidden>
          🗺️
        </div>

        <h1 className="text-3xl font-extrabold leading-tight">基本情報クエスト</h1>
        <p className="mt-3 text-lg font-bold text-amber-200">
          1日3分、基本情報を冒険に変える
        </p>

        <p className="mt-4 text-sm leading-relaxed text-indigo-100">
          参考書を開く前に、まずは小さなクエストから。
          <br />
          解いているうちに、ITの世界に自然と慣れていきます。
        </p>

        <ul className="mt-8 w-full space-y-2.5">
          {points.map((p) => (
            <li
              key={p.text}
              className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-sm font-semibold backdrop-blur-sm"
            >
              <span className="text-xl" aria-hidden>
                {p.emoji}
              </span>
              {p.text}
            </li>
          ))}
        </ul>

        <Link
          href="/onboarding"
          className="mt-9 w-full rounded-2xl bg-amber-300 px-6 py-4 text-center text-lg font-extrabold text-amber-900 shadow-lg transition active:scale-[0.98]"
        >
          ⚔️ 冒険を始める
        </Link>

        <Link
          href="/map"
          className="mt-3 text-sm font-medium text-indigo-100 underline underline-offset-4"
        >
          すでに始めている方はこちら
        </Link>
      </div>
    </main>
  );
}
