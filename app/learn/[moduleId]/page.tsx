import { getModule } from '@/data/modules';
import ModulePage from '@/components/ModulePage';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const module = getModule(moduleId);
  if (!module) notFound();
  return <ModulePage module={module} />;
}
