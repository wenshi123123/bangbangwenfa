@echo off
cd /d "d:\帮帮问法网站项目文件包"

echo ========================================
echo   帮帮问法 - CloudBase 云托管部署
echo ========================================
echo.
echo 正在部署服务: bangbangwenfa
echo 环境ID: bangbangwenfa-d4g7q7yei6a3b2970
echo 端口: 3000
echo.

tcb cloudrun deploy --serviceName bangbangwenfa --envId bangbangwenfa-d4g7q7yei6a3b2970 --source . --port 3000 --force

echo.
echo ========================================
echo 部署完成！请检查上方输出确认结果。
echo ========================================
pause