@echo off
echo ========================================
echo  CLEARING PROCESSED FILES TRACKER
echo ========================================
echo.
echo This will clear the tracker so ALL files
echo will be reprocessed on next automation run.
echo.
pause
echo {} > processed_files_tracker.json
echo.
echo ========================================
echo  TRACKER CLEARED SUCCESSFULLY!
echo ========================================
echo.
echo Next steps:
echo 1. Run automation: npm run automation
echo 2. Or manually: node scripts/smart_automation.js
echo.
pause
