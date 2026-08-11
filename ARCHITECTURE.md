# 系统架构说明（ARCHITECTURE）

本文档描述飞牛 NAS KTV 系统（nasktv）的整体架构、服务划分、通信机制与数据流。

## 系统架构图

```
                          ┌──────────────────────────────────────┐
                          │           NAS 主机（:8080）           │
                          │         Nginx 反向代理（web）          │
                          │  /admin /h5 /api /ws  →  内部服务      │
                          └───────────────┬──────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
   ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
   │   admin-web     │          │   mobile-h5     │          │     backend     │
   │  (nginx:alpine) │          │  (nginx:alpine) │          │ (node:20-alpine)│
   │   Admin SPA     │          │   H5 SPA        │          │  Express + WS   │
   └─────────────────┘          └─────────────────┘          └────────┬────────┘
                                                                       │
            ┌──────────────────────────────────────────────────────────┤
            │                                                          │
            ▼                                                          ▼
   ┌─────────────────┐                                    ┌─────────────────────┐
   │   separator     │  HTTP（容器内 :8001）              │      SQLite        │
   │ (pytorch + uv)  │ ◄────────────────────────────────  │  ./data/db/*.db    │
   │  FastAPI +      │                                     └─────────────────────┘
   │  Demucs v4      │                                             ▲
   └────────┬────────┘                                             │
            │                                                      │
            ▼                                                      │
   ┌──────────────────────────────────────────────────────────────┐│
   │                  共享数据卷（./data/*）                        ││
   │  songs/  separated/  uploads/  separator-cache/              ││
   └──────────────────────────────────────────────────────────────┘│
                                                                   │
   ┌───────────────────────────────────────────────────────────────┐
   │                      TV App（Tauri 2.0）                       │
   │   Android TV APK，独立于 Docker，通过 :8080/api 与 :8080/ws     │
   │   直连 backend；HTML5 video/audio + Web Audio API 本地播放      │
   └───────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ 扫码加入房间
                                   │
   ┌───────────────────────────────────────────────────────────────┐
   │                  Mobile H5（手机浏览器）                        │
   │        通过 :8080/h5 访问，REST + WebSocket 控制队列            │
   └───────────────────────────────────────────────────────────────┘
```

## 服务划分

| 服务 | 镜像基础 | 容器端口 | 对外暴露 | 用途 |
|------|---------|---------|---------|------|
| backend | node:20-alpine 多阶段 | 3000 | 3000（调试用） | API + WebSocket |
| separator | pytorch 镜像 | 8001 | 无（仅容器内） | 人声分离（Demucs v4） |
| admin-web | node → nginx:alpine | 80 | 无（通过 web 反代） | 管理后台 SPA |
| mobile-h5 | node → nginx:alpine | 80 | 无（通过 web 反代） | 手机点歌 H5 SPA |
| web | nginx:alpine | 80 | 8080 | 根反向代理 |
| TV App | Tauri 2.0 APK | — | — | Android TV 播放器（不走 Docker） |

## 反向代理路由（nginx.conf）

| 路径 | 上游 | 说明 |
|------|------|------|
| `/admin/*` | admin-web:80 | 剥离 `/admin` 前缀 |
| `/h5/*` | mobile-h5:80 | 剥离 `/h5` 前缀 |
| `/api/*` | backend:3000/api | REST API |
| `/ws` | backend:3000/ws | WebSocket Upgrade 头透传，3600s 超时 |
| `/` | — | 302 重定向到 `/admin/` |

## 通信机制

| 通信方式 | 源 → 目标 | 用途 |
|---------|----------|------|
| REST（HTTP） | 客户端 → web → backend | 歌曲库 CRUD、设备授权、扫描、AI 解析配置 |
| WebSocket | 客户端 ↔ web ↔ backend | 房间状态、队列更新、播放控制、歌词同步、任务进度 |
| 容器间 HTTP | backend → separator | 触发人声分离任务、查询进度 |
| 文件系统（共享卷） | backend ↔ separator | 读取源音频、写入分离结果（vocals/instrumental） |
| 文件系统（挂载） | backend ↔ SQLite | 数据持久化 |
| Tauri IPC | TV App WebView ↔ Rust 外壳 | 设备 ID 生成与持久化、原生能力调用 |

## WebSocket 消息类型

### 设备授权

| 消息 | 方向 | 说明 |
|------|------|------|
| `ROOM_AUTHORIZED` | server → TV | 房间已获授权 |
| `ROOM_UNAUTHORIZED` | server → TV | 房间授权被撤销 |
| `ROOM_CLOSED` | server → clients | 房间已关闭 |
| `ROOM_EXPIRING_SOON` | server → TV | 临时授权即将到期 |

### 房间消息

| 消息 | 方向 | 说明 |
|------|------|------|
| `JOIN_ROOM` | client → server | 加入房间 |
| `ADD_SONG` | client → server | 加入队列 |
| `INSERT_NEXT` | client → server | 插入到下一首 |
| `SKIP_SONG` | client → server | 跳过当前曲 |
| `PLAYER_STATE` | TV → server / server → clients | 播放器状态同步 |
| `QUEUE_UPDATED` | server → clients | 队列变更广播 |
| `LYRIC_SYNC` | TV → server / server → clients | 歌词行同步 |
| `ROOM_STATE_SNAPSHOT` | server → client | 房间全量状态快照 |

### 分离任务

