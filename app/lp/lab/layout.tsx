import type { Metadata } from "next";

// Alternative campaign pages remain accessible in production without competing with /lp in search.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AlternativeLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
