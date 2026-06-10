"use client";

import dynamic from "next/dynamic";
import GameBoyColor from "@/components/GameBoyColor";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black text-[10px] text-zinc-500">
      booting…
    </div>
  ),
});

export default function PlayPage() {
  return <GameBoyColor topScreen={<GameCanvas />} />;
}
