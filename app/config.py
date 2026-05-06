from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg2://gastodehoy:gastodehoy@localhost:5432/gastodehoy",
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    timezone: str = Field(
        default="Europe/Madrid",
        validation_alias=AliasChoices("TIMEZONE", "TZ"),
    )


settings = Settings()
