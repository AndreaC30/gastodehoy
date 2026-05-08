"""Application settings loaded from the environment / ``.env`` file.

Pydantic-Settings validates and normalises the values, and exposes a
single module-level ``settings`` instance imported from elsewhere.
"""

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed view of the environment variables we care about."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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


settings = Settings()
