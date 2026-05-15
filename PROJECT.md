# wedding-sns — Sam & Sarah wedding mini-game

A Next.js site that hosts a small, hand-rolled Pokémon-style game built as a wedding gift for two friends (Sam & Sarah). Guests should be able to play it in 5–10 minutes, leave a message at the end, and have it appear in a moderated guestbook.

## Goals
- **Playable in 5–10 minutes** — one short overworld + a handful of scripted battles + ending.
- **Character select**: pick "Sam" or "Sarah" at the start; choice affects sprite + a few lines of dialogue.
- **Simple plot**, simple turn-based fight mechanics.
- **Pixel-art aesthetic** reusing a Pokémon-style sprite pack (kept private; not for public indexing).
- **Mobile-first**, performant — must feel snappy on a phone over hotel Wi-Fi.
- **Extensible by me**: friends/family can be added as NPC trainers via data-only edits (no engine changes).

## Stack
- **Next.js 16 (App Router)** + **Tailwind v4** + **TypeScript**.
- **Phaser 3** for the game itself, mounted into a client-only component. Game code is plain TS under `game/` — no React inside the game loop.
- **pnpm** for package management.
- (Planned) **Neon Postgres** via Vercel Marketplace + **Drizzle ORM** for guest messages and run records. Not wired up yet — landing + game scaffold first.

## Layout
```
app/
  layout.tsx              shared shell
  page.tsx                wedding landing → /play
  play/page.tsx           client component, dynamically imports GameCanvas (ssr:false)
components/
  GameCanvas.tsx          mounts Phaser into a <div>
game/
  createGame.ts           Phaser.Game factory (pixelArt, FIT scaling)
  constants.ts            internal resolution, asset keys, etc.
  scenes/
    BootScene.ts          preload + boot
    TitleScene.ts         press-to-start
    CharacterSelectScene.ts  pick Sam or Sarah
    (later) OverworldScene, BattleScene, EndingScene
  data/                   (later) trainers, moves, species, dialogue — all data-driven
  systems/                (later) battle.ts pure functions, save.ts localStorage
  net/                    (later) /api wrappers for messages + runs
public/
  <source>/               sprite assets grouped by where they came from
                          (e.g. public/pokemon-phaser/player.png) — keeps IP
                          provenance obvious and makes per-source removal easy
```

## Conventions
- All NPCs / dialogue / encounters live as **data**, not code. Adding a guest cameo should be a one-line edit in `game/data/trainers.ts` + a sprite.
- Phaser is **never** imported at module top-level in a server component — always dynamic + `ssr: false`, or behind `"use client"`.
- Forms (end-of-run message, etc.) are rendered in React on top of the canvas, not in Phaser — saves rebuilding text inputs and gets mobile keyboard for free.
- Internal game resolution is fixed (320×240, a touch above GBA-native 240×160 to give 32×48 player sprites breathing room) and `Phaser.Scale.FIT` upscales. Use `pixelArt: true`, `roundPixels: true`.

## Status / next steps
- [x] Step 1 — Next.js + Tailwind base (came from create-next-app).
- [x] Step 2 — Landing page placeholder + `/play` route.
- [x] Step 3 — Phaser boots; Title → CharacterSelect with Sam/Sarah pickable (placeholder rectangles until sprites arrive).
- [ ] Step 4 — One tiny tilemap + walking + scripted battle.
- [ ] Step 5 — Ending → message form → DB (Neon + Drizzle).
- [ ] Step 6 — Real plot, more NPC trainers, polish.

## Notes for future-me / agents
- **Don't pull in 3D libs** — Bevy/R3F/Three were already considered and ruled out. This is 2D + turn-based.
- **Don't rebuild scaffolds** — extend the existing scene structure.
- **IP**: using ripped Pokémon sprites is technically infringing. Acceptable for a private, unindexed wedding URL; never push the sprite pack to a public repo or social post.
- **AGENTS.md** flags that this is a non-standard Next.js — always check `node_modules/next/dist/docs/` before assuming behaviour.
