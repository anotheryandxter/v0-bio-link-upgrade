#!/usr/bin/env python3
"""
Generate flattened favicon PNGs and a multi-resolution favicon.ico
Uses Pillow (PIL). Overlays the source image over a white background to avoid
transparent areas rendering black in some browsers.

Writes to the repository `public/` directory:
- favicon-{size}x{size}.png
- favicon.ico (contains multiple sizes)

Run: python3 scripts/generate_favicons.py
"""
from PIL import Image
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'public' / 'favicon.png'
OUT = Path(__file__).resolve().parents[1] / 'public'

if not SRC.exists():
    print(f"Source favicon not found at {SRC}")
    raise SystemExit(1)

sizes_png = [16, 32, 48, 96, 180, 192, 256, 512]
sizes_ico = [16, 32, 48, 64, 128, 256]

with Image.open(SRC) as im:
    im = im.convert('RGBA')

    # Create flattened PNGs
    for s in sizes_png:
        out_path = OUT / f'favicon-{s}x{s}.png'
        canvas = Image.new('RGBA', (s, s), (255, 255, 255, 255))
        thumb = im.copy()
        thumb.thumbnail((s, s), Image.LANCZOS)
        # center the thumbnail on the canvas
        x = (s - thumb.width) // 2
        y = (s - thumb.height) // 2
        canvas.paste(thumb, (x, y), thumb)
        # convert to RGB (no alpha) so browsers treat background as white
        canvas_rgb = canvas.convert('RGB')
        canvas_rgb.save(out_path, format='PNG')
        print(f'Wrote {out_path}')

    # Create favicon.ico with multiple sizes. Pillow will pack sizes from a single image
    # Generate source images for each ico size
    ico_images = []
    for s in sizes_ico:
        thumb = im.copy()
        thumb.thumbnail((s, s), Image.LANCZOS)
        canvas = Image.new('RGBA', (s, s), (255, 255, 255, 255))
        x = (s - thumb.width) // 2
        y = (s - thumb.height) // 2
        canvas.paste(thumb, (x, y), thumb)
        ico_images.append(canvas.convert('RGB'))

    ico_path = OUT / 'favicon.ico'
    # save the largest image and append sizes
    ico_images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in sizes_ico])
    print(f'Wrote {ico_path}')
