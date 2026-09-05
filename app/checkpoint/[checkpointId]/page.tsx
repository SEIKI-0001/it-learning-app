import { notFound } from "next/navigation";
import CheckpointExamRunner from "@/components/checkpoint/CheckpointExamRunner";
import PageHeader from "@/components/ui/PageHeader";
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
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/plan", label: "学習計画へ" }}
        tone="brand"
        eyebrow="分野まとめテスト"
        title={checkpoint.title}
        description={checkpoint.description}
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <CheckpointExamRunner checkpointId={checkpoint.id} />
      </div>
      <BottomNav />
    </main>
  );
}
