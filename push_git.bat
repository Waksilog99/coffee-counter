@echo off
echo Adding all files to git staging...
git add .

echo Committing changes...
git commit -m "Fix local network permission prompt: Use relative API paths and proxy configuration"

echo Pushing to origin main...
git push origin main

echo Git push sequence completed.
pause
