#!/usr/bin/env python3
"""
Game Boy-ish motif renderer.

Reads a MIDI file, takes a time window (the "motif"), and renders every note
as a pulse/square-wave voice with a lo-fi crunch so it sounds chiptune-y while
staying recognisable as the original song. NOT limited to 3 voices -- we play
all the polyphony, because this is just a browser, not real DMG hardware.

Pure standard library (no numpy/ffmpeg). Writes a 16-bit mono WAV.

Quick iterate loop:
    python3 scripts/chiptune/render_motif.py --start 0 --end 12 --out motif
    afplay public/music/chiptune/motif.wav        # macOS preview

Tweak the knobs below or pass them on the command line (CLI overrides defaults).
"""

import argparse, math, struct, wave, os

# ============================ TUNABLE DEFAULTS ============================
MIDI_FILE   = "public/music/basic_pitch_transcription(1).mid"
OUT_DIR     = "public/music/chiptune"

DEF_START   = 0.0      # motif start (seconds into the song)
DEF_END     = 12.0     # motif end   (seconds) -> loop length = end - start
SAMPLE_RATE = 44100
MASTER_GAIN = 0.55     # 0..1 headroom; lower if it clips/distorts

# --- timbre ---
# Duty cycle per pitch band gives variety without extra config.
# 0.5 = full/fat, 0.25 = hollow, 0.125 = thin/nasal (classic lead).
DUTY_BASS   = 0.5      # MIDI pitch < 48  (~below C3)
DUTY_MID    = 0.25     # 48..71
DUTY_LEAD   = 0.125    # >= 72 (~C5 and up)

VIBRATO_HZ    = 0.0    # set ~5.5 for a warble; 0 = off
VIBRATO_CENTS = 0.0    # depth of vibrato in cents

# --- per-note volume envelope (seconds) ---
ATTACK   = 0.004
DECAY    = 0.05
SUSTAIN  = 0.65        # 0..1 level held after decay
RELEASE  = 0.06

# --- lo-fi crunch (the "old hardware" character) ---
BITCRUSH_BITS = 7      # quantise output to N bits (8 = clean-ish, 5 = gritty)
DOWNSAMPLE    = 2      # render then sample-and-hold every Nth sample (1 = off)

# --- loop polish ---
LOOP_XFADE_MS = 60     # crossfade tail into head for a seamless loop (0 = off)

# --- optional voice cap (0 = unlimited / recognisable; 3 = chip-like) ---
MAX_VOICES = 0
# =========================================================================


def build_tick_to_sec(tempo_events, div):
    """Given [(tick, us_per_quarter), ...], return a tick->seconds function that
    honours every tempo change (a multi-tempo file is non-linear in time)."""
    evs = sorted(tempo_events)
    if not evs or evs[0][0] != 0:
        evs = [(0, 500000)] + evs  # default 120 BPM until the first change
    # cumulative seconds elapsed at the start of each tempo segment
    segs = []  # (start_tick, start_sec, us_per_quarter)
    sec = 0.0
    for idx, (tk, tp) in enumerate(evs):
        segs.append((tk, sec, tp))
        if idx + 1 < len(evs):
            sec += (evs[idx + 1][0] - tk) * (tp / 1_000_000.0 / div)

    def t2s(tick):
        seg = segs[0]
        for s in segs:
            if s[0] <= tick:
                seg = s
            else:
                break
        tk0, sec0, tp = seg
        return sec0 + (tick - tk0) * (tp / 1_000_000.0 / div)

    return t2s


