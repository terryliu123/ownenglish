# 数字化教具管理设计 v1

## 1. 文档目标

本文件用于定义系统中的“数字化教具管理”能力，解决三个问题：

1. 当前已有约 200 个静态 HTML 数字化教具，如何规范导入系统
2. 数字化教具如何在产品中被管理、检索、预览和使用
3. 未来 AI 生成数字化教具 HTML 时，如何接入同一套体系

本文件优先保证：

- 不破坏当前白板 / 互动管理主链路
- 尽量复用现有 `experiment` 相关能力
- 导入路径简单、批量可执行、可持续维护

## 2. 设计结论

结论固定为：

1. “实验题”与“数字化教具”不应继续混成一个概念。
2. 当前已有的静态 HTML 教具，应升级为独立的“数字化教具资源”管理能力。
3. 现有 `experiment` 上传能力可以作为底层文件接入手段，但上层需要新增“教具元数据管理”。
4. 首批导入采用：
   - 教具文件目录
   - 批量元数据清单
   的双文件机制，不要求逐个手工录入。
5. 未来 AI 生成的 HTML 教具，也进入同一套“数字化教具资源库”。

## 3. 产品定位

数字化教具不是课堂任务，也不是大屏互动玩法。

它的定位是：

**老师在课堂中调用的数字化演示资源 / 数字化教具库**

典型使用场景：

- 白板模式中打开教具进行讲解
- 在互动前作为演示材料使用
- 作为实验/现象说明的辅助资源
- 后续作为 AI 生成教具的承载容器

## 4. 与现有系统的关系

### 4.1 可复用部分

当前系统里可复用：

- 现有实验文件上传能力
  - [D:\pcode\ownenglish\client\src\services\api.ts](D:\pcode\ownenglish\client\src\services\api.ts)
- 白板模式作为课堂主入口
- 会员体系和 AI 能力开关

### 4.2 不应继续沿用的方式

不建议继续把所有数字化教具直接当成“实验题”的 HTML 附件散落管理。

原因：

1. 缺少统一的教具库
2. 缺少元数据管理
3. 后续无法支持批量导入、筛选、搜索
4. 后续 AI 生成无法无缝并入

## 5. 数据模型

建议新增一个独立资源模型：

`TeachingAid`

核心字段：

- `id`
- `name`
- `slug`
- `category`
- `summary`
- `cover_image_url`
- `diagram_image_url`
- `html_entry_url`
- `source_filename`
- `status`
- `tags`
- `created_by`
- `created_at`
- `updated_at`
- `source_type`

字段说明：

- `name`
  - 教具名称
- `slug`
  - 唯一标识，建议由文件名或规范英文名生成
- `category`
  - 教具分类，例如物理 / 化学 / 生物 / 通用
- `summary`
  - 教具简介
- `cover_image_url`
  - 列表卡片封面图
- `diagram_image_url`
  - 系统图 / 结构图
- `html_entry_url`
  - 教具 HTML 入口
- `source_filename`
  - 原始文件名
- `status`
  - `draft / active / archived`
- `tags`
  - 检索标签
- `source_type`
  - `manual_import / batch_import / ai_generated`

## 6. 文件组织方式

首批建议把教具文件存储标准化。

建议目录结构：

```text
teaching-aids/
  assets/
    <aid-slug>/
      index.html
      preview.png
      diagram.png
      ...
  manifests/
    teaching-aids-import.json
```

说明：

- 每个教具一个独立目录
- `index.html` 作为主入口
- 图片资源跟随该目录
- 批量导入时用一个统一 manifest 描述元数据

## 6.1 访问安全原则

这批数字化教具虽然本体是静态 HTML，但访问控制不能按“公网静态文件”处理。

结论固定为：

1. 教具 HTML、JS、CSS、图片等资源不得直接暴露在公网静态目录下
2. 用户不能通过直接访问文件 URL 跳过系统登录
3. 教具访问必须经过系统鉴权
4. 不仅入口 `index.html` 要受保护，其引用的子资源也要受保护

