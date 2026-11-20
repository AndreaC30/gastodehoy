"""Mide los contrastes WCAG de los tokens de color de web/src/index.css.

Uso:  python3 tools/check_contrast.py          (sale con código 1 si algo falla)

Lee los tokens del tema claro (bloque @theme) y del oscuro (html.dark) y
comprueba las parejas texto/fondo que usa la interfaz. Solo mira colores
sólidos (#rrggbb); los semitransparentes (rgb(... / 0.12)) se mezclan sobre
el fondo de la tarjeta antes de medir.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parents[1] / "web" / "src" / "index.css"

TEXT = 4.5  # WCAG AA, texto normal
UI = 3.0  # WCAG AA, componentes y gráficos


def parse_block(css: str, start: str) -> dict[str, str]:
    """Variables --color-* del bloque que empieza en `start`."""
    i = css.index(start)
    j = css.index("{", i)
    depth, k = 0, j
    while True:
        if css[k] == "{":
            depth += 1
        elif css[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    body = css[j:k]
    return {
        m.group(1): m.group(2).strip()
        for m in re.finditer(r"--color-([a-z0-9-]+):\s*([^;]+);", body)
    }


def to_rgb(value: str, over: tuple[float, float, float] | None = None):
    value = value.strip()
    if value.startswith("#"):
        h = value[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[n : n + 2], 16) for n in (0, 2, 4))
    m = re.fullmatch(r"rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:/\s*([\d.]+))?\)", value)
    if m:
        r, g, b = (int(m.group(n)) for n in (1, 2, 3))
        a = float(m.group(4)) if m.group(4) else 1.0
        if over is None:
            return (r, g, b)
        return tuple(round(a * c + (1 - a) * o) for c, o in zip((r, g, b), over))
    raise ValueError(f"color no reconocido: {value}")


def lum(rgb) -> float:
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# (texto, fondo, mínimo, descripción)
PAIRS = [
    ("text", "bg", TEXT, "texto sobre página"),
    ("text", "panel", TEXT, "texto sobre tarjeta"),
    ("text", "panel-elevated", TEXT, "texto sobre tarjeta elevada"),
    ("text-muted", "bg", TEXT, "texto atenuado sobre página"),
    ("text-muted", "panel", TEXT, "texto atenuado sobre tarjeta"),
    ("text-muted", "panel-elevated", TEXT, "texto atenuado sobre elevada"),
    ("text-dim", "bg", TEXT, "texto tenue sobre página"),
    ("text-dim", "panel", TEXT, "texto tenue sobre tarjeta"),
    ("accent", "bg", TEXT, "acento (enlaces, cifra) sobre página"),
    ("accent", "panel", TEXT, "acento sobre tarjeta"),
    ("accent-ink", "accent", TEXT, "texto del botón principal"),
    ("ok", "panel", TEXT, "estado «bien» sobre tarjeta"),
    ("ok", "ok-dim", TEXT, "estado «bien» sobre su fondo"),
    ("warn", "panel", TEXT, "estado «justo» sobre tarjeta"),
    ("warn", "warn-dim", TEXT, "estado «justo» sobre su fondo"),
    ("crit", "panel", TEXT, "estado «mal» sobre tarjeta"),
    ("crit", "crit-dim", TEXT, "estado «mal» sobre su fondo"),
]

# Informativas: no bloquean (los bordes decorativos no exigen 3:1).
INFO = [
    ("border-subtle", "panel", UI, "borde de campos sobre tarjeta"),
    ("accent", "panel", UI, "anillo de foco sobre tarjeta"),
]


def check(theme: str, tokens: dict[str, str], base_over: str) -> int:
    fails = 0
    page = to_rgb(tokens["bg"])
    print(f"\n== Tema {theme} ==")
    for fg, bg, minimum, label in PAIRS + INFO:
        informative = (fg, bg, minimum, label) in INFO
        bg_rgb = to_rgb(tokens[bg], page)
        fg_rgb = to_rgb(tokens[fg], bg_rgb)
        r = ratio(fg_rgb, bg_rgb)
        ok = r >= minimum
        mark = "ok " if ok else ("info" if informative else "FALLA")
        if not ok and not informative:
            fails += 1
        print(f"  {mark:5} {r:5.2f}:1 (mín {minimum})  {label}  [{fg} sobre {bg}]")
    return fails


def main() -> int:
    css = CSS.read_text(encoding="utf-8")
    light = parse_block(css, "@theme")
    dark = {**light, **parse_block(css, "html.dark")}
    fails = check("claro", light, "") + check("oscuro", dark, "")
    print(f"\n{'Todo en orden' if not fails else str(fails) + ' pareja(s) por debajo del mínimo'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
