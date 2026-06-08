// Internal fixed resolution. We scale up with Phaser.Scale.FIT.
// GBA was 240x160 and FRLG-native; we go bigger so 32x48 player sprites + 16x16
// tiles have room to breathe without feeling like 6 chunky pixels on a phone.
// 320x240 gives ~20x15 tiles visible — generous viewport, still retro.
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 240;

// Asset keys — single source of truth so scenes can't typo a key.
export const ASSETS = {
  PLAYER_SHEET: "player-sheet",
} as const;

// Player walking animation keys. Match the row layout of player.png.
export const PLAYER_ANIM = {
  walkDown: "player-walk-down",
  walkLeft: "player-walk-left",
  walkRight: "player-walk-right",
  walkUp: "player-walk-up",
} as const;

export type CharacterId = "sam" | "sarah";

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
