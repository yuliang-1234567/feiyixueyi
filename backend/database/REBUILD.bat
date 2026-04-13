@echo off
echo ========================================
echo 数据库重建脚本
echo ========================================
echo.
echo 警告：此操作将删除现有数据库并重新创建！
echo 请确保已备份重要数据！
echo.
pause

cd /d %~dp0

echo 正在重建数据库...
echo.

mysql -u root -p123456 < rebuild_database.sql

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo 数据库重建完成！
    echo ========================================
    echo.
    echo 下一步：重启后端服务器
    echo cd ..\..
    echo cd backend
    echo npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo 重建失败，请检查错误信息
    echo ========================================
    pause
    exit /b 1
)

pause

