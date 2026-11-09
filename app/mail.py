"""Optional SMTP: envío de correos electrónicos para la aplicación."""

from __future__ import annotations

import html
import smtplib
import ssl
from contextlib import contextmanager
from decimal import Decimal
from email.message import EmailMessage

from app.config import settings

_SMTP_TIMEOUT_S = 10


class SMTPNotConfiguredError(RuntimeError):
    """Faltan variables SMTP_* en el entorno."""


def _smtp_sender() -> tuple[str, str]:
    """Host y remitente, o error si el envío no está configurado."""
    host = settings.smtp_host
    if not host or not host.strip():
        raise SMTPNotConfiguredError("SMTP_HOST no está configurado")
    from_addr = settings.smtp_from or settings.smtp_user
    if not from_addr:
        raise SMTPNotConfiguredError("SMTP_FROM o SMTP_USER deben estar configurados")
    return host, from_addr


@contextmanager
def _smtp_connection(host: str):
    """SMTP con tope de 10s. TLS exige el certificado y el nombre del servidor."""
    context = ssl.create_default_context()
    if settings.smtp_use_ssl:
        client = smtplib.SMTP_SSL(
            host,
            settings.smtp_port,
            timeout=_SMTP_TIMEOUT_S,
            context=context,
        )
    else:
        client = smtplib.SMTP(host, settings.smtp_port, timeout=_SMTP_TIMEOUT_S)
    with client as smtp:
        if not settings.smtp_use_ssl and settings.smtp_use_tls:
            smtp.starttls(context=context)
        yield smtp


def _transmit(host: str, msg: EmailMessage) -> None:
    with _smtp_connection(host) as smtp:
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


def send_email(to_email: str, subject: str, body: str) -> None:
    """Envía un correo electrónico usando la configuración SMTP de settings.

    Args:
        to_email: Dirección de correo del destinatario.
        subject: Asunto del correo.
        body: Cuerpo del correo en texto plano.

    Raises:
        SMTPNotConfiguredError: Si faltan configuraciones SMTP necesarias.
    """
    host, from_addr = _smtp_sender()

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)
    _transmit(host, msg)


def _header_safe(value: str) -> str:
    """Drop CR/LF so a name cannot start a second header."""
    return value.replace("\r", "").replace("\n", "")


def send_welcome_email(to_email: str, name: str) -> None:
    """Envía un correo de bienvenida personalizado al registrarse.

    Args:
        to_email: Dirección de correo del nuevo usuario.
        name: Nombre del nuevo usuario.
    """
    subject = f"¡Bienvenido a GastoDeHoy, {_header_safe(name)}!"
    body = (
        f"Hola, {name}.\n\n"
        "¡Qué alegría tenerte con nosotros! Tu cuenta en GastoDeHoy ya está "
        "lista para que empieces a tomar el control de tus finanzas de una "
        "forma sencilla y cómoda.\n\n"
        "Aquí podrás registrar tus gastos, organizar tus categorías y llevar "
        "un seguimiento claro de tu dinero, todo desde un lugar pensado para "
        "hacerte la vida más fácil.\n\n"
        "Si tienes alguna duda o necesitas ayuda, no dudes en escribirnos. "
        "Estamos aquí para acompañarte en cada paso.\n\n"
        "Disfruta de la experiencia y bienvenido a tu nueva forma de gestionar "
        "tus gastos.\n\n"
        "Un saludo cálido,\n"
        "El equipo de GastoDeHoy\n"
    )
    send_email(to_email, subject, body)


def _format_eur(amount) -> str:
    """Format a decimal amount for Spanish locale-style emails."""
    return f"{Decimal(amount).quantize(Decimal('0.01')):.2f} €".replace(".", ",")


def send_weekly_digest_email(to_email: str, name: str, digest: dict) -> None:
    """Envía el resumen semanal en HTML simple (español)."""
    weekly = _format_eur(digest["weekly_variable_spent"])
    remaining = _format_eur(digest["remaining_this_month"])
    savings = _format_eur(digest["savings_amount"])
    month_spent = _format_eur(digest["variable_spent_month"])
    week_start = digest["week_start"]
    week_end = digest["week_end"]

    safe_name = html.escape(name)
    subject = f"GastoDeHoy — resumen semanal, {_header_safe(name)}"
    text = (
        f"Hola, {name}.\n\n"
        f"Gasto variable (últimos 7 días, {week_start:%d/%m}–{week_end:%d/%m}): {weekly}\n"
        f"Gasto variable del mes: {month_spent}\n"
        f"Te queda este mes: {remaining}\n"
        f"Ahorro reservado: {savings}\n\n"
        "Entra en GastoDeHoy para ver el detalle.\n"
    )
    html_body = (
        f"<p>Hola, <strong>{safe_name}</strong>.</p>"
        "<p>Tu resumen semanal en <strong>GastoDeHoy</strong>:</p>"
        "<ul>"
        f"<li>Gasto variable (últimos 7 días, "
        f"{week_start:%d/%m}–{week_end:%d/%m}): <strong>{weekly}</strong></li>"
        f"<li>Gasto variable del mes: <strong>{month_spent}</strong></li>"
        f"<li>Te queda este mes: <strong>{remaining}</strong></li>"
        f"<li>Ahorro reservado: <strong>{savings}</strong></li>"
        "</ul>"
        "<p>Entra en la app para ver el detalle.</p>"
    )

    host, from_addr = _smtp_sender()

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")
    _transmit(host, msg)


def send_forgot_password_email(to_email: str, reset_url: str) -> None:
    """Envía el enlace de un solo uso para elegir una contraseña nueva.

    Requiere ``SMTP_HOST`` y remitente válidos en ``settings``.
    La contraseña actual no cambia hasta que se abra el enlace.
    """
    subject = "GastoDeHoy — enlace para cambiar la contraseña"
    body = (
        "Has solicitado recuperar el acceso a GastoDeHoy.\n\n"
        "El enlace caduca en 1 hora y solo se puede usar una vez. "
        "Tu contraseña actual sigue valiendo hasta que elijas una nueva:\n\n"
        f"{reset_url}\n\n"
        "Si no has sido tú, ignora este mensaje.\n"
    )
    send_email(to_email, subject, body)
