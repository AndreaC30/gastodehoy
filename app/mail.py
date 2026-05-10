"""Optional SMTP: envío de contraseña temporal para recuperación de cuenta."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import settings


class SMTPNotConfiguredError(RuntimeError):
    """Faltan variables SMTP_* en el entorno."""


def send_forgot_password_email(to_email: str, temporary_password: str) -> None:
    """Envía por correo una contraseña nueva generada en el servidor.

    Requiere ``SMTP_HOST`` y remitente válidos en ``settings``.
    """
    host = settings.smtp_host
    if not host or not host.strip():
        raise SMTPNotConfiguredError("SMTP_HOST no está configurado")

    from_addr = settings.smtp_from or settings.smtp_user
    if not from_addr:
        raise SMTPNotConfiguredError("SMTP_FROM o SMTP_USER deben estar configurados")

    msg = EmailMessage()
    msg["Subject"] = "GastoDeHoy — contraseña temporal"
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(
        "Has solicitado recuperar el acceso a GastoDeHoy.\n\n"
        f"Tu contraseña temporal es: {temporary_password}\n\n"
        "Entra en la aplicación con este correo y esa contraseña; "
        "la pantalla te pedirá elegir una contraseña nueva en cuanto entres.\n\n"
        "Si no has sido tú, ignora este mensaje.\n"
    )

    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(host, settings.smtp_port) as smtp:
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, settings.smtp_port) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
