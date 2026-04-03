#!/bin/bash
set -e

# ============================================================
# OwnEnglish 宝塔面板一键部署脚本
# 运行环境：Linux (CentOS 7+/Ubuntu/Debian) + 宝塔面板
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
    error "项目目录不存在：$PROJECT_DIR，请先上传代码"
fi

cd "$PROJECT_DIR"

log "开始部署 OwnEnglish..."

# ============================================================
# 1. 后端 Python 环境
# ============================================================
log "步骤 1/5：安装后端 Python 环境..."

if ! command -v python3 &> /dev/null; then
    error "未找到 python3，请先安装 Python 3.10+"
fi

PYTHON_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
PYTHON_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]; }; then
    error "Python 版本过低（$(python3 --version)），需要 3.10 或更高版本"
fi

if [ ! -f "$VENV_DIR/bin/activate" ]; then
    log "创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR" 2>/dev/null || true
    if [ ! -f "$VENV_DIR/bin/activate" ]; then
        warn "python3 -m venv 失败，尝试安装 python3-virtualenv..."
        if command -v apt-get &> /dev/null; then
            apt-get update -qq && apt-get install -y -qq python3-venv python3-pip
        elif command -v yum &> /dev/null; then
            yum install -y python3-virtualenv python3-pip
        elif command -v dnf &> /dev/null; then
            dnf install -y python3-virtualenv python3-pip
        fi
        python3 -m venv "$VENV_DIR" || error "创建虚拟环境失败，请手动安装 python3-virtualenv 后重试"
    fi
    log "虚拟环境已创建：$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip setuptools wheel

# 先安装带预编译 wheel 的关键包，避免旧系统 GCC 编译失败
log "安装预编译依赖（跳过源码编译）..."
pip install --only-binary :all: PyYAML==6.0.1 greenlet==3.0.3 asyncpg==0.29.0 2>/dev/null || \
    warn "预编译包安装可能有警告，继续尝试常规安装..."

# 再安装完整 requirements
if [ -f "$SERVER_DIR/requirements.txt" ]; then
    log "安装 requirements.txt ..."
    pip install -r "$SERVER_DIR/requirements.txt"
else
    warn "未找到 requirements.txt，使用默认依赖"
    pip install fastapi uvicorn[standard] sqlalchemy aiosqlite greenlet==3.0.3 asyncpg==0.29.0 alembic 'pydantic>=1.10.0,<2.0' python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv
fi

pip install pydantic-settings || true
log "后端依赖安装完成"

# ============================================================
# 2. 上传目录
# ============================================================
log "步骤 2/5：创建上传目录..."
mkdir -p "$SERVER_DIR/uploads/"{audio,images,media,experiments}
chown -R www:www "$SERVER_DIR/uploads"
chmod -R 775 "$SERVER_DIR/uploads"

# ============================================================
# 3. 前端构建
# ============================================================
log "步骤 3/5：安装前端依赖并构建..."

if ! command -v node &> /dev/null; then
    error "未检测到 Node.js。请在宝塔【软件商店】安装 Node.js 20 LTS，或通过以下命令手动安装：\n  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -\n  yum install -y nodejs"
fi

NODE_MAJOR=$(node -v | grep -oP 'v\K[0-9]+')
if [ "$NODE_MAJOR" -lt 18 ]; then
    error "Node.js 版本过低（当前 $(node -v)），必须升级到 Node 18+。升级命令：\n  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -\n  yum install -y nodejs"
fi

cd "$CLIENT_DIR"

# 强制使用可靠镜像并清理旧缓存
npm config set registry https://registry.npmmirror.com
rm -rf node_modules package-lock.json .npm-cache 2>/dev/null || true

npm install
npm run build

if [ ! -d "$CLIENT_DIR/dist" ]; then
    error "前端构建失败，未生成 dist 目录"
fi

log "前端构建完成：$CLIENT_DIR/dist"

# ============================================================
# 4. 环境变量
# ============================================================
log "步骤 4/5：检查环境变量配置..."

SERVER_ENV="$SERVER_DIR/.env"
if [ ! -f "$SERVER_ENV" ]; then
    cat > "$SERVER_ENV" << 'EOF'
