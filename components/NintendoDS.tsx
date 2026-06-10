"use client";

import { ReactNode } from "react";
import { inputBus, InputDir } from "@/game/input/bus";

// Stylised DS Lite-ish wrapper. The shell is SVG (sharp at any size); screens
// and tappable buttons are HTML overlays positioned in percentages relative to
// the SVG viewBox (100 × 130). Aspect-ratio on the wrapper keeps everything in
// proportion regardless of viewport size.

type Props = {
  topScreen: ReactNode;
  bottomScreen?: ReactNode;
};

// All positions are % of the wrapper, sized to match SVG viewBox 100 × 130.
const SLOTS = {
  topScreen: { left: 20, top: 6, width: 60, height: 45 },
  bottomScreen: { left: 25, top: 75, width: 50, height: 37.5 },
  dpad: { left: 3, top: 80, width: 18, height: 22 },
  abButtons: { right: 3, top: 80, width: 18, height: 22 },
};

export default function NintendoDS({ topScreen, bottomScreen }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-2">
      <div
        className="relative h-full"
        style={{ aspectRatio: "100 / 130", maxWidth: "100%" }}
      >
        <svg
          viewBox="0 0 100 130"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Drop shadow */}
          <defs>
            <linearGradient id="shellGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fafafa" />
              <stop offset="100%" stopColor="#dcdcdc" />
            </linearGradient>
            <linearGradient id="screenBezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#0a0a0a" />
            </linearGradient>
          </defs>

          {/* TOP UNIT */}
          <rect
            x={0}
            y={0}
            width={100}
            height={58}
            rx={4}
            fill="url(#shellGradient)"
            stroke="#bdbdbd"
            strokeWidth={0.3}
          />
          {/* Top screen bezel */}
          <rect
            x={17}
            y={3}
            width={66}
            height={51}
            rx={1.5}
            fill="url(#screenBezel)"
          />
          {/* Speaker grilles */}
          {[0, 1, 2].map((i) => (
            <circle key={`l${i}`} cx={8} cy={20 + i * 4} r={0.7} fill="#999" />
          ))}
          {[0, 1, 2].map((i) => (
            <circle key={`r${i}`} cx={92} cy={20 + i * 4} r={0.7} fill="#999" />
          ))}
          {/* Camera/light dots row */}
          <circle cx={48} cy={55.5} r={0.4} fill="#666" />
          <circle cx={52} cy={55.5} r={0.4} fill="#666" />

          {/* HINGE */}
          <rect x={0} y={58} width={100} height={4} fill="#cfcfcf" />
          <rect x={20} y={58.5} width={60} height={3} rx={1} fill="#bdbdbd" />

          {/* BOTTOM UNIT */}
          <rect
            x={0}
            y={62}
            width={100}
            height={68}
            rx={4}
            fill="url(#shellGradient)"
            stroke="#bdbdbd"
            strokeWidth={0.3}
          />
          {/* Bottom screen bezel */}
          <rect
            x={22}
            y={72}
            width={56}
            height={41}
            rx={1.5}
            fill="url(#screenBezel)"
          />

          {/* D-pad visual (under the HTML overlay) */}
          <DPadGfx cx={12} cy={91} size={14} />

          {/* A/B/X/Y visual */}
          <FaceButtonsGfx cx={88} cy={91} size={14} />

          {/* Start / Select pills */}
          <rect x={40} y={119} width={8} height={1.8} rx={0.9} fill="#a0a0a0" />
          <rect x={52} y={119} width={8} height={1.8} rx={0.9} fill="#a0a0a0" />

          {/* Power LED */}
          <circle cx={50} cy={66} r={0.6} fill="#7dd87d" />
        </svg>

        {/* TOP SCREEN content slot (game canvas goes here) */}
        <ScreenSlot rect={SLOTS.topScreen}>{topScreen}</ScreenSlot>

        {/* BOTTOM SCREEN content slot (HUD / menus later) */}
        <ScreenSlot rect={SLOTS.bottomScreen}>
          {bottomScreen ?? <BottomScreenPlaceholder />}
        </ScreenSlot>

        {/* Tappable D-pad overlay */}
        <DPadOverlay rect={SLOTS.dpad} />

        {/* A/B buttons (decorative for now, hooked into the input bus) */}
        <ABButtonsOverlay rect={SLOTS.abButtons} />
      </div>
    </div>
  );
}

