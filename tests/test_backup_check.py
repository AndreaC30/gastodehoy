"""Restore check for gzipped SQLite dumps. No Docker."""

from __future__ import annotations

import gzip
import sqlite3
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _run_check(archive: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", str(ROOT / "scripts" / "backup.sh"), "check", str(archive)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def _gzip_sqlite(archive: Path) -> None:
    raw = archive.with_suffix("")  # drops .gz -> *.db
    conn = sqlite3.connect(raw)
    try:
        conn.execute("CREATE TABLE probe (id INTEGER PRIMARY KEY, note TEXT)")
        conn.execute("INSERT INTO probe (note) VALUES ('restorable')")
        conn.commit()
    finally:
        conn.close()
    archive.write_bytes(gzip.compress(raw.read_bytes()))
    raw.unlink()


def _leftover_temps() -> set[Path]:
    return set(Path(tempfile.gettempdir()).glob("gastodehoy-check-*"))


def test_check_valid_backup_is_ok(tmp_path: Path) -> None:
    archive = tmp_path / "gastodehoy-20260101T000000Z.db.gz"
    _gzip_sqlite(archive)
    before = _leftover_temps()

    result = _run_check(archive)

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "ok"
    assert _leftover_temps() == before


def test_check_empty_gzip_fails(tmp_path: Path) -> None:
    archive = tmp_path / "gastodehoy-20260101T000000Z.db.gz"
    archive.write_bytes(gzip.compress(b""))
    before = _leftover_temps()

    result = _run_check(archive)

    assert result.returncode != 0
    assert result.stdout.strip() != "ok"
    assert _leftover_temps() == before


def test_check_corrupt_gzip_fails(tmp_path: Path) -> None:
    archive = tmp_path / "gastodehoy-20260101T000000Z.db.gz"
    archive.write_bytes(b"this is not a gzip")

    result = _run_check(archive)

    assert result.returncode != 0
    assert result.stdout.strip() != "ok"


def test_check_refuses_to_replace_live_database(tmp_path: Path) -> None:
    live = tmp_path / "gastodehoy.db"
    live.write_bytes(b"live-sentinel")

    result = _run_check(live)

    assert result.returncode != 0
    assert "refusing to replace the live database" in result.stderr
    assert live.read_bytes() == b"live-sentinel"
