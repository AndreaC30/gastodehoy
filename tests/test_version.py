"""La versión del backend y la del frontend deben coincidir y verse en /health."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app import __version__

ROOT = Path(__file__).resolve().parents[1]


def test_version_is_semver() -> None:
    assert re.fullmatch(r"\d+\.\d+\.\d+", __version__)


def test_backend_and_web_versions_match() -> None:
    pkg = json.loads((ROOT / "web" / "package.json").read_text(encoding="utf-8"))
    assert pkg["version"] == __version__


def test_health_reports_version(anon_client) -> None:
    body = anon_client.get("/health").json()
    assert body.get("version") == __version__
