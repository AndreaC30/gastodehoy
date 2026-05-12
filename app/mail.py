"""Optional SMTP: envío de correos electrónicos para la aplicación."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import settings


class SMTPNotConfiguredError(RuntimeError):
    """Faltan variables SMTP_* en el entorno."""


def send_email(to_email: str, subject: str, body: str) -> None:
    """Envía un correo electrónico usando la configuración SMTP de settings.

    Args:
        to_email: Dirección de correo del destinatario.
        subject: Asunto del correo.
        body: Cuerpo del correo en texto plano.

    Raises:
        SMTPNotConfiguredError: Si faltan configuraciones SMTP necesarias.
    """
    host = settings.smtp_host
    if not host or not host.strip():
        raise SMTPNotConfiguredError("SMTP_HOST no está configurado")

    from_addr = settings.smtp_from or settings.smtp_user
    if not from_addr:
        raise SMTPNotConfiguredError("SMTP_FROM o SMTP_USER deben estar configurados")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)

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


def send_welcome_email(to_email: str, name: str) -> None:
    """Envía un correo de bienvenida personalizado al registrarse.

    Args:
        to_email: Dirección de correo del nuevo usuario.
        name: Nombre del nuevo usuario.
    """
    subject = f"¡Bienvenido a GastoDeHoy, {name}!"
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


def send_forgot_password_email(to_email: str, temporary_password: str) -> None:
    """Envía por correo una contraseña nueva generada en el servidor.

    Requiere ``SMTP_HOST`` y remitente válidos en ``settings``.
    """
    subject = "GastoDeHoy — contraseña temporal"
    body = (
        "Has solicitado recuperar el acceso a GastoDeHoy.\n\n"
        f"Tu contraseña temporal es: {temporary_password}\n\n"
        "Entra en la aplicación con este correo y esa contraseña; "
        "la pantalla te pedirá elegir una contraseña nueva en cuanto entres.\n\n"
        "Si no has sido tú, ignora este mensaje.\n"
    )
    send_email(to_email, subject, body)
