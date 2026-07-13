@echo off
cd /d "%~dp0community-marketplace"

echo Switching to dev/sarayut...
git checkout dev/sarayut

echo Pulling latest main into dev/sarayut...
git fetch origin main

echo Merging main (keep our version of index.ts)...
git merge origin/main --no-edit

if %errorlevel% neq 0 (
    echo Conflict detected - taking our version of index.ts...
    git checkout --ours apps/api/src/index.ts
    git add apps/api/src/index.ts
    git commit --no-edit
)

echo Pushing to dev/sarayut...
git push origin dev/sarayut

echo.
echo Done! PR conflict resolved. Go back to GitHub and merge the PR.
pause
