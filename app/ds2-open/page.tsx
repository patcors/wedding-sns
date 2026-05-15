"use client";

import { useEffect, useState } from "react";
import NintendoDS2, { NintendoDS2LidBack } from "@/components/NintendoDS-2";

// Viewport math: the DS SVG is 800×820. The hinge line is at y=386 (about
// 47.07%). The lid is a half-height container that rotates around its OWN
// bottom edge (the hinge). The bottom unit lives in its own half-height
// container directly below.

const LID_PCT = (386 / 820) * 100;
const BOTTOM_PCT = 100 - LID_PCT;
// Inside each half-height container, the SVG is rendered at full
// natural size (its full 820 height) and the half not wanted is clipped
// via overflow:hidden. SVG height as % of container height:
const SVG_HEIGHT_PCT_TOP = (820 / 386) * 100; // ≈ 212.43%
const SVG_HEIGHT_PCT_BOTTOM = (820 / 434) * 100; // ≈ 188.94%

export default function DS2OpenPage() {
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

      <div style={{ perspective: "2200px", width: "min(720px, 90vw)" }}>
        <div style={{ position: "relative", aspectRatio: "800 / 820" }}>
          {/* Static bottom + hinge — bottom half. Renders the full DS SVG
              shifted up so only the bottom half shows through overflow. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${LID_PCT}%`,
              height: `${BOTTOM_PCT}%`,
              overflow: "hidden",
            }}
          >
            <NintendoDS2
              style={{
                position: "absolute",
                top: `-${LID_PCT / BOTTOM_PCT * 100}%`,
                left: 0,
                width: "100%",
                height: `${SVG_HEIGHT_PCT_BOTTOM}%`,
              }}
            />
          </div>

          {/* Flipping lid — top half. Rotates around its bottom edge (hinge). */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: `${LID_PCT}%`,
              transformOrigin: "50% 100%",
              transform: open ? "rotateX(0deg)" : "rotateX(-180deg)",
              transition: "transform 1.6s cubic-bezier(.5, 0, .2, 1)",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            {/* Front (inner) face — top half of NintendoDS2 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <NintendoDS2
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${SVG_HEIGHT_PCT_TOP}%`,
                }}
              />
            </div>

            {/* Back (outer) face — lid back, pre-rotated 180° around its
                centre so it faces the opposite way from the front. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
              }}
            >
              <NintendoDS2LidBack
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${SVG_HEIGHT_PCT_TOP}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
