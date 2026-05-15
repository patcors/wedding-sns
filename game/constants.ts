// Internal fixed resolution. We scale up with Phaser.Scale.FIT.
// GBA was 240x160; we go a touch wider so modern phones don't pillarbox hard.
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 192;

export type CharacterId = "sam" | "sarah";

export const CHARACTERS: Record<
  CharacterId,
  { id: CharacterId; name: string; accent: number }
> = {
  sam: { id: "sam", name: "Sam", accent: 0x4f9dde },
  sarah: { id: "sarah", name: "Sarah", accent: 0xe26a8b },
};
