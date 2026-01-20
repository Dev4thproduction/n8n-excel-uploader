@echo off
:: This script UNLOCKS n8n and gives it more time for long tasks
set N8N_BLOCK_NODES=
set NODE_FUNCTION_ALLOW_BUILTIN=child_process,fs,path
set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

:: INCREASE TIMEOUTS FOR PUPPETEER
set N8N_RUNNERS_MAX_CONCURRENCY=10
set N8N_RUNNERS_HEARTBEAT_INTERVAL=3000
set N8N_RUNNERS_HEARTBEAT_TIMEOUT=120000

echo ==========================================
echo    N8N UNLOCKER (PRO VERSION)
echo ==========================================
echo.
echo 1. Closing old n8n...
taskkill /F /IM n8n.exe >nul 2>&1
echo 2. Starting n8n with EXTENDED TIMEOUTS...
echo.
n8n start
