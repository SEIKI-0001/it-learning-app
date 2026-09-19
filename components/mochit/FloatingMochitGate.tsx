"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import {
  fetchCurrentExamReadiness,
  loadCachedProgressBootstrap,
} from "@/lib/userSession";
import { getMochitProgressPresentation } from "@/lib/mochitPresentation";
import FloatingMochit from "./FloatingMochit";

const HIDDEN_ROUTE_PREFIXES = [
  "/login",
  "/onboarding",
  "/avatar",
  "/dev",
] as const;

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldShowFloatingMochit(
  pathname: string,
  configured: boolean,
): boolean {
  if (!configured || pathname === "/") return false;
  return !HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    isPathWithin(pathname, prefix),
  );
}

function ConfiguredFloatingMochit({ pathname }: { pathname: string }) {
  const [state] = useAppState();
  const [presentationSources, setPresentationSources] = useState(() => {
    const bootstrap = loadCachedProgressBootstrap();
    const proposal = bootstrap?.planAdjustmentProposal;
    return {
      readiness: bootstrap?.examReadiness ?? null,
      hasPlanAdjustment:
        proposal?.status === "proposed" || proposal?.status === "accepted",
    };
  });
  const configured = Boolean(state?.profile);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    void fetchCurrentExamReadiness().then((current) => {
      if (active) {
        setPresentationSources((previous) => ({ ...previous, readiness: current }));
      }
    });
    return () => {
      active = false;
    };
  }, [configured]);

  if (!shouldShowFloatingMochit(pathname, configured)) {
    return null;
  }
  const presentation = getMochitProgressPresentation({
    readiness: presentationSources.readiness,
    currentCheckpointId:
      state?.progress?.checkpointProgress?.currentCheckpointId ?? "cp0",
    reviewCount: state?.progress?.reviewQueue?.length ?? 0,
    planAdjustmentProposal: presentationSources.hasPlanAdjustment,
    lastPlayedAt: state?.progress?.lastPlayedAt,
  });
  return <FloatingMochit presentation={presentation} />;
}

export default function FloatingMochitGate() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    HIDDEN_ROUTE_PREFIXES.some((prefix) => isPathWithin(pathname, prefix))
  ) {
    return null;
  }
  return <ConfiguredFloatingMochit pathname={pathname} />;
}
