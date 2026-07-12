"use client";

import Image from "next/image";
import { useState } from "react";

export default function MapBackground() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        data-testid="roadmap-background"
        className="absolute inset-0 bg-gradient-to-b from-sky-800 via-sky-600 to-cyan-500"
      />
    );
  }

  return (
    <Image
      data-testid="roadmap-background"
      src="/maps/roadmap/base-map.webp"
      alt=""
      fill
      priority
      sizes="(max-width: 767px) calc(100vw - 2rem), 512px"
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
}
