"""Load assignment root `.env` into the process (optional `python-dotenv`)."""

from __future__ import annotations

import os
from pathlib import Path


def load_root_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    root = Path(__file__).resolve().parents[1]
    env_path = root / ".env"
    if env_path.is_file():
        load_dotenv(env_path)


def supabase_url_and_key() -> tuple[str, str]:
    """
    Read Supabase URL + service_role key with trimming fixes for:
    - Windows CRLF leaving a stray \\r on the value (breaks JWT regex → "Invalid API key")
    - UTF-8 BOM / optional quotes around values
    """
    load_root_dotenv()
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    url = url.removeprefix("\ufeff")
    key = key.removeprefix("\ufeff")
    if len(url) >= 2 and url[0] == url[-1] and url[0] in "\"'":
        url = url[1:-1].strip()
    if len(key) >= 2 and key[0] == key[-1] and key[0] in "\"'":
        key = key[1:-1].strip()
    return url, key
