#!/usr/bin/env python3
"""Slice uploaded sprite sheets into one transparent atlas + copy maps."""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SRC = Path("/workspace/attachments")
OUT = Path("/workspace/public/assets")
MAPS = OUT / "maps"
OUT.mkdir(parents=True, exist_ok=True)
MAPS.mkdir(parents=True, exist_ok=True)

# (filename, key prefix, mode) mode: lr = top right / bottom left, cd = climb/dead, boss = 1x4
SHEETS: list[tuple[str, str, str]] = [
    ("champo-walking-sprite-sheet.PNG", "champo.walk", "lr"),
    ("champo-crouching-sprite-sheet.PNG", "champo.crouch", "lr"),
    ("champo-climbing-dead-sprite-sheet.PNG", "champo.cd", "cd"),
    ("hermy-walking-sprite-sheet.PNG", "hermy.walk", "lr"),
    ("hermy-crouching-sprite-sheet.PNG", "hermy.crouch", "lr"),
    ("  hermy-climbing-dead-sprite-sheet.PNG", "hermy.cd", "cd"),
    ("tanya-walking-sprite-sheet.JPG", "tanya.walk", "lr"),
    ("tanya-crouching-sprite-sheet.JPG", "tanya.crouch", "lr"),
    ("tanya-climbing-dead-sprite-sheet.JPG", "tanya.cd", "cd"),
    ("trizzle-walking-sprite-sheet.PNG", "trizzle.walk", "lr"),
    ("trizzle-couching-sprite-sheet.JPG", "trizzle.crouch", "lr"),
    ("trizzle-climbing-dead-sprite-sheet.JPG", "trizzle.cd", "cd"),
    ("slug-sprite-sheet.PNG", "slug", "lr"),
    ("froggy-sprite-sheet.PNG", "frog", "lr"),
    ("birdie-sprite-sheet.PNG", "birdie", "lr"),
    ("fireball-sprite-sheet.PNG", "ember", "lr"),
    ("jumping-fireball-sprite-sheet.PNG", "pink", "lr"),
    ("bat-sprite-sheet.PNG", "bat", "lr"),
    ("rat-sprite-sheet.PNG", "rat", "lr"),
    ("skeleton-frog-sprite-sheet.PNG", "skfrog", "lr"),
    ("vulture-sprite-sheet.PNG", "vulture", "lr"),
    ("catcher-attack-right-sprite-sheet.PNG", "catcher.r", "boss"),
    ("catcher-attack-left-sprite-sheet.PNG", "catcher.l", "boss"),
    ("surtur-attack-right-sprite-sheet.PNG", "surtur.r", "boss"),
    ("surtur-attack-left-sprite-sheet.jpg", "surtur.l", "boss"),
    ("baphomet-attack-right-sprite-sheet.PNG", "baphomet.r", "boss"),
    ("baphomet-attack-left-sprite-sheet.jpg", "baphomet.l", "boss"),
]

MAP_FILES = {
    "midgard.jpg": "midgard-city-map.JPG",
    "forest-easy.png": "forest-region-easy-map.PNG",
    "forest-medium.png": "forest-region-medium-map.PNG",
    "forest-hard.png": "forest-region-hard-map.PNG",
    "forest-nightmare.png": "forest-region-nightmare.PNG",
    "fire-easy.jpg": "fire-underworld-easy-map.JPG",
    "fire-medium.jpg": "fire-underworld-medium-map.JPG",
    "fire-hard.jpg": "fire-underworld-hard-map.JPG",
    "fire-nightmare.jpg": "fire-underworld-nightmare-map.JPG",
    "death-easy.jpg": "death-region-easy-map.JPG",
    "death-medium.jpg": "death-region-medium-map.JPG",
    "death-hard.jpg": "death-region-hard-map.JPG",
    "death-nightmare.jpg": "death-region-nightmare-map.JPG",
    "title.png": "hermy-champo-title-screen.PNG",
}


