"""
Remember which videos have already been summarised.

GitHub's cron is best-effort: it runs late, and some mornings it does not run at
all. The fix is to schedule several times a day - which only works if a second
run knows the first one already delivered. This is that memory.

Keyed by video id rather than by date, so a video published later in the day
still gets its own summary while nothing is ever sent twice.
"""

import json
from datetime import datetime, timedelta, timezone

STATE_FILE = "sent_videos.json"

# Long enough to cover any realistic look-back window, short enough that the
# file stays small. Video ids older than this are forgotten.
KEEP_DAYS = 30


def load() -> dict[str, str]:
    """Map of video_id -> ISO timestamp of when we summarised it."""
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            state = json.load(f)
    except (FileNotFoundError, ValueError):
        return {}

    return state if isinstance(state, dict) else {}


def record(video_ids: list[str], state: dict[str, str]) -> None:
    """Mark these videos as delivered and write the file back."""
    now = datetime.now(timezone.utc)
    for video_id in video_ids:
        state[video_id] = now.isoformat()

    cutoff = now - timedelta(days=KEEP_DAYS)
    pruned = {}
    for video_id, stamp in state.items():
        try:
            if datetime.fromisoformat(stamp) >= cutoff:
                pruned[video_id] = stamp
        except ValueError:
            continue  # Unparseable entry - drop it.

    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(pruned, f, indent=2, sort_keys=True)