因此，首批 200 个教具导入后应采用：

- **私有文件存储**
- **数据入库**
- **启动时鉴权**
- **会话化访问**

不建议的方式：

1. 把教具目录直接放进 `uploads` 或 nginx 公网目录
2. 通过前端隐藏链接来“假保护”
3. 只保护 `index.html`，而让 JS/CSS/图片仍然可直接访问

## 6.2 推荐访问模型

推荐模型：

1. 教具文件存储在非公开目录
2. 系统中记录 `TeachingAid` 元数据和实际存储路径
3. 教师在系统中点击“打开教具”时，先由后端创建一个短时访问会话
4. 前端通过受控路由打开教具，而不是直接打开文件路径

典型链路：

1. 教师在白板模式或教具库中点击教具
2. 前端请求：
   - `POST /api/v1/teaching-aids/{aid_id}/launch`
3. 后端校验：
   - 用户已登录
   - 角色允许访问
   - 教具状态可用
4. 后端生成短时 `TeachingAidSession` 或访问票据
5. 前端通过受控地址加载：
   - `/api/v1/teaching-aids/session/{session_id}/index`
   - 或 `/api/v1/teaching-aids/files/{aid_id}/{path}?ticket=...`

这样可以保证：

- 必须先登录
- 必须有合法权限
- 访问可失效
- 后续可记录使用日志
- 后续 AI 生成教具仍然能走同一套访问模型

## 7. 首批导入方案

首批已有约 200 个教具，不建议手工逐条录入。

建议导入方式：

### 7.1 导入输入

需要两部分：

1. 教具 HTML 文件目录
2. 元数据清单文件

元数据清单建议支持：

- `JSON`
- 或 `CSV`

推荐优先使用 `JSON`，因为结构更稳定。

### 7.2 推荐 JSON 结构

```json
[
  {
    "name": "欧姆定律演示器",
    "slug": "ohms-law-demo",
    "category": "physics",
    "summary": "用于演示电压、电流、电阻之间关系的数字化教具。",
    "diagram_image": "ohms-law-demo/diagram.png",
    "cover_image": "ohms-law-demo/preview.png",
    "html_entry": "ohms-law-demo/index.html",
    "source_filename": "ohms-law-demo.zip",
    "tags": ["电学", "欧姆定律", "实验"]
  }
]
```

### 7.3 推荐 CSV 字段

如果已有表格资料，也可以用 CSV。

建议列名：

- `name`
- `slug`
- `category`
- `summary`
- `diagram_image`
- `cover_image`
- `html_entry`
- `source_filename`
- `tags`

其中 `tags` 用英文逗号分隔。

### 7.4 导入逻辑

后续实现时，后台导入器应做这些事：

1. 读取 manifest
2. 校验 `slug` 唯一
3. 校验 `html_entry` 是否存在
4. 校验图片资源是否存在
5. 生成 `TeachingAid` 记录
6. 将文件路径映射成系统可访问 URL

### 7.5 导入失败策略

必须支持：

- 跳过单条坏数据继续导入
- 输出导入报告
- 标记失败原因

建议导入报告至少包含：

- 总数
- 成功数
- 失败数
- 重复 slug
- 缺失文件
- 缺失封面
- 缺失系统图

## 8. 后台管理功能

数字化教具需要独立管理页。

建议模块名称：

`数字化教具`

后台至少应包含：

### 8.1 教具列表

功能：

- 搜索名称
- 按分类筛选
- 按标签筛选
- 查看状态
- 打开预览
- 编辑元数据
- 上下架

### 8.2 教具详情 / 编辑页

功能：

- 修改名称
- 修改简介
- 修改分类
- 修改标签
- 上传 / 替换封面图
- 上传 / 替换系统图
- 替换 HTML 入口资源

