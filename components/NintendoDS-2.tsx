import { ReactNode, SVGProps } from "react";

// Visual-only SVG trace of a DS Lite-style handheld. No input wiring — see
// NintendoDS.tsx for the interactive version. viewBox is 800 × 820 to roughly
// match the reference image's aspect ratio. Coordinates are absolute pixels in
// that space so it's easy to tweak by eye.

type Props = SVGProps<SVGSVGElement> & {
  topScreen?: ReactNode;
  bottomScreen?: ReactNode;
};

// Outside of the lid — what you see when the DS is closed. Same 800×820
// viewBox as the front so it can be stacked under a flipping clip-path
// container without extra coordinate math.
export function NintendoDS2LidBack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 800 820"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Closed DS lid"
      {...props}
    >
      <defs>
        <linearGradient id="ds2back-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfbfb" />
          <stop offset="50%" stopColor="#e6e6e6" />
          <stop offset="100%" stopColor="#c2c2c2" />
        </linearGradient>
        <linearGradient id="ds2back-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shoulder notches */}
      <rect x="6" y="0" width="34" height="14" rx="3" fill="#cfcfcf" />
      <rect x="760" y="0" width="34" height="14" rx="3" fill="#cfcfcf" />

      {/* Outer shell — slightly cleaner gradient than the inside */}
      <rect
        x="4"
        y="6"
        width="792"
        height="380"
        rx="14"
        fill="url(#ds2back-shell)"
        stroke="#aeaeae"
        strokeWidth="1.5"
      />

      {/* Horizontal sheen across the upper third */}
      <rect x="20" y="60" width="760" height="36" rx="14" fill="url(#ds2back-sheen)" opacity="0.6" />

      {/* Subtle hinge seam highlight along the bottom edge of the lid */}
      <rect x="40" y="378" width="720" height="2" fill="#ffffff" opacity="0.6" />
      <rect x="40" y="382" width="720" height="1" fill="#9d9d9d" opacity="0.5" />

      {/* DS emblem — two stacked rounded rectangles in the centre, the
          iconic "two screens" mark on the back of every DS Lite. */}
      <g
        transform="translate(400 195)"
        fill="none"
        stroke="#b8b8b8"
        strokeWidth="3"
        opacity="0.85"
      >
        <rect x="-46" y="-44" width="92" height="38" rx="6" />
        <rect x="-36" y="6" width="72" height="38" rx="6" />
      </g>
    </svg>
  );
}

export default function NintendoDS2({ topScreen, bottomScreen, ...svg }: Props) {
  return (
    <svg
      viewBox="0 0 800 820"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Nintendo DS Lite illustration"
      {...svg}
    >
      <defs>
        <linearGradient id="ds2-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfdfd" />
          <stop offset="55%" stopColor="#ececec" />
          <stop offset="100%" stopColor="#cfcfcf" />
        </linearGradient>
        <linearGradient id="ds2-shell-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f2f2" />
          <stop offset="100%" stopColor="#c6c6c6" />
        </linearGradient>
        <linearGradient id="ds2-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bcbcbc" />
          <stop offset="100%" stopColor="#e6e6e6" />
        </linearGradient>
        <linearGradient id="ds2-hinge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdcdcd" />
          <stop offset="50%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#a8a8a8" />
        </linearGradient>
        <linearGradient id="ds2-dpad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8d8d8" />
          <stop offset="100%" stopColor="#a8a8a8" />
        </linearGradient>
        <radialGradient id="ds2-button" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#a8a8a8" />
        </radialGradient>
        <linearGradient id="ds2-led" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdf5a8" />
          <stop offset="100%" stopColor="#5fbf3d" />
        </linearGradient>
      </defs>

      {/* ============= TOP UNIT ============= */}
      {/* Shoulder notches (small tabs at very top corners) */}
      <rect x="6" y="0" width="34" height="14" rx="3" fill="#cfcfcf" />
      <rect x="760" y="0" width="34" height="14" rx="3" fill="#cfcfcf" />

      {/* Top shell */}
      <rect
        x="4"
        y="6"
        width="792"
        height="380"
        rx="14"
        fill="url(#ds2-shell)"
        stroke="#b5b5b5"
        strokeWidth="1.5"
      />

      {/* Top screen bezel (outer) */}
      <rect
        x="180"
        y="30"
        width="440"
        height="332"
        rx="8"
        fill="url(#ds2-bezel)"
        stroke="#9a9a9a"
        strokeWidth="1"
      />
      {/* Top screen */}
      <rect
        x="200"
        y="50"
        width="400"
        height="292"
        rx="2"
        fill="#ffffff"
        stroke="#8a8a8a"
        strokeWidth="0.5"
      />
      {topScreen && (
        <foreignObject x="200" y="50" width="400" height="292">
          {topScreen}
        </foreignObject>
      )}

      {/* Speaker grilles — 2 rows × 3 columns, each side */}
      <SpeakerDots cx={90} cy={195} />
      <SpeakerDots cx={710} cy={195} />

      {/* ============= HINGE ============= */}
      <rect
        x="4"
        y="386"
        width="792"
        height="58"
        rx="22"
        fill="url(#ds2-hinge)"
        stroke="#9d9d9d"
        strokeWidth="1"
      />
      {/* Hinge highlight line */}
      <rect x="40" y="402" width="720" height="2" fill="#ffffff" opacity="0.5" />

      {/* MiC indicator */}
      <g transform="translate(360 405)">
        <rect x="0" y="0" width="80" height="22" rx="3" fill="#e8e8e8" stroke="#a0a0a0" strokeWidth="0.6" />
        <rect x="6" y="4" width="8" height="14" rx="2" fill="#0a0a0a" />
        <text
          x="44"
          y="16"
          fontSize="13"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="600"
          fill="#444"
        >
          MiC
        </text>
      </g>

      {/* Power / charge LEDs (two green pills, right side of hinge) */}
      <rect x="710" y="408" width="6" height="16" rx="2" fill="url(#ds2-led)" />
      <rect x="722" y="408" width="6" height="16" rx="2" fill="url(#ds2-led)" />

      {/* ============= BOTTOM UNIT ============= */}
      <rect
        x="4"
        y="442"
        width="792"
        height="372"
        rx="14"
        fill="url(#ds2-shell-bottom)"
        stroke="#b5b5b5"
        strokeWidth="1.5"
      />

      {/* Bottom screen bezel */}
      <rect
        x="220"
        y="466"
        width="360"
        height="320"
        rx="8"
        fill="url(#ds2-bezel)"
        stroke="#9a9a9a"
        strokeWidth="1"
      />
      <rect
        x="240"
        y="486"
        width="320"
        height="280"
        rx="2"
        fill="#ffffff"
        stroke="#8a8a8a"
        strokeWidth="0.5"
      />
      {bottomScreen && (
        <foreignObject x="240" y="486" width="320" height="280">
          {bottomScreen}
        </foreignObject>
      )}

      {/* D-pad (left) */}
      <DPad cx={110} cy={600} arm={42} length={130} />

      {/* Face buttons (right) in X/Y/A/B diamond */}
      <FaceButtons cx={680} cy={600} radius={28} spread={48} />

      {/* START / SELECT pills (lower right) */}
      <StartSelect x={605} y={730} />
    </svg>
  );
}

