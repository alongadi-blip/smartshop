"""
Step 2: Find videos published in the last N hours and download their transcripts.

Usage:
    py fetch_recent.py           # uses HOURS_BACK from config.py
    py fetch_recent.py 72        # override: look back 72 hours
"""

import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import requests

import config
from get_transcript import get_transcript_text

RSS_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def list_channel_videos(channel_id: str) -> list[dict]:
    """The 15 most recent uploads of a channel, newest first, from its public RSS feed."""
    response = requests.get(RSS_URL.format(channel_id=channel_id), timeout=20)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    videos = []
    for entry in root.findall("atom:entry", NAMESPACES):
        videos.append(
            {
                "video_id": entry.find("yt:videoId", NAMESPACES).text,
                "title": entry.find("atom:title", NAMESPACES).text,
                "published": entry.find("atom:published", NAMESPACES).text,
                "url": entry.find("atom:link", NAMESPACES).get("href"),
            }
        )
    return videos


def filter_recent(videos: list[dict], hours: int) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [v for v in videos if datetime.fromisoformat(v["published"]) >= cutoff]


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    hours = int(sys.argv[1]) if len(sys.argv) > 1 else config.HOURS_BACK
    now = datetime.now(timezone.utc)
    print(f"Now (UTC)  : {now:%Y-%m-%d %H:%M}")
    print(f"Looking back {hours} hours\n")

    collected = []

    for channel in config.CHANNELS:
        print(f"=== {channel['name']} ===")
        try:
            all_videos = list_channel_videos(channel["channel_id"])
        except requests.RequestException as exc:
            print(f"  ERROR fetching feed: {exc}\n")
            continue

        recent = filter_recent(all_videos, hours)
        print(f"  {len(all_videos)} videos in feed, {len(recent)} within the window")

        if not recent and all_videos:
            newest = datetime.fromisoformat(all_videos[0]["published"])
            age_h = (now - newest).total_seconds() / 3600
            print(f"  Newest upload is {age_h:.1f}h old: {all_videos[0]['title']}")

        for video in recent:
            published = datetime.fromisoformat(video["published"])
            print(f"\n  - {video['title']}")
            print(f"    {published:%Y-%m-%d %H:%M} UTC | {video['url']}")

            text = get_transcript_text(video["video_id"])
            if text is None:
                print("    transcript: NOT AVAILABLE - skipping")
                continue
            if len(text) < config.MIN_TRANSCRIPT_CHARS:
                print(f"    transcript: only {len(text)} chars - too short, skipping")
                continue

            print(f"    transcript: {len(text)} chars OK")
            collected.append({**video, "channel": channel["name"], "transcript": text})

        print()

    payload = {
        "generated_at": now.isoformat(),
        "hours_back": hours,
        "videos": collected,
    }
    with open(config.OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Collected {len(collected)} video(s) with transcripts -> {config.OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
