"""Application settings loaded from the environment / ``.env`` file.

Pydantic-Settings validates and normalises the values, and exposes a
single module-level ``settings`` instance imported from elsewhere.
"""

from typing import Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed view of the environment variables we care about."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "production"] = Field(
        default="development",
        validation_alias=AliasChoices("ENV", "ENVIRONMENT"),
        description="development = valores laxos; production exige APP_SECRET fuerte.",
    )
    database_url: str = Field(
        default="sqlite:///./data/gastodehoy.db",
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    timezone: str = Field(
        default="Europe/Madrid",
        validation_alias=AliasChoices("TIMEZONE", "TZ"),
    )
    app_secret: str = Field(
        default="change-me-in-prod",
        validation_alias=AliasChoices("APP_SECRET"),
        description="Clave para firmar la cookie de sesión. Cámbiala en producción.",
    )
    session_ttl_days: int = Field(
        default=30,
        ge=1,
        le=365,
        validation_alias=AliasChoices("SESSION_TTL_DAYS"),
    )
    cookie_secure: bool = Field(
        default=False,
        validation_alias=AliasChoices("COOKIE_SECURE"),
        description="True en producción tras HTTPS (Caddy). False en dev.",
    )
    cookie_domain: str | None = Field(
        default=None,
        validation_alias=AliasChoices("COOKIE_DOMAIN"),
    )
    cors_origins: str = Field(
        default="http://127.0.0.1:5173,http://localhost:5173",
        validation_alias=AliasChoices("CORS_ORIGINS"),
        description="Orígenes permitidos (CORS), separados por coma. Incluye el origin del front en prod.",
    )
    trust_forwarded_for: bool = Field(
        default=False,
        validation_alias=AliasChoices("TRUST_FORWARDED_FOR"),
        description=(
            "True solo detrás de un proxy que inyecta X-Forwarded-For de forma fiable. "
            "En false se usa la IP del socket (recomendado en dev / sin proxy)."
        ),
    )
    smtp_host: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_HOST"),
        description="Servidor SMTP (vacío = recuperación por correo desactivada).",
    )
    smtp_port: int = Field(
        default=587,
        ge=1,
        le=65535,
        validation_alias=AliasChoices("SMTP_PORT"),
    )
    smtp_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_USER"),
    )
    smtp_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_PASSWORD"),
    )
    smtp_from: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_FROM"),
        description="Remitente From (si no se pone, se usa SMTP_USER).",
    )
    smtp_use_tls: bool = Field(
        default=True,
        validation_alias=AliasChoices("SMTP_USE_TLS"),
        description="STARTTLS (puerto típico 587). False si usas SSL directo.",
    )
    smtp_use_ssl: bool = Field(
        default=False,
        validation_alias=AliasChoices("SMTP_USE_SSL"),
        description="SMTP_SSL (puerto típico 465). Si es true, TLS implícito.",
    )
    vapid_public_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("VAPID_PUBLIC_KEY"),
        description="Clave pública VAPID (Web Push). Vacía = push desactivado.",
    )
    vapid_private_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("VAPID_PRIVATE_KEY"),
        description="Clave privada VAPID. No la subas al repo.",
    )
    vapid_subject: str = Field(
        default="mailto:admin@gastodehoy.local",
        validation_alias=AliasChoices("VAPID_SUBJECT"),
        description="Contacto VAPID (mailto: o https:).",
    )

    def web_push_enabled(self) -> bool:
        """True when both VAPID keys are set."""
        pub = (self.vapid_public_key or "").strip()
        priv = (self.vapid_private_key or "").strip()
        return bool(pub and priv)

    def cors_origins_list(self) -> list[str]:
        parts = [x.strip() for x in self.cors_origins.split(",") if x.strip()]
        return parts or [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ]

    @field_validator("cookie_domain")
    @classmethod
    def validate_cookie_domain(cls, v: str | None) -> str | None:
        """Reject empty strings, bare TLDs, and malformed domains."""
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("cookie_domain must not be an empty string")
        # Reject bare public TLDs (e.g. ".com", ".org", ".net")
        _PUBLIC_TLDS = {
            "com", "org", "net", "edu", "gov", "mil", "int",
            "io", "co", "us", "uk", "de", "fr", "es", "it",
            "info", "biz", "name", "pro", "aero", "coop", "museum",
        }
        if v.lstrip(".").lower() in _PUBLIC_TLDS:
            raise ValueError(
                f"cookie_domain '{v}' looks like a public TLD; "
                "use a real domain like 'example.com'"
            )
        # Basic format check: at least one dot, no spaces, no wildcards
        if "." not in v:
            raise ValueError(
                f"cookie_domain '{v}' is not a valid domain (missing dot)"
            )
        if " " in v or "*" in v:
            raise ValueError(
                f"cookie_domain '{v}' contains invalid characters"
            )
        # Each label must be non-empty and reasonable
        for label in v.split("."):
            if not label:
                raise ValueError(
                    f"cookie_domain '{v}' has empty labels"
                )
        return v


settings = Settings()
