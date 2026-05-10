"""Admin-side password reset (safety net when both the password AND the
recovery code are lost).

Usage:

    python -m app.cli.reset_password user@example.com

Prompts for a new password on stdin (hidden), validates it, bcrypt-hashes
it and updates the row. Invalidates existing sessions and rotates the
recovery code; the new code is printed ONCE so the admin can hand it
to the user.
"""

from __future__ import annotations

import argparse
import getpass
import sys
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.auth import (
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    generate_recovery_code,
    hash_password,
    hash_recovery_code,
)
from app.database import SessionLocal
from app.models import User


def _read_password() -> str:
    """Prompt twice for the new password and return it once they match."""
    pw1 = getpass.getpass("Nueva contraseña: ")
    if not (PASSWORD_MIN_LEN <= len(pw1) <= PASSWORD_MAX_LEN):
        sys.exit(
            f"La contraseña debe tener entre {PASSWORD_MIN_LEN} y "
            f"{PASSWORD_MAX_LEN} caracteres."
        )
    pw2 = getpass.getpass("Repite la contraseña: ")
    if pw1 != pw2:
        sys.exit("Las contraseñas no coinciden.")
    return pw1


def main() -> None:
    """CLI entry point. See module docstring for usage."""
    parser = argparse.ArgumentParser(
        description="Reset administrativo de contraseña por email."
    )
    parser.add_argument("email", help="Email del usuario a resetear.")
    args = parser.parse_args()

    email = args.email.strip().lower()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == email))
        if user is None:
            sys.exit(f"No existe ningún usuario con email {email}.")

        password = _read_password()
        new_code = generate_recovery_code()

        user.password_hash = hash_password(password)
        user.password_changed_at = datetime.now(timezone.utc).replace(microsecond=0)
        user.recovery_hash = hash_recovery_code(new_code)
        user.must_change_password = False
        db.commit()

    print()
    print(f"Contraseña actualizada para {email}.")
    print("Sesiones previas invalidadas.")
    print()
    print("Nuevo código de recuperación (guárdalo y dáselo al usuario):")
    print(f"  {new_code}")
    print()
    print("No volveremos a mostrarlo.")


if __name__ == "__main__":
    main()
