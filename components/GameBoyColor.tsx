"use client";

import { CSSProperties, ReactNode, useRef } from "react";
import { inputBus, type InputAction, type InputDir } from "@/game/input/bus";

// Game Boy Color frame built as a horizontal 9-slice around the game screen.
//
//   ┌──────────── top band ────────────┐
//   │ [top L½] [ top_fill →stretch ] [top R½] │   <- gameboy_colour_top.png + _fill
//   ├──────┬──────────────────┬──────────┤
//   │ side │      SCREEN       │   side   │   <- gameboy_colour_right_fill.png (R) + mirror (L)
//   ├──────┴──────────────────┴──────────┤
//   │ [bot L½] [ bottom_fill →stretch] [bot R½]│   <- gameboy_colour_bottom.png + _fill
//   └──────────── bottom band ───────────┘
//
// The corner pieces (top.png / bottom.png) are drawn at native scale and the
// `_fill` slices stretch to absorb extra width. When the screen is narrower
// than the source image the two halves meet at the centre with no gap, so it
// degrades cleanly to "the whole image scaled to fit the width".
//
// Mobile controls: the d-pad and A/B/Start/Select buttons are *drawn into* the
// bottom-corner artwork, so we don't render our own buttons — we layer
// invisible <button> hit-areas on top of the corner images, positioned as
// fractions of each image's box (which keeps its native aspect ratio at every
// width, so the fractions track the artwork as the screen scales). Each button
// pokes the input bus, which the live Phaser scene subscribes to.

// Dandelion yellow of the Game Boy Color body (sampled from the bezel art).
// Painted behind the notch / top safe-area strip so the exposed status-bar
// region blends into the console instead of flashing the dark shell.
const GB_YELLOW = "#f1b000";

const ASSET = "/gameboy";
const SRC = {
  topLeft: `${ASSET}/gameboy_colour_top_left.png`,
  topRight: `${ASSET}/gameboy_colour_top_right.png`,
  topFill: `${ASSET}/gameboy_colour_top_fill.png`,
  bottomLeft: `${ASSET}/gameboy_colour_bottom_left.png`,
  bottomRight: `${ASSET}/gameboy_colour_bottom_right.png`,
  bottomFill: `${ASSET}/gameboy_colour_bottom_fill.png`,
  sideRight: `${ASSET}/gameboy_colour_right_fill.png`,
  sideLeft: `${ASSET}/gameboy_colour_left_fill.png`,
  gameboyColourLogo: `${ASSET}/gameboy_colour_logo.png`,
  gameboyColourNintendoLogo: `${ASSET}/gameboy_colour_nintendo_logo.png`,
};

type Props = {
  topScreen: ReactNode;
};

// Flip to true to paint the invisible hit-areas so they can be lined up with
// the printed buttons, then flip back. Positions below are percentages of the
// owning corner image and are meant to be hand-tuned against the artwork.
const DEBUG_CONTROLS = false;

// Screen window geometry, measured in viewport pixels. The bezel images are
// fixed to the viewport edges (left 33, right 34, top 40), so the playable
// screen sits at (33, 40) with size (100vw - 67) × (100vh - 400). The top
// pieces (screen, top band, side edges) are additionally pushed down by
// env(safe-area-inset-top) so the whole console clears the iOS notch.
const SCREEN_LEFT = 33;
const SCREEN_TOP = 40;
const SCREEN_INSET_X = 67; // left 33 + right 34
const SCREEN_INSET_Y = 400; // top 40 + bottom body 360

// Cap the console width so it doesn't stretch absurdly wide on desktop. The
// whole layout is fixed/100vw-based, so instead of restructuring we clamp the
// effective width (--gb-width) and add equal side gutters (--gb-gutter) that
// centre it: every full-width piece is shifted right by the gutter and sized to
// --gb-width, so the console behaves as if the viewport were at most 550px wide.
const GB_MAX_WIDTH = 550;

// Cap the whole console frame height so it doesn't stretch absurdly tall on big
// desktop monitors. On a taller viewport the console tops out at this height and
// is centred vertically — the `--gb-top-gutter` below is the equal top/bottom
// margin, applied to every viewport-anchored piece (bands, edges, logos, screen)
// so they all lift together. The screen window is derived: device − SCREEN_INSET_Y.
const GB_MAX_HEIGHT = 950;

