"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/useAppState";
import {
  fetchCurrentExamReadiness,
  loadCachedProgressBootstrap,
} from "@/lib/userSession";
import { getMochitProgressPresentation } from "@/lib/mochitPresentation";
import { DEFAULT_MOCHIT_NAME, getMochitDisplayName } from "@/lib/mochitName";
import FloatingMochit from "./FloatingMochit";
import MochitConsultSheet from "./MochitConsultSheet";

const HIDDEN_ROUTE_PREFIXES = [
  "/login",
  "/onboarding",
  "/avatar",
  "/dev",
  // 公開ガイドは読み物。本文に重なる常駐キャラは出さない。
  "/guide",
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
  return (
    <>
      <FloatingMochit presentation={presentation} />
      {/* 相談シートはペットを非表示にしていても「モチットに聞く」ボタンから開ける */}
      <MochitConsultSheet displayName={state?.progress ? getMochitDisplayName(state) : DEFAULT_MOCHIT_NAME} />
    </>
  );
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
