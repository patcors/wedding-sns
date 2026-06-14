// Internal fixed resolution. We scale up with Phaser.Scale.FIT.
// GBA was 240x160 and FRLG-native; we go bigger so 32x48 player sprites + 16x16
// tiles have room to breathe without feeling like 6 chunky pixels on a phone.
// 320x240 gives ~20x15 tiles visible — generous viewport, still retro.
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 240;

export type CharacterId = "sam" | "sarah";

export type Dir = "up" | "down" | "left" | "right";

// Per-direction frame index lists. For a Pokémon walk cycle the natural pattern
// is [idle, step, idle, otherStep]; for a sheet whose row IS the 4-frame cycle
// (like the Brendan sheet) it's just the four frames in order.
type DirFrames = Record<Dir, number[]>;

// A character's spritesheet + how its frames map to walk/run animations. This is
// the single source of truth — scenes build sprites and anims from this, so a new
// playable character is a data-only edit here (+ the PNG in public/).
export type CharacterSprite = {
  /** Phaser texture/asset key. */
  sheetKey: string;
  /** Path under public/. */
  texturePath: string;
  frameWidth: number;
  frameHeight: number;
  /** Idle (standing) frame per direction. */
  idle: Record<Dir, number>;
  /** Walk-cycle frames per direction. */
  walk: DirFrames;
  /** Run-cycle frames per direction. Omitted when the sheet has no run row. */
  run?: DirFrames;
  /** Walk animation frame rate (fps). */
  frameRate: number;
};

export const CHARACTER_SPRITES: Record<CharacterId, CharacterSprite> = {
  // Custom Sam sheet (sam-animation.png): 96x256, 3 cols x 8 rows of 32x32 —
  // same layout as Sarah's (see below).
  sam: {
    sheetKey: "sam-sheet",
    texturePath: "/playable-characters/sam-animation.png",
    frameWidth: 32,
    frameHeight: 32,
    idle: { down: 0, right: 3, up: 6, left: 9 },
    walk: {
      down: [0, 1, 0, 2],
      right: [3, 4, 3, 5],
      up: [6, 7, 6, 8],
      left: [9, 10, 9, 11],
    },
    run: {
      down: [12, 13, 12, 14],
      right: [15, 16, 15, 17],
      up: [18, 19, 18, 20],
      left: [21, 22, 21, 23],
    },
    frameRate: 8,
  },
  // Custom Sarah sheet (sarah-animation.png): 96x256, 3 cols x 8 rows of 32x32.
  // Each row has 3 unique cells [idle, stepA, stepB]; the walk cycle plays them
  // idle->stepA->idle->stepB. Rows 0-3 are walk (down/right/up/left), rows 4-7
  // are run (down/right/up/left). See sarah-animation.json frameTags.
  sarah: {
    sheetKey: "sarah-sheet",
    texturePath: "/playable-characters/sarah-animation.png",
    frameWidth: 32,
    frameHeight: 32,
    idle: { down: 0, right: 3, up: 6, left: 9 },
    walk: {
      down: [0, 1, 0, 2],
      right: [3, 4, 3, 5],
      up: [6, 7, 6, 8],
      left: [9, 10, 9, 11],
    },
    run: {
      down: [12, 13, 12, 14],
      right: [15, 16, 15, 17],
      up: [18, 19, 18, 20],
      left: [21, 22, 21, 23],
    },
    frameRate: 8,
  },
};

// Animation keys are namespaced per character so two sheets never collide.
export function animKey(id: CharacterId, gait: "walk" | "run", dir: Dir) {
  return `${id}-${gait}-${dir}`;
}

// --- dev ergonomics ---
// In development, skip Title + CharacterSelect and drop straight into the
// overworld so hot-reloads land in-game. Append ?intro to the URL to watch the
// real opening flow when you need to. Always off in production builds.
export const DEV_SKIP_INTRO = process.env.NODE_ENV !== "production";
export const DEV_DEFAULT_CHARACTER: CharacterId = "sam";

export const CHARACTERS: Record<
  CharacterId,
  { id: CharacterId; name: string; accent: number }
> = {
  sam: { id: "sam", name: "Sam", accent: 0x4f9dde },
  sarah: { id: "sarah", name: "Sarah", accent: 0xe26a8b },
};
