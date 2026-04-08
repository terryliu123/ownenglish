# 数字化教具库上线整理说明

本文档用于把现有约 200 个静态 HTML 数字化教具整理进系统，并作为后台同步、白板验收、线上发布的执行说明。

## 1. 固定目录结构

所有教具统一放到：

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

1. `category` 必须使用系统标准分类编码
2. `slug` 必须与目录名一致
3. 入口文件固定为 `index.html`
4. 推荐封面图文件名为 `cover.png`
5. 推荐系统图文件名为 `diagram.png`
6. 教具内部全部资源必须使用相对路径
7. 不允许跨教具目录引用资源
8. 不允许跨分类目录引用资源

## 2. 标准分类编码

第一版固定：

1. `physics`
2. `chemistry`
3. `biology`
4. `earth_science`
5. `general_science`
6. `mathematics`
7. `other`

如果原始分类表名称不同，先映射到以上标准编码，再写入 Manifest。

## 3. Manifest 结构

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

`items` 每项固定字段：

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

硬约束：

1. `slug` 只能使用小写字母、数字、连字符
2. `html_entry` 必须严格等于 `<category>/<slug>/index.html`
3. `cover_image` 和 `diagram_image` 如填写，必须位于当前教具目录内

## 4. 教具分级标准

整理 200 个教具时，按以下结果分级：

### 可直接上线

1. `index.html` 正常
2. 子资源完整
3. 结构自包含
4. 可有或可无封面、系统图

### 缺视觉资源但可上线

1. `index.html` 正常
2. 子资源完整
3. `cover_image` 或 `diagram_image` 缺失

### 入口异常需修复

1. `index.html` 缺失
2. `html_entry` 错误

### 资源不自包含需返工

1. 存在跨目录引用
2. 存在外部本地路径
3. 子资源缺失

## 5. 本地校验工具

运行：

```powershell
py -3 D:\pcode\ownenglish\tools\validate_teaching_aids_manifest.py
```

输出包含：

1. `summary.total`
2. `summary.ready`
3. `summary.ready_without_visuals`
4. `summary.blocked`
5. 每个教具的：
   - `status`
   - `warnings`
   - `errors`

状态说明：

1. `ready`：可直接上线
2. `ready_without_visuals`：缺封面或系统图，但主体可用
3. `blocked`：入口异常、资源缺失或存在越界引用

上线前要求：

1. `blocked = 0` 才允许整体上线
2. 如果不能一次性清零，只同步通过校验的条目

## 6. 系统同步步骤

1. 将教具目录放入固定位置
2. 更新 `teaching-aids.json`
3. 运行本地校验脚本
4. 修复所有 `blocked` 项
5. 管理员后台执行一次 `sync-manifest`
6. 在后台列表核对：
   - 分类
   - 名称
   - 简介
   - 入口
   - 状态
7. 抽样预览教具
8. 将通过验收的教具切换为 `active`

## 7. 后台抽检要求

后台至少检查：

1. 列表加载正常
2. 分类筛选正常
3. 搜索正常
4. 批量状态切换正常
5. 详情页元数据正确
6. 状态切换正常
7. `launch` 预览可打开
8. 同步报告中的错误条目、缺失条目、复制、下载功能正常

## 8. 白板抽样验收要求

首轮白板验收按分层抽样执行：

1. 每个分类至少抽 3 个
2. 总量至少抽 20 个

必须覆盖：

1. 有封面图
2. 有系统图
3. 资源较多
4. 结构较复杂

白板验收项：

1. 分类浏览
2. 关键词搜索
3. 最近使用
4. 预览信息
5. 点击打开
6. iframe 正常显示
7. JS/CSS/图片完整加载
8. 加载失败提示正确
9. 空筛选状态正确

## 9. 上线结论规则

只有同时满足以下条件，才视为第一条线完成：

1. 目录和 Manifest 已整理完成
2. 本地校验时无 `blocked`
3. 后台同步成功
4. 管理后台抽检通过
5. 白板抽样验收通过
6. 上线结果记录到 `docs/deployment-update-record.md`
