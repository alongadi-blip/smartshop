"""
Keep secret values out of anything we print, log, or upload.

The Telegram bot token lives in the request URL path, and requests/urllib3 put
that path into connection-error messages. Anything that reaches a log file has
to go through here first.
"""

import os

SECRET_ENV_VARS = (
    "TELEGRAM_BOT_TOKEN",
    "ANTHROPIC_API_KEY",
    "SUPADATA_API_KEY",
)

# Short values would match too much unrelated text to replace safely.
MIN_SECRET_LENGTH = 12


def redact(text: str) -> str:
    """Replace any configured secret appearing in `text` with its variable name."""
    for name in SECRET_ENV_VARS:
        value = os.getenv(name)
        if value and len(value) >= MIN_SECRET_LENGTH:
            text = text.replace(value, f"<{name}>")
    return text
