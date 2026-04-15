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


settings = Settings()
