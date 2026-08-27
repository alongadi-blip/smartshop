"""All the knobs you may want to turn live here."""

# Channels to monitor. Get a channel_id with: py find_channel.py "<any video url>"
CHANNELS = [
    {"name": "Micha.Stocks", "channel_id": "UCSxjNbPriyBh9RNl_QNSAtw"},
]

# How far back to look for new videos, in hours. Wider than a day on purpose:
# if a scheduled run is skipped entirely, the next one still catches yesterday.
# Safe because already-summarised videos are skipped by id, not by date.
HOURS_BACK = 36

# Videos shorter than this are usually Shorts / teasers, not real analysis.
MIN_TRANSCRIPT_CHARS = 500

# Upper bounds, not targets. Telegram messages are split automatically, so these
# exist to stop a runaway list - not to starve the summary of detail.
MAX_RECOMMENDATIONS = 12
MAX_ATTENTION_POINTS = 8
MAX_EVENTS = 8

# Where fetched videos + transcripts are cached for the next step.
OUTPUT_FILE = "latest_videos.json"
