"""Atomic SQLite backup using sqlite3's online backup API.

The online backup is consistent even if the app is writing while the
backup runs: SQLite copies pages under its own lock and yields between
batches. The result is a regular SQLite database file at the requested
output path.

Usage (inside the container):
    python -m app.cli.backup /tmp/gastodehoy-backup.db

This is normally invoked from ``scripts/backup.sh``, which then streams
the file to the host and gzips it.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

from sqlalchemy.engine.url import make_url

from app.config import settings


def main() -> None:
    """Copy the configured SQLite database to the path given as argv[1]."""
    if len(sys.argv) != 2:
        print("usage: python -m app.cli.backup <output_path>", file=sys.stderr)
        sys.exit(2)

    out = Path(sys.argv[1])

    url = make_url(settings.database_url)
    if url.get_backend_name() != "sqlite":
        print(
            f"backup: only SQLite is supported (got {url.get_backend_name()!r})",
            file=sys.stderr,
        )
        sys.exit(1)
    if not url.database or url.database == ":memory:":
        print("backup: DATABASE_URL has no on-disk path", file=sys.stderr)
        sys.exit(1)

    src_path = Path(url.database)
    if not src_path.exists():
        print(f"backup: source not found: {src_path}", file=sys.stderr)
        sys.exit(1)

    out.parent.mkdir(parents=True, exist_ok=True)

    src = sqlite3.connect(str(src_path))
    dst = sqlite3.connect(str(out))
    try:
        with dst:
            src.backup(dst)
    finally:
        dst.close()
        src.close()


if __name__ == "__main__":
    main()
