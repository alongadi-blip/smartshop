"""
Step 3: Turn the fetched transcripts into one structured daily summary.

Usage:
    py analyze.py            # reads latest_videos.json, writes summary.json
"""

import json
import os
import sys
import time
from typing import Literal

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field

import config

load_dotenv()

MODEL = "claude-opus-5"

SYSTEM_PROMPT = """\
אתה אנליסט פיננסי שמסכם תוכן וידאו על שוק ההון עבור משקיע פרטי בישראל.

אתה מקבל תמלולים אוטומטיים של סרטוני יוטיוב. חשוב מאוד:
- התמלול נוצר אוטומטית ולכן שמות חברות וטיקרים משובשים. תקן אותם לפי ההקשר.
  דוגמאות לשיבושים נפוצים: "אנדיה"/"נבידיה" = NVIDIA (NVDA), "אפל" = Apple (AAPL),
  "טסלה" = Tesla (TSLA), "אמזון" = Amazon (AMZN), "מיקרוסופט" = Microsoft (MSFT),
  "סלספורס" = Salesforce (CRM), "נזדק" = Nasdaq, "רסל" = Russell 2000.
- דווח אך ורק על מה שנאמר בפועל בתמלול. אל תוסיף ניתוח, דעות או נתונים משלך.
- אם היוצר אומר במפורש שזה לא ייעוץ, אל תציג את דבריו כהמלצה ודאית — שקף את רמת
  הוודאות שלו (למשל "מזכיר לעקוב" מול "אומר לקנות").
- אם משהו לא נאמר בסרטונים, השאר את השדה ריק. אל תמציא.

כתוב את כל הפלט בעברית תקינה, בגוף שלישי, קצר וענייני.\
"""


class Recommendation(BaseModel):
    ticker: str = Field(description="סימול המניה באנגלית, למשל NVDA. אם לא ידוע - מחרוזת ריקה")
    company: str = Field(description="שם החברה")
    action: Literal["קנייה", "מכירה", "החזקה", "מעקב"] = Field(
        description="הפעולה שהיוצר מציע. 'מעקב' אם רק הזכיר בלי כיוון ברור"
    )
    confidence: Literal["גבוהה", "בינונית", "נמוכה"] = Field(
        description="עד כמה היוצר היה נחרץ"
    )
    reason: str = Field(description="הנימוק שנאמר בסרטון, משפט או שניים")


class DailySummary(BaseModel):
    market_overview: str = Field(description="סקירת שוק כללית, 3-5 משפטים")
    sentiment: Literal["חיובי", "שלילי", "מעורב", "ניטרלי"] = Field(
        description="הסנטימנט הכללי שעולה מהסרטונים"
    )
    recommendations: list[Recommendation] = Field(
        description="המלצות ספציפיות למניות שהוזכרו. רשימה ריקה אם אין"
    )
    attention_points: list[str] = Field(
        description="נקודות תשומת לב: סיכונים, אזהרות, דברים לעקוב אחריהם"
    )
    upcoming_events: list[str] = Field(
        description="אירועים קרובים שהוזכרו: דוחות, נתוני מאקרו, החלטות ריבית"
    )


def build_user_prompt(videos: list[dict]) -> str:
    parts = [f"להלן {len(videos)} סרטונים מהיממה האחרונה. סכם את כולם יחד.\n"]
    for i, video in enumerate(videos, 1):
        parts.append(
            f"\n===== סרטון {i} =====\n"
            f"ערוץ: {video['channel']}\n"
            f"כותרת: {video['title']}\n"
            f"פורסם: {video['published']}\n"
            f"תמלול:\n{video['transcript']}\n"
        )
    return "".join(parts)


PHASE_LABELS = {"thinking": "thinking", "text": "writing summary"}


def analyze(videos: list[dict]) -> DailySummary:
    """Stream the request so we get live progress and no HTTP timeout on long inputs."""
    client = anthropic.Anthropic()

    started = time.monotonic()
    phase = "connecting"
    chars = 0
    last_drawn = 0.0

    def draw(force: bool = False) -> None:
        nonlocal last_drawn
        now = time.monotonic()
        if not force and now - last_drawn < 0.25:
            return
        last_drawn = now
        print(f"\r  [{now - started:5.1f}s] {phase}... {chars} chars ", end="", flush=True)

    with client.messages.stream(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        messages=[{"role": "user", "content": build_user_prompt(videos)}],
        output_format=DailySummary,
    ) as stream:
        for event in stream:
            if event.type == "content_block_start":
                block_type = event.content_block.type
                phase = PHASE_LABELS.get(block_type, block_type)
                chars = 0
            elif event.type == "content_block_delta":
                delta = event.delta
                chars += len(getattr(delta, "text", None) or getattr(delta, "thinking", None) or "")
            draw()
        draw(force=True)
        response = stream.get_final_message()

    usage = response.usage
    cost = usage.input_tokens * 5e-6 + usage.output_tokens * 25e-6
    print(
        f"\r  done in {time.monotonic() - started:.1f}s | "
        f"{usage.input_tokens} in / {usage.output_tokens} out tokens | ~${cost:.3f}\n"
    )
    return response.parsed_output


ACTION_ICONS = {"קנייה": "🟢", "מכירה": "🔴", "החזקה": "🟡", "מעקב": "👀"}


def render(summary: DailySummary, videos: list[dict]) -> str:
    """Plain-text rendering, reused by the Telegram step."""
    lines = ["📊 סיכום שוק ההון היומי", ""]

    lines.append(f"🌐 סקירה כללית ({summary.sentiment})")
    lines.append(summary.market_overview)
    lines.append("")

    if summary.recommendations:
        lines.append("💡 מניות שהוזכרו")
        for rec in summary.recommendations:
            icon = ACTION_ICONS.get(rec.action, "•")
            ticker = f" ({rec.ticker})" if rec.ticker else ""
            lines.append(f"{icon} {rec.company}{ticker} — {rec.action} | ודאות {rec.confidence}")
            lines.append(f"   {rec.reason}")
        lines.append("")

    if summary.attention_points:
        lines.append("⚠️ נקודות תשומת לב")
        lines.extend(f"• {point}" for point in summary.attention_points)
        lines.append("")

    if summary.upcoming_events:
        lines.append("📅 אירועים קרובים")
        lines.extend(f"• {event}" for event in summary.upcoming_events)
        lines.append("")

    lines.append("🎬 מקורות")
    for video in videos:
        lines.append(f"• {video['title']}")
        lines.append(f"  {video['url']}")
    lines.append("")
    lines.append("אינו ייעוץ פיננסי. סיכום אוטומטי של תוכן הערוץ בלבד.")

    return "\n".join(lines)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not os.getenv("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY is missing. Copy .env.example to .env and fill it in.")
        return 1

    try:
        with open(config.OUTPUT_FILE, encoding="utf-8") as f:
            payload = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {config.OUTPUT_FILE} not found. Run 'py fetch_recent.py' first.")
        return 1

    videos = payload["videos"]
    if not videos:
        print("No videos to analyze - nothing was published in the window.")
        return 0

    print(f"Analyzing {len(videos)} video(s) with {MODEL}...\n")
    summary = analyze(videos)

    text = render(summary, videos)
    print(text)

    with open("summary.json", "w", encoding="utf-8") as f:
        json.dump(summary.model_dump(), f, ensure_ascii=False, indent=2)
    with open("summary.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("\nSaved to summary.json + summary.txt")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
