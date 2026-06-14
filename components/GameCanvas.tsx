"use client";

import { useEffect, useRef, useState } from "react";
import DebugOverlay from "./DebugOverlay";
import { planViewport, type ViewportPlan } from "@/game/systems/viewport";

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const [game, setGame] = useState<import("phaser").Game | null>(null);
  const [plan, setPlan] = useState<ViewportPlan | null>(null);
  // Debug HUD toggle — append ?debug to the URL to show the viewport overlay.
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"));

    let destroyed = false;

    // Pick the integer-zoom canvas resolution for the current screen size and
    // hand it to Phaser; FIT then CSS-scales that canvas by the fractional
    // remainder to fill the screen (see game/systems/viewport.ts).
    const applyPlan = () => {
      const host = hostRef.current;
      if (!host) return;
      const p = planViewport(host.clientWidth, host.clientHeight);
      gameRef.current?.scale.setGameSize(p.canvasW, p.canvasH);
      setPlan(p);
    };

    const ro = new ResizeObserver(applyPlan);

    (async () => {
      const [{ default: Phaser }, { createGame }] = await Promise.all([
        import("phaser"),
        import("@/game/createGame"),
      ]);
      if (destroyed || !hostRef.current) return;
      const g = createGame(Phaser, hostRef.current);
      // Nearest-neighbour for FIT's fractional CSS upscale — crisp, not blurry.
      g.canvas.style.imageRendering = "pixelated";
      gameRef.current = g;
      setGame(g);
      applyPlan();
      ro.observe(hostRef.current);
    })();

    return () => {
      destroyed = true;
      ro.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      setGame(null);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full overflow-hidden touch-none select-none bg-black"
    >
      {debug && game && plan && <DebugOverlay game={game} plan={plan} />}
    </div>
  );
}
