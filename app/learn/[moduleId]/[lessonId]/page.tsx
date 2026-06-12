import { getModule, getLesson } from '@/data/modules';
import LessonPage from '@/components/LessonPage';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { moduleId, lessonId } = await params;
  const module = getModule(moduleId);
  if (!module) notFound();

  const lessonIndex = module.lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex === -1) notFound();

  const lesson = module.lessons[lessonIndex];
  const nextLesson = module.lessons[lessonIndex + 1] ?? null;

  return (
    <LessonPage
      module={module}
      lesson={lesson}
      lessonIndex={lessonIndex}
      nextLesson={nextLesson}
    />
  );
}
