"""Check a gzipped SQLite backup without touching the live database.

Usage (on the host, from the repo root):

    python -m app.cli.check_backup backups/gastodehoy-YYYYMMDDTHHMMSSZ.db.gz

``scripts/backup.sh check`` calls this. The archive is inflated to a temp
file, ``PRAGMA integrity_check`` must return exactly ``ok``, and the temp
file is removed. This never writes ``data/gastodehoy.db``.
"""

from __future__ import annotations

import gzip
import os
import sqlite3
import sys
import tempfile
import zlib
from pathlib import Path

_SQLITE_MAGIC = b"SQLite format 3\x00"
_LIVE_NAMES = frozenset({"gastodehoy.db", "gastodehoy.db-wal", "gastodehoy.db-shm"})


class BackupCheckError(Exception):
    """The archive is missing, unsafe, or not an intact SQLite database."""


def _points_at_live_db(path: Path) -> bool:
    """True when `path` is the running database or a sidecar, not a dump."""
    candidates = [path]
    try:
        candidates.append(path.resolve())
    except OSError:
        pass
    if any(item.name in _LIVE_NAMES for item in candidates):
        return True
    try:
        resolved = path.resolve()
    except OSError:
        return False
    roots = [Path.cwd(), Path(__file__).resolve().parents[2]]
    for root in roots:
        live = root / "data" / "gastodehoy.db"
        try:
            if live.exists() and resolved == live.resolve():
                return True
        except OSError:
            continue
    return False


def _accepts_archive_name(path: Path) -> bool:
    name = path.name
    if not name.startswith("gastodehoy-") or not name.endswith(".db.gz"):
        return False
    stamp = name[len("gastodehoy-") : -len(".db.gz")]
    return bool(stamp) and "/" not in stamp and stamp != "."


def check_archive(archive: Path) -> str:
    """Inflate one `gastodehoy-*.db.gz`, integrity-check it, delete the temp.

    Returns ``ok`` only when ``PRAGMA integrity_check`` yields that single
    value. Raises ``BackupCheckError`` otherwise. Does not write the live
    database.
    """
    if _points_at_live_db(archive):
        raise BackupCheckError("refusing to replace the live database")
    if not _accepts_archive_name(archive):
        raise BackupCheckError(
            "refusing to replace the live database; "
            "expected a gastodehoy-*.db.gz archive"
        )
    if not archive.is_file():
        raise BackupCheckError(f"not a file: {archive}")

    fd, tmp_name = tempfile.mkstemp(prefix="gastodehoy-check-", suffix=".db")
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        if _points_at_live_db(tmp):
            raise BackupCheckError("refusing to replace the live database")
        _inflate(archive, tmp)
        _assert_sqlite_file(tmp)
        return _integrity(tmp)
    finally:
        tmp.unlink(missing_ok=True)


def _inflate(archive: Path, tmp: Path) -> None:
    try:
        with gzip.open(archive, "rb") as src, tmp.open("wb") as dst:
            while True:
                chunk = src.read(1024 * 1024)
                if not chunk:
                    break
                dst.write(chunk)
    except (gzip.BadGzipFile, zlib.error, EOFError, OSError) as exc:
        raise BackupCheckError(f"cannot read gzip: {exc}") from exc


def _assert_sqlite_file(tmp: Path) -> None:
    try:
        with tmp.open("rb") as handle:
            magic = handle.read(len(_SQLITE_MAGIC))
        size = tmp.stat().st_size
    except OSError as exc:
        raise BackupCheckError(f"cannot read temp database: {exc}") from exc
    if size < len(_SQLITE_MAGIC) or magic != _SQLITE_MAGIC:
        raise BackupCheckError("not a SQLite database")


def _integrity(tmp: Path) -> str:
    uri = tmp.resolve().as_uri() + "?mode=ro"
    try:
        conn = sqlite3.connect(uri, uri=True)
    except sqlite3.Error as exc:
        raise BackupCheckError(f"cannot open database: {exc}") from exc
    try:
        try:
            rows = conn.execute("PRAGMA integrity_check").fetchall()
        except sqlite3.Error as exc:
            raise BackupCheckError(f"integrity_check failed: {exc}") from exc
    finally:
        conn.close()
    messages = [str(row[0]) for row in rows]
    if messages != ["ok"]:
        detail = "; ".join(messages) if messages else "empty"
        raise BackupCheckError(f"integrity_check: {detail}")
    return "ok"


def main(argv: list[str] | None = None) -> None:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1:
        print(
            "usage: python -m app.cli.check_backup <gastodehoy-*.db.gz>",
            file=sys.stderr,
        )
        raise SystemExit(2)
    try:
        result = check_archive(Path(args[0]))
    except BackupCheckError as exc:
        print(f"check: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    if result != "ok":
        print(f"check: integrity_check: {result}", file=sys.stderr)
        raise SystemExit(1)
    print(result)


if __name__ == "__main__":
    main()
