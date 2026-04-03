#!/bin/bash
# 重新构建前端（在服务器上执行）
set -e

CLIENT_DIR="/www/wwwroot/ownenglish/client"

cd "$CLIENT_DIR"

if ! command -v node &> /dev/null; then
    echo "[Error] 未检测到 Node.js，请先安装 Node 20 LTS"
    exit 1
fi

NODE_MAJOR=$(node -v | grep -oP 'v\K[0-9]+')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "[Error] Node.js 版本过低（当前 $(node -v)），请先升级到 Node 18+"
    exit 1
fi

echo "[OwnEnglish] 设置 npm 镜像..."
npm config set registry https://registry.npmmirror.com

echo "[OwnEnglish] 清理旧依赖..."
rm -rf node_modules package-lock.json .npm-cache 2> /dev/null || true

echo "[OwnEnglish] 安装前端依赖..."
npm install

echo "[OwnEnglish] 构建生产包..."
npm run build

echo "[OwnEnglish] 前端构建完成，输出目录：$CLIENT_DIR/dist"
