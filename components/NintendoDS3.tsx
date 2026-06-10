"use client";

import { ReactNode, useEffect, useState } from "react";

// Photo-based DS flip rig. The lid (top half of the open photo) rotates
// around the hinge line; the closed photo is the lid back. Children rendered
// into `topScreen` / `bottomScreen` are positioned over the screen cutouts in
// the open photo (which are transparent in the source PNG).

const HINGE_PCT = 50;
const BOTTOM_PCT = 100 - HINGE_PCT;

const OPEN_SRC = "/ds/ds-open-transparent.png";
const CLOSED_SRC = "/ds/ds-closed-transparent.png";

// --- Closed-lid manual alignment knobs --------------------------------------
// Tweak these to align the closed photo against the open photo's bottom half.
// Positive offsets move the closed DS right/down in the final (flipped)
// viewport. CLOSED_SCALE multiplies its size from the centre.
const CLOSED_SCALE = 1.2;
const CLOSED_OFFSET_X = 0;
const CLOSED_OFFSET_Y = 0;

// --- Screen positions (% of the rig) ----------------------------------------
// Eyeballed from the open photo's transparent screen cut-outs. Adjust until
// the canvas sits flush inside the visible bezel.
const TOP_SCREEN = { left: 26, top: 7.5, width: 48.2, height: 35 };
const BOTTOM_SCREEN = { left: 23.4, top: 59, width: 50, height: 36.5 };
// ----------------------------------------------------------------------------

type Props = {
  topScreen: ReactNode;
  bottomScreen?: ReactNode;
  /** Open the lid on mount with a flip animation. Default true. */
  autoOpen?: boolean;
};

export default function NintendoDS3({
  topScreen,
  bottomScreen,
  autoOpen = true,
}: Props) {
  const [open, setOpen] = useState(!autoOpen);

  useEffect(() => {
    if (!autoOpen) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [autoOpen]);

  return (
    <main className="relative flex min-h-full w-full items-center justify-center bg-zinc-900 p-2 sm:p-6">
      <div style={{ perspective: "2400px", width: "min(640px, 100%)" }}>
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
              pointerEvents: "none",
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

          {/* Bottom-screen slot — sits over the static bottom photo and below
              the lid, so it's hidden when the lid is closed. */}
          <ScreenSlot rect={BOTTOM_SCREEN}>{bottomScreen}</ScreenSlot>

          {/* Flipping lid */}
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
            {/* Front (inner) face — top slice of the open photo + top-screen
                slot positioned over the transparent screen cut-out. */}
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
                  pointerEvents: "none",
                }}
              />

              {/* Top-screen slot — drawn over the photo so the canvas fully
                  covers the transparent screen cut-out (and any residual
                  photo content in the screen area). */}
              <div
                style={{
                  position: "absolute",
                  left: `${TOP_SCREEN.left}%`,
                  top: `${(TOP_SCREEN.top / HINGE_PCT) * 100}%`,
                  width: `${TOP_SCREEN.width}%`,
                  height: `${(TOP_SCREEN.height / HINGE_PCT) * 100}%`,
                  overflow: "hidden",
                  backgroundColor: "#000",
                }}
              >
                {topScreen}
              </div>
            </div>

            {/* Back (outer) face — closed-DS photo */}
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

function ScreenSlot({
  rect,
  children,
}: {
  rect: { left: number; top: number; width: number; height: number };
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {children}
    </div>
  );
}
