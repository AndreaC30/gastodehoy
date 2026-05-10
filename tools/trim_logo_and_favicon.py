#!/usr/bin/env python3
"""Recorta transparencia sobrante del logo; genera favicon cuadrado 512 desde el icono."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WEB_ASSETS = ROOT / "web" / "src" / "assets"


def trim_rgba(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def main() -> None:
    logo_path = WEB_ASSETS / "gastodehoy-logo.png"
    icon_path = WEB_ASSETS / "gastodehoy-app-icon.png"
    fav_path = WEB_ASSETS / "gastodehoy-favicon.png"

    logo = Image.open(logo_path).convert("RGBA")
    logo = trim_rgba(logo)
    logo.save(logo_path, "PNG")
    print(f"trim logo -> {logo.size}")

    icon = Image.open(icon_path).convert("RGBA")
    w, h = icon.size
    side = min(w, h)
    square = icon.crop((0, 0, side, side))
    square.resize((512, 512), Image.Resampling.LANCZOS).save(fav_path, "PNG")
    print(f"favicon -> {fav_path.name} 512x512 (crop izquierdo {side}x{side})")


if __name__ == "__main__":
    main()
