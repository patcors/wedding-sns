"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black text-sm text-zinc-400">
      Loading the world…
    </div>
  ),
});

export default function PlayPage() {
  return <GameCanvas />;
}
