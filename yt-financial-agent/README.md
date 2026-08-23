# YouTube Financial Summarizer Agent

Fetches the last 24h of videos from a YouTube finance channel, downloads their
transcripts, summarizes them with Claude, and delivers the result to Telegram —
automatically, every morning at 08:00.

## Everyday use

Once set up, it runs itself. To trigger a run by hand:

```
py run_daily.py
```

## The pieces

| File | What it does |
|---|---|
| `config.py` | **Settings you may want to change** — channels, look-back window |
| `.env` | Your secrets. Never committed. |
| `run_daily.py` | The whole pipeline: fetch → analyze → send |
| `run_daily.bat` | What the scheduled task launches |
| `setup_schedule.ps1` | Registers the 08:00 daily task (run once) |
| `fetch_recent.py` | Finds recent videos and downloads transcripts |
| `analyze.py` | Sends transcripts to Claude, returns a structured summary |
| `telegram_send.py` | Formats and delivers to Telegram |
| `get_transcript.py` | Single-video transcript fetch (also a CLI tool) |
| `find_channel.py` | Resolves a channel id from any video URL |

## First-time setup

```
py -m pip install -r requirements.txt
copy .env.example .env
```

Then fill in `.env`:

- `ANTHROPIC_API_KEY` — from console.anthropic.com → API Keys
- `TELEGRAM_BOT_TOKEN` — from @BotFather in Telegram (`/newbot`)
- `TELEGRAM_CHAT_ID` — message your bot once, then run `py telegram_send.py --whoami`

Schedule the daily run:

```
powershell -ExecutionPolicy Bypass -File setup_schedule.ps1
```

## Adding another channel

Get its id, then add a line to `CHANNELS` in `config.py`:

```
py find_channel.py "https://www.youtube.com/watch?v=SOME_VIDEO"
```

## Running the steps separately

Useful when debugging — each step caches its output for the next one.

```
py fetch_recent.py 96     # look back 96 hours instead of 24
py analyze.py             # re-analyze the cached transcripts
py telegram_send.py       # re-send the cached summary (free)
```

## Managing the schedule

```powershell
Get-ScheduledTaskInfo -TaskName "YT Financial Agent"     # last run / next run
Start-ScheduledTask     -TaskName "YT Financial Agent"   # run it now
Disable-ScheduledTask   -TaskName "YT Financial Agent"   # pause
Unregister-ScheduledTask -TaskName "YT Financial Agent" -Confirm:$false   # remove
```

Every run appends to `run_daily.log`. If a run fails, the error is also sent to
Telegram — silence should never be mistaken for "no news today".

## Notes

- Transcripts come from YouTube's public RSS feed and the transcript endpoint —
  no Google API key, no quota.
- YouTube blocks transcript requests from datacenter IPs. Locally that never
  matters; in GitHub Actions every transcript comes from Supadata instead
  (100 free/month, set `SUPADATA_API_KEY`). The fallback is automatic.
- A typical day (one video) costs a few cents.
- **Not financial advice.** The summary reflects what a video said, nothing more.
