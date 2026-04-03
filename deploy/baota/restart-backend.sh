#!/bin/bash
# 重启 OwnEnglish 后端服务（适用于宝塔 Supervisor 或手动运行）

SERVER_DIR="/www/wwwroot/ownenglish/server"
VENV_DIR="$SERVER_DIR/venv"

if [ ! -d "$SERVER_DIR" ]; then
    echo "[Error] 后端目录不存在：$SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"
source "$VENV_DIR/bin/activate"

echo "[OwnEnglish] 查找占用 8000 端口的进程..."
PID=$(lsof -t -i:8000 2> /dev/null || ss -ltnp 2> /dev/null | grep ':8000' | awk '{print $NF}' | cut -d',' -f2 | cut -d'=' -f2 | head -n1 || true)

if [ -n "$PID" ]; then
    echo "[OwnEnglish] 杀死旧进程：$PID"
    kill -9 "$PID" 2> /dev/null || true
    sleep 1
else
    echo "[OwnEnglish] 端口 8000 未被占用"
fi

echo "[OwnEnglish] 启动后端服务..."
nohup "$VENV_DIR/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --workers 2 > "$SERVER_DIR/server.log" 2>&1 &

sleep 2

if curl -sf http://127.0.0.1:8000/api/v1/health > /dev/null; then
    echo "[OwnEnglish] 后端启动成功"
else
    echo "[OwnEnglish] 后端可能未启动，请检查日志：$SERVER_DIR/server.log"
fi

echo "[OwnEnglish] 日志：$SERVER_DIR/server.log"
echo "[OwnEnglish] 健康检查：curl http://127.0.0.1:8000/api/v1/health"
