@echo off
REM Marbefa Poultry Analytics - Backend Startup Script
REM Starts the Django development server on port 8000

cd /d "%~dp0backend"

echo ============================================
echo   Marbefa Poultry Analytics - Backend
echo ============================================
echo.
echo Starting Django server on http://localhost:8000
echo Press Ctrl+C to stop.
echo.

python manage.py runserver 0.0.0.0:8000

pause