# =================== OwnEnglish 后端配置 ===================
APP_NAME=OwnEnglish
APP_VERSION=0.1.0

# 数据库（请改为你的 PostgreSQL 配置）
# DATABASE_URL=postgresql+asyncpg://用户名:密码@127.0.0.1:5432/ownenglish
# 如果没有 PostgreSQL，可临时使用 SQLite（不推荐生产环境）：
# DATABASE_URL=sqlite+aiosqlite:///./ownenglish.db

# JWT 密钥（请务必修改为随机强密码）
SECRET_KEY=change-this-to-a-random-secret-key-32chars
ACCESS_TOKEN_EXPIRE_MINUTES=120

# CORS 允许域名（多个用逗号分隔）
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000

# 微信支付配置（可选）
WECHAT_MCHID=
WECHAT_APIV3_KEY=
WECHAT_APPID=
WECHAT_APIV3_CERT_SERIAL_NO=
WECHAT_APIV3_PRIVATE_KEY_PATH=
NOTIFY_URL=
EOF
    warn "已生成默认后端环境变量：$SERVER_ENV"
    warn "⚠️ 请务必编辑该文件，修改数据库连接和 SECRET_KEY 后再启动服务！"
else
    log "后端 .env 已存在，跳过"
fi

CLIENT_ENV="$CLIENT_DIR/.env.production"
if [ ! -f "$CLIENT_ENV" ]; then
    cat > "$CLIENT_ENV" << 'EOF'
VITE_API_BASE_URL=/api
VITE_WS_URL=wss://your-domain.com
EOF
    warn "已生成默认前端环境变量：$CLIENT_ENV"
    warn "⚠️ 请修改 VITE_WS_URL 为你的域名后重新执行 npm run build"
else
    log "前端 .env.production 已存在，跳过"
fi

# ============================================================
# 5. Nginx + Supervisor 配置模板
# ============================================================
log "步骤 5/5：生成 Nginx / Supervisor 配置模板..."

mkdir -p "$PROJECT_DIR/deploy/baota/output"

SUPERVISOR_CONF="$PROJECT_DIR/deploy/baota/output/supervisor-ownenglish.ini"
cat > "$SUPERVISOR_CONF" << EOF
[program:ownenglish-backend]
command=$VENV_DIR/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
directory=$SERVER_DIR
user=www
autostart=true
autorestart=true
startsecs=3
startretries=3
stderr_logfile=/www/wwwlogs/supervisor/ownenglish-backend.err.log
stdout_logfile=/www/wwwlogs/supervisor/ownenglish-backend.out.log
environment=PATH="$VENV_DIR/bin:%(ENV_PATH)s"
EOF

NGINX_CONF="$PROJECT_DIR/deploy/baota/output/nginx-ownenglish.conf"
cat > "$NGINX_CONF" << 'EOF'
# 在宝塔站点配置的 server {} 块内添加以下内容

# API 反向代理
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket 反向代理 - 路径必须与后端端点 /api/v1/live/ws 匹配
location /api/v1/live/ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}

# 上传文件访问
location /uploads {
    alias /www/wwwroot/ownenglish/server/uploads;
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# SPA 刷新支持 - 防止前端路由 404
location / {
    try_files $uri $uri/ /index.html;
}
EOF

chown -R www:www "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod -R 775 "$SERVER_DIR/uploads"

log "=============================================="
log "部署准备完成！"
log "=============================================="
echo ""
echo "后续步骤："
echo "  1. 宝塔面板 -> 数据库 -> 创建 PostgreSQL 数据库"
echo "  2. 编辑 $SERVER_ENV 填写数据库连接和 SECRET_KEY"
echo "  3. 编辑 $CLIENT_ENV 填写生产域名，重新 npm run build"
echo "  4. 宝塔 -> 网站 -> 添加站点，根目录：$CLIENT_DIR/dist"
echo "  5. 站点 Nginx 配置中引入：$NGINX_CONF 的内容"
echo "  6. Supervisor 添加进程，配置文件参考：$SUPERVISOR_CONF"
echo ""
echo "完整图文教程：$PROJECT_DIR/deploy/baota/DEPLOY.md"
echo ""
