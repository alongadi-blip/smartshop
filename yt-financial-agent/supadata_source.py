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


def _raise_for_error(response: requests.Response) -> None:
    """Surface Supadata's own error text — a bare status code says nothing useful."""
    if response.ok or response.status_code == 202:
        return

    try:
        body = response.json()
        detail = " | ".join(
            str(body[field]) for field in ("error", "message", "details") if body.get(field)
        )
    except ValueError:
        detail = response.text[:300]

    raise SupadataError(f"HTTP {response.status_code}: {detail or 'no detail returned'}")


def _wait_for_job(job_id: str) -> str:
    """Poll an async transcript job until it completes."""
    deadline = time.monotonic() + JOB_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        time.sleep(JOB_POLL_SECONDS)
        response = requests.get(
            JOB_ENDPOINT.format(job_id=job_id), headers=_headers(), timeout=30
        )
        _raise_for_error(response)
        body = response.json()
        status = body.get("status")

        if status == "completed":
            return body.get("content") or ""
        if status == "failed":
            raise SupadataError(f"job failed: {body.get('error', 'unknown error')}")

    raise SupadataError(f"job {job_id} did not finish within {JOB_TIMEOUT_SECONDS}s")


def _variants(video_id: str) -> list[tuple[str, dict]]:
    """
    Request shapes to try, in order.

    A valid key still returned 400 on the first shape we tried, and the API
    checks auth before parameters so it can't be reproduced without the real
    key. Rather than guess, try the plausible shapes and report what each said.
    """
    short_url = f"https://youtu.be/{video_id}"
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    return [
        ("short url + lang", {"url": short_url, "lang": PREFERRED_LANG, "text": "true"}),
        ("short url, no lang", {"url": short_url, "text": "true"}),
        ("watch url, no lang", {"url": watch_url, "text": "true"}),
    ]


# Waits between 429 retries. The free plan's rate limit is not published, so
# these are deliberately generous - a slow summary beats no summary.
RATE_LIMIT_BACKOFF = (20, 45, 90)

# Breathing room between differently-shaped attempts, so our own retries are
# not what trips the rate limit.
VARIANT_PAUSE = 3

# Which request shape this API key accepts. Learned on the first success and
# reused, so later videos in the same run cost one request instead of three.
_working_variant: str | None = None


def _get(params: dict) -> requests.Response:
    """One request, retrying only on 429."""
    response = requests.get(ENDPOINT, params=params, headers=_headers(), timeout=120)

    for wait in RATE_LIMIT_BACKOFF:
        if response.status_code != 429:
            break
        print(f"    Supadata rate-limited, retrying in {wait}s...", flush=True)
        time.sleep(wait)
        response = requests.get(ENDPOINT, params=params, headers=_headers(), timeout=120)

    return response


def get_transcript_text(video_id: str) -> str | None:
    """Full transcript text, or None if Supadata isn't configured or has no transcript."""
    global _working_variant

    if not is_configured():
        return None

    variants = _variants(video_id)
    if _working_variant:
        variants.sort(key=lambda v: v[0] != _working_variant)

    problems = []

    for index, (label, params) in enumerate(variants):
        if index:
            time.sleep(VARIANT_PAUSE)

        response = _get(params)

        # 202 means the video was long enough to be queued as a job.
        if response.status_code == 202:
            _working_variant = label
            return _wait_for_job(response.json()["jobId"]) or None

        # 206 and 404 both mean "no transcript for this video" - not a failure.
        if response.status_code in (206, 404):
            return None

        if response.ok:
            if _working_variant != label:
                print(f"    Supadata accepted the '{label}' request shape", flush=True)
            _working_variant = label
            return response.json().get("content") or None

        # 400 is the only status worth retrying with a different shape; auth,
        # quota and server errors will fail identically however we ask.
        try:
            _raise_for_error(response)
        except SupadataError as exc:
            problems.append(f"[{label}] {exc}")
            if response.status_code != 400:
                raise SupadataError(str(exc)) from None

    raise SupadataError("all request shapes rejected -> " + " ;; ".join(problems))
