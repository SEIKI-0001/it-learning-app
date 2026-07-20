import Link from "next/link";
import { notFound } from "next/navigation";
import CheckpointExamRunner from "@/components/checkpoint/CheckpointExamRunner";
import BottomNav from "@/components/BottomNav";
import {
  getAllCheckpointExams,
  getCheckpointExamDefinition,
} from "@/lib/checkpointExam";

export function generateStaticParams() {
  return getAllCheckpointExams().map((checkpoint) => ({ checkpointId: checkpoint.id }));
}

export default async function CheckpointExamPage({
  params,
}: {
  params: Promise<{ checkpointId: string }>;
}) {
  const { checkpointId } = await params;
  const checkpoint = getCheckpointExamDefinition(checkpointId);
  if (!checkpoint) notFound();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-700 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <Link href="/plan" className="text-sm font-semibold text-white/80">
            ← 学習計画へ
          </Link>
          <p className="mt-3 text-xs font-bold text-white/75">突破試験</p>
          <h1 className="mt-1 text-2xl font-bold">{checkpoint.title}</h1>
          <p className="mt-1 text-sm text-white/90">{checkpoint.description}</p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl">
        <CheckpointExamRunner checkpointId={checkpoint.id} />
      </div>
      <BottomNav />
    </main>
  );
}