def is_bg(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    # Light checkerboard / near-white paper. Keeps silver armor (darker or bluer).
    return ((mx - mn) < 26) & (mn > 188)


def knock_out(im: Image.Image) -> Image.Image:
    import cv2

    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    cand = is_bg(arr[:, :, :3]).astype(np.uint8)
    _n, labels = cv2.connectedComponents(cand, connectivity=4)
    border = np.unique(
        np.concatenate(
            [
                labels[0, :],
                labels[-1, :],
                labels[:, 0],
                labels[:, -1],
            ]
        )
    )
    border = border[border != 0]
    bg = np.isin(labels, border)
    arr[:, :, 3] = np.where(bg, 0, 255)
    alpha = arr[:, :, 3]
    for _ in range(2):
        transparent = alpha == 0
        neigh = np.zeros_like(transparent)
        neigh[1:] |= transparent[:-1]
        neigh[:-1] |= transparent[1:]
        neigh[:, 1:] |= transparent[:, :-1]
        neigh[:, :-1] |= transparent[:, 1:]
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        mx = np.maximum(np.maximum(r, g), b)
        mn = np.minimum(np.minimum(r, g), b)
        halo = neigh & (alpha > 0) & ((mx - mn) < 22) & (mn > 214)
        alpha = np.where(halo, 0, alpha)
        arr[:, :, 3] = alpha
    return Image.fromarray(arr)


def trim(im: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(im)
    alpha = arr[:, :, 3] > 16
    ys, xs = np.where(alpha)
    if len(xs) == 0:
        return Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width - 1, x1 + pad)
    y1 = min(im.height - 1, y1 + pad)
    cropped = im.crop((x0, y0, x1 + 1, y1 + 1))
    # Cap height so the atlas stays sane. Bosses stay larger.
    max_h = 300 if cropped.height > 420 else 240
    if cropped.height > max_h:
        nh = max_h
        nw = max(1, int(cropped.width * (nh / cropped.height)))
        cropped = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    return cropped


def cells(im: Image.Image, mode: str) -> list[tuple[str, Image.Image]]:
    w, h = im.size
    out: list[tuple[str, Image.Image]] = []
    if mode == "boss":
        cw = w // 4
        for i in range(4):
            out.append((str(i), im.crop((i * cw, 0, (i + 1) * cw if i < 3 else w, h))))
        return out
    cw, ch = w // 4, h // 2
    for r in range(2):
        for c in range(4):
            frame = im.crop((c * cw, r * ch, (c + 1) * cw if c < 3 else w, (r + 1) * ch if r < 1 else h))
            if mode == "lr":
                key = f"{'r' if r == 0 else 'l'}.{c}"
            else:
                key = f"{'climb' if r == 0 else 'dead'}.{c}"
            out.append((key, frame))
    return out


def draw_projectiles() -> dict[str, Image.Image]:
    def canvas():
        im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        return im, ImageDraw.Draw(im)

    items: dict[str, Image.Image] = {}

    im, d = canvas()
    d.ellipse((22, 28, 74, 80), fill=(244, 244, 236, 255), outline=(40, 32, 28, 255), width=3)
    d.arc((30, 36, 66, 72), 200, 340, fill=(196, 48, 48, 255), width=3)
    d.arc((30, 36, 66, 72), 20, 160, fill=(196, 48, 48, 255), width=3)
    items["proj.baseball"] = im

    im, d = canvas()
    d.ellipse((18, 30, 78, 82), fill=(120, 116, 112, 255), outline=(40, 36, 32, 255), width=3)
    d.ellipse((28, 40, 48, 58), fill=(168, 164, 158, 255))
    d.polygon([(60, 36), (78, 28), (70, 52)], fill=(90, 86, 82, 255))
    items["proj.rock"] = im

    im, d = canvas()
    d.polygon([(48, 8), (68, 78), (28, 78)], fill=(186, 236, 255, 255), outline=(40, 80, 120, 255))
    d.polygon([(48, 16), (58, 70), (42, 70)], fill=(240, 252, 255, 230))
    items["proj.icicle"] = im

    im, d = canvas()
    cx, cy = 48, 48
    pts = []
    for i in range(8):
        ang = np.deg2rad(i * 45 - 90)
        rad = 40 if i % 2 == 0 else 16
        pts.append((cx + rad * np.cos(ang), cy + rad * np.sin(ang)))
    d.polygon(pts, fill=(70, 74, 84, 255), outline=(20, 18, 16, 255))
    d.ellipse((40, 40, 56, 56), fill=(210, 180, 80, 255))
    items["proj.star"] = im

    im, d = canvas()
    d.ellipse((16, 24, 80, 84), fill=(255, 120, 24, 255), outline=(90, 24, 8, 255), width=3)
    d.polygon([(20, 50), (4, 40), (22, 32)], fill=(255, 180, 40, 255))
    d.polygon([(18, 64), (2, 70), (20, 78)], fill=(255, 90, 20, 255))
    d.ellipse((36, 38, 50, 54), fill=(40, 16, 8, 255))
    d.ellipse((56, 38, 70, 54), fill=(40, 16, 8, 255))
    d.arc((38, 56, 68, 76), 10, 170, fill=(60, 16, 8, 255), width=2)
    items["proj.pfire"] = im

    im, d = canvas()
    d.ellipse((20, 28, 76, 84), fill=(150, 220, 40, 255), outline=(30, 70, 16, 255), width=3)
    d.ellipse((30, 36, 52, 56), fill=(210, 255, 120, 220))
    d.ellipse((58, 58, 74, 78), fill=(90, 160, 30, 255))
    items["proj.acid"] = im

    im, d = canvas()
    d.polygon([(8, 48), (40, 28), (40, 68)], fill=(255, 140, 40, 180))
    d.ellipse((36, 22, 88, 74), fill=(255, 210, 80, 255), outline=(120, 48, 8, 255), width=3)
    d.ellipse((52, 34, 70, 52), fill=(255, 255, 220, 255))
    items["proj.comet"] = im

    im, d = canvas()
    d.arc((10, 14, 86, 86), 300, 120, fill=(255, 214, 90, 255), width=10)
    d.polygon([(18, 30), (8, 14), (28, 16)], fill=(255, 236, 160, 255))
    d.ellipse((58, 40, 78, 60), fill=(120, 200, 255, 255), outline=(40, 60, 120, 255))
    items["proj.boomerang"] = im

    im, d = canvas()
    d.ellipse((22, 18, 78, 78), fill=(150, 70, 220, 230), outline=(40, 8, 60, 255), width=3)
    d.polygon([(30, 70), (18, 90), (40, 74)], fill=(90, 20, 140, 220))
    d.polygon([(66, 70), (82, 90), (58, 74)], fill=(90, 20, 140, 220))
    d.ellipse((34, 36, 46, 50), fill=(255, 240, 80, 255))
    d.ellipse((56, 36, 68, 50), fill=(255, 240, 80, 255))
    d.arc((36, 52, 66, 70), 20, 160, fill=(40, 0, 40, 255), width=2)
    items["proj.ghoul"] = im

    # Soul gem + potion icons for the bag.
    im, d = canvas()
    d.polygon([(48, 8), (84, 40), (48, 88), (12, 40)], fill=(80, 220, 190, 255), outline=(10, 60, 50, 255))
    d.polygon([(48, 18), (70, 40), (48, 52), (26, 40)], fill=(210, 255, 245, 230))
    items["icon.gem"] = im

    im, d = canvas()
    d.rounded_rectangle((34, 28, 62, 84), radius=10, fill=(220, 48, 64, 255), outline=(40, 8, 12, 255), width=3)
    d.rectangle((40, 16, 56, 32), fill=(90, 50, 40, 255))
    d.ellipse((38, 40, 52, 54), fill=(255, 180, 180, 180))
    items["icon.red"] = im

    im, d = canvas()
    d.rounded_rectangle((34, 28, 62, 84), radius=10, fill=(48, 120, 220, 255), outline=(8, 20, 50, 255), width=3)
    d.rectangle((40, 16, 56, 32), fill=(90, 50, 40, 255))
    d.ellipse((38, 40, 52, 54), fill=(180, 220, 255, 180))
    items["icon.blue"] = im

    im, d = canvas()
    d.ellipse((18, 18, 78, 78), fill=(255, 196, 64, 255), outline=(90, 60, 10, 255), width=3)
    d.ellipse((30, 28, 48, 44), fill=(255, 240, 180, 220))
    items["icon.gold"] = im
    return items


def pack(frames: list[tuple[str, Image.Image]]) -> tuple[Image.Image, dict]:
    # Shelf pack, max width 2048.
    max_w = 2048
    x = y = row_h = 0
    placed: dict[str, dict] = {}
    shelves: list[tuple[int, int, int, int]] = []  # x,y,w,h
    for key, im in frames:
        if x + im.width > max_w:
            x = 0
            y += row_h + 2
            row_h = 0
        shelves.append((x, y, im.width, im.height))
        placed[key] = {"x": x, "y": y, "w": im.width, "h": im.height}
        x += im.width + 2
        row_h = max(row_h, im.height)
    atlas_h = y + row_h + 2
    atlas = Image.new("RGBA", (max_w, max(1, atlas_h)), (0, 0, 0, 0))
    for key, im in frames:
        p = placed[key]
        atlas.paste(im, (p["x"], p["y"]), im)
    # Crop width to content
    used_w = max((p["x"] + p["w"]) for p in placed.values())
    atlas = atlas.crop((0, 0, min(max_w, used_w + 2), atlas_h))
    return atlas, placed


def main() -> None:
    for dest, src_name in MAP_FILES.items():
        im = Image.open(SRC / src_name).convert("RGB")
        # Keep maps large but not insane.
        im.thumbnail((1920, 1280), Image.Resampling.LANCZOS)
        path = MAPS / dest
        if dest.endswith(".jpg"):
            im.save(path, quality=86, optimize=True)
        else:
            im.save(path, optimize=True)
        print("map", dest, im.size)

    frames: list[tuple[str, Image.Image]] = []
    for filename, prefix, mode in SHEETS:
        print("sheet", filename, flush=True)
        raw = Image.open(SRC / filename)
        cut = knock_out(raw)
        for key, cell in cells(cut, mode):
            framed = trim(cell)
            frames.append((f"{prefix}.{key}", framed))
    frames.extend(draw_projectiles().items())
    atlas, meta = pack(frames)
    atlas.save(OUT / "atlas.png", optimize=True)
    (OUT / "atlas.json").write_text(json.dumps({"frames": meta}))
    print("atlas", atlas.size, "frames", len(meta))


if __name__ == "__main__":
    main()
