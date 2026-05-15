"use client";

import { useEffect, useState } from "react";

// Photo-based flip rig using transparent PNG cut-outs. Rig is sized to the
// open photo's aspect. The lid (top half) rotates around the hinge line; the
// closed photo is the lid back.
//
// Alignment notes:
//   - Open photo  1561 × 1632 (transparent surround) — body roughly centred.
//   - Closed photo 1121 ×  644 (transparent surround) — hinges at top.
//   - Hinge line is at HINGE_PCT% of the open photo. With these crops the
//     hinge is essentially mid-height, so 50% is a clean starting point.
//   - The closed photo's native aspect (1.74) is wider per unit height than
//     the lid container (1.91), so we stretch slightly vertically to keep the
//     body width matched to the open photo's body width. The squish is < 10%
//     and effectively invisible against transparent surrounds.

const HINGE_PCT = 50;
const BOTTOM_PCT = 100 - HINGE_PCT;

const OPEN_SRC = "/ds/ds-open-transparent.png";
const CLOSED_SRC = "/ds/ds-closed-transparent.png";

// --- Closed-lid manual alignment knobs --------------------------------------
// Tweak these to align the closed photo pixel-perfectly against the open
// photo's bottom half. Positive offsets move the closed DS right/down in the
// final (flipped) viewport. CLOSED_SCALE multiplies its size from the centre.
// Units: % of the lid container's width/height respectively.
const CLOSED_SCALE = 1.05;
const CLOSED_OFFSET_X = 0;
const CLOSED_OFFSET_Y = -4;
// ----------------------------------------------------------------------------

export default function DS3OpenPage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-zinc-900 p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-4 top-4 rounded bg-zinc-700 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-600"
      >
        Toggle
      </button>

      <div style={{ perspective: "2400px", width: "min(640px, 90vw)" }}>
        <div style={{ position: "relative", aspectRatio: "1561 / 1632" }}>
          {/* Static bottom half — bottom slice of the open photo */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${HINGE_PCT}%`,
              height: `${BOTTOM_PCT}%`,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={OPEN_SRC}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                top: `-${(HINGE_PCT / BOTTOM_PCT) * 100}%`,
                left: 0,
                width: "100%",
                height: `${(100 / BOTTOM_PCT) * 100}%`,
                userSelect: "none",
              }}
            />
          </div>

          {/* Flipping lid — top half, rotates around its bottom edge (hinge) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: `${HINGE_PCT}%`,
              transformOrigin: "50% 100%",
              transform: open ? "rotateX(0deg)" : "rotateX(-180deg)",
              transition: "transform 1.6s cubic-bezier(.5, 0, .2, 1)",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            {/* Front (inner) face — top slice of the open photo */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.4))",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={OPEN_SRC}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${(100 / HINGE_PCT) * 100}%`,
                  userSelect: "none",
                }}
              />
            </div>

            {/* Back (outer) face — closed-DS photo, anchored at natural
                aspect ratio and tuned with the CLOSED_SCALE / OFFSET knobs
                above. Dark backdrop sits inside the lid bounds and occludes
                the static bottom unit while the lid is shut so its silhouette
                doesn't bleed through transparent margins of the closed photo. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "visible",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
                filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.5))",
              }}
            >
              {/* Backdrop occluder — same size as the lid container */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#18181b",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CLOSED_SRC}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "auto",
                  transform: `translate(${CLOSED_OFFSET_X}%, ${CLOSED_OFFSET_Y}%) scale(${CLOSED_SCALE})`,
                  transformOrigin: "center center",
                  userSelect: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