function SpeakerDots({ cx, cy }: { cx: number; cy: number }) {
  const cols = [-22, 0, 22];
  const rows = [-12, 12];
  return (
    <g fill="#5a5a5a">
      {rows.map((dy) =>
        cols.map((dx) => (
          <circle key={`${dx}_${dy}`} cx={cx + dx} cy={cy + dy} r={3.2} />
        )),
      )}
    </g>
  );
}

function DPad({
  cx,
  cy,
  arm,
  length,
}: {
  cx: number;
  cy: number;
  arm: number;
  length: number;
}) {
  const halfArm = arm / 2;
  const halfLen = length / 2;
  // Plus-shape via two crossed rounded rects + subtle inner cross lines.
  return (
    <g>
      {/* Drop shadow */}
      <g transform="translate(2 3)" opacity="0.25">
        <rect x={cx - halfLen} y={cy - halfArm} width={length} height={arm} rx={6} fill="#000" />
        <rect x={cx - halfArm} y={cy - halfLen} width={arm} height={length} rx={6} fill="#000" />
      </g>
      {/* Body */}
      <rect
        x={cx - halfLen}
        y={cy - halfArm}
        width={length}
        height={arm}
        rx={6}
        fill="url(#ds2-dpad)"
        stroke="#7d7d7d"
        strokeWidth="1.2"
      />
      <rect
        x={cx - halfArm}
        y={cy - halfLen}
        width={arm}
        height={length}
        rx={6}
        fill="url(#ds2-dpad)"
        stroke="#7d7d7d"
        strokeWidth="1.2"
      />
      {/* Inner cross grooves */}
      <line x1={cx - halfLen + 8} y1={cy} x2={cx - halfArm - 2} y2={cy} stroke="#8a8a8a" strokeWidth="1" />
      <line x1={cx + halfArm + 2} y1={cy} x2={cx + halfLen - 8} y2={cy} stroke="#8a8a8a" strokeWidth="1" />
      <line x1={cx} y1={cy - halfLen + 8} x2={cx} y2={cy - halfArm - 2} stroke="#8a8a8a" strokeWidth="1" />
      <line x1={cx} y1={cy + halfArm + 2} x2={cx} y2={cy + halfLen - 8} stroke="#8a8a8a" strokeWidth="1" />
    </g>
  );
}

function FaceButtons({
  cx,
  cy,
  radius,
  spread,
}: {
  cx: number;
  cy: number;
  radius: number;
  spread: number;
}) {
  const buttons: Array<{ label: string; dx: number; dy: number }> = [
    { label: "X", dx: 0, dy: -spread },
    { label: "Y", dx: -spread, dy: 0 },
    { label: "A", dx: spread, dy: 0 },
    { label: "B", dx: 0, dy: spread },
  ];
  return (
    <g>
      {buttons.map(({ label, dx, dy }) => (
        <g key={label}>
          <circle
            cx={cx + dx}
            cy={cy + dy}
            r={radius}
            fill="url(#ds2-button)"
            stroke="#8a8a8a"
            strokeWidth="1"
          />
          <text
            x={cx + dx}
            y={cy + dy + radius * 0.32}
            fontSize={radius * 0.85}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            fill="#666"
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}

function StartSelect({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[
        { label: "START", dy: 0 },
        { label: "SELECT", dy: 30 },
      ].map(({ label, dy }) => (
        <g key={label} transform={`translate(${x} ${y + dy})`}>
          <rect
            x="0"
            y="0"
            width="22"
            height="10"
            rx="5"
            fill="url(#ds2-button)"
            stroke="#8a8a8a"
            strokeWidth="0.6"
          />
          <text
            x="34"
            y="9"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
            fill="#555"
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}
