@echo off
title Claude Telegram Bot
color 0A
echo.
echo ==========================================
echo   Claude Telegram Bot - Starting...
echo ==========================================
echo.

cd /d "%~dp0"

if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and fill in your values.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Bot is running. Press Ctrl+C to stop.
echo.
node bot.js

pause
