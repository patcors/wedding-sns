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
  /** Phaser texture key for the character-select portrait (single image). */
  selectKey: string;
  /** Portrait path under public/, shown on the character-select screen. */
  selectPath: string;
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
  // Custom Sam sheet (sam-sprites.png): 96x256, 3 cols x 8 rows of 32x32 —
  // same layout as Sarah's (see below).
  sam: {
    sheetKey: "sam-sheet",
    texturePath: "/playable-characters/sam-sprites.png",
    selectKey: "sam-select",
    selectPath: "/playable-characters/sam-character-select.png",
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
  // Custom Sarah sheet (sarah-sprites.png): 96x256, 3 cols x 8 rows of 32x32.
  // Each row has 3 unique cells [idle, stepA, stepB]; the walk cycle plays them
  // idle->stepA->idle->stepB. Rows 0-3 are walk (down/right/up/left), rows 4-7
  // are run (down/right/up/left). See sarah-sprites.json frameTags.
  sarah: {
    sheetKey: "sarah-sheet",
    texturePath: "/playable-characters/sarah-sprites.png",
    selectKey: "sarah-select",
    selectPath: "/playable-characters/sarah-character-select.png",
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

// --- NPCs ---
export const GENERIC_MAN_SHEET = "generic-man";
export const GENERIC_MAN_TEXTURE_PATH = "/non-playable-characters/generic-man.png";
export const GENERIC_MAN_FRAME_SIZE = 32;
export const GENERIC_MAN_IDLE_FRAME = 0;
// "turn-to-front" plays when the player walks adjacent (frames 0→1→2→0).
export const GENERIC_MAN_TURN_ANIM = "generic-man-turn";

// --- bushes ---
// Standalone 2-frame sheet (public/tilesets/bushes.png, 32x16): frame 0 = at
// rest, frame 1 = leaves displaced. Map tiles tagged `bush=true` in Tiled are
// swapped at runtime for an animated sprite from this sheet, so each bush can
// Y-sort against the player (sometimes in front, sometimes behind) and rustle
// when walked through.
export const BUSH_SHEET = "bushes";
export const BUSH_TEXTURE_PATH = "/tilesets/bushes.png";
export const BUSH_FRAME_SIZE = 16;
export const BUSH_RUSTLE_ANIM = "bush-rustle";

// --- music ---
// Chiptune renders (MIDI -> pulse voices, see scripts/chiptune/), one looped as
// the overworld theme once the player spawns. The player picks which on the
// character-select screen; the .m4a files are AAC encoded from the .wav renders
// via afconvert (~3-5MB vs ~20-28MB raw) so they load on a phone over hotel Wi-Fi.
export type TrackId = "marigolds" | "captain";

export interface Track {
  id: TrackId;
  name: string;
  key: string; // Phaser audio cache key
  path: string; // served from /public
}

export const TRACKS: Record<TrackId, Track> = {
  marigolds: {
    id: "marigolds",
    name: "Marigolds",
    key: "track-marigolds",
    path: "/music/chiptune/marigolds.m4a",
  },
  captain: {
    id: "captain",
    name: "Captain",
    key: "track-captain",
    path: "/music/chiptune/captain.m4a",
  },
};

// Order shown in the selector; first entry is the default.
export const TRACK_IDS: TrackId[] = ["marigolds", "captain"];
export const DEFAULT_TRACK_ID: TrackId = "marigolds";
export const MUSIC_VOLUME = 0.5;

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

// Order shown in any character picker; mirrors TRACK_IDS. Adding a playable
// character is a data-only edit: a CHARACTER_SPRITES entry + an id here.
export const CHARACTER_IDS: CharacterId[] = ["sam", "sarah"];
