"""All the knobs you may want to turn live here."""

# Channels to monitor. Get a channel_id with: py find_channel.py "<any video url>"
CHANNELS = [
    {"name": "Micha.Stocks", "channel_id": "UCSxjNbPriyBh9RNl_QNSAtw"},
]

# How far back to look for new videos, in hours.
HOURS_BACK = 24

# Videos shorter than this are usually Shorts / teasers, not real analysis.
MIN_TRANSCRIPT_CHARS = 500

# Keep the Telegram message short enough to read on a phone over coffee.
# The model is asked to prioritize; these are also enforced as hard caps in code.
MAX_RECOMMENDATIONS = 6
MAX_ATTENTION_POINTS = 4
MAX_EVENTS = 4

# Where fetched videos + transcripts are cached for the next step.
OUTPUT_FILE = "latest_videos.json"
