#!/usr/bin/env python3
"""
Convierte en transparente el negro *conectado a las esquinas* (típico fondo
plano). Requiere: pip install pillow

Útil cuando la “exportación PNG” en realidad es JPEG o pierde alpha.
"""
from __future__ import annotations

import sys
from collections import deque

from PIL import Image


def main() -> None:
    if len(sys.argv) < 3:
        print(
            "Uso: strip_outer_black_bg.py entrada.jpg|png salida.png [umbral_0_255]",
            file=sys.stderr,
        )
        sys.exit(1)
    inp = sys.argv[1]
    outp = sys.argv[2]
    thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 42

    im = Image.open(inp).convert("RGBA")
    w, h = im.size
    px = im.load()

    def dark(r: int, g: int, b: int) -> bool:
        return r <= thresh and g <= thresh and b <= thresh

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for cx, cy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        r, g, b, _a = px[cx, cy]
        if dark(r, g, b) and not seen[cy][cx]:
            seen[cy][cx] = True
            q.append((cx, cy))

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h) or seen[ny][nx]:
                continue
            r, g, b, _a = px[nx, ny]
            if not dark(r, g, b):
                continue
            seen[ny][nx] = True
            q.append((nx, ny))

    im.save(outp, "PNG")


if __name__ == "__main__":
    main()
