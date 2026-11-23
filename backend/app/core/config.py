from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Uygulama ortam değişkenleri ve temel yapılandırma ayarları."""

    app_title: str = "GİB e-Emlak Kurumsal Taşınmaz Platformu API"
    app_version: str = "0.4.0-P3"
    app_env: str = "development"
    database_url: str = (
        "postgresql+psycopg://gib_user:gib_password@localhost:5432/gib_emlak_db"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
