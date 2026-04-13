@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM One-click start for backend and web (no SQL import, no DB reset)

set "ROOT=%~dp0"
set "BACKEND_PORT=3100"
set "WEB_PORT=3001"
set "BACKEND_WAIT=20"
set "WEB_PORT_WAIT=12"
set "WEB_WAIT=12"
set "BACKEND_OK=1"
set "WEB_OK=1"

echo [1/4] Killing processes on target ports...
call :kill_port %BACKEND_PORT%
call :kill_port %WEB_PORT%
call :kill_port 3002

echo [2/4] Waiting for ports to be released...
call :wait_port_free %BACKEND_PORT% 12
if errorlevel 1 (
    echo [ERROR] Port %BACKEND_PORT% is still occupied.
    goto :end
)
call :wait_port_free %WEB_PORT% 12
if errorlevel 1 (
    echo [ERROR] Port %WEB_PORT% is still occupied.
    goto :end
)
call :wait_port_free 3002 12

echo [3/4] Starting backend and web...
start "backend" cmd /k "cd /d ""%ROOT%backend"" & npm run dev"
start "web" cmd /k "set PORT=%WEB_PORT% & set BROWSER=none & set CI=true & cd /d ""%ROOT%web"" & npm start"

echo [4/4] Verifying service health...
call :wait_http "http://localhost:%BACKEND_PORT%/api/health" %BACKEND_WAIT% "backend"
set "BACKEND_OK=!errorlevel!"
call :wait_port_listen %WEB_PORT% %WEB_PORT_WAIT% "web-port"
if !errorlevel! equ 0 (
    call :wait_http "http://localhost:%WEB_PORT%" %WEB_WAIT% "web"
    set "WEB_OK=!errorlevel!"
) else (
    set "WEB_OK=1"
)

echo =============================
if "%BACKEND_OK%"=="0" (
    echo Backend is up: http://localhost:%BACKEND_PORT%
) else (
    echo Backend startup failed. Check backend window logs.
)
if "%WEB_OK%"=="0" (
    echo Web is up: http://localhost:%WEB_PORT%
) else (
    echo Web is still starting or switched slowly. Check web window logs.
    echo Tip: open http://localhost:%WEB_PORT% after a few seconds.
)
echo Database was not reset.
echo =============================

:end
if "%BACKEND_OK%"=="0" exit /b 0
exit /b 1

:kill_port
set "TARGET_PORT=%~1"
for /f %%i in ('powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort %TARGET_PORT% -State Listen -ErrorAction SilentlyContinue; if ($c) { foreach ($x in $c) { $x.OwningProcess } }"') do (
    echo Found PID %%i on port %TARGET_PORT%, killing...
    taskkill /F /PID %%i >nul 2>nul
)
exit /b 0

:wait_port_free
set "TARGET_PORT=%~1"
set "MAX_WAIT=%~2"
for /l %%t in (1,1,%MAX_WAIT%) do (
    powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %TARGET_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
    if !errorlevel! equ 0 exit /b 0
    timeout /t 1 >nul
)
exit /b 1

:wait_http
set "URL=%~1"
set "MAX_WAIT=%~2"
set "SERVICE_NAME=%~3"
powershell -NoProfile -Command "$url='%URL%'; $max=%MAX_WAIT%; for($i=0; $i -lt $max; $i++){ try { $r=Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 1; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ exit 0 } } catch {} Start-Sleep -Seconds 1 }; exit 1"
if !errorlevel! equ 0 exit /b 0
echo [WARN] %SERVICE_NAME% did not pass check within %MAX_WAIT%s: %URL%
exit /b 1

:wait_port_listen
set "TARGET_PORT=%~1"
set "MAX_WAIT=%~2"
set "SERVICE_NAME=%~3"
powershell -NoProfile -Command "$p=%TARGET_PORT%; $max=%MAX_WAIT%; for($i=0; $i -lt $max; $i++){ if(Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue){ exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if !errorlevel! equ 0 exit /b 0
echo [WARN] %SERVICE_NAME% did not listen on port %TARGET_PORT% within %MAX_WAIT%s.
exit /b 1

 