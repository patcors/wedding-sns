"use client";

import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | undefined;

    (async () => {
      const [{ default: Phaser }, { createGame }] = await Promise.all([
        import("phaser"),
        import("@/game/createGame"),
      ]);
      if (destroyed || !hostRef.current) return;
      game = createGame(Phaser, hostRef.current);
    })();

    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="h-full w-full touch-none select-none bg-black"
    />
  );
}