def parse_midi(path):
    """Return (notes, tick_to_sec). notes = [(start_s, dur_s, pitch, vel)].

    Two-stage: collect note on/off in absolute ticks + a global tempo map, then
    convert ticks->seconds through the tempo map so multi-tempo files stay in time.
    """
    f = open(path, "rb").read()
    assert f[:4] == b"MThd", "not a MIDI file"
    hlen = struct.unpack(">I", f[4:8])[0]
    _fmt, _ntrks, div = struct.unpack(">HHH", f[8:8 + hlen])
    pos = 8 + hlen
    tempo_events = []      # (abs_tick, us_per_quarter), gathered across all tracks
    raw = []               # (start_tick, end_tick, pitch, vel)
    while pos < len(f) and f[pos:pos + 4] == b"MTrk":
        tlen = struct.unpack(">I", f[pos + 4:pos + 8])[0]
        data = f[pos + 8:pos + 8 + tlen]
        pos += 8 + tlen
        i = 0
        running = None
        tick = 0
        active = {}  # pitch -> [(start_tick, vel), ...]

        def readvar(i):
            v = 0
            while True:
                b = data[i]; i += 1
                v = (v << 7) | (b & 0x7f)
                if not b & 0x80:
                    break
            return v, i

        while i < len(data):
            dt, i = readvar(i); tick += dt
            b = data[i]
            if b & 0x80:
                status = b; i += 1; running = status
            else:
                status = running
            if status == 0xFF:
                meta = data[i]; i += 1
                ln, i = readvar(i)
                if meta == 0x51:
                    tempo_events.append((tick, struct.unpack(">I", b"\x00" + data[i:i + 3])[0]))
                i += ln
            elif status in (0xF0, 0xF7):
                ln, i = readvar(i); i += ln
            else:
                hi = status & 0xF0
                if hi in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                    d1 = data[i]; d2 = data[i + 1]; i += 2
                    if hi == 0x90 and d2 > 0:
                        active.setdefault(d1, []).append((tick, d2))
                    elif hi == 0x80 or (hi == 0x90 and d2 == 0):
                        if active.get(d1):
                            st, vel = active[d1].pop(0)
                            raw.append((st, tick, d1, vel))
                else:
                    i += 1  # program change / channel pressure (1 data byte)

    t2s = build_tick_to_sec(tempo_events, div)
    notes = [(t2s(st), t2s(en) - t2s(st), p, v) for (st, en, p, v) in raw]
    notes.sort()
    return notes, t2s


def duty_for(pitch):
    if pitch < 48:
        return DUTY_BASS
    if pitch < 72:
        return DUTY_MID
    return DUTY_LEAD


def midi_to_hz(p):
    return 440.0 * 2 ** ((p - 69) / 12.0)


def envelope(t, dur):
    """AD-S-R amplitude at time t within a note of length dur."""
    rel_start = max(dur - RELEASE, 0.0)
    if t < ATTACK:
        return t / ATTACK if ATTACK > 0 else 1.0
    if t < ATTACK + DECAY:
        f = (t - ATTACK) / DECAY if DECAY > 0 else 1.0
        return 1.0 - (1.0 - SUSTAIN) * f
    if t < rel_start:
        return SUSTAIN
    # release
    if RELEASE > 0 and t < dur:
        return SUSTAIN * (1.0 - (t - rel_start) / RELEASE)
    return 0.0


def render(notes, start, end, sr):
    win = end - start
    n = int(win * sr)
    buf = [0.0] * n

    # crude voice cap: keep notes, but if MAX_VOICES set, drop notes that would
    # exceed the cap at their onset (lowest priority = highest pitch dropped).
    window_notes = [nt for nt in notes if nt[0] < end and nt[0] + nt[1] > start]
    if MAX_VOICES > 0:
        kept = []
        for nt in window_notes:
            s0, d0, p0, v0 = nt
            overlap = sum(1 for k in kept if k[0] < s0 + d0 and k[0] + k[1] > s0)
            if overlap < MAX_VOICES:
                kept.append(nt)
        window_notes = kept

    vib_w = 2 * math.pi * VIBRATO_HZ
    vib_depth = 2 ** (VIBRATO_CENTS / 1200.0) - 1.0

    for (s_s, d_s, pitch, vel) in window_notes:
        freq = midi_to_hz(pitch)
        duty = duty_for(pitch)
        amp = (vel / 127.0) * 0.8
        # clip note to window
        n_start = s_s - start
        i0 = max(int(n_start * sr), 0)
        i1 = min(int((n_start + d_s) * sr), n)
        phase = 0.0
        for i in range(i0, i1):
            t_in_note = (i / sr) - n_start
            f = freq
            if VIBRATO_HZ > 0:
                f = freq * (1.0 + vib_depth * math.sin(vib_w * (i / sr)))
            phase += f / sr
            ph = phase - math.floor(phase)
            sq = 1.0 if ph < duty else -1.0
            buf[i] += sq * amp * envelope(t_in_note, d_s)

    return buf


