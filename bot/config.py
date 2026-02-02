"""Bot configuration via pydantic-settings."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Required
    telegram_bot_token: str
    encryption_key: str

    # InsForge
    insforge_base_url: str = "https://wz7ymxxu.eu-central.insforge.app"
    insforge_anon_key: str = ""

    # Optional LLM defaults (for testing)
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""

    # Voice transcription (AssemblyAI)
    assemblyai_api_key: str = ""

    # Configuration
    log_level: str = "INFO"
    default_openrouter_model: str = "openai/gpt-oss-120b"

    # Authorization
    admin_usernames: str = ""  # comma-separated
    allowed_usernames: str = ""  # comma-separated

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def admin_list(self) -> list[str]:
        """Parsed list of admin usernames (without @)."""
        if not self.admin_usernames:
            return []
        return [u.strip().lower().lstrip("@") for u in self.admin_usernames.split(",") if u.strip()]

    @property
    def allowed_list(self) -> list[str]:
        """Parsed list of allowed usernames (without @)."""
        if not self.allowed_usernames:
            return []
        return [u.strip().lower().lstrip("@") for u in self.allowed_usernames.split(",") if u.strip()]


def load_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
