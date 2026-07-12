import { notFound } from "next/navigation";
import ThemeDetail from "@/components/learn/ThemeDetail";
import { getAllThemes, getThemeBySlug } from "@/lib/learningCatalog";

export function generateStaticParams() {
  return getAllThemes().map((theme) => ({ themeSlug: theme.slug }));
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ themeSlug: string }>;
}) {
  const { themeSlug } = await params;
  if (!getThemeBySlug(themeSlug)) notFound();
  return <ThemeDetail themeSlug={themeSlug} />;
}