| 消息 | 方向 | 说明 |
|------|------|------|
| `SEPARATION_STARTED` | server → admin | 任务已开始 |
| `SEPARATION_PROGRESS` | server → admin | 分离进度 |
| `SEPARATION_COMPLETED` | server → admin | 分离完成 |
| `SEPARATION_FAILED` | server → admin | 分离失败 |

### AI 解析

| 消息 | 方向 | 说明 |
|------|------|------|
| `AI_PARSE_STARTED` | server → admin | 解析已开始 |
| `AI_PARSE_PROGRESS` | server → admin | 解析进度 |
| `AI_PARSE_COMPLETED` | server → admin | 解析完成 |
| `AI_PARSE_FAILED` | server → admin | 解析失败 |

## 数据流说明

### 1. 点歌流程（Mobile H5 → TV App）

```
手机扫码加入房间（房间码）
   │
   ▼
Mobile H5 搜索/浏览歌曲 → POST /api/rooms/:code/queue（或 WS ADD_SONG）
   │
   ▼
backend 写入房间队列 → 广播 QUEUE_UPDATED → 所有客户端（含 TV App）
   │
   ▼
TV App 收到队列更新 → 播放当前曲 → 广播 PLAYER_STATE + LYRIC_SYNC
   │
   ▼
Mobile H5 实时显示正在播放、歌词、进度；可执行 INSERT_NEXT / SKIP_SONG
```

### 2. 人声分离流程

```
Admin Web 触发分离 → POST /api/songs/:id/separate
   │
   ▼
backend 创建 separation_tasks 记录 → HTTP 调用 separator:8001/separate
   │
   ▼
separator 读取 ./data/songs/<id>.* 源文件 → Demucs v4 推理
   │  （htdemucs_base / htdemucs_ft，进度回传 backend）
   ▼
输出 vocals.mp3 + instrumental.mp3（320kbps）→ 写入 ./data/separated/<id>/
   │
   ▼
backend 更新任务状态 → WS 广播 SEPARATION_PROGRESS / SEPARATION_COMPLETED
   │
   ▼
TV App 播放时按原/伴唱开关，切换读取 vocals 或 instrumental 资源
```

### 3. AI 解析流程

```
Admin Web 触发扫描 → POST /api/scan → scanner 入库新文件
   │
   ▼
入库后创建 ai_parse_tasks → 调用 OpenAI 兼容接口（ai-client.ts）
   │  （依据文件名/ID3/已有元数据构造 prompt）
   ▼
解析返回歌手、分类、语种、年代 → 更新 songs / artists / categories / song_categories
   │
   ▼
WS 广播 AI_PARSE_PROGRESS / AI_PARSE_COMPLETED 给 Admin Web
```

### 4. 设备授权流程

```
TV App 首次安装 → Tauri Rust 生成固定设备 ID + 房间码 → 调用 /api/devices/register
   │
   ▼
backend 写入 rooms（默认未授权 status=unauthorized）
   │
   ▼
Admin Web 在「设备管理」看到待授权设备 → 选择临时（带到期时间）或永久授权
   │
   ▼
device-service.ts 广播 ROOM_AUTHORIZED → TV App 进入正常播放界面
   │  （到期前广播 ROOM_EXPIRING_SOON，到期后广播 ROOM_UNAUTHORIZED）
   ▼
未授权时 TV App 停留在 Unauthorized 页面，仅显示房间码等待授权
```

## 数据库 Schema 概览

数据库为 SQLite3 单文件，schema 定义在 `packages/shared/src/schema/`，使用 Drizzle ORM。

| 表名 | 用途 |
|------|------|
| `songs` | 歌曲主表（标题、文件路径、时长、是否有分离结果等） |
| `artists` | 歌手库（名称、拼音、头像等） |
| `categories` | 分类（语种、年代、主题等） |
| `song_categories` | 歌曲 ↔ 分类 多对多关联 |
| `rooms` | 房间/设备（房间码、设备 ID、授权状态、到期时间） |
| `room_sessions` | 房间会话（当前队列、播放状态快照） |
| `users` | 管理员账号（用户名、密码哈希） |
| `separation_tasks` | 人声分离任务（状态、进度、产物路径） |
| `ai_parse_tasks` | AI 解析任务（状态、解析结果） |
| `settings` | 系统配置（AI 接口、分离模型等键值对） |
| `play_history` | 播放历史记录 |
| `playlists` | 歌单 |

## 数据卷与持久化策略

| 宿主路径 | 容器挂载 | 读写权限 | 用途 |
|---------|---------|---------|------|
| `./data/db` | backend `/app/data/db` | 读写 | SQLite 数据库文件持久化 |
| `./data/songs` | backend `/app/data/songs` | 读写 | 原始音频/MV 存储 |
| `./data/songs` | separator `/data/songs` | 只读 | 分离服务读取源文件 |
| `./data/separated` | backend `/app/data/separated` | 读写 | 分离结果（vocals/instrumental） |
| `./data/separated` | separator `/data/separated` | 读写 | 分离服务写入产物 |
| `./data/uploads` | backend `/app/data/uploads` | 读写 | 上传临时目录 |
| `./data/separator-cache` | separator `/app/cache` | 读写 | Demucs 模型缓存（避免重复下载） |

**策略要点**：

- `songs/` 对 separator 只读挂载，防止分离服务误改源文件。
- `separated/` 双向共享，backend 索引产物，separator 写入产物。
- `separator-cache/` 持久化模型权重，容器重建后无需重新下载 Demucs 模型（首下载约数 GB）。
- 所有数据卷位于 NAS 宿主 `./data/` 下，便于备份与迁移。
