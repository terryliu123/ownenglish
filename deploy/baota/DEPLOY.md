# OwnEnglish 宝塔面板一键部署指南（CentOS 7+ / Alibaba Cloud）

## 目录

1. [环境要求](#一环境要求)
2. [宝塔基础软件安装](#二十宝塔基础软件安装)
3. [上传代码](#三上传代码)
4. [一键部署脚本](#四一键部署脚本)
5. [数据库与后端配置](#五数据库与后端配置)
6. [前端构建与域名配置](#六前端构建与域名配置)
7. [宝塔站点与 Nginx 配置](#七宝塔站点与-nginx-配置)
8. [Supervisor 启动后端](#八supervisor-启动后端)
9. [验证部署](#九验证部署)
10. [常见问题排查](#十常见问题排查)
11. [维护命令速查](#十一维护命令速查)

---

## 一、环境要求

- **系统**：CentOS 7.9+ / Ubuntu 20.04+ / Debian 11+（本手册以 CentOS 7 / 阿里云为例）
- **CPU**：2 核+
- **内存**：4 GB+
- **磁盘**：40 GB+
- **域名**：建议准备一个已备案域名（如 `ownenglish.example.com`）
- **Python**：3.10 或更高版本（脚本会自动检查）
- **Node.js**：18+（强烈建议 **Node 20 LTS**）

### 需要开放的端口（阿里云安全组 + 宝塔防火墙）

| 端口 | 用途 |
|------|------|
| 22   | SSH |
| 80   | HTTP |
| 443  | HTTPS |
| 8000 | 后端 API（仅本机访问，可不对外暴露） |

---

## 二、（必做）宝塔基础软件安装

登录宝塔面板 → 软件商店，安装以下运行环境：

1. **Nginx**（推荐 1.24+）
2. **PostgreSQL**（推荐 14+）
3. **Supervisor 管理器**（推荐 2.x）
4. **Node.js 版本管理器**（安装 **Node 20 LTS**）

> 如果系统里自带的 `node` 版本还是 14，请**手动升级**，见【常见问题】里的 Node 升级说明。

---

## 三、上传代码

将项目代码打包上传到服务器固定路径：

```
/www/wwwroot/ownenglish
```

确保目录结构如下：

```
/www/wwwroot/ownenglish/
├── client/
├── server/
├── deploy/
│   └── baota/
│       ├── install.sh
│       ├── build-client.sh
│       ├── restart-backend.sh
│       └── DEPLOY.md
```

---

## 四、一键部署脚本

使用 `root` 用户登录服务器，执行以下命令：

```bash
cd /www/wwwroot/ownenglish/deploy/baota
bash install.sh
```

`install.sh` 会自动完成：

1. 检查 Python 3.10+ 并创建虚拟环境 `server/venv`
2. **优先使用预编译 wheel 安装** `PyYAML`、`greenlet`、`asyncpg`（避免旧系统 GCC 编译失败）
3. 安装 `requirements.txt` 中的其他后端依赖
4. 创建上传目录 `server/uploads`
5. 检查 Node.js 版本，清空旧缓存，重新 `npm install` + `npm run build`
6. 生成默认 `.env` 和 `.env.production`
7. 生成 Nginx 和 Supervisor 配置模板到 `deploy/baota/output/`

### 4.2 快速重新部署（代码更新后）

如果已有 `.env` 配置，只需重新构建和部署：

```bash
cd /www/wwwroot/ownenglish/deploy/baota
bash quick-deploy.sh
```

此脚本会：
- 检查并提示必要的配置
- 自动设置上传目录权限
- 更新后端依赖
- 重新构建前端
- 重启 Supervisor 和 Nginx

---

## 五、数据库与后端配置

### 5.1 创建 PostgreSQL 数据库

宝塔面板 → 数据库 → 添加数据库：

- 数据库名：`ownenglish`
- 用户名：`ownenglish`
- 密码：随机生成或自定义（请牢记）

### 5.2 编辑后端 .env

编辑文件：

```bash
vi /www/wwwroot/ownenglish/server/.env
```

修改以下配置项（务必替换密码）：

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://ownenglish:你的密码@127.0.0.1:5432/ownenglish

# JWT 密钥（必须改成随机强密码）
SECRET_KEY=your-super-secret-key-change-this

# 允许的前端域名（生产环境）
ALLOWED_ORIGINS=https://ownenglish.example.com

# 微信支付（如启用）
WECHAT_MCHID=
WECHAT_APIV3_KEY=
WECHAT_APPID=
WECHAT_APIV3_CERT_SERIAL_NO=
WECHAT_APIV3_PRIVATE_KEY_PATH=
NOTIFY_URL=https://ownenglish.example.com/api/v1/membership/notify
```

---

## 六、前端构建与域名配置

### 6.1 编辑前端 .env.production

```bash
vi /www/wwwroot/ownenglish/client/.env.production
```

内容示例：

```env
VITE_API_BASE_URL=https://ownenglish.example.com/api
```

> **注意**：WebSocket URL 已由代码自动根据页面协议推断（HTTPS 使用 wss://，HTTP 使用 ws://），无需配置 `VITE_WS_URL`。

### 6.2 重新构建前端

修改完域名后必须重新构建：

```bash
cd /www/wwwroot/ownenglish/client
npm run build
```

> 如果构建报错，请确认 Node 版本是 20，且 npm 源不是旧淘宝源。可直接运行 `./deploy/baota/build-client.sh`。

---

## 七、宝塔站点与 Nginx 配置

### 7.1 添加站点

宝塔 → 网站 → 添加站点：

- **域名**：`ownenglish.example.com`
- **根目录**：`/www/wwwroot/ownenglish/client/dist`
- **PHP 版本**：纯静态

### 7.2 配置 SSL（强烈建议）

站点设置 → SSL → Let's Encrypt → 申请免费证书 → 开启 **强制 HTTPS**。

### 7.3 Nginx 反向代理

站点设置 → 配置文件，在 `server { ... }` 块内**添加**以下内容：

```nginx
# API 反向代理
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket 反向代理 - 路径必须与后端端点匹配
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
```

保存后，**重启 Nginx**。

---

## 八、Supervisor 启动后端

宝塔 → 软件商店 → Supervisor 管理器 → 添加守护进程：

| 配置项 | 值 |
|--------|-----|
| 名称 | `ownenglish-backend` |
| 启动用户 | `www` |
| 运行目录 | `/www/wwwroot/ownenglish/server` |
| 启动命令 | `/www/wwwroot/ownenglish/server/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2` |

点击确定，状态变为 **运行中** 即表示启动成功。

> 首次启动时，FastAPI lifespan 会自动调用 `init_db()` 创建所有数据表。

---

## 九、验证部署

1. 浏览器打开 `https://ownenglish.example.com`，确认首页正常显示。
2. 打开 `https://ownenglish.example.com/api/v1/health`，应返回：
   ```json
   {"status":"healthy"}
   ```
3. 注册/登录测试是否正常。
4. 进入课堂 → Chrome F12 → Network → WS，确认 WebSocket `/api/v1/live/ws` 连接成功。

---

## 十、常见问题排查

### Q1. 提示 "Node.js 版本过低" 或 npm 安装报错 `CERT_HAS_EXPIRED`

**原因**：系统自带 Node 14，且旧淘宝镜像 `registry.npm.taobao.org` 证书已过期。

**解决**：手动升级到 Node 20，并切换 npm 源。

```bash
# 升级 Node 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 验证
node -v   # 应显示 v20.x.x

# 切换镜像
npm config set registry https://registry.npmmirror.com

# 重新构建前端
cd /www/wwwroot/ownenglish/client
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Q2. `install.sh` 报错：`python3-venv: No such file or directory`

**原因**：CentOS 默认没有 `python3-venv` 模块。

**解决**：

```bash
yum install -y python3-virtualenv python3-pip
rm -rf /www/wwwroot/ownenglish/server/venv
cd /www/wwwroot/ownenglish/deploy/baota
bash install.sh
```

---

### Q3. `Failed building wheel for greenlet` 或 `asyncpg`

**原因**：CentOS 7 默认 GCC 4.8.5 版本太老，无法编译新版 C 扩展。

**解决**：新版 `install.sh` 已优先安装预编译 wheel。如果是旧版本脚本，请直接执行：

```bash
source /www/wwwroot/ownenglish/server/venv/bin/activate
python -m pip install --upgrade pip setuptools wheel

# 强制只安装二进制包
pip install --only-binary :all: PyYAML==6.0.1 greenlet==3.0.3 asyncpg==0.29.0

# 然后手动安装其余依赖
pip install fastapi uvicorn[standard] sqlalchemy aiosqlite alembic 'pydantic>=1.10.0,<2.0' python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv pydantic-settings
```

---

### Q4. 前端页面空白或 404

**排查步骤**：

1. 检查 Nginx 站点根目录是否指向 `/www/wwwroot/ownenglish/client/dist`
2. 确认 `dist` 目录存在且非空：`ls -la /www/wwwroot/ownenglish/client/dist`
3. 如果不存在，重新执行 `npm run build`

---

### Q5. API 返回 502 Bad Gateway

**排查步骤**：

1. 检查后端是否启动：`curl http://127.0.0.1:8000/api/v1/health`
2. 检查 Nginx 配置文件里的 `location /api` 是否已添加并保存
3. 检查 Supervisor 日志：
   ```bash
   tail -f /www/wwwlogs/supervisor/ownenglish-backend.err.log
   ```

---

### Q6. WebSocket 连接失败

**原因 1**：Nginx 配置的 WebSocket 路径与后端端点不匹配。

**解决**：Nginx 必须配置 `/api/v1/live/ws` 路径（不是 `/ws`）：

```nginx
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
```

**原因 2**：HTTPS 页面尝试使用 `ws://` 连接（浏览器安全策略禁止）。

**解决**：前端代码已自动处理，会根据 `window.location.protocol` 自动选择 `wss:` 或 `ws:`。如需手动配置，确保使用正确协议：
- HTTPS 站点 → `wss://your-domain.com`
- HTTP 站点 → `ws://your-domain.com`

---

### Q7. 上传图片/音频失败或 404

**原因 1**：`uploads` 目录权限不足。

**解决**：

```bash
chown -R www:www /www/wwwroot/ownenglish/server/uploads
chmod -R 775 /www/wwwroot/ownenglish/server/uploads
```

**原因 2**：后端工作目录导致的上传路径问题。

**解决**：在 `.env` 中添加绝对路径配置：

```env
UPLOADS_BASE_DIR=/www/wwwroot/ownenglish/server
```

然后重启后端。

**原因 3**：图片已上传但访问返回 404。

**排查**：
```bash
# 检查图片是否存在
ls -la /www/wwwroot/ownenglish/server/uploads/images/

# 检查 Nginx 配置
location /uploads {
    alias /www/wwwroot/ownenglish/server/uploads;
    expires 7d;
}
```

---

### Q8. 前端页面刷新 404

**原因**：单页应用（SPA）路由问题，Nginx 尝试查找文件路径而非返回 index.html。

**解决**：在 Nginx 配置 `server { ... }` 块中添加：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

### Q9. 数据库连接失败

**原因**：`.env` 里 `DATABASE_URL` 错误，或 PostgreSQL 未启动/未允许本地连接。

**排查**：

```bash
# 检查 PostgreSQL 是否运行
systemctl status postgresql-14

# 测试连接
psql -h 127.0.0.1 -U ownenglish -d ownenglish
```

宝塔创建的数据库默认允许本地连接。如果仍失败，检查 `.env` 中的密码和端口是否正确。

---

## 十一、维护命令速查

### 重启后端

```bash
supervisorctl restart ownenglish-backend
```

或手动：

```bash
cd /www/wwwroot/ownenglish/deploy/baota
bash restart-backend.sh
```

### 重新构建前端

```bash
cd /www/wwwroot/ownenglish/deploy/baota
bash build-client.sh
```

### 查看后端日志

```bash
tail -f /www/wwwlogs/supervisor/ownenglish-backend.out.log
tail -f /www/wwwroot/ownenglish/server/server.log
```

### 手动初始化数据库（建表）

仅在需要手动确认时执行：

```bash
cd /www/wwwroot/ownenglish/server
source venv/bin/activate
python -c "from app.db.session import init_db; import asyncio; asyncio.run(init_db())"
```

### 备份数据库

```bash
pg_dump -U ownenglish ownenglish > /www/backup/ownenglish_$(date +%F).sql
```

---

## 文件路径速查

| 用途 | 路径 |
|------|------|
| 项目根目录 | `/www/wwwroot/ownenglish` |
| 前端站点根目录 | `/www/wwwroot/ownenglish/client/dist` |
| 后端代码目录 | `/www/wwwroot/ownenglish/server` |
| 后端虚拟环境 | `/www/wwwroot/ownenglish/server/venv` |
| 上传文件目录 | `/www/wwwroot/ownenglish/server/uploads` |
| 后端环境变量 | `/www/wwwroot/ownenglish/server/.env` |
| 前端环境变量 | `/www/wwwroot/ownenglish/client/.env.production` |
| Nginx 配置模板 | `/www/wwwroot/ownenglish/deploy/baota/output/nginx-ownenglish.conf` |
| Supervisor 配置模板 | `/www/wwwroot/ownenglish/deploy/baota/output/supervisor-ownenglish.ini` |
| Nginx 站点配置 | `/www/server/panel/vhost/nginx/ownenglish.example.com.conf` |
| Supervisor 日志 | `/www/wwwlogs/supervisor/ownenglish-backend.*.log` |

---

## 附：部署检查清单

首次部署建议使用检查清单逐项核对，确保一次成功。

> 查看 `deploy/baota/DEPLOY_CHECKLIST.md` 获取完整检查清单。
