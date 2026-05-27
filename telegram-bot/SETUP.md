# Claude Telegram Bot — Setup Guide

Control Claude Code from your phone via Telegram.

---

## Step 1 — Create a Telegram Bot (2 minutes)

1. Open Telegram on your phone
2. Search for **@BotFather** and tap it
3. Send: `/newbot`
4. Choose a name (e.g. `My Code Bot`)
5. Choose a username ending in `bot` (e.g. `mycode_ctrl_bot`)
6. BotFather will give you a **TOKEN** — copy it

---

## Step 2 — Get Your Telegram User ID

1. Search for **@userinfobot** on Telegram
2. Send it any message
3. It will reply with your **ID** (a number like `123456789`)

---

## Step 3 — Configure the Bot

1. Copy `.env.example` to `.env`
2. Open `.env` and fill in:

```
BOT_TOKEN=123456789:ABCDefGhijklMNOpqrSTUvwxyz
ALLOWED_IDS=123456789
```

---

## Step 4 — Run the Bot

Double-click **`start.bat`**

A terminal window will open. Keep it open — the bot runs as long as this window is open.

---

## Step 5 — Test It

1. Open Telegram → find your bot → send `/start`
2. Select a project (SmartShop / StockStocker / SmartCard)
3. Send an instruction: _"Change the title to Hello World"_
4. Wait ~30 seconds → code is changed and deployed!

---

## Auto-start When PC Turns On (Optional)

To make the bot start automatically:

1. Press `Win + R` → type `shell:startup` → Enter
2. Create a shortcut to `start.bat` in that folder

---

## Tips for Your Mother

- First **select a project** by tapping the button
- Then type the instruction in **Hebrew or English**
- Wait — it can take 30-60 seconds
- She'll get a confirmation when it's done and deployed

### Example Instructions:
- `"שנה את הכותרת ל'ברוכים הבאים'"`
- `"Add a contact us button at the bottom"`
- `"Make the background color light blue"`
- `"הוסף שדה טלפון לטופס"`

---

## Troubleshooting

**Bot doesn't respond:** Make sure `start.bat` is running on the PC

**"Access denied":** Your Telegram ID isn't in `ALLOWED_IDS` in `.env`

**Error from Claude:** Claude Code might need to be logged in — run `claude` once in the terminal
