# 数字化教具开发规格 v1

## 1. 目标

本规格对应数字化教具库第一版实现，范围固定为：

1. 私有存储的 HTML 教具资源
2. 基于固定目录和固定 Manifest 的手工接入
3. `TeachingAid` 和 `TeachingAidSession` 两个模型
4. 管理后台列表、详情、状态切换、Manifest 同步
5. 教师白板侧按分类浏览、搜索、最近使用、打开教具
6. 登录后受控访问入口 HTML 及其全部子资源

第一版明确不做：

1. 上传 ZIP
2. 后台导入器页面
3. AI 生成教具
4. 教具复杂分析报表
5. 学生端直接使用教具

## 2. 固定目录结构

所有教具资源统一放在：

```text
server/storage/teaching-aids/
  assets/
    <category>/<slug>/
      index.html
      cover.png
      diagram.png
      assets/...
  manifests/
    teaching-aids.json
```

约束：

1. 每个教具一个目录
2. 目录按 `分类 / slug` 两层组织
3. 入口文件固定为 `index.html`
4. 教具内部必须使用相对路径引用资源
5. 不允许跨分类目录引用资源
6. 不允许跨教具目录引用资源
7. 不能放到前端静态目录、`uploads/` 或 nginx 公网目录

## 3. 分类规则

分类是主字段，不是附加标签。

标准分类编码：

1. `physics`
2. `chemistry`
3. `biology`
4. `earth_science`
5. `general_science`
6. `mathematics`
7. `other`

要求：

1. 每个教具必须有一个主分类
2. Manifest 使用标准分类编码
3. 后端保存：
   - `category_code`
   - `category_label`
4. `tags` 只做补充检索，不替代分类

## 4. Manifest 规范

文件位置：

`server/storage/teaching-aids/manifests/teaching-aids.json`

顶层结构：

```json
{
  "schema_version": 1,
  "base_path": "server/storage/teaching-aids/assets",
  "categories": [
    { "code": "physics", "label": "物理" },
    { "code": "chemistry", "label": "化学" }
  ],
  "items": []
}
```

`items[]` 固定字段：

1. `name`
2. `slug`
3. `category`
4. `summary`
5. `cover_image`
6. `diagram_image`
7. `html_entry`
8. `source_filename`
9. `tags`

示例：

```json
{
  "name": "欧姆定律演示器",
  "slug": "ohms-law-demo",
  "category": "physics",
  "summary": "用于演示电压、电流、电阻关系的数字化教具。",
  "cover_image": "physics/ohms-law-demo/cover.png",
  "diagram_image": "physics/ohms-law-demo/diagram.png",
  "html_entry": "physics/ohms-law-demo/index.html",
  "source_filename": "ohms-law-demo.zip",
  "tags": ["电学", "欧姆定律", "实验"]
}
```

严格校验规则：

1. `slug` 全库唯一
2. `slug` 只能使用小写字母、数字、连字符
3. `category` 必填
4. `name` 必填
5. `html_entry` 必须严格等于 `<category>/<slug>/index.html`
6. `cover_image`、`diagram_image` 如填写，必须位于当前教具目录内
7. 入口文件必须存在
8. 不允许路径越界

## 5. 后端模型

### 5.1 TeachingAid

建议字段：

```python
id: UUID
name: str
slug: str
category_code: str
category_label: str
summary: str | None
cover_image_url: str | None
diagram_image_url: str | None
entry_file: str
storage_path: str
source_filename: str | None
status: str
tags: list[str]
source_type: str
created_at: datetime
updated_at: datetime
```

枚举口径：

- `status`: `draft | active | archived`
- `source_type`: 第一版固定 `batch_import`

### 5.2 TeachingAidSession

建议字段：

```python
id: UUID
teaching_aid_id: UUID
user_id: UUID
session_token: str
expires_at: datetime
last_accessed_at: datetime | None
created_at: datetime
```

用途：

1. 记录某次教具访问会话
2. 保护入口 HTML 和其 JS/CSS/图片等子资源
3. 支持最近使用记录

## 6. 接口规格

### 6.1 管理后台