export default function GameBoyColor({ topScreen }: Props) {
  const rigRef = useRef<HTMLDivElement>(null);

  return (
    // The shell fills the whole viewport (notch included) and is painted
    // GameBoy-yellow. The console pieces below are each pushed down by the top
    // safe-area inset, so the only part of the yellow shell left showing is the
    // notch strip — on an iOS PWA the notch reads as yellow console plastic.
    <main
      className="gb-shell relative flex-1 h-full w-full overflow-hidden select-none"
      // Inline (not in CSS): Lightning CSS strips these from stylesheets, but
      // `-webkit-touch-callout: none` is what suppresses iOS's long-press
      // loupe/magnifier. Both properties inherit, so setting them on the shell
      // covers the d-pad buttons, canvas, and bezel beneath it.
      style={
        {
          backgroundColor: GB_YELLOW,
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          "--gb-width": `min(100vw, ${GB_MAX_WIDTH}px)`,
          "--gb-gutter": `max(0px, (100vw - ${GB_MAX_WIDTH}px) / 2)`,
          // Equal top/bottom margin that centres the console once it hits its
          // height cap; 0 while the viewport is shorter than the cap.
          "--gb-top-gutter": `max(0px, (100vh - env(safe-area-inset-top, 0px) - ${GB_MAX_HEIGHT}px) / 2)`,
        } as CSSProperties
      }
    >
      <div
        ref={rigRef}
        className="absolute overflow-hidden bg-black"
        style={{
          left: `calc(${SCREEN_LEFT}px + var(--gb-gutter))`,
          top: `calc(${SCREEN_TOP}px + env(safe-area-inset-top, 0px) + var(--gb-top-gutter))`,
          width: `calc(var(--gb-width) - ${SCREEN_INSET_X}px)`,
          height: `calc(min(100vh - env(safe-area-inset-top, 0px), ${GB_MAX_HEIGHT}px) - ${SCREEN_INSET_Y}px)`,
        }}
      >
        {topScreen}
      </div>
      <LeftEdge />
      <RightEdge />
      <TopBand />
      <BottomBand />
      <GameboyColourLogo />
      <GameboyColourNintendoLogo />
    </main>
  );
}

function hitStyle(style: CSSProperties): CSSProperties {
  return {
    ...style,
    background: DEBUG_CONTROLS ? "rgba(255,0,0,0.35)" : "transparent",
    border: DEBUG_CONTROLS ? "1px solid red" : "none",
  };
}

const HIT_CLASS =
  "absolute touch-none appearance-none p-0 m-0 outline-none cursor-pointer";

// Each hit-area accepts one rect or several. Pass an array to stitch multiple
// rectangles into a single logical button (a bigger or L/T-shaped hitbox) —
// every rect is wired to the same handlers, so a press on any of them counts
// as the same button.
function rects(style: CSSProperties | CSSProperties[]): CSSProperties[] {
  return Array.isArray(style) ? style : [style];
}

// D-pad geometry, relative to the bottom-left artwork. One box over the whole
// cross (the union of the old four per-arm hitboxes): left arm starts at
// x=10, right arm ends at x=140, down arm starts at bottom=130, up arm ends
// at bottom=280. The pivot (cross centre) is the box centre: (75, bottom 205).
const DPAD_BOX: CSSProperties = {
  left: "10px",
  bottom: "130px",
  width: "130px",
  height: "150px",
};
// No direction registers within this radius of the pivot (like the physical
// pivot of a real d-pad), so a thumb resting dead-centre doesn't jitter
// between arms.
const DPAD_DEAD_ZONE = 12;
// How far outside the box a captured pointer can wander before the held
// direction releases, as a fraction of the box size. Generous on purpose:
// rolling thumbs drift.
const DPAD_SLACK = 0.4;

/**
 * Classify a pointer position into a d-pad direction. Dominant axis wins, so
 * the diagonal corners of the box snap to the nearest arm — that's what makes
 * rolling the thumb between arms feel continuous instead of dropping out over
 * the gap between the old per-arm rectangles.
 */
