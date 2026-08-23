@echo off
REM Entry point for the Windows scheduled task.
REM %~dp0 is this file's own folder, so the task works no matter where it runs from.
cd /d "%~dp0"
py run_daily.py