### 8.3 批量导入页

功能：

- 上传 manifest
- 上传或指定教具目录
- 执行导入
- 查看导入报告

## 9. 教师端使用方式

教师端不需要看到复杂管理细节，但需要能调用教具。

建议在白板模式中新增：

- 打开数字化教具库
- 搜索教具
- 预览教具
- 插入当前课堂

教师端最适合的接入点：

1. 白板模式
2. 课前准备中实验 / 教具选择器

## 9.1 白板中的打开方式

第一阶段建议：

- 教师在白板模式中从“数字化教具库”选择教具
- 系统先创建访问会话
- 再以覆盖层、右侧工作区或独立工作面板方式加载教具

不建议第一阶段直接使用：

- 公开静态 URL 嵌入
- 无鉴权 iframe
- 多窗口自由跳转

原因是这会直接绕过登录体系，也不利于后续接入会员权限与使用记录。

## 10. 与 experiment 的兼容策略

当前已有 `experimentService.upload`，说明系统已经具备实验 HTML 或实验文件上传入口。

建议兼容策略：

### 第一阶段

- 保留现有 `experiment` 使用方式
- 新增 `TeachingAid` 管理模型
- 底层文件上传继续可复用现有实验上传能力

### 第二阶段

- 将现有“静态 HTML 实验题”逐步迁移到教具资源库
- `experiment` 更明确地代表课堂中的实验型任务
- `TeachingAid` 更明确地代表数字化教具资源

## 11. AI 生成数字化教具的预留设计

未来 AI 生成 HTML 教具时，不应另建系统。

应统一进入：

`TeachingAid`

只是在 `source_type` 上标记为：

- `ai_generated`

后续 AI 生成链路建议：

1. 输入教具需求
2. AI 生成 HTML / CSS / JS
3. 生成预览图
4. 生成 `TeachingAid` 记录
5. 人工审核后发布

这要求当前模型预留：

- `source_type`
- `version`
- `review_status`

建议预留字段：

- `version`
- `review_status`
- `generator_prompt`
- `generator_model`

同时，AI 生成后的 HTML 教具也必须进入同一套访问安全体系：

- 私有文件存储
- `TeachingAid` 记录
- 访问会话或短时票据
- 非公开资源路由

## 12. 对现有系统的修改清单

建议新增：

前端：

- `client/src/pages/admin/TeachingAids.tsx`
- `client/src/pages/admin/TeachingAidDetail.tsx`
- `client/src/pages/teacher/TeachingAidLibrary.tsx`
- `client/src/features/teaching-aids/`

后端：

- `server/app/api/v1/teaching_aids.py`
- `server/app/models/teaching_aid.py`
- `server/app/services/teaching_aids_import.py`

轻改现有模块：

- `experimentService` 继续保留
- 白板模式增加“打开数字化教具库”入口
- 后台导航增加“数字化教具”

## 13. 第一阶段实施顺序

建议按这个顺序推进：

1. 定稿 `TeachingAid` 数据模型
2. 实现后台列表 / 编辑 / 上下架
3. 实现批量导入器
4. 导入现有 200 个教具
5. 白板模式接入教具库入口
6. 后续再做 AI 生成接入

## 14. 验收标准

这一块设计验收标准：

1. 200 个已有教具可批量导入
2. 导入后可在后台统一管理
3. 教师可在白板中调用教具
4. 不影响当前 experiment 主链路
5. 后续 AI 生成教具可接入同一资源模型

## 15. 一句话结论

数字化教具不应继续散落在“实验题”里管理，而应升级成：

**独立的数字化教具资源库，首批通过 manifest + HTML 文件目录批量导入，后续与 AI 生成能力共用同一套模型。**

## 16. 开发规格

可开发稿见：

- [数字化教具开发规格 v1](D:\pcode\ownenglish\docs\digital-teaching-aids-development-spec-v1.md)