function dirAt(
  clientX: number,
  clientY: number,
  box: DOMRect,
): InputDir | null {
  const slackX = box.width * DPAD_SLACK;
  const slackY = box.height * DPAD_SLACK;
  if (
    clientX < box.left - slackX ||
    clientX > box.right + slackX ||
    clientY < box.top - slackY ||
    clientY > box.bottom + slackY
  ) {
    return null;
  }
  const dx = clientX - (box.left + box.width / 2);
  const dy = clientY - (box.top + box.height / 2);
  if (Math.hypot(dx, dy) < DPAD_DEAD_ZONE) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

/**
 * The whole d-pad as a single hit-area. Each active pointer is tracked by
 * pointerId and re-classified on every move, so a thumb can roll from one arm
 * to the next without lifting, and several fingers can ride the pad at once.
 * Presses are refcounted per direction: the bus only sees press on 0→1 and
 * release on 1→0, so two fingers holding the same arm don't cancel each other
 * when one lifts.
 */
function DPad() {
  const pointers = useRef(new Map<number, InputDir>());
  const counts = useRef<Record<InputDir, number>>({
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  });

  const setDir = (pointerId: number, next: InputDir | null) => {
    const prev = pointers.current.get(pointerId) ?? null;
    if (prev === next) return;
    if (prev && --counts.current[prev] === 0) inputBus.release(prev);
    if (next) {
      pointers.current.set(pointerId, next);
      if (++counts.current[next] === 1) inputBus.press(next);
    } else {
      pointers.current.delete(pointerId);
    }
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Touch pointers capture implicitly; this makes mouse drags match, and
    // capture is what keeps move/up events coming to us after the pointer
    // leaves the box mid-roll.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDir(
      e.pointerId,
      dirAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()),
    );
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setDir(
      e.pointerId,
      dirAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()),
    );
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    setDir(e.pointerId, null);
  };

  return (
    <div
      role="group"
      aria-label="d-pad"
      className={HIT_CLASS}
      style={hitStyle(DPAD_BOX)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

/**
 * Hit-area for A / B / Start / Select.
 *
 * Always emits the one-shot `action` on pointerdown (tap = confirm/cancel).
 * With `hold`, it also emits press/release so the scene can track the button
 * being held — e.g. hold B to run.
 */
function ActionButton({
  action,
  style,
  hold = false,
}: {
  action: InputAction;
  style: CSSProperties | CSSProperties[];
  hold?: boolean;
}) {
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    inputBus.action(action);
    if (hold) inputBus.pressAction(action);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    if (hold) inputBus.releaseAction(action);
  };
  return (
    <>
      {rects(style).map((s, i) => (
        <button
          key={i}
          type="button"
          aria-label={action}
          className={HIT_CLASS}
          style={hitStyle(s)}
          onPointerDown={press}
          onPointerUp={hold ? release : undefined}
          onPointerLeave={hold ? release : undefined}
          onPointerCancel={hold ? release : undefined}
          onContextMenu={(e) => e.preventDefault()}
        />
      ))}
    </>
  );
}

function GameboyColourLogo() {
  return (
    <div
      className="pointer-events-none fixed flex h-[40px] items-center justify-center"
      style={{
        bottom: "calc(310px + var(--gb-top-gutter))",
        left: "var(--gb-gutter)",
        width: "var(--gb-width)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-[40px] w-2/3 max-w-[320px] pointer-events-none select-none"
        src={SRC.gameboyColourLogo}
        alt=""
        draggable={false}
      />
    </div>
  );
}

function GameboyColourNintendoLogo() {
  return (
    <div
      className="pointer-events-none fixed flex h-[40px] items-center justify-center"
      style={{
        bottom: "calc(220px + var(--gb-top-gutter))",
        left: "var(--gb-gutter)",
        width: "var(--gb-width)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-[40px] max-w-1/3 pointer-events-none select-none"
        src={SRC.gameboyColourNintendoLogo}
        alt=""
        draggable={false}
      />
    </div>
  );
}

function TopBand() {
  return (
    <div
      className="fixed flex flex-row h-[40px]"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--gb-top-gutter))",
        left: "var(--gb-gutter)",
        width: "var(--gb-width)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none h-full w-[172px] pointer-events-none select-none"
        src={SRC.topLeft}
        alt=""
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="grow min-w-[20px] pointer-events-none select-none"
        src={SRC.topFill}
        alt=""
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none flex-end h-full w-[175px] pointer-events-none select-none"
        src={SRC.topRight}
        alt=""
        draggable={false}
      />
    </div>
  );
}

function BottomBand() {
  return (
    <div
      className="fixed flex flex-row h-90"
      style={{
        bottom: "var(--gb-top-gutter)",
        left: "var(--gb-gutter)",
        width: "var(--gb-width)",
      }}
    >
      {/* Bottom-left artwork: d-pad + Select. Wrapper keeps the image's box as
          the positioning context for the overlaid hit-areas. */}
      <div className="relative flex-none h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="block h-full w-auto pointer-events-none select-none"
          src={SRC.bottomLeft}
          alt=""
          draggable={false}
        />
        {/* D-pad: one hit-area over the whole cross; direction is computed
            from the pointer position so the thumb can roll between arms. */}
        <DPad />
        <ActionButton
          action="select"
          style={{ left: "72%", top: "66%", width: "26%", height: "9%" }}
        />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="grow pointer-events-none select-none"
        src={SRC.bottomFill}
        alt=""
        draggable={false}
      />

      {/* Bottom-right artwork: B + A + Start. */}
      <div className="relative flex-none h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="block h-full w-auto pointer-events-none select-none"
          src={SRC.bottomRight}
          alt=""
          draggable={false}
        />
        <ActionButton
          action="b"
          hold
          style={{ left: "20%", top: "38%", width: "26%", height: "15%" }}
        />
        <ActionButton
          action="a"
          style={{ left: "57%", top: "33%", width: "26%", height: "15%" }}
        />
        <ActionButton
          action="start"
          style={{ left: "1%", top: "66%", width: "26%", height: "9%" }}
        />
      </div>
    </div>
  );
}

/** A vertical side bezel, stretched to the middle's full height. */
function LeftEdge() {
  return (
    <div
      className="fixed"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--gb-top-gutter))",
        bottom: "var(--gb-top-gutter)",
        left: "var(--gb-gutter)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-full w-[33px] pointer-events-none select-none"
        src={SRC.sideLeft}
        alt=""
        draggable={false}
      />
    </div>
  );
}

function RightEdge() {
  return (
    <div
      className="fixed"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + var(--gb-top-gutter))",
        bottom: "var(--gb-top-gutter)",
        right: "var(--gb-gutter)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-full w-[34px] pointer-events-none select-none"
        src={SRC.sideRight}
        alt=""
        draggable={false}
      />
    </div>
  );
}
