"use client";

import type { Game } from "phaser";
import type { ViewportPlan } from "@/game/systems/viewport";

// Native tile size in design px. WORLD_SCALE is 1 (see OverworldScene), so one
// world tile is this many design pixels.
const TILE_PX = 16;

// Debug HUD pinned to the top-right of the GameBoy screen. Shows the hybrid
// scaling split: the integer camera zoom Phaser renders at, the fractional CSS
// scale FIT applies, the canvas resolution vs the on-screen size, and how many
// tiles are visible vertically. Gated by the ?debug URL flag (see GameCanvas).
export default function DebugOverlay({
  game,
  plan,
}: {
  game: Game;
  plan: ViewportPlan;
}) {
  // Final on-screen size after FIT's CSS scale.
  const screenW = Math.round(plan.canvasW * plan.cssScale);
  const screenH = Math.round(plan.canvasH * plan.cssScale);
  // 16px tiles rendered at an integer zoom => whole-pixel tiles => seam-free.
  const tilePx = TILE_PX * plan.phaserZoom;

  return (
    <div className="pointer-events-none absolute right-1 top-1 z-50 rounded bg-black/70 px-1.5 py-1 text-right font-mono text-[9px] leading-tight text-lime-300 tabular-nums">
      <div>
        screen {screenW}×{screenH}
      </div>
      <div>
        render {plan.canvasW}×{plan.canvasH}
      </div>
      <div>
        canvas {game.canvas?.width ?? 0}×{game.canvas?.height ?? 0}
      </div>
      <div>aspect {(screenW / screenH).toFixed(3)}</div>
      <div>
        zoom {plan.phaserZoom}× int · {plan.cssScale.toFixed(3)}× css ={" "}
        {plan.totalZoom.toFixed(3)}×
      </div>
      <div>tile {tilePx}px engine</div>
      <div>v-tiles {(plan.visibleHeight / TILE_PX).toFixed(1)}</div>
    </div>
  );
}
