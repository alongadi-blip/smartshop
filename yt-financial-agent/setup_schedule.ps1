# Registers the daily 08:00 run in Windows Task Scheduler.
# Run once:  powershell -ExecutionPolicy Bypass -File setup_schedule.ps1
# Remove it: Unregister-ScheduledTask -TaskName "YT Financial Agent" -Confirm:$false

$taskName = "YT Financial Agent"
$batch = Join-Path $PSScriptRoot "run_daily.bat"

if (-not (Test-Path $batch)) {
    Write-Host "ERROR: run_daily.bat not found next to this script." -ForegroundColor Red
    exit 1
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batch`"" -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At "08:00"

# StartWhenAvailable: if the PC was asleep or off at 08:00, run as soon as it is back.
# The task is pointless without internet, so require a network connection.
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Summarizes the last 24h of finance videos and sends it to Telegram." `
    -Force | Out-Null

Write-Host "Scheduled '$taskName' for 08:00 daily." -ForegroundColor Green
Write-Host ""
Write-Host "Test it right now with:"
Write-Host "  Start-ScheduledTask -TaskName `"$taskName`""
Write-Host ""
Write-Host "Check when it last ran / will run next:"
Write-Host "  Get-ScheduledTaskInfo -TaskName `"$taskName`""
