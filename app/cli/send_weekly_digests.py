"""Send weekly digest emails to all users (requires SMTP).

Usage:

    python -m app.cli.send_weekly_digests

Exits with code 1 if SMTP is not configured. Logs per-user send failures
and continues with the rest.
"""

from __future__ import annotations

import argparse
import logging
import sys

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.mail import SMTPNotConfiguredError, send_weekly_digest_email
from app.models import User
from app.services.weekly_digest import build_digest_for_user

_log = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    host = settings.smtp_host
    if not host or not host.strip():
        return False
    from_addr = settings.smtp_from or settings.smtp_user
    return bool(from_addr and str(from_addr).strip())


def main() -> None:
    """CLI entry point. See module docstring for usage."""
    parser = argparse.ArgumentParser(
        description="Envía el resumen semanal por correo a todos los usuarios."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Calcula digestos pero no envía correos.",
    )
    args = parser.parse_args()

    if not _smtp_configured():
        sys.exit(
            "SMTP no configurado (SMTP_HOST y SMTP_FROM o SMTP_USER). "
            "No se envían resúmenes semanales."
        )

    sent = 0
    failed = 0

    with SessionLocal() as db:
        users = list(db.scalars(select(User).order_by(User.id)))
        for user in users:
            if not user.email or not user.email.strip():
                continue
            digest = build_digest_for_user(db, user)
            if args.dry_run:
                _log.info(
                    "dry-run %s: weekly=%s remaining=%s savings=%s",
                    user.email,
                    digest["weekly_variable_spent"],
                    digest["remaining_this_month"],
                    digest["savings_amount"],
                )
                sent += 1
                continue
            try:
                send_weekly_digest_email(user.email, user.name, digest)
                sent += 1
            except SMTPNotConfiguredError:
                sys.exit("SMTP dejó de estar configurado durante el envío.")
            except Exception as exc:
                failed += 1
                _log.warning("weekly digest failed for %s: %s", user.email, exc)

    print(f"Resúmenes semanales: {sent} enviados, {failed} fallidos.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
