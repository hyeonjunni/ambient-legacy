from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ambient Legacy Backend"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://user:password@localhost:5432/ambient_legacy"
    gcs_bucket_name: str = "ambient-legacy"
    gcp_project_id: str = ""
    use_gcs_media_storage: bool = True
    use_cloud_sql_connector: bool = False
    instance_connection_name: str = ""
    db_user: str = ""
    db_pass: str = ""
    db_name: str = ""
    private_ip: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
