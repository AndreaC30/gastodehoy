"""Application settings loaded from the environment / ``.env`` file.

Pydantic-Settings validates and normalises the values, and exposes a
single module-level ``settings`` instance imported from elsewhere.
"""

from typing import Literal

from pydantic import AliasChoices, Field
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

    def cors_origins_list(self) -> list[str]:
        parts = [x.strip() for x in self.cors_origins.split(",") if x.strip()]
        return parts or [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ]


settings = Settings()
