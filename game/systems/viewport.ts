import type Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";

// Responsive viewport strategy — HYBRID integer-zoom + CSS fractional remainder
// -----------------------------------------------------------------------------
// We want a FIXED vertical slice of world (VISIBLE_HEIGHT design px) on every
// device, with the width flexing to the aspect ratio. The total zoom that needs
// is `screenH / VISIBLE_HEIGHT`, which is almost always fractional.
//
// Phaser CANNOT render a tilemap at a fractional camera zoom without seams: the
// layer is one batched GPU mesh scaled by the camera matrix, so interior tile
// edges sample the tileset at fractional texel offsets (roundPixels only snaps
// object origins, not the mesh interior) -> thin "black line" gaps. The earlier
// "snap zoom to 1/16" idea is mathematically seam-free for a CPU renderer but
// doesn't hold here, because the GPU does the scaling.
//
// So we SPLIT the zoom:
//   - Phaser does the INTEGER part (floor of the total). At a whole-number zoom
//     every tile rasterises on exact texels -> crisp, seam-free.
//   - CSS does the FRACTIONAL remainder by scaling the finished <canvas> (Scale.
//     FIT + image-rendering: pixelated). Scaling one flat bitmap can't create
//     inter-tile seams.
// The price is the usual pixel-art fractional-scale tradeoff (a few screen
// pixels doubled), but no seams and no blur. GameCanvas owns the CSS half via
// setGameSize; this module derives both halves so they always agree.

// Design px shown vertically on every device. Lower = more zoomed-in / less
// world; higher = more world. The single knob for "how much world is visible".
export const VISIBLE_HEIGHT = 300;

// Everything GameCanvas needs to size the canvas for a given on-screen size.
export type ViewportPlan = {
  /** Design px shown vertically (VISIBLE_HEIGHT, unless the screen is shorter). */
  visibleHeight: number;
  /** World px -> screen px. Continuous; what the eye perceives. */
  totalZoom: number;
  /** Integer camera zoom applied inside Phaser (seam-free). */
  phaserZoom: number;
  /** Fractional remainder applied by FIT as a CSS canvas scale (~1.0–2.0). */
  cssScale: number;
  /** Canvas RESOLUTION in px — rendered at phaserZoom, then CSS-scaled by FIT. */
  canvasW: number;
  canvasH: number;
};

// Derive the integer/CSS split from the on-screen (CSS px) size of the screen.
export function planViewport(screenW: number, screenH: number): ViewportPlan {
  const totalZoom = screenH / VISIBLE_HEIGHT;
  const phaserZoom = Math.max(1, Math.floor(totalZoom));
  // Render VISIBLE_HEIGHT design px at the integer zoom, so the canvas height is
  // an exact multiple of VISIBLE_HEIGHT; FIT then scales it up to the screen.
  const canvasH = phaserZoom * VISIBLE_HEIGHT;
  const cssScale = screenH / canvasH; // == totalZoom / phaserZoom
  // Match the screen's aspect so FIT scales uniformly with ~no letterbox.
  const canvasW = Math.round(screenW / cssScale);
  return { visibleHeight: VISIBLE_HEIGHT, totalZoom, phaserZoom, cssScale, canvasW, canvasH };
}

// Integer camera zoom for a scene, from the live canvas (game) height. Equals
// planViewport's phaserZoom because the canvas height is phaserZoom *
// VISIBLE_HEIGHT. Scenes call this in setZoom on create/resize.
export function viewportZoom(scale: Phaser.Scale.ScaleManager): number {
  return Math.max(1, Math.round(scale.height / VISIBLE_HEIGHT));
}

// Design-frame centre (320x240). Static scenes lay out around this point and
// call `cam.centerOn(...DESIGN_CENTER)` so content stays centred regardless of
// the visible width — see TitleScene / CharacterSelectScene.
export const DESIGN_CENTER: [number, number] = [
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2,
];
