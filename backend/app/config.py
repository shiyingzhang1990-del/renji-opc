from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "壬集 OPC"
    env: str = "development"
    database_url: str = ""
    platform_fee_rate: float = 0.08
    cors_origins: str = ""
    payment_provider: str = "mock"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_database_url(self) -> str:
        url = self.database_url
        if not url:
            if self.env == "development":
                url = "sqlite:///./renji.db"
            else:
                raise ValueError(
                    "DATABASE_URL is required in production. "
                    "Please set the DATABASE_URL environment variable on Render "
                    "by connecting a PostgreSQL database to this service."
                )
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        if not origins:
            return []
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
