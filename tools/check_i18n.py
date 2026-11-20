"""Comprueba que los cuatro idiomas de la web son coherentes entre sí.

Uso:  python3 tools/check_i18n.py          (sale con código 1 si algo falla)

Toma es.json como referencia y comprueba en en, fr y de:
  - claves que faltan o sobran;
  - que los marcadores {{x}} sean los mismos que en es;
  - plurales: las claves terminadas en _one/_other/_zero/_two/_few/_many deben
    tener su pareja _other y _one en todos los idiomas que las usan;
  - valores vacíos o que no sean texto.

Las claves de plural no se comparan por sufijo exacto entre idiomas (francés
usa _one/_many/_other según la regla CLDR); solo se exige que cada grupo tenga
al menos _other y que los marcadores coincidan con el grupo de es.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

LOCALES = Path(__file__).resolve().parents[1] / "web" / "src" / "i18n" / "locales"
REF = "es"
OTHERS = ["en", "fr", "de"]
PLURAL = re.compile(r"^(.*)_(zero|one|two|few|many|other)$")
PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z0-9_.]+)\s*(?:,[^}]*)?\}\}")


def flatten(node, prefix: str = "") -> dict[str, object]:
    out: dict[str, object] = {}
    if isinstance(node, dict):
        for k, v in node.items():
            out.update(flatten(v, f"{prefix}{k}."))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out.update(flatten(v, f"{prefix}{i}."))
    else:
        out[prefix[:-1]] = node
    return out


def groups(flat: dict[str, object]) -> dict[str, set[str]]:
    """Clave base -> sufijos de plural presentes."""
    g: dict[str, set[str]] = {}
    for key in flat:
        m = PLURAL.match(key)
        if m:
            g.setdefault(m.group(1), set()).add(m.group(2))
    return g


def placeholders(value: object) -> set[str]:
    return set(PLACEHOLDER.findall(value)) if isinstance(value, str) else set()


def main() -> int:
    data = {
        lang: flatten(json.loads((LOCALES / f"{lang}.json").read_text(encoding="utf-8")))
        for lang in [REF, *OTHERS]
    }
    ref = data[REF]
    ref_groups = groups(ref)
    problems: list[str] = []

    for lang, flat in data.items():
        for key, value in flat.items():
            if not isinstance(value, str) or not value.strip():
                problems.append(f"[{lang}] {key}: valor vacío o que no es texto")

    for lang in OTHERS:
        flat = data[lang]
        g = groups(flat)
        ref_plain = {k for k in ref if not PLURAL.match(k)}
        plain = {k for k in flat if not PLURAL.match(k)}
        for key in sorted(ref_plain - plain):
            problems.append(f"[{lang}] falta la clave {key}")
        for key in sorted(plain - ref_plain):
            problems.append(f"[{lang}] sobra la clave {key} (no está en {REF})")

        for base in sorted(set(ref_groups) - set(g)):
            problems.append(f"[{lang}] falta el grupo de plurales {base}_*")
        for base in sorted(set(g) - set(ref_groups)):
            problems.append(f"[{lang}] sobra el grupo de plurales {base}_*")
        for base, suffixes in sorted(g.items()):
            if "other" not in suffixes:
                problems.append(f"[{lang}] {base}: falta la forma _other")
            if base in ref_groups and "one" in ref_groups[base] and "one" not in suffixes:
                problems.append(f"[{lang}] {base}: falta la forma _one")

        # Marcadores: cada clave debe usar los mismos {{x}} que en es.
        for key in sorted(ref_plain & plain):
            if placeholders(ref[key]) != placeholders(flat[key]):
                problems.append(
                    f"[{lang}] {key}: marcadores {sorted(placeholders(flat[key]))} "
                    f"distintos de {REF} {sorted(placeholders(ref[key]))}"
                )
        # Plurales: la unión de marcadores del grupo debe coincidir con es.
        for base in sorted(set(ref_groups) & set(g)):
            ref_ph = set().union(*(placeholders(ref[f"{base}_{s}"]) for s in ref_groups[base]))
            lang_ph = set().union(*(placeholders(flat[f"{base}_{s}"]) for s in g[base]))
            if ref_ph != lang_ph:
                problems.append(
                    f"[{lang}] {base}_*: marcadores {sorted(lang_ph)} distintos de {REF} {sorted(ref_ph)}"
                )

    for p in problems:
        print(p)
    n = len(ref)
    print(
        f"\n{'Todo en orden' if not problems else str(len(problems)) + ' problema(s)'}"
        f" ({n} claves en {REF}, comparadas con {', '.join(OTHERS)})"
    )
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
