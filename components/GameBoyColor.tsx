"use client";

import { ReactNode, useRef } from "react";

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
};

type Props = {
  topScreen: ReactNode;
};

// Screen window geometry, measured in viewport pixels. The bezel images are
// fixed to the viewport edges (left 33, right 34, top 40), so the playable
// screen sits at (33, 40) with size (100vw - 67) × (100dvh - 400).
const SCREEN_LEFT = 33;
const SCREEN_TOP = 40;
const SCREEN_INSET_X = 67; // left 33 + right 34
const SCREEN_INSET_Y = 400; // top 40 + bottom body 360

export default function GameBoyColor({ topScreen }: Props) {
  const rigRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-zinc-900 select-none">
      <div
        ref={rigRef}
        className="absolute overflow-hidden bg-black"
        style={{
          left: SCREEN_LEFT,
          top: SCREEN_TOP,
          width: `calc(100vw - ${SCREEN_INSET_X}px)`,
          height: `calc(100dvh - ${SCREEN_INSET_Y}px)`,
        }}
      >
        {topScreen}
      </div>
      <LeftEdge />
      <RightEdge />
      <TopBand />
      <BottomBand />
    </main>
  );
}

function TopBand() {
  return (
    <div className="fixed top-0 left-0 right-0 flex flex-row w-full h-[40px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none h-full w-[172px]"
        src={SRC.topLeft}
        alt=""
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="grow min-w-[20px]"
        src={SRC.topFill}
        alt=""
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none flex-end h-full w-[175px]"
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none"
        src={SRC.bottomLeft}
        alt=""
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="grow" src={SRC.bottomFill} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="flex-none"
        src={SRC.bottomRight}
        alt=""
        draggable={false}
      />
    </div>
  );
}

/** A vertical side bezel, stretched to the middle's full height. */
function LeftEdge() {
  return (
    <div className="fixed top-0 bottom-0 left-0 h-dvh">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-full w-[33px]"
        src={SRC.sideLeft}
        alt=""
        draggable={false}
      />
    </div>
  );
}

function RightEdge() {
  return (
    <div className="fixed top-0 bottom-0 right-0 h-dvh">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-full w-[34px]"
        src={SRC.sideRight}
        alt=""
        draggable={false}
      />
    </div>
  );
}
