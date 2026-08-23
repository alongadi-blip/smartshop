"""
Fetch the transcript of a single YouTube video.

Usable both as a CLI tool and as a library:
    py get_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"
    from get_transcript import get_transcript_text
"""

import re
import sys

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

import supadata_source

# Transcript languages we want, in order of preference.
PREFERRED_LANGUAGES = ["he", "iw", "en"]


def extract_video_id(url_or_id: str) -> str:
    """Pull the 11-character video id out of any common YouTube URL shape."""
    url_or_id = url_or_id.strip()

    # Already a bare id.
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url_or_id):
        return url_or_id

    patterns = [
        r"(?:v=|/v/)([A-Za-z0-9_-]{11})",       # watch?v=ID  /v/ID
        r"youtu\.be/([A-Za-z0-9_-]{11})",        # youtu.be/ID
        r"/shorts/([A-Za-z0-9_-]{11})",          # /shorts/ID
        r"/live/([A-Za-z0-9_-]{11})",            # /live/ID
        r"/embed/([A-Za-z0-9_-]{11})",           # /embed/ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    raise ValueError(f"Could not find a video id in: {url_or_id}")


def fetch_transcript(video_id: str, verbose: bool = True):
    """Return (language_code, list_of_snippets) for the best available transcript."""
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    if verbose:
        print("Available transcripts:")
        for t in transcript_list:
            kind = "auto-generated" if t.is_generated else "manual"
            print(f"  - {t.language_code:<6} {t.language} ({kind})")
        print()

    # 1. Try a real transcript in a preferred language.
    try:
        transcript = transcript_list.find_transcript(PREFERRED_LANGUAGES)
    except NoTranscriptFound:
        # 2. Fall back to any transcript, translated to Hebrew if possible.
        transcript = next(iter(transcript_list))
        if transcript.is_translatable:
            transcript = transcript.translate("he")

    return transcript.language_code, transcript.fetch()


def get_transcript_text(video_id: str) -> str | None:
    """
    Full transcript as one string, or None when no source can supply one.

    Tries YouTube directly first — it is free and works from a home connection.
    YouTube blocks datacenter IPs, so in the cloud that always fails and we fall
    back to Supadata (only if SUPADATA_API_KEY is set).
    """
    try:
        _language, snippets = fetch_transcript(video_id, verbose=False)
        return " ".join(snippet.text for snippet in snippets)
    except CouldNotRetrieveTranscript as exc:
        if not supadata_source.is_configured():
            return None
        print(f"    youtube refused ({type(exc).__name__}), trying Supadata...", flush=True)

    try:
        return supadata_source.get_transcript_text(video_id)
    except (supadata_source.SupadataError, requests.RequestException) as exc:
        print(f"    Supadata failed: {exc}", flush=True)
        return None


def main() -> int:
    # Windows consoles default to a legacy codepage; force UTF-8 so Hebrew prints.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) < 2:
        print('Usage: py get_transcript.py "<youtube url>"')
        return 1

    try:
        video_id = extract_video_id(sys.argv[1])
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    print(f"Video id: {video_id}\n")

    try:
        language, snippets = fetch_transcript(video_id)
    except TranscriptsDisabled:
        print("ERROR: this video has transcripts disabled.")
        return 1
    except NoTranscriptFound:
        print("ERROR: no transcript available for this video.")
        return 1
    except VideoUnavailable:
        print("ERROR: video unavailable (private, deleted, or region blocked).")
        return 1

    full_text = " ".join(snippet.text for snippet in snippets)
    duration_min = (snippets[-1].start + snippets[-1].duration) / 60 if snippets else 0

    print(f"Fetched language : {language}")
    print(f"Snippets         : {len(snippets)}")
    print(f"Characters       : {len(full_text)}")
    print(f"Video length     : {duration_min:.1f} min")
    print("\n--- first 800 characters ---")
    print(full_text[:800])
    print("--- end of preview ---\n")

    out_path = f"transcript_{video_id}.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    print(f"Full transcript saved to: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
