<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project

See [PROJECT.md](./PROJECT.md) for the purpose, goals, stack, and current status of this repo. Read it before making non-trivial changes.

# Reference repos (sibling directories, not vendored)

Two Phaser-based Pokémon clones live alongside this repo for reference. They are **never imported** and **never copied wholesale** — read them to lift *patterns*, then rewrite to match our stack (TypeScript, modules, Next 16 dynamic import, React-on-canvas-for-UI).

## `../pokemon-phaser` — small, clean, mobile-aware

Single-canvas Gen-3-style mockup. Plain JS, no bundler, Phaser 3.15 loaded from CDN. ~25k LOC total but most of that is two JSON data files. The closest in scope/feel to what we want.

Worth reading before extending the overworld or battle scene:
- `js/mainScene.js` — overworld + walking + grass encounters. The walking pattern is the one to mirror:
  - `this.moving` flag gates all input; tween moves player by one tile, `onComplete` flips it back.
  - Keyboard uses `Phaser.Input.Keyboard.JustDown(this.cursors.left)` — one tile per key press, no key-repeat needed.
  - Mobile uses per-direction boolean flags (`isLeftPress` etc.) that get set true on button event and cleared in the tween's `onComplete`. Equivalent to "held direction" but driven by discrete press events.
  - Encounter check is a physics-overlap on tween completion against a `grasses` group.
- `js/buttonScene.js` + `js/game.js` — mobile controls live in a **second Phaser.Game** mounted in a separate `<div id="button">`, bridged via `registry.merge`. Buttons emit named events (`"Up"`, `"Down"`, `"Left"`, `"Right"`, `"Yes"`, `"No"`, `"Enter"`) on the *currently active* main-scene. The lesson is the event indirection — for us, render the d-pad as **React DOM over the canvas** (per PROJECT.md convention) and have it emit the same named events into the live Phaser scene. Don't replicate the second-canvas trick.
- `js/battleScene.js` — turn-based battle: pokeball intro anim, HP bars, action menu (Fight/Bag/Pokémon/Run), typed-text dialogue via `rexTextTyping` plugin, attack→damage→message→opponent-turn loop. Useful structural reference when we build our scripted-battle scene; ignore the massive plugin pile in `js/plugins/`.
- Sprite spec: `assets/player.png` is a 32×48 spritesheet, 4 frames per direction, layout `down 0-3 / left 4-7 / right 8-11 / up 12-15`. If we source a real player sprite, target that layout.
- Scene transitions use `scene.sleep('mainScene') + scene.run('battleScene', this)` — preserves overworld state across battles. Use the same pattern, not `scene.start`.

## `../pokerogue` — full Pokémon Roguelite, skim-only

Massive TypeScript/Vite project (`src/battle-scene.ts`, `src/field/`, `src/data/`). Way over scope. **Read for inspiration, do not copy code.**

- **License: AGPL-v3.0-only for source code.** Copying code from this repo would force the wedding site to be AGPL too — not happening. Treat all `.ts` files as look-but-don't-touch.
- Docs/comments are CC-BY-NC-SA-4.0. Same "don't copy verbatim" rule for safety.
- `assets/` is **empty in the repo** — pokerogue art lives in a separate `pokerogue-assets` GitHub repo under CC-BY-NC-SA-4.0. That license is technically OK for a private, unindexed, non-commercial wedding gift, but PROJECT.md already says "never push the sprite pack to a public repo" — same applies here. Prefer Spriters-Resource / pkmn.net rips for any sprites we ship.
- Where it's actually useful: **battle UI structure** (HP bar layouts, action-menu hierarchies in `src/ui/`), and as a **data-shape reference** for moves/species/trainers in `src/data/`. Glance, then design our own much smaller JSON for `game/data/`.
- Skip entirely: their ability system, mystery encounters, daily-seed, i18n — all too big for a 5-10 min game.
