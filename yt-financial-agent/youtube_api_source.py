"""
Channel listing fallback for when YouTube's RSS feed is down.

The public RSS endpoint (feeds/videos.xml) has been returning 404 on and off
for months across every feed reader, so it cannot be the only way we learn what
was published. This uses the official YouTube Data API instead: documented,
stable, and free at our volume - the daily quota is 10,000 units and one call
here costs 1.

Enabled by setting YOUTUBE_API_KEY.
"""

import os

import requests

ENDPOINT = "https://www.googleapis.com/youtube/v3/playlistItems"

# Videos to ask for. We only need the last day, but the extra rows are free.
PAGE_SIZE = 25


class YouTubeApiError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(os.getenv("YOUTUBE_API_KEY"))


def uploads_playlist_id(channel_id: str) -> str:
    """
    Every channel has an "uploads" playlist whose id is the channel id with the
    UC prefix swapped for UU. Deriving it saves a separate channels.list call.
    """
    if not channel_id.startswith("UC"):
        raise YouTubeApiError(f"expected a channel id starting with UC, got {channel_id!r}")
    return "UU" + channel_id[2:]


def list_channel_videos(channel_id: str) -> list[dict]:
    """Recent uploads, newest first, in the same shape the RSS path returns."""
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        raise YouTubeApiError("YOUTUBE_API_KEY is not set")

    response = requests.get(
        ENDPOINT,
        params={
            "part": "snippet",
            "playlistId": uploads_playlist_id(channel_id),
            "maxResults": PAGE_SIZE,
            "key": key,
        },
        timeout=25,
    )

    if not response.ok:
        # Google returns a JSON error body that says exactly what is wrong
        # (bad key, API not enabled, quota). Surface it rather than a bare code.
        try:
            error = response.json().get("error", {})
            detail = error.get("message") or str(error)
        except ValueError:
            detail = response.text[:300]
        raise YouTubeApiError(f"HTTP {response.status_code}: {detail}")

    videos = []
    for item in response.json().get("items", []):
        snippet = item["snippet"]
        video_id = snippet["resourceId"]["videoId"]
        videos.append(
            {
                "video_id": video_id,
                "title": snippet["title"],
                "published": snippet["publishedAt"],
                "url": f"https://www.youtube.com/watch?v={video_id}",
            }
        )
    return videos
