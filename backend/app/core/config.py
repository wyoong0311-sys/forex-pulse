from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

  app_name: str = "Forex Pulse API"
  app_env: str = "development"
  database_url: str = "sqlite:///./forex_pulse.db"
  forex_provider_url: str = "https://api.frankfurter.dev/v1"
  forex_api_key: str = ""
  firebase_credentials_path: str = "./firebase-service-account.json"
  mock_data_enabled: bool = True
  notification_mock_enabled: bool = True
  log_level: str = "INFO"
  log_format: str = "json"
  provider_timeout_seconds: float = 12.0
  provider_retry_attempts: int = 3
  notification_retry_attempts: int = 2
  expo_push_api_url: str = "https://exp.host/--/api/v2/push/send"
  expo_push_access_token: str = ""
  feature_macro_calendar_enabled: bool = False
  feature_news_sentiment_enabled: bool = False

  @field_validator("app_env", mode="before")
  @classmethod
  def _default_app_env(cls, value: str | None) -> str:
    if value is None or not str(value).strip():
      return "development"
    return str(value).strip()

  @field_validator("database_url", mode="before")
  @classmethod
  def _default_database_url(cls, value: str | None) -> str:
    if value is None or not str(value).strip():
      return "sqlite:///./forex_pulse.db"
    return str(value).strip()

  @field_validator("forex_provider_url", mode="before")
  @classmethod
  def _default_provider_url(cls, value: str | None) -> str:
    if value is None or not str(value).strip():
      return "https://api.frankfurter.dev/v1"
    normalized = str(value).strip()
    if not normalized.startswith(("http://", "https://")):
      return "https://api.frankfurter.dev/v1"
    return normalized


settings = Settings()
