import { notFound, redirect } from "next/navigation";
import { getAllTopics, getTopic } from "@/lib/content";
import { getLessonHref, getLessonLocation } from "@/lib/learningCatalog";

// 旧ブックマーク、通知、外部リンクを新しい正規レッスンURLへ引き継ぐ。
export function generateStaticParams() {
  return getAllTopics().map((topic) => ({ id: topic.id }));
}

export default async function LegacyTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getTopic(id) || !getLessonLocation(id)) notFound();
  redirect(getLessonHref(id));
}