1. `GET /api/v1/teaching-aids`
2. `GET /api/v1/teaching-aids/{aid_id}`
3. `PUT /api/v1/teaching-aids/{aid_id}`
4. `PUT /api/v1/teaching-aids/{aid_id}/status`
5. `POST /api/v1/teaching-aids/status/batch`
6. `POST /api/v1/teaching-aids/sync-manifest`

### 6.2 教师白板

1. `GET /api/v1/teaching-aids/library`
2. `GET /api/v1/teaching-aids/library/recent`
3. `GET /api/v1/teaching-aids/categories`
4. `POST /api/v1/teaching-aids/{aid_id}/launch`

### 6.3 受控资源访问

`GET /api/v1/teaching-aids/session/{session_id}/{path:path}`

必须校验：

1. session 存在
2. session 未过期
3. 当前用户有权限
4. 访问路径位于当前教具目录内
5. 阻止 `..` 路径穿越

### 6.4 Manifest 同步

`POST /api/v1/teaching-aids/sync-manifest`

处理口径：

1. 读取固定文件 `server/storage/teaching-aids/manifests/teaching-aids.json`
2. 以 `slug` 为 upsert 主键
3. 只新增 / 更新，不自动删除缺失项
4. 返回同步报告：
   - `created`
   - `updated`
   - `errors`
   - `missing_existing`

### 6.5 批量状态切换

`POST /api/v1/teaching-aids/status/batch`

典型 payload：

```json
{
  "ids": ["aid-1", "aid-2"],
  "status": "active"
}
```

## 7. 前端页面规格

### 7.1 管理后台列表页

页面结构：

1. 顶部搜索
2. 分类筛选
3. 状态筛选
4. 批量状态操作区
5. Manifest 同步按钮
6. 同步结果区
7. 教具列表

列表字段：

1. 名称
2. 分类
3. 状态
4. 最近更新时间
5. 预览入口

列表操作：

1. 勾选
2. 查看详情
3. 启动预览
4. 单条状态切换

### 7.2 管理后台详情页

支持：

1. 查看基础信息
2. 修改名称
3. 修改分类
4. 修改简介
5. 查看封面图、系统图、入口文件
6. 预览启动

### 7.3 同步结果区

需要展示：

1. 新增数
2. 更新数
3. 错误条目
4. Manifest 中缺失但系统已存在的条目
5. 复制报告
6. 下载 JSON 报告

### 7.4 白板教具库

教师侧只从白板进入。

页面能力：

1. 按分类浏览
2. 搜索
3. 最近使用
4. 预览信息
5. 点击打开
6. 失败重试
7. 空筛选状态提示

## 8. 教师使用流程

1. 进入白板
2. 点击“数字化教具”
3. 优先查看最近使用
4. 按分类浏览或关键词搜索
5. 查看简介、系统图和资源信息
6. 点击“打开教具”
7. 在白板中通过受控会话地址加载教具

## 9. 测试与验收

### 9.1 Manifest 与目录

1. 合法条目可新增或更新
2. 分类缺失、入口不存在、路径越界会报错并跳过
3. 每个教具入口为 `index.html`
4. 子资源全部通过相对路径加载
5. 不存在跨目录依赖

### 9.2 管理后台

1. 列表加载正确
2. 分类筛选正确
3. 搜索正确
4. 详情编辑正确
5. 单条状态切换正确
6. 批量状态切换正确
7. 同步报告复制正确
8. 同步报告下载正确
9. 预览可打开

### 9.3 白板

1. 分类浏览正确
2. 搜索正确
3. 最近使用正确
4. 打开教具后 iframe 正常显示
5. JS/CSS/图片完整加载
6. 失败重试提示正确
7. 空筛选状态正确

### 9.4 安全

1. 未登录不能 `launch`
2. 未登录不能直接访问 session 地址
3. 过期 session 失效
4. 只能访问当前 session 对应目录
5. 阻止路径穿越
6. 不能通过真实静态路径直接访问教具

## 10. 下一步边界

第一版完成后，下一步只允许扩：

1. 更丰富的后台筛选与排序
2. 更好的教具运营能力
3. AI 生成教具接入同一模型

第一版之后仍不建议直接加：

1. 上传 ZIP
2. 复杂教具分析报表
3. 学生端直接使用入口
