# OwnEnglish 部署检查清单

> 部署前逐项检查，确保一次部署成功

---

## 一、服务器环境准备

- [ ] 系统：CentOS 7.9+ / Ubuntu 20.04+
- [ ] 宝塔面板已安装
- [ ] 软件商店已安装：Nginx 1.24+、PostgreSQL 14+、Supervisor 2.x、Node.js 20 LTS
- [ ] 安全组已开放：80、443、22 端口（8000 不需要对外开放）
- [ ] 域名已解析到服务器 IP

---

## 二、代码上传

- [ ] 项目上传到 `/www/wwwroot/ownenglish`
- [ ] 目录结构正确：
  ```
  /www/wwwroot/ownenglish/
  ├── client/
  ├── server/
  └── deploy/
  ```

---

## 三、后端配置

### 3.1 数据库
- [ ] 宝塔面板创建 PostgreSQL 数据库
- [ ] 数据库名：`ownenglish`
- [ ] 用户名：`ownenglish`
- [ ] 密码：已记录

### 3.2 .env 文件
编辑 `/www/wwwroot/ownenglish/server/.env`：

```env
# 必改项
DATABASE_URL=postgresql+asyncpg://ownenglish:你的密码@127.0.0.1:5432/ownenglish
SECRET_KEY=使用随机生成的32位以上密钥
ALLOWED_ORIGINS=https://你的域名.com
UPLOADS_BASE_DIR=/www/wwwroot/ownenglish/server

# 可选：微信支付
WECHAT_PAY_NOTIFY_URL=https://你的域名.com/api/v1/membership/notify
```

---

## 四、前端配置

编辑 `/www/wwwroot/ownenglish/client/.env.production`：

```env
VITE_API_BASE_URL=https://你的域名.com/api
```

> 注意：不需要配置 `VITE_WS_URL`，代码已自动根据协议选择 wss:// 或 ws://

---

## 五、Nginx 配置（关键）

在宝塔站点配置文件 `server { ... }` 块内添加：

```nginx
# API 反向代理
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# WebSocket 反向代理 - 路径必须是 /api/v1/live/ws
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

# SPA 刷新支持
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 六、目录权限

```bash
chown -R www:www /www/wwwroot/ownenglish/server/uploads
chmod -R 775 /www/wwwroot/ownenglish/server/uploads
```

---

## 七、Supervisor 配置

| 配置项 | 值 |
|--------|-----|
| 名称 | `ownenglish-backend` |
| 启动用户 | `www` |
| 运行目录 | `/www/wwwroot/ownenglish/server` |
| 启动命令 | `/www/wwwroot/ownenglish/server/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2` |

---

## 八、构建部署

```bash
# 1. 安装后端依赖
cd /www/wwwroot/ownenglish/server
source venv/bin/activate
pip install -r requirements.txt

# 2. 构建前端
cd /www/wwwroot/ownenglish/client
npm install
npm run build

# 3. 重启后端
supervisorctl restart ownenglish-backend

# 4. 重启 Nginx
nginx -t && systemctl reload nginx
```

---

## 九、验证测试

- [ ] 首页 `https://你的域名.com` 正常显示
- [ ] API 健康检查 `https://你的域名.com/api/v1/health` 返回 `{"status":"healthy"}`
- [ ] 注册/登录功能正常
- [ ] 教师创建课堂正常
- [ ] 学生加入课堂正常
- [ ] WebSocket 连接正常（F12 → Network → WS）
- [ ] 图片上传正常
- [ ] 音频上传正常
- [ ] 页面刷新不 404

---

## 十、常见问题速查

### WebSocket 连接失败
1. 检查 Nginx 配置路径是否为 `/api/v1/live/ws`
2. 检查 HTTPS 站点是否使用 `wss://`

### 图片上传 404
1. 检查 `UPLOADS_BASE_DIR` 是否配置正确
2. 检查目录权限是否为 `www:www 775`

### 502 Bad Gateway
1. 检查后端是否运行：`supervisorctl status ownenglish-backend`
2. 检查端口监听：`ss -tlnp | grep 8000`
3. 查看错误日志：`tail -f /www/wwwlogs/supervisor/ownenglish-backend.err.log`

### 页面刷新 404
确保 Nginx 配置了 `try_files $uri $uri/ /index.html;`
