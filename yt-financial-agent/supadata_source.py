"""
Transcript fallback for when YouTube refuses us.

YouTube blocks transcript requests from datacenter IPs, so the free
youtube-transcript-api route only works from a home connection. In the cloud we
go through Supadata, a managed transcript API (100 free transcripts/month).

Enabled by setting SUPADATA_API_KEY; without it this module reports "unavailable"
and the caller falls back to whatever it had.
"""

import os
import time

import requests

ENDPOINT = "https://api.supadata.ai/v1/transcript"
JOB_ENDPOINT = "https://api.supadata.ai/v1/transcript/{job_id}"

# Videos over ~20 minutes come back as an async job instead of inline content.
JOB_POLL_SECONDS = 5
JOB_TIMEOUT_SECONDS = 300

PREFERRED_LANG = "he"


class SupadataError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(os.getenv("SUPADATA_API_KEY"))


def _headers() -> dict:
    key = os.getenv("SUPADATA_API_KEY")
    if not key:
        raise SupadataError("SUPADATA_API_KEY is not set")
    return {"x-api-key": key}


def _wait_for_job(job_id: str) -> str:
    """Poll an async transcript job until it completes."""
    deadline = time.monotonic() + JOB_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        time.sleep(JOB_POLL_SECONDS)
        response = requests.get(
            JOB_ENDPOINT.format(job_id=job_id), headers=_headers(), timeout=30
        )
        response.raise_for_status()
        body = response.json()
        status = body.get("status")

        if status == "completed":
            return body.get("content") or ""
        if status == "failed":
            raise SupadataError(f"job failed: {body.get('error', 'unknown error')}")

    raise SupadataError(f"job {job_id} did not finish within {JOB_TIMEOUT_SECONDS}s")


def get_transcript_text(video_id: str) -> str | None:
    """Full transcript text, or None if Supadata isn't configured or has no transcript."""
    if not is_configured():
        return None

    response = requests.get(
        ENDPOINT,
        params={
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "lang": PREFERRED_LANG,
            "text": "true",
        },
        headers=_headers(),
        timeout=120,
    )

    # 202 means the video was long enough to be queued as a job.
    if response.status_code == 202:
        return _wait_for_job(response.json()["jobId"]) or None

    if response.status_code == 404:
        return None  # No transcript exists for this video.

    response.raise_for_status()
    return response.json().get("content") or None
