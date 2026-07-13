@echo off
cd /d "%~dp0"

echo Removing git lock if exists...
if exist .git\index.lock del /f .git\index.lock

echo Adding all files...
git add -A
if %errorlevel% neq 0 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo Committing...
git commit -m "fix: restore all files from nong branch — resolve conflict marker corruption"
if %errorlevel% neq 0 (
    echo ERROR: git commit failed
    pause
    exit /b 1
)

echo Pushing to main...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: git push failed
    pause
    exit /b 1
)

echo.
echo Done! Railway will deploy automatically.
pause
