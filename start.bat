@echo off
title NeoSys Medical Report Generator
cd /d "%~dp0"

echo ====================================================
echo   NeoSys Medicare Local Medical Report Generator
echo   Starting server at http://localhost:1516 ...
echo ====================================================

start "" http://localhost:1516
node server.js
pause
