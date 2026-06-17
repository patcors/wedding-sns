#!/usr/bin/env python3
"""
Generate the PWA / home-screen icons from the retro pixel-heart favicon.

Pure standard library (zlib only) so it runs anywhere with no pip installs, and
it scales with NEAREST-NEIGHBOUR on purpose: the source is pixel art, so smooth
interpolation (sips/most resizers) would blur the crisp blocky edges. Nearest
keeps them sharp.

Source : app/icon.png   (347x347, 8-bit RGBA, transparent background)
Outputs:
  public/icon-192.png          192  transparent   (manifest "any")
  public/icon-512.png          512  transparent   (manifest "any")
  public/icon-maskable-512.png 512  white, heart in the 80% safe zone (maskable)
  app/apple-icon.png           180  white          (iOS flattens alpha to black,
                                                     so it needs a solid bg; the
                                                     app/ location auto-links the
                                                     apple-touch-icon tag)

    python3 scripts/icons/make_icons.py
"""

import struct, zlib, os

SRC = "app/icon.png"


# ------------------------------- PNG decode --------------------------------
def load_rgba(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    i = 8
    w = h = bd = ct = None
    idat = bytearray()
    while i < len(d):
        ln = struct.unpack(">I", d[i:i + 4])[0]
        typ = d[i + 4:i + 8]
        body = d[i + 8:i + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct, _comp, _filt, _il = struct.unpack(">IIBBBBB", body)
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
        i += 12 + ln
    assert bd == 8 and ct == 6, f"need 8-bit RGBA, got bitdepth={bd} colortype={ct}"

    raw = zlib.decompress(bytes(idat))
    bpp = 4
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos + stride]); pos += stride
        if ft == 1:      # Sub
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 0xFF
        elif ft == 2:    # Up
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif ft == 3:    # Average
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 0xFF
        elif ft == 4:    # Paeth
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 0xFF
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, out


# ------------------------------- ops ---------------------------------------
def resize_nearest(px, w, h, nw, nh):
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        sy = y * h // nh
        srow = sy * w * 4
        drow = y * nw * 4
        for x in range(nw):
            sx = x * w // nw
            si = srow + sx * 4
            di = drow + x * 4
            out[di:di + 4] = px[si:si + 4]
    return out


def canvas(size, bg):
    """Solid (bg=(r,g,b)) or transparent (bg=None) RGBA canvas."""
    if bg is None:
        return bytearray(size * size * 4)
    r, g, b = bg
    one = bytes((r, g, b, 255))
    return bytearray(one * (size * size))


def composite_center(dst, dsize, src, ssize):
    """Alpha-composite a ssize×ssize sprite centred onto a dsize×dsize canvas."""
    off = (dsize - ssize) // 2
    for y in range(ssize):
        for x in range(ssize):
            si = (y * ssize + x) * 4
            sa = src[si + 3]
            if sa == 0:
                continue
            di = ((off + y) * dsize + (off + x)) * 4
            ia = 255 - sa
            for c in range(3):
                dst[di + c] = (src[si + c] * sa + dst[di + c] * ia) // 255
            dst[di + 3] = sa + (dst[di + 3] * ia) // 255


# ------------------------------- PNG encode --------------------------------
def save_rgba(path, px, size):
    stride = size * 4
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: None
        raw += px[y * stride:(y + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(typ, body):
        return (struct.pack(">I", len(body)) + typ + body
                + struct.pack(">I", zlib.crc32(typ + body) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", comp))
        f.write(chunk(b"IEND", b""))


def make(path, size, bg, heart_scale, sw, sh, spx):
    """Render one icon: heart at `heart_scale` of `size`, centred on `bg`."""
    hs = round(size * heart_scale)
    heart = resize_nearest(spx, sw, sh, hs, hs)
    cv = canvas(size, bg)
    composite_center(cv, size, heart, hs)
    save_rgba(path, cv, size)
    print(f"wrote {path}  ({size}x{size}, "
          f"bg={'transparent' if bg is None else '#%02x%02x%02x' % bg}, "
          f"heart={int(heart_scale * 100)}%)")


def main():
    sw, sh, spx = load_rgba(SRC)
    os.makedirs("public", exist_ok=True)
    WHITE = (255, 255, 255)
    # "any" icons: faithful to the favicon — full-frame heart, transparent bg.
    make("public/icon-192.png", 192, None, 1.0, sw, sh, spx)
    make("public/icon-512.png", 512, None, 1.0, sw, sh, spx)
    # maskable: solid bg, heart inside the ~80% safe zone so platform masks
    # (circle/squircle/rounded-rect) never clip it.
    make("public/icon-maskable-512.png", 512, WHITE, 0.66, sw, sh, spx)
    # iOS apple-touch-icon: alpha gets flattened to black, so use a solid bg.
    # Lives in app/ (not public/) so Next auto-emits the <link rel="apple-touch-icon">.
    make("app/apple-icon.png", 180, WHITE, 0.82, sw, sh, spx)


if __name__ == "__main__":
    main()
