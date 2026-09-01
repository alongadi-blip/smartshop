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
import sent_log
import telegram_send
from analyze import analyze
from fetch_recent import filter_recent, list_channel_videos
from get_transcript import get_transcript_text
from redaction import redact

LOG_FILE = "run_daily.log"


def log(message: str) -> None:
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Redact before anything is written: CI masks its own console stream, but
    # nothing masks a file, so an unredacted line here would outlive the run.
    line = redact(f"[{stamp}] {message}")
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def collect(hours: int, already_sent: dict[str, str]) -> tuple[list[dict], int, list[str], list[str]]:
    """Returns (videos with transcripts, NEW videos found, feed errors, transcript errors)."""
    collected = []
    found = 0
    feed_errors = []
    transcript_errors = []
    for channel in config.CHANNELS:
        try:
            videos = filter_recent(list_channel_videos(channel["channel_id"]), hours)
        except Exception as exc:
            # Never swallow this: a feed we could not read is not the same as a
            # feed with nothing new, and treating it as "quiet day" hides an
            # outage behind exactly the silence a normal morning produces.
            log(f"  {channel['name']}: feed error - {exc}")
            feed_errors.append(f"{channel['name']}: {type(exc).__name__}: {exc}")
            continue

        # Drop already-summarised videos before fetching transcripts, not after:
        # a transcript we would throw away still costs a Supadata credit.
        fresh = [v for v in videos if v["video_id"] not in already_sent]
        skipped = len(videos) - len(fresh)

        log(
            f"  {channel['name']}: {len(videos)} video(s) in the last {hours}h"
            + (f", {skipped} already summarised" if skipped else "")
        )
        found += len(fresh)

        for video in fresh:
            reasons: list[str] = []
            text = get_transcript_text(video["video_id"], reasons)
            if text is None or len(text) < config.MIN_TRANSCRIPT_CHARS:
                why = "; ".join(reasons) or f"only {len(text or '')} chars"
                log(f"    skipped ({why}): {video['title']}")
                transcript_errors.append(f"{video['title'][:40]}: {why}")
                continue
            log(f"    ok ({len(text)} chars): {video['title']}")
            collected.append({**video, "channel": channel["name"], "transcript": text})

    return collected, found, feed_errors, transcript_errors


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    hours = int(sys.argv[1]) if len(sys.argv) > 1 else config.HOURS_BACK

    log("=" * 60)
    log("Daily run started")

    try:
        already_sent = sent_log.load()
        log(f"{len(already_sent)} video(s) summarised previously")

        videos, found, feed_errors, transcript_errors = collect(hours, already_sent)

        # A feed we could not read means we do not know what was published, so
        # silence would be a guess. Report it.
        if feed_errors:
            raise RuntimeError("could not read channel feed -> " + " ;; ".join(feed_errors))

        # Nothing new is a normal quiet run - either nothing was published, or an
        # earlier run today already delivered it. Stay silent either way.
        if found == 0:
            log(f"Nothing new in the last {hours}h - nothing to send. Done.")
            return 0

        # Videos exist but none yielded a transcript. That is a real failure and
        # must be reported, or a broken agent looks exactly like a quiet day.
        if not videos:
            raise RuntimeError(
                f"{found} video(s) found but no transcript could be fetched -> "
                + " ;; ".join(transcript_errors)
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

        # Only after a successful send - a crash before this point should leave
        # the videos eligible for the next run.
        sent_log.record([v["video_id"] for v in videos], already_sent)
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
