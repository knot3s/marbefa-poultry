@echo off
REM Marbefa Poultry Analytics - Seed Database
REM Creates demo users, a flock batch, and 30 days of daily logs

cd /d "%~dp0backend"

echo Seeding database with demo data...
python manage.py shell -c "exec(open('seed_data.py').read())"

echo.
echo Done! Credentials:
echo   Manager: manager / manager123
echo   Staff:   staff / staff123
pause
