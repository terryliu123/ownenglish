#!/bin/bash
set -e

# ============================================================
# OwnEnglish 快速部署脚本（用于已有代码的重新部署）
# 用法：cd /www/wwwroot/ownenglish/deploy/baota && bash quick-deploy.sh
# ============================================================

PROJECT_DIR="/www/wwwroot/ownenglish"
CLIENT_DIR="$PROJECT_DIR/client"
SERVER_DIR="$PROJECT_DIR/server"
VENV_DIR="$SERVER_DIR/venv"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OwnEnglish]${NC} $1"; }
warn() { echo -e "${YELLOW}[Warning]${NC} $1"; }
error() {
    echo -e "${RED}[Error]${NC} $1"
    exit 1
}

if [ "$EUID" -ne 0 ]; then
    error "请使用 root 用户运行此脚本"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    error "项目目录不存在：$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

log "开始快速部署 OwnEnglish..."

# ============================================================
# 1. 检查 .env 配置
# ============================================================
log "检查后端配置..."

if [ ! -f "$SERVER_DIR/.env" ]; then
    if [ -f "$SERVER_DIR/.env.example" ]; then
        cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
        warn "已创建 .env 文件，请编辑配置后再运行此脚本"
        warn "必改项：DATABASE_URL, SECRET_KEY, ALLOWED_ORIGINS, UPLOADS_BASE_DIR"
        exit 1
    else
        error "未找到 .env 或 .env.example 文件"
    fi
fi

# 检查关键配置
if grep -q "change-this-to-a-random-secret-key" "$SERVER_DIR/.env" 2>/dev/null; then
    warn "SECRET_KEY 未修改，请设置为随机密钥"
fi

if ! grep -q "UPLOADS_BASE_DIR" "$SERVER_DIR/.env" 2>/dev/null; then
    warn "未配置 UPLOADS_BASE_DIR，建议添加：UPLOADS_BASE_DIR=$SERVER_DIR"
fi

# ============================================================
# 2. 创建上传目录并设置权限
# ============================================================
log "设置上传目录权限..."

mkdir -p "$SERVER_DIR/uploads/"{audio,images,media,experiments}
chown -R www:www "$SERVER_DIR/uploads"
chmod -R 775 "$SERVER_DIR/uploads"
log "上传目录权限已设置"

# ============================================================
# 3. 安装/更新后端依赖
# ============================================================
log "更新后端依赖..."

if [ ! -f "$VENV_DIR/bin/activate" ]; then
    log "创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel

# 安装关键依赖（避免编译失败）
pip install --only-binary :all: PyYAML==6.0.1 greenlet==3.0.3 asyncpg==0.29.0 2>/dev/null || true

# 安装主依赖
if [ -f "$SERVER_DIR/requirements.txt" ]; then
    pip install -r "$SERVER_DIR/requirements.txt"
else
    pip install fastapi uvicorn[standard] sqlalchemy aiosqlite asyncpg alembic \
        'pydantic>=1.10.0,<2.0' python-jose[cryptography] passlib[bcrypt] \
        python-multipart python-dotenv pydantic-settings email-validator
fi

log "后端依赖更新完成"

# ============================================================
# 4. 构建前端
# ============================================================
log "构建前端..."

cd "$CLIENT_DIR"

# 使用国内镜像加速
npm config set registry https://registry.npmmirror.com

# 清理缓存重新安装
rm -rf node_modules package-lock.json
npm install

# 检查 .env.production
if [ ! -f ".env.production" ]; then
    cat > ".env.production" << EOF
VITE_API_BASE_URL=/api
EOF
    warn "已创建 .env.production，使用相对路径 /api"
fi

npm run build

if [ ! -d "$CLIENT_DIR/dist" ]; then
    error "前端构建失败，未生成 dist 目录"
fi

log "前端构建完成"

# ============================================================
# 5. 重启服务
# ============================================================
log "重启服务..."

# 重启后端
if supervisorctl status ownenglish-backend >/dev/null 2>&1; then
    supervisorctl restart ownenglish-backend
    log "后端已重启"
else
    warn "Supervisor 未配置 ownenglish-backend，请手动配置"
fi

# 重启 Nginx
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log "Nginx 已重启"
else
    warn "Nginx 配置测试失败，请检查配置"
fi

# ============================================================
# 6. 验证部署
# ============================================================
log "验证部署..."

sleep 2

# 检查后端健康
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/v1/health 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    log "后端健康检查通过"
else
    warn "后端健康检查失败 (HTTP $HEALTH_STATUS)"
fi

log "=============================================="
log "部署完成！"
log "=============================================="
echo ""
echo "请检查以下配置是否正确："
echo "  1. Nginx 配置中的 WebSocket 路径：/api/v1/live/ws"
echo "  2. .env 中的 UPLOADS_BASE_DIR：$SERVER_DIR"
echo "  3. 域名 SSL 证书是否配置"
echo ""
echo "访问地址："
echo "  前端：https://你的域名.com"
echo "  API：https://你的域名.com/api/v1/health"
echo ""
