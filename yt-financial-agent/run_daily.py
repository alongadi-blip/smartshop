"""
The whole pipeline in one command: fetch -> analyze -> send to Telegram.

This is what the daily 08:00 scheduled task runs.

Usage:
    py run_daily.py           # uses HOURS_BACK from config.py
    py run_daily.py 96        # override the look-back window
"""

import json
import sys
import traceback
from datetime import datetime, timezone

import config
import telegram_send
from analyze import analyze
from fetch_recent import filter_recent, list_channel_videos
from get_transcript import get_transcript_text

LOG_FILE = "run_daily.log"


def log(message: str) -> None:
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {message}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def collect(hours: int) -> tuple[list[dict], int]:
    """Returns (videos with transcripts, how many videos were published at all)."""
    collected = []
    found = 0
    for channel in config.CHANNELS:
        try:
            videos = filter_recent(list_channel_videos(channel["channel_id"]), hours)
        except Exception as exc:
            log(f"  {channel['name']}: feed error - {exc}")
            continue

        log(f"  {channel['name']}: {len(videos)} video(s) in the last {hours}h")
        found += len(videos)

        for video in videos:
            text = get_transcript_text(video["video_id"])
            if text is None or len(text) < config.MIN_TRANSCRIPT_CHARS:
                log(f"    skipped (no usable transcript): {video['title']}")
                continue
            log(f"    ok ({len(text)} chars): {video['title']}")
            collected.append({**video, "channel": channel["name"], "transcript": text})

    return collected, found


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    hours = int(sys.argv[1]) if len(sys.argv) > 1 else config.HOURS_BACK

    log("=" * 60)
    log("Daily run started")

    try:
        videos, found = collect(hours)

        # Nothing published is a normal quiet day - stay silent.
        if found == 0:
            log(f"No videos published in the last {hours}h - nothing to send. Done.")
            return 0

        # Videos exist but none yielded a transcript. That is a real failure and
        # must be reported, or a broken agent looks exactly like a quiet day.
        if not videos:
            raise RuntimeError(
                f"{found} video(s) found but no transcript could be fetched. "
                "In the cloud this usually means SUPADATA_API_KEY is missing or out of credits."
            )

        # Cache what we fetched, so a failed analysis can be retried without re-downloading.
        with open(config.OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "hours_back": hours,
                    "videos": videos,
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

        log(f"Analyzing {len(videos)} video(s)...")
        summary = analyze(videos)

        with open("summary.json", "w", encoding="utf-8") as f:
            json.dump(summary.model_dump(), f, ensure_ascii=False, indent=2)

        text = telegram_send.render_html(summary, videos)
        count = telegram_send.send(text)
        log(f"Sent to Telegram: {count} message(s), {len(text)} chars.")
        log("Done.")
        return 0

    except Exception as exc:
        log(f"FAILED: {type(exc).__name__}: {exc}")
        log(traceback.format_exc())

        # Best effort: tell the user on Telegram that the run broke, so silence
        # is never mistaken for "no news today".
        try:
            telegram_send.send(
                f"⚠️ <b>הסוכן נכשל בהרצה היומית</b>\n\n"
                f"<code>{telegram_send.esc(f'{type(exc).__name__}: {exc}')}</code>\n\n"
                f"<i>הפרטים המלאים ב-{LOG_FILE}</i>"
            )
        except Exception:
            log("Could not send the failure notification either.")

        return 1


if __name__ == "__main__":
    raise SystemExit(main())