function ScreenSlot({
  rect,
  children,
}: {
  rect: { left: number; top: number; width: number; height: number };
  children: ReactNode;
}) {
  return (
    <div
      className="absolute overflow-hidden bg-black"
      style={{
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
    >
      {children}
    </div>
  );
}

function BottomScreenPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950 font-mono text-[10px] tracking-widest text-zinc-600">
      WEDDING.DS
    </div>
  );
}

function DPadOverlay({
  rect,
}: {
  rect: { left: number; top: number; width: number; height: number };
}) {
  return (
    <div
      className="absolute touch-none select-none"
      style={{
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
    >
      {/* 3x3 grid; center is dead, edges are direction buttons */}
      <div className="grid h-full w-full grid-cols-3 grid-rows-3">
        <div />
        <DirButton dir="up" />
        <div />
        <DirButton dir="left" />
        <div />
        <DirButton dir="right" />
        <div />
        <DirButton dir="down" />
        <div />
      </div>
    </div>
  );
}

function DirButton({ dir }: { dir: InputDir }) {
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    inputBus.press(dir);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    inputBus.release(dir);
  };
  return (
    <button
      type="button"
      aria-label={dir}
      className="h-full w-full cursor-pointer touch-none bg-transparent active:bg-white/10"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    />
  );
}

function ABButtonsOverlay({
  rect,
}: {
  rect: { right: number; top: number; width: number; height: number };
}) {
  return (
    <div
      className="absolute touch-none select-none"
      style={{
        right: `${rect.right}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
    >
      <button
        type="button"
        aria-label="A"
        className="absolute touch-none rounded-full bg-transparent active:bg-rose-300/30"
        style={{ left: "60%", top: "30%", width: "32%", height: "32%" }}
        onPointerDown={(e) => {
          e.preventDefault();
          inputBus.action("a");
        }}
      />
      <button
        type="button"
        aria-label="B"
        className="absolute touch-none rounded-full bg-transparent active:bg-rose-300/30"
        style={{ left: "30%", top: "60%", width: "32%", height: "32%" }}
        onPointerDown={(e) => {
          e.preventDefault();
          inputBus.action("b");
        }}
      />
    </div>
  );
}

// --- SVG decorations ---

function DPadGfx({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const arm = size * 0.32;
  const half = arm / 2;
  return (
    <g>
      {/* Horizontal arm */}
      <rect
        x={cx - size / 2}
        y={cy - half}
        width={size}
        height={arm}
        rx={0.6}
        fill="#2a2a2a"
      />
      {/* Vertical arm */}
      <rect
        x={cx - half}
        y={cy - size / 2}
        width={arm}
        height={size}
        rx={0.6}
        fill="#2a2a2a"
      />
      {/* Subtle highlight */}
      <rect
        x={cx - half + 0.4}
        y={cy - size / 2 + 0.4}
        width={arm - 0.8}
        height={1}
        fill="#3a3a3a"
      />
    </g>
  );
}

function FaceButtonsGfx({
  cx,
  cy,
  size,
}: {
  cx: number;
  cy: number;
  size: number;
}) {
  const r = size * 0.15;
  const off = size * 0.32;
  return (
    <g>
      {/* X (top) */}
      <circle
        cx={cx}
        cy={cy - off}
        r={r}
        fill="#e8e8e8"
        stroke="#bdbdbd"
        strokeWidth={0.2}
      />
      {/* Y (left) */}
      <circle
        cx={cx - off}
        cy={cy}
        r={r}
        fill="#e8e8e8"
        stroke="#bdbdbd"
        strokeWidth={0.2}
      />
      {/* A (right) */}
      <circle
        cx={cx + off}
        cy={cy}
        r={r}
        fill="#e8e8e8"
        stroke="#bdbdbd"
        strokeWidth={0.2}
      />
      {/* B (bottom) */}
      <circle
        cx={cx}
        cy={cy + off}
        r={r}
        fill="#e8e8e8"
        stroke="#bdbdbd"
        strokeWidth={0.2}
      />
      {/* Letters */}
      <text
        x={cx}
        y={cy - off + 0.8}
        fontSize={2}
        textAnchor="middle"
        fill="#888"
      >
        X
      </text>
      <text
        x={cx - off}
        y={cy + 0.8}
        fontSize={2}
        textAnchor="middle"
        fill="#888"
      >
        Y
      </text>
      <text
        x={cx + off}
        y={cy + 0.8}
        fontSize={2}
        textAnchor="middle"
        fill="#888"
      >
        A
      </text>
      <text
        x={cx}
        y={cy + off + 0.8}
        fontSize={2}
        textAnchor="middle"
        fill="#888"
      >
        B
      </text>
    </g>
  );
}
