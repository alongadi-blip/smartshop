@echo off
echo Copying smartshop.html to public\index.html...
copy smartshop.html public\index.html

echo.
echo Deploying to Firebase Hosting...
set PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%
firebase deploy --only hosting

echo.
pause
