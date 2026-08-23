"""
Step 4: Deliver the summary to Telegram.

Usage:
    py telegram_send.py --whoami   # print your chat id (run once, during setup)
    py telegram_send.py            # send the saved summary.json
"""

import html
import json
import os
import sys

import requests
from dotenv import load_dotenv

import config
from analyze import ACTION_ICONS, DailySummary

load_dotenv()

API = "https://api.telegram.org/bot{token}/{method}"

# Telegram rejects messages longer than this.
MAX_MESSAGE_CHARS = 4096


def api_call(method: str, **payload) -> dict:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing from .env")

    response = requests.post(API.format(token=token, method=method), json=payload, timeout=30)
    body = response.json()
    if not body.get("ok"):
        raise RuntimeError(f"Telegram API error: {body.get('description', body)}")
    return body["result"]


def esc(text: str) -> str:
    """Escape user/model text so it can't break Telegram's HTML parser."""
    return html.escape(str(text), quote=False)


def render_html(summary: DailySummary, videos: list[dict]) -> str:
    lines = ["<b>📊 סיכום שוק ההון היומי</b>", ""]

    lines.append(f"<b>🌐 סקירה כללית</b> ({esc(summary.sentiment)})")
    lines.append(esc(summary.market_overview))
    lines.append("")

    if summary.recommendations:
        lines.append("<b>💡 מניות שהוזכרו</b>")
        for rec in summary.recommendations:
            icon = ACTION_ICONS.get(rec.action, "•")
            ticker = f" ({esc(rec.ticker)})" if rec.ticker else ""
            lines.append(
                f"{icon} <b>{esc(rec.company)}</b>{ticker} — {esc(rec.action)}"
                f" | ודאות {esc(rec.confidence)}"
            )
            lines.append(f"<i>{esc(rec.reason)}</i>")
            lines.append("")

    if summary.attention_points:
        lines.append("<b>⚠️ נקודות תשומת לב</b>")
        lines.extend(f"• {esc(point)}" for point in summary.attention_points)
        lines.append("")

    if summary.upcoming_events:
        lines.append("<b>📅 אירועים קרובים</b>")
        lines.extend(f"• {esc(event)}" for event in summary.upcoming_events)
        lines.append("")

    lines.append("<b>🎬 מקורות</b>")
    for video in videos:
        lines.append(f'• <a href="{esc(video["url"])}">{esc(video["title"])}</a>')
    lines.append("")
    lines.append("<i>אינו ייעוץ פיננסי. סיכום אוטומטי של תוכן הערוץ בלבד.</i>")

    return "\n".join(lines)


def split_message(text: str, limit: int = MAX_MESSAGE_CHARS) -> list[str]:
    """Split on paragraph, then line, then character boundaries — never mid-HTML-tag."""
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    current = ""

    for paragraph in text.split("\n\n"):
        candidate = f"{current}\n\n{paragraph}" if current else paragraph

        if len(candidate) <= limit:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        # A single paragraph that is itself too long: break it line by line.
        if len(paragraph) <= limit:
            current = paragraph
            continue

        for line in paragraph.split("\n"):
            candidate = f"{current}\n{line}" if current else line
            if len(candidate) <= limit:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                # A single line over the limit is rare; hard-slice it.
                while len(line) > limit:
                    chunks.append(line[:limit])
                    line = line[limit:]
                current = line

    if current:
        chunks.append(current)
    return chunks


def send(text: str) -> int:
    """Send text to the configured chat, splitting when needed. Returns messages sent."""
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not chat_id:
        raise RuntimeError("TELEGRAM_CHAT_ID is missing from .env (run: py telegram_send.py --whoami)")

    chunks = split_message(text)
    for i, chunk in enumerate(chunks, 1):
        suffix = f"\n\n<i>({i}/{len(chunks)})</i>" if len(chunks) > 1 else ""
        api_call(
            "sendMessage",
            chat_id=chat_id,
            text=chunk + suffix,
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
    return len(chunks)


def whoami() -> int:
    """Print the chat id of whoever last messaged the bot."""
    updates = api_call("getUpdates")
    if not updates:
        print("No messages found.")
        print("Open Telegram, find your bot, and send it any message - then run this again.")
        return 1

    seen = {}
    for update in updates:
        message = update.get("message") or update.get("channel_post")
        if not message:
            continue
        chat = message["chat"]
        name = chat.get("title") or " ".join(
            filter(None, [chat.get("first_name"), chat.get("last_name")])
        )
        seen[chat["id"]] = f"{name} ({chat['type']})"

    print("Chats that have messaged this bot:\n")
    for chat_id, label in seen.items():
        print(f"  TELEGRAM_CHAT_ID={chat_id}    <- {label}")
    print("\nCopy the line above into your .env file.")
    return 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    try:
        if "--whoami" in sys.argv:
            return whoami()

        with open("summary.json", encoding="utf-8") as f:
            summary = DailySummary.model_validate(json.load(f))
        with open(config.OUTPUT_FILE, encoding="utf-8") as f:
            videos = json.load(f)["videos"]

        text = render_html(summary, videos)
        count = send(text)
        print(f"Sent to Telegram in {count} message(s), {len(text)} chars total.")
        return 0

    except FileNotFoundError as exc:
        print(f"ERROR: {exc.filename} not found. Run 'py fetch_recent.py' and 'py analyze.py' first.")
        return 1
    except (RuntimeError, requests.RequestException) as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
