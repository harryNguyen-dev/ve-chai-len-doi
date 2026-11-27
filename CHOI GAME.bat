@echo off
rem Ve Chai Len Doi - mo game khong can server. Lan dau (chua co dist\index.html) can Node.js de build.
setlocal
cd /d "%~dp0"
if not exist "dist\index.html" (
  where npm >nul 2>nul || (echo Chua co ban build va may chua cai Node.js: https://nodejs.org & pause & exit /b 1)
  if not exist node_modules call npm install
  call npm run build || (pause & exit /b 1)
)
set "GAME=%~dp0dist\index.html"
set "B="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe") do if not defined B if exist %%P set "B=%%~P"
if not defined B (start "" "%GAME%" & exit /b 0)
rem rieng profile + bo qua blocklist + chon card roi: ep trinh duyet ve 3D bang GPU
start "" "%B%" --user-data-dir="%LocalAppData%\ve-chai-len-doi-browser" --ignore-gpu-blocklist --force_high_performance_gpu --enable-gpu-rasterization --no-first-run --no-default-browser-check --start-maximized --app="file:///%GAME:\=/%"
