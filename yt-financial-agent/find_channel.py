"""
Helper: given any YouTube video URL, print the channel it belongs to.

Usage:
    py find_channel.py "https://www.youtube.com/watch?v=VIDEO_ID"
"""

import re
import sys

import requests

from get_transcript import extract_video_id

# A browser-ish user agent, otherwise YouTube serves a stripped-down page.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(1) if match else None


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) < 2:
        print('Usage: py find_channel.py "<youtube video url>"')
        return 1

    video_id = extract_video_id(sys.argv[1])
    page = requests.get(
        f"https://www.youtube.com/watch?v={video_id}", headers=HEADERS, timeout=20
    ).text

    channel_id = first_match(r'"channelId":"(UC[A-Za-z0-9_-]{22})"', page)
    handle = first_match(r'"canonicalBaseUrl":"/(@[^"]+)"', page)
    channel_name = first_match(r'"ownerChannelName":"([^"]+)"', page)
    video_title = first_match(r'"title":"([^"]+)"', page)

    print(f"Video title  : {video_title}")
    print(f"Channel name : {channel_name}")
    print(f"Channel id   : {channel_id}")
    print(f"Handle       : {handle}")
    print()

    if handle:
        print(f"Channel URL  : https://www.youtube.com/{handle}")
    if channel_id:
        print(f"Channel URL  : https://www.youtube.com/channel/{channel_id}")
        print(f"RSS feed     : https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