def bitcrush(buf, bits):
    if bits <= 0 or bits >= 16:
        return buf
    levels = 2 ** bits
    return [round(x * levels) / levels for x in buf]


def downsample_hold(buf, factor):
    if factor <= 1:
        return buf
    out = []
    held = 0.0
    for i, x in enumerate(buf):
        if i % factor == 0:
            held = x
        out.append(held)
    return out


def loop_crossfade(buf, sr, ms):
    if ms <= 0:
        return buf
    xf = min(int(sr * ms / 1000.0), len(buf) // 2)
    if xf <= 0:
        return buf
    out = buf[:]
    for i in range(xf):
        a = out[i]            # head
        b = buf[len(buf) - xf + i]  # tail
        w = i / xf            # 0..1
        out[i] = a * w + b * (1.0 - w)
    return out[:len(buf) - xf]  # drop the tail we folded in


def normalize(buf, gain):
    peak = max((abs(x) for x in buf), default=1.0) or 1.0
    scale = gain / peak
    return [x * scale for x in buf]


def write_wav(path, buf, sr):
    w = wave.open(path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    frames = bytearray()
    for x in buf:
        v = int(max(-1.0, min(1.0, x)) * 32767)
        frames += struct.pack("<h", v)
    w.writeframes(bytes(frames))
    w.close()


def main():
    global BITCRUSH_BITS, DOWNSAMPLE, LOOP_XFADE_MS, MAX_VOICES, VIBRATO_HZ, VIBRATO_CENTS
    ap = argparse.ArgumentParser()
    ap.add_argument("--midi", default=MIDI_FILE)
    ap.add_argument("--start", type=float, default=DEF_START)
    ap.add_argument("--end", type=float, default=DEF_END)
    ap.add_argument("--out", default="motif", help="output basename (no extension)")
    ap.add_argument("--bits", type=int, default=BITCRUSH_BITS)
    ap.add_argument("--downsample", type=int, default=DOWNSAMPLE)
    ap.add_argument("--gain", type=float, default=MASTER_GAIN)
    ap.add_argument("--xfade", type=float, default=LOOP_XFADE_MS)
    ap.add_argument("--maxvoices", type=int, default=MAX_VOICES)
    ap.add_argument("--vibrato-hz", type=float, default=VIBRATO_HZ)
    ap.add_argument("--vibrato-cents", type=float, default=VIBRATO_CENTS)
    args = ap.parse_args()

    BITCRUSH_BITS = args.bits
    DOWNSAMPLE = args.downsample
    LOOP_XFADE_MS = args.xfade
    MAX_VOICES = args.maxvoices
    VIBRATO_HZ = args.vibrato_hz
    VIBRATO_CENTS = args.vibrato_cents

    notes, _spt = parse_midi(args.midi)
    print(f"parsed {len(notes)} notes; window {args.start:.2f}-{args.end:.2f}s")

    buf = render(notes, args.start, args.end, SAMPLE_RATE)
    buf = loop_crossfade(buf, SAMPLE_RATE, LOOP_XFADE_MS)
    buf = bitcrush(buf, BITCRUSH_BITS)
    buf = downsample_hold(buf, DOWNSAMPLE)
    buf = normalize(buf, args.gain)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, args.out + ".wav")
    write_wav(out, buf, SAMPLE_RATE)
    dur = len(buf) / SAMPLE_RATE
    print(f"wrote {out}  ({dur:.2f}s, bits={BITCRUSH_BITS}, downsample={DOWNSAMPLE}, "
          f"maxvoices={MAX_VOICES or 'unlimited'})")


if __name__ == "__main__":
    main()
