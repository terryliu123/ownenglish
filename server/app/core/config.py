try:
    from pydantic import BaseSettings
except ImportError:
    # Pydantic v2: BaseSettings moved to pydantic-settings
    from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings."""

    # App
    APP_NAME: str = "教学辅助系统 API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development, production

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ownenglish.db"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI
    SILICONFLOW_API_URL: str = "https://api.siliconflow.com/v1/chat/completions"
    SILICONFLOW_API_KEY: str = ""
    SILICONFLOW_MODEL: str = "zai-org/GLM-5"
    SILICONFLOW_TIMEOUT_SECONDS: int = 90

    # Membership
    MEMBERSHIP_MONTHLY_PRICE_CENTS: int = 3900
    MEMBERSHIP_YEARLY_PRICE_CENTS: int = 39900

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "OwnEnglish"

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"

    # WeChat Pay
    WECHAT_PAY_APP_ID: str = ""
    WECHAT_PAY_MCH_ID: str = ""
    WECHAT_PAY_MCH_SERIAL_NO: str = ""
    WECHAT_PAY_PRIVATE_KEY_PATH: str = ""
    WECHAT_PAY_PRIVATE_KEY: str = ""
    WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH: str = ""
    WECHAT_PAY_PLATFORM_PUBLIC_KEY: str = ""
    WECHAT_PAY_API_V3_KEY: str = ""
    WECHAT_PAY_NOTIFY_URL: str = ""
    WECHAT_PAY_RETURN_URL: str = ""
    WECHAT_PAY_H5_DOMAIN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_allowed_origins(self) -> List[str]:
        return self.ALLOWED_ORIGINS.split(",")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
