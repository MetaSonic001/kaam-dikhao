"""Runtime configuration. Everything comes from the repo-root `.env`."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

import os

ROOT = Path(__file__).resolve().parents[2]
ON_VERCEL = bool(os.environ.get("VERCEL"))
# Hosts that sleep or restart (Vercel, Render free): no in-process scheduler; an external cron calls /api/cron/sync.
SERVERLESS = ON_VERCEL or os.environ.get("KD_SERVERLESS", "").lower() in ("1", "true", "yes")
# Serverless filesystems are read-only except /tmp
DATA_DIR = Path(os.environ.get("DATA_DIR") or ("/tmp/kaam-dikhao" if ON_VERCEL else ROOT / "backend" / "data"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    app_env: str = "development"
    app_url: str = "http://localhost:3000"
    cors_origins: str = ""  # comma separated extra origins

    # Supabase: Postgres (via pooler), Auth (token verification), Storage (media).
    database_url: str = ""
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_publishable_key: str = ""

    # Clerk (auth). The API verifies Clerk session JWTs against the instance JWKS.
    next_public_clerk_publishable_key: str = ""
    clerk_secret_key: str = ""
    storage_bucket: str = "kaam-dikhao"

    # Groq: LLM, vision, speech-to-text. Optional; features degrade gracefully.
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_fast_model: str = "openai/gpt-oss-20b"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    groq_stt_model: str = "whisper-large-v3"

    data_gov_in_api_key: str = ""

    # Comma separated emails that receive the `admin` role on login.
    admin_emails: str = ""
    # Grievance officer contact (IT Rules 2021, rule 3(2)).
    grievance_email: str = "grievance@kaamdikhao.in"
    nominatim_user_agent: str = (
        "KaamDikhao/1.0 (civic accountability platform; contact: grievance@kaamdikhao.in)"
    )

    sync_on_startup: bool = True
    embeddings: bool = True  # false = Postgres full-text search for Ask AI (no 400 MB model; fits 512 MB hosts)
    cron_secret: str = ""  # Vercel Cron sends this as a Bearer token
    default_city: str = "mumbai"

    @property
    def clerk_issuer(self) -> str:
        """https://<frontend-api-host>, decoded from the publishable key (pk_test_<base64(host$)>)."""
        import base64

        key = self.next_public_clerk_publishable_key
        if not key:
            return ""
        raw = key.split("_", 2)[-1]
        host = base64.b64decode(raw + "=" * (-len(raw) % 4)).decode().rstrip("$")
        return f"https://{host}"

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"

    @property
    def admin_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    @property
    def origins(self) -> list[str]:
        base = [self.app_url, "http://localhost:3000", "http://127.0.0.1:3000"]
        extra = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return list({*base, *extra})


@lru_cache
def get_settings() -> Settings:
    return Settings()
