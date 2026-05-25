from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ambient Legacy Backend"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://user:password@localhost:5432/ambient_legacy"
    gcs_bucket_name: str = "ambient-legacy"
    gcp_project_id: str = ""
    gcp_credentials_path: str = ""
    use_gcs_media_storage: bool = True
    use_cloud_sql_connector: bool = False
    instance_connection_name: str = ""
    db_user: str = ""
    db_pass: str = ""
    db_name: str = ""
    private_ip: bool = False
    gemma_endpoint_url: str = ""
    exaone_endpoint_url: str = ""
    ollama_base_url: str = "http://127.0.0.1:11434"
    prefer_ollama_for_gemma: bool = True
    ollama_gemma_e2b_model_name: str = "gemma4:e2b"
    ollama_gemma_e4b_model_name: str = "gemma4:e4b"
    ai_provider_timeout_seconds: int = 30
    jwt_secret_key: str = "ambient-legacy-dev-secret"
    jwt_access_token_expires_minutes: int = 60 * 24 * 7

    @field_validator("use_gcs_media_storage", "use_cloud_sql_connector", "private_ip", mode="before")
    @classmethod
    def normalize_bool_env(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
