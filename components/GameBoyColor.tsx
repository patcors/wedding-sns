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
// screen sits at (33, 40) with size (100vw - 67) × (100vh - 400).
const SCREEN_LEFT = 33;
const SCREEN_TOP = 40;
const SCREEN_INSET_X = 67; // left 33 + right 34
const SCREEN_INSET_Y = 400; // top 40 + bottom body 360

export default function GameBoyColor({ topScreen }: Props) {
  const rigRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative flex-1 h-full w-full overflow-hidden bg-zinc-900 select-none">
      <div
        ref={rigRef}
        className="absolute overflow-hidden bg-black"
        style={{
          left: SCREEN_LEFT,
          top: SCREEN_TOP,
          width: `calc(100vw - ${SCREEN_INSET_X}px)`,
          height: `calc(100vh - ${SCREEN_INSET_Y}px)`,
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

/** Hold-to-walk hit-area: press on pointerdown, release on up/cancel. */
function DirButton({ dir, style }: { dir: InputDir; style: CSSProperties }) {
  const held = useRef(false);
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    if (held.current) return;
    held.current = true;
    inputBus.press(dir);
  };
  const release = () => {
    if (!held.current) return;
    held.current = false;
    inputBus.release(dir);
  };
  return (
    <button
      type="button"
      aria-label={dir}
      className={
        "absolute touch-none appearance-none p-0 m-0 outline-none cursor-pointer"
      }
      style={hitStyle(style)}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

/** One-shot hit-area for A / B / Start / Select. */
function ActionButton({
  action,
  style,
}: {
  action: InputAction;
  style: CSSProperties;
}) {
  const fire = (e: React.PointerEvent) => {
    e.preventDefault();
    inputBus.action(action);
  };
  return (
    <button
      type="button"
      aria-label={action}
      className={
        "absolute touch-none appearance-none p-0 m-0 outline-none cursor-pointer"
      }
      style={hitStyle(style)}
      onPointerDown={fire}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function GameboyColourLogo() {
  return (
    <div className="fixed bottom-[310px] left-0 flex w-full h-[40px] items-center justify-center">
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
    <div className="fixed bottom-[220px] left-0 flex w-full h-[40px] items-center justify-center">
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
    <div className="fixed top-0 left-0 right-0 flex flex-row w-full h-[40px]">
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
    <div className="fixed bottom-0 left-0 right-0 flex flex-row h-90">
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
        {/* D-pad: a square over the cross, split into the four arms. */}
        <div
          className="absolute"
          style={{ left: "19%", top: "29%", width: "46%", height: "29%" }}
        >
          <DirButton
            dir="up"
            style={{ left: "30%", top: "-26%", width: "40%", height: "60%" }}
          />
          <DirButton
            dir="down"
            style={{ left: "30%", top: "62%", width: "40%", height: "60%" }}
          />
          <DirButton
            dir="left"
            style={{ left: "-30%", top: "33%", width: "60%", height: "30%" }}
          />
          <DirButton
            dir="right"
            style={{ left: "67%", top: "33%", width: "60%", height: "30%" }}
          />
        </div>
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
    <div className="fixed top-0 bottom-0 left-0 h-screen">
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
    <div className="fixed top-0 bottom-0 right-0 h-screen">
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
