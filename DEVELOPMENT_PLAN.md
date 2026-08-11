# 飞牛NAS KTV系统 - 开发计划

> 文档版本：v1.8
> 最后更新：2026-07-30
> 状态：开发进行中
>
> v1.1 变更：调整房间码机制 — 由电视端App安装时固定生成，默认未授权，需管理员授权后才能使用
> v1.2 变更：①房间授权支持临时/永久两种方式；②新增AI辅助解析歌曲信息（OpenAI标准接口）；③新增歌手和分类手动维护功能
> v1.3 变更：阶段1基础设施搭建完成，项目配置和开发环境已就绪
> v1.4 变更：阶段2歌曲库扫描器完成，支持音频标签解析、歌手自动入库、歌词关联、默认分类初始化
> v1.5 变更：阶段2.5人声分离微服务和阶段2.6 AI解析服务完成
> v1.6 变更：强制要求所有前端UI设计与页面实现（Admin Web / Mobile H5 / TV App WebView）全部使用 Hallmark 技能（Use Skill: hallmark）进行设计与构建

---

## 一、项目概述

### 1.1 项目定位
部署在飞牛NAS上的家庭KTV系统，支持三端协同：
- **管理员后台**：歌曲库管理、MV/音频上传、人声分离任务监控、设备授权管理、AI辅助解析配置、歌手与分类维护
- **电视KTV App**：Android TV 端播放器，支持原伴唱切换、歌词同步、遥控器操作
- **手机点歌H5**：扫码加入房间、搜索点歌、队列管理、播放控制

### 1.2 核心特色
- **AI人声分离**：基于 Demucs v4，对音频/MV文件自动分离人声与伴奏，实现原伴唱切换
- **AI辅助解析**：对接OpenAI标准接口，扫描入库后自动解析歌手、分类、语种、年代等信息，减少手动维护成本
- **设备授权机制**：电视端App安装时生成固定房间码，默认未授权，管理员可临时或永久授权后才能使用点歌功能
- **多房间支持**：一台NAS可服务多台电视，房间码隔离
- **NAS本地化**：歌曲库扫描NAS目录，SQLite单文件存储，Docker一键部署

---

## 二、技术栈

### 2.1 核心技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 编程语言 | TypeScript（主） + Python（分离服务） + Rust（Tauri外壳） | 全栈统一 |
| 后端运行时 | Node.js LTS 20+ | Express + WebSocket |
| 包管理 | pnpm workspace | monorepo 管理 |
| 数据库 | SQLite3 (better-sqlite3) | 单文件持久化 |
| ORM | Drizzle ORM | 类型安全 |
| 认证 | JWT + bcrypt | 后台鉴权 |
| 实时通信 | WebSocket (ws) | 房间消息同步 |
| AI接口 | OpenAI SDK（openai npm包） | 兼容OpenAI协议的AI辅助解析 |

### 2.2 前端技术栈（Admin Web + Mobile H5）

| 模块 | 技术 |
|------|------|
| 构建工具 | Vite |
| UI框架 | React 18 + TypeScript |
| 样式 | TailwindCSS |
| 路由 | React Router DOM |
| 状态管理 | Zustand |
| HTTP | Axios（JWT拦截器） |
| 图标 | lucide-react |
| 通知 | sonner |
| 表单 | react-hook-form |
| **UI 设计技能** | **Hallmark（Use Skill: hallmark）— 强制约束所有页面/组件设计与实现** |

> **Hallmark 强制说明**：上表中的 TailwindCSS / lucide-react / sonner / react-hook-form 仅作为底层渲染与交互工具，所有视觉决策（色彩、字体、间距、宏结构、主题、动效、组件 8 状态样式）必须由 Hallmark 技能产出，并通过 `tokens.css` 令牌驱动，禁止未经 Hallmark 流程直接手写视觉层。详见 §2.6。

### 2.3 电视端技术栈（Tauri）

| 模块 | 技术 |
|------|------|
| 外壳 | Tauri 2.0 (Rust) |
| WebView内容 | React + Vite（同前端栈） |
| 打包目标 | aarch64-linux-android (Android TV APK) |
| 播放 | HTML5 video/audio + Web Audio API |
| 遥控器 | Tauri键盘事件 + 自定义键值映射 |
| 二维码 | qrcode 库 |
| **UI 设计技能** | **Hallmark（Use Skill: hallmark）— 强制约束 TV WebView 内所有界面设计与实现** |

> **Hallmark 强制说明**：TV App 的 WebView 内容层（注册页、等待授权页、播放器界面、队列面板、二维码界面、遥控器焦点视觉等）同样必须经 Hallmark 技能产出，默认走 `atmospheric` genre + Bloom/Midnight/Aurora 主题聚类以适配客厅暗光远距离观看场景。详见 §2.6。

### 2.4 人声分离服务

| 模块 | 技术 |
|------|------|
| Web框架 | FastAPI (Python) |
| AI模型 | Demucs v4 (htdemucs_base / htdemucs_ft) |
| 音频处理 | ffmpeg + torchaudio |
| 包管理 | uv (pyproject.toml) |

### 2.5 部署运维

| 项目 | 技术 |
|------|------|
| 容器化 | Docker 多阶段构建 |
| 编排 | Docker Compose |
| 静态托管 | Nginx（反代 admin/h5 + 代理 API/WS） |
| 部署平台 | 飞牛NAS（原生Docker支持） |
| 日志 | pino（结构化日志输出到stdout） |

### 2.6 前端 UI 设计与实现规范（Hallmark 强制约束）

> **强制规则**：本项目所有前端 UI 设计与页面实现 —— 涵盖 Admin Web、Mobile H5、TV App 的 WebView 内容层 —— **必须**通过 `Use Skill: hallmark` 技能进行设计与构建。任何前端页面、组件、视觉元素的产生，都需经 Hallmark 技能的设计流程产出，不得直接手写无约束的 Tailwind/HTML/CSS。

#### 2.6.1 适用范围

| 端 | 路径 | Hallmark 适用范围 |
|----|------|------------------|
| Admin Web | `packages/admin-web/src/**` | 所有 page、component、layout、表单、表格、图表卡片 |
| Mobile H5 | `packages/mobile-h5/src/**` | 所有 page、component、底部 Tab、搜索/列表/详情布局 |
| TV App WebView | `packages/tv-app/src/**` | 所有 page、播放器界面、二维码界面、等待授权界面、遥控器焦点样式 |

> 后端、Python 分离服务、Tauri Rust 外壳、Drizzle schema、WS 协议等非视觉层不适用 Hallmark。

#### 2.6.2 Hallmark 设计流程（每个页面/组件必走）

每次新增或重构前端页面/组件时，**必须**调用 `Use Skill: hallmark` 并遵循其完整设计流程：

1. **Pre-flight 扫描** — 读取项目已存在的 `tokens.css` / Tailwind 配置 / 字体栈，避免覆盖既有设计系统。首次运行会在项目根创建 `.hallmark/preflight.json` 与 `.hallmark/log.json`。
2. **设计上下文网关** — 明确三要素：受众、用例、调性（editorial / modern-minimal / atmospheric / playful 之一，"clean and modern" 不算调性）。
3. **宏结构（Macrostructure）选择** — 从 Hallmark 21 种命名宏结构中选取一种，并遵守多样化规则：相邻两次构建不得复用同一宏结构。
4. **主题（Theme）选择** — 默认走 catalog（20 种命名主题），按调性聚类轮换；如品牌色或多属性氛围明确，可走 custom 路线。
5. **加载视觉规则集** — 加载对应 genre 文件、宏结构文件、nav/footer archetype 文件、`typography.md` / `color.md` / `layout-and-space.md` / `motion.md` / `copy.md` / `anti-patterns.md`。
6. **Hero enrichment 决策** — 多数页面走 typography-only；SaaS/演示类才走 E1~E5 增强方案。
7. **Preview 块** — 输出构建前的 TL;DR（宏结构/主题/增强/章节/动效/slop-test/多样化）。
8. **Build** — 产出页面代码 + `tokens.css`，CSS 首行必须盖 Hallmark stamp 注释，并追加 `.hallmark/log.json` 记录。
9. **Slop test** — 跑 58 道门禁，任一失败必须修复后再交付。

#### 2.6.3 硬性约束（不可违反）

| 约束 | 说明 |
|------|------|
| **OKLCH 调色板** | 所有颜色必须使用 OKLCH 并声明为 `:root` 令牌（`var(--color-*)`），禁止内联 hex/rgb |
| **令牌化** | 颜色、字体、间距、文字尺寸、缓动、时长、边线、圆角全部走令牌；新值先入令牌块再引用 |
| **字体配对** | 每个 theme 至少一个 display face + 一个 body face；标题永远 `font-style: normal`，禁止斜体标题 |
| **4pt 间距** | 使用 `--space-xs/sm/md/lg/xl/2xl/3xl` 语义化间距令牌 |
| **8 状态交互** | 每个交互组件必须覆盖 default / hover / focus-visible / active / disabled / loading / error / success 全 8 状态 |
| **移动端响应** | 320 / 375 / 414 / 768 px 四档全部验证：无横向滚动、按钮/导航/CTA 单行不折行、图片栅格用 `minmax(0, 1fr)` |
| **动效纪律** | 只动 `transform` 和 `opacity`；三档缓动 `--ease-out/in/in-out`；支持 `prefers-reduced-motion`；focus-visible 环不动画 |
| **真实文案** | 不许杜撰数据/指标/证言/logo；未提供则用占位符 `—` + 标注 |
| **不重绘 chrome** | 禁止手绘假浏览器栏、假手机框、假代码窗口；用真实截图或裸内容 |
| **结构多样化** | 同一项目相邻两次 Hallmark 产出：宏结构不同 + 主题至少在三轴（paper band / display style / accent hue）之一不同；nav/footer archetype 也不得连续复用 |

#### 2.6.4 三端调性（Genre）与主题聚类指引

| 端 | Genre | 推荐主题聚类 | 说明 |
|----|-------|-------------|------|
| Admin Web | `modern-minimal` | Coral / Cobalt | 后台属于 SaaS/工具类，追求密度与可读性 |
| Mobile H5 | `editorial`（默认）或 `playful` | Specimen / Atelier / Newsprint / Studio / Garden / Hum | 点歌端偏消费级，注重浏览与情绪 |
| TV App WebView | `atmospheric` | Bloom / Midnight / Terminal / Aurora / Lumen | 客厅暗光环境、远距离观看，需要大字号高对比 |

> 调性可在 Hallmark 设计上下文网关阶段被用户覆盖；上表仅作默认指引。

#### 2.6.5 项目级设计系统落盘

- 首次 Hallmark 运行后，会在项目根产出 `tokens.css`（所有 `--color-*` / `--font-*` / `--space-*` / `--text-*` / `--ease-*` / `--dur-*` / `--rule-*` / `--radius-*` 令牌）。
- 三端共享同一份 `tokens.css` 以保证视觉一致性；不同端只切换 genre/theme 子集，不复用未令牌化的硬编码值。
- 如需锁定全局设计系统供跨页面复用，可在任意 Hallmark 构建后说 `lock the system`，Hallmark 会在项目根产出 `design.md`，后续所有页面构建 defer to 它（多样化规则在 `design.md` 管理项目下反转：页面之间共享系统，不强求互异）。
- `.hallmark/log.json` 记录每次构建的宏结构/主题/增强/brief，用于触发多样化规则与可追溯性。

#### 2.6.6 Hallmark 技能调用方式

在任何前端页面/组件的开发任务开始时，**第一步**即调用：

```
Use Skill: hallmark
```

随后按 Hallmark 技能提示的设计流程逐步推进；不允许跳过 Pre-flight、Preview、Slop test 任一环节直接写代码。

---

## 三、系统架构

### 3.1 整体架构图

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  管理员后台  │    │  电视KTV App │    │ 手机点歌H5  │
│  (Admin Web) │    │   (TV App)   │    │ (Mobile H5) │
└──────┬──────┘    └──────┬───────┘    └──────┬──────┘
       │ REST              │ WebSocket         │ WebSocket
       │                   │ 房间实时同步       │
       └──────────┬────────┴───────────────────┘
                  │
         ┌────────▼────────┐
         │  Backend (API)  │
         │ Node+Express+WS │
         └────────┬────────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
   ┌────▼───┐ ┌───▼────┐ ┌───▼─────────┐
   │ SQLite │ │ 文件系统│ │ Separator   │
   │  +DB   │ │ NAS挂载│ │ Service     │
   └────────┘ └────────┘ │ (Python+    │
                          │  Demucs)    │
                          └─────────────┘
```

### 3.2 通信机制

| 场景 | 协议 | 说明 |
|------|------|------|
| 后台CRUD | REST | 管理员JWT鉴权 |
| H5点歌 | WebSocket | 手机→服务器→电视实时推送 |
| 电视播放状态 | WebSocket | 电视上报进度，手机同步 |
| 文件上传 | REST | 支持大文件分片 |
| 分离任务进度 | WebSocket | 实时推送到Admin页面 |
| Backend ↔ Separator | REST | 任务下发 + 回调通知 |

### 3.3 WebSocket消息类型

```
# 设备授权消息（电视端订阅）
ROOM_AUTHORIZED        房间已授权（含房间名称、授权类型、过期时间）
ROOM_UNAUTHORIZED      房间授权被撤销（含原因：manual_revoke | expired）
ROOM_CLOSED            房间已关闭
ROOM_EXPIRING_SOON     临时授权即将过期（提前10分钟提醒）

# 房间消息（仅授权房间可用）
JOIN_ROOM              加入房间
ADD_SONG               点歌
INSERT_NEXT            插队
SKIP_SONG              切歌
PLAYER_STATE           播放状态同步（进度/暂停）
QUEUE_UPDATED          队列变更广播
LYRIC_SYNC             歌词进度同步

# 分离任务消息（仅Admin）
SEPARATION_STARTED     分离任务开始
SEPARATION_PROGRESS    进度更新（百分比、当前阶段）
SEPARATION_COMPLETED   分离完成
SEPARATION_FAILED      分离失败

# AI解析任务消息（仅Admin）
AI_PARSE_STARTED       AI解析任务开始
AI_PARSE_PROGRESS      解析进度
AI_PARSE_COMPLETED     解析完成（含解析结果）
AI_PARSE_FAILED        解析失败
```

### 3.4 授权机制说明

**房间码生成与授权流程**：
1. 电视端App安装后首次启动 → 本地生成唯一 `device_id`（UUID，持久化存储）
2. 电视端调用 `POST /api/devices/register` 注册到后端 → 后端生成固定房间码
3. 房间码生成后固定不变，除非重新安装App生成新device_id
4. 新注册设备默认 `authorized=false, status=pending`，无法进行任何点歌操作
5. 管理员在后台「设备授权」页看到待授权设备 → 选择**临时授权**或**永久授权**
6. 后端更新授权信息 → WS推送 `ROOM_AUTHORIZED` 到电视端（含授权类型和过期时间）
7. 电视端收到授权消息 → 进入正常KTV界面，显示二维码供手机扫码
8. 手机端扫码加入 → 后端校验 `authorized=true` 且未过期 才允许加入

**授权类型**：
| 类型 | 字段值 | 过期时间 | 适用场景 |
|------|--------|----------|----------|
| 永久授权 | `permanent` | 无 | 家庭自用电视，授权一次永久有效 |
| 临时授权 | `temporary` | 管理员设置（如2小时/1天/7天） | 朋友聚会、短期试用、付费场景 |

**临时授权机制**：
- 授权时设置 `expires_at`（精确到分钟）
- 定时任务每分钟检查即将过期的临时授权
- 过期前10分钟推送 `ROOM_EXPIRING_SOON` 提醒
- 过期后自动撤销：更新 `authorized=false, status=revoked`，推送 `ROOM_UNAUTHORIZED`（原因：expired）
- 临时授权可随时手动续期或转为永久授权

**授权状态校验**：
- WS消息处理前校验房间 `authorized` 字段且临时授权未过期
- 未授权房间：只接收 `ROOM_AUTHORIZED` 消息，拒绝所有点歌操作
- 已授权房间：允许所有正常点歌流程
- 授权被撤销/过期：推送 `ROOM_UNAUTHORIZED`，电视端回到等待授权界面，手机端连接被断开

### 3.5 AI辅助解析机制

**触发时机**：
1. 扫描入库后自动触发（可在系统设置中开关）
2. 管理员手动触发单首/批量解析
3. 上传文件入库后自动触发

**解析流程**：
```
1. 取出歌曲的文件元数据（文件名、ID3标签原始信息、时长、码率等）
   │
2. 构造AI提示词（含歌曲文件名、原始标签、已有歌手/分类列表供参考）
   │
3. 调用OpenAI兼容接口（chat/completions）
   │  模型按JSON格式输出：{
   │    "title": "歌曲名",
   │    "artist": "歌手名",
   │    "artist_pinyin": "zhangxueyou",
   │    "language": "粤语",
   │    "era": "90年代",
   │    "genre": "流行",
   │    "mood": "伤感",
   │    "confidence": 0.95
   │  }
   ▼
4. 解析返回结果，匹配或新建歌手记录
   │
5. 自动归类到对应分类（语种/年代/风格/心情）
   │
6. 更新songs表的ai_parsed字段为true
   │
7. WS推送 AI_PARSE_COMPLETED 到Admin页面
   │
8. 管理员可在后台审核AI解析结果，手动修正
```

**AI配置要求**：
- 兼容OpenAI Chat Completions API标准（`/v1/chat/completions`）
- 可对接：OpenAI、DeepSeek、通义千问、Moonshot、本地Ollama等
- 配置项：Base URL、API Key、模型名称、提示词模板、温度参数

---

## 四、功能模块规划

### 4.1 管理员后台（Admin Web）

| 模块 | 功能点 |
|------|--------|
| 仪表盘 | 歌曲总数、今日点播次数、活跃房间数、热门歌曲Top10、分离任务统计、AI解析统计 |
| 歌曲管理 | 列表/网格视图、搜索（歌名/歌手/拼音首字母/分类）、批量操作、ID3标签解析、手动编辑、删除、AI解析状态标识 |
| 歌曲上传 | 单文件/批量上传、拖拽、支持音频和MV视频 |
| 歌手管理 | 歌手列表、新增/编辑/删除、头像上传、拼音首字母自动生成、合并歌手、歌曲数量统计 |
| 分类管理 | 分类树（语种/年代/风格/心情/主题）、新增/编辑/删除/排序、分类下歌曲数量统计 |
| 歌单管理 | 创建主题歌单、拖拽排序、封面设置 |
| 人声分离 | 任务概览、当前任务进度、队列列表、失败重试、试听伴奏/人声、批量分离 |
| AI解析中心 | 解析任务概览、当前任务进度、批量解析、失败重试、解析结果审核与修正、AI配置 |
| 设备授权 | 待授权设备列表、临时/永久授权、已授权设备管理（撤销/续期/转永久/重命名）、设备活跃状态监控 |
| 系统设置 | 扫描路径配置、分离参数、AI解析参数、JWT密钥、房间空闲超时、自动开关 |

### 4.2 电视KTV App（Tauri）

| 模块 | 功能点 |
|------|--------|
| 首次启动注册 | 本地生成device_id（UUID持久化）→ 调用后端注册 → 获取房间码 |
| 等待授权界面 | 显示房间码 + "等待管理员授权"提示 + 设备ID + 注册时间 |
| 授权状态监听 | WS连接监听授权状态变更（授权/撤销/过期/关闭） |
| 临时授权倒计时 | 临时授权时在界面角落显示剩余时间，即将到期时弹出提醒 |
| 绑定房间 | 授权后显示房间码 + 二维码（手机扫码加入） |
| 播放界面 | 全屏MV/音频可视化、逐行歌词同步、底部状态栏 |
| 播放控制 | 上一首/下一首/暂停/原伴唱切换/音调±/混响 |
| 原伴唱切换 | 三模式循环：原唱→伴奏→人声辅助→原唱 |
| 点歌队列 | 右侧悬浮显示待播列表 |
| 遥控器适配 | 方向键导航、OK键确认、数字键输入房间码 |

### 4.3 手机点歌H5（Mobile H5）

| 模块 | 功能点 |
|------|--------|
| 加入房间 | 扫码进入 或 手动输入房间码（后端校验房间授权状态及是否过期） |
| 授权校验提示 | 未授权/已过期房间显示"该房间尚未授权或授权已过期，请联系管理员" |
| 搜索点歌 | 拼音搜索（首字母/全拼）、歌手索引A-Z |
| 分类浏览 | 按语种/年代/风格/心情/主题分类筛选歌曲 |
| 歌手浏览 | 歌手A-Z索引、歌手详情页（全部歌曲） |
| 点歌操作 | 加入队列、插队播放、置顶、取消 |
| 我的点歌 | 查看已点歌曲状态（待播/播放中/已播） |
| 播放控制 | 切歌（投票制或独享）、调节音量 |
| 歌单浏览 | 浏览管理员创建的歌单并点歌 |

### 4.4 人声分离功能

**支持输入**：
- 纯音频文件（MP3/FLAC/M4A）— 主流场景，最快
- MV视频文件（MP4/MKV等）— 自动提取音频后分离

**分离输出**：
- `vocals.mp3` — 人声音轨
- `instrumental.mp3` — 伴奏音轨

**使用场景**：
- 伴奏模式（KTV核心）：播放 instrumental + 歌词
- 原唱模式：播放原文件
- 人声辅助：伴奏 + 小音量人声叠加，帮助找调

**处理流程**：
```
1. 接收任务（音频或视频路径）
2. ffmpeg 提取/转码为 WAV (44.1kHz stereo)        阶段: extracting (10%)
3. Demucs 模型加载（首次启动慢，后续缓存）
4. Demucs 推理分离                                阶段: separating (10%-80%)
5. 输出 vocals.wav + no_vocals.wav
6. ffmpeg 转码为 MP3 (320kbps)                    阶段: encoding (80%-95%)
7. 回调 Backend 更新数据库                        阶段: done (100%)
8. 清理中间 WAV 文件
```

### 4.5 AI辅助解析功能

**支持输入**：
- 歌曲文件名 + ID3/Vorbis标签原始信息
- 已有歌手库、分类库（作为AI参考上下文）

**解析输出**：
```json
{
  "title": "吻别",
  "artist": "张学友",
  "artist_pinyin": "zhangxueyou",
  "artist_first_letter": "Z",
  "language": "粤语",
  "era": "90年代",
  "genre": "流行",
  "mood": "伤感",
  "confidence": 0.95,
  "need_review": false
}
```

**触发方式**：
| 触发场景 | 说明 |
|---------|------|
| 扫描后自动触发 | 系统设置开启「扫描后自动AI解析」时，扫描完成自动入队 |
| 上传后自动触发 | 上传文件入库后自动入队（受总开关控制） |
| 手动单首触发 | 歌曲管理页点击「AI解析」按钮 |
| 手动批量触发 | 勾选多首 → 「批量AI解析」，或AI解析中心页操作 |
| 失败重试 | AI解析中心页对失败任务批量重试 |

**提示词模板**（可在后台编辑）：
```
你是一个音乐元数据分析专家。请根据以下歌曲文件信息，分析并返回JSON格式的元数据。

文件名: {filename}
原始标签: {raw_tags}
时长: {duration}

已有歌手库参考（用于匹配，避免重复创建）:
{existing_artists_sample}

已有分类参考:
- 语种: 国语、粤语、英语、日语、韩语、其他
- 年代: 70年代、80年代、90年代、00年代、10年代、20年代
- 风格: 流行、摇滚、民谣、古典、电子、说唱、R&B、其他
- 心情: 伤感、欢快、励志、浪漫、激情、安静、其他

请返回严格的JSON格式：
{{
  "title": "规范化的歌曲名",
  "artist": "歌手名（如有多个用、分隔）",
  "artist_pinyin": "歌手拼音全拼（小写无空格）",
  "artist_first_letter": "首字母大写",
  "language": "从参考分类中选择",
  "era": "从参考分类中选择",
  "genre": "从参考分类中选择",
  "mood": "从参考分类中选择",
  "confidence": 0.0-1.0,
  "need_review": true/false
}}
```

**解析结果处理**：
- `confidence >= 0.85` 且 `need_review=false` → 自动应用，标记 `ai_parsed=true`
- `confidence < 0.85` 或 `need_review=true` → 标记为待审核，需管理员确认后才应用
- AI解析结果不影响原始文件，仅更新数据库字段
- 管理员可随时手动修正AI解析结果

### 4.6 歌手与分类管理

**歌手管理**：
| 功能 | 说明 |
|------|------|
| 歌手列表 | 按首字母A-Z分组、搜索、分页 |
| 新增歌手 | 手动录入（名称、头像、简介） |
| 编辑歌手 | 修改信息、更换头像 |
| 删除歌手 | 关联歌曲改为"未知歌手"或迁移到其他歌手 |
| 合并歌手 | 将重复歌手合并（如"张学友"与"Jacky Cheung"），歌曲自动迁移 |
| 歌曲数量统计 | 每个歌手显示关联歌曲总数 |

**分类管理**：
分类采用「分类组 + 分类项」两级结构：
```
分类组（Category Group）
  ├── 语种
  │   ├── 国语
  │   ├── 粤语
  │   ├── 英语
  │   └── ...
  ├── 年代
  │   ├── 70年代
  │   ├── 80年代
  │   └── ...
  ├── 风格
  │   ├── 流行
  │   ├── 摇滚
  │   └── ...
  ├── 心情
  │   ├── 伤感
  │   ├── 欢快
  │   └── ...
  └── 主题（可自定义）
      ├── 经典老歌
      ├── 抖音热歌
      └── ...
```

| 功能 | 说明 |
|------|------|
| 分类组管理 | 新增/编辑/删除/排序分类组（如"语种""年代"） |
| 分类项管理 | 在分类组下新增/编辑/删除/排序分类项 |
| 歌曲归类 | 单首/批量将歌曲添加到分类项（一首歌可属多个分类） |
| AI自动归类 | AI解析后自动创建分类关联 |
| 分类歌曲数 | 每个分类项显示关联歌曲数 |

---

## 五、数据库设计

### 5.1 核心表结构

```
users              管理员用户
  id, username, password_hash, role, created_at

albums             专辑
  id, name, artist_id, cover, year

songs              歌曲
  id, title, artist_id, album_id
  file_path, file_type (audio|video)
  duration, lyrics_path
  pitch_default, play_count, created_at
  # 人声分离字段
  vocals_path, instrumental_path
  separation_status (pending|processing|completed|failed)
  separation_model (htdemucs|htdemucs_ft)
  separation_started_at, separation_completed_at
  separation_error
  # AI解析字段
  ai_parsed (0|1)               -- 是否已AI解析
  ai_parsed_at                  -- AI解析时间
  ai_confidence                 -- AI置信度 (0.0-1.0)
  ai_need_review (0|1)          -- 是否待人工审核
  raw_tags (JSON)               -- 原始ID3标签（解析前保存）

artists            歌手
  id, name, pinyin, first_letter, avatar, bio, created_at
  song_count                   -- 冗余字段，歌曲数量（定期更新）

categories         分类组
  id, name (语种|年代|风格|心情|主题), sort_order, created_at

category_items     分类项
  id, category_id, name (国语|粤语|流行|摇滚...), sort_order
  song_count                   -- 冗余字段，歌曲数量

song_categories    歌曲-分类关联（多对多）
  id, song_id, category_item_id
  source (manual|ai)           -- 来源：手动归类或AI自动归类

playlists          歌单
  id, name, cover, description, sort_order

playlist_songs     歌单歌曲
  playlist_id, song_id, sort_order

rooms              房间（设备授权机制）
  id, code, device_id (UUID唯一), name
  authorized (0|1), authorized_at, authorized_by (user_id)
  authorize_type (permanent|temporary)   -- 授权类型
  authorize_expires_at                   -- 临时授权过期时间（永久授权为null）
  status (pending|active|closed|revoked)
                                -- pending: 已注册未授权
                                -- active: 已授权且活跃
                                -- closed: 设备长时间未活跃自动关闭
                                -- revoked: 已授权后被撤销或临时授权过期
  device_info (JSON)            -- 设备型号、Android版本、App版本等
  created_at, closed_at, last_active_at

room_queues        房间队列
  id, room_id, song_id, user_session_id
  status (pending|playing|played|skipped)
  sort_order, requested_at

room_sessions      房间会话
  id, room_id, nickname, avatar, joined_at, left_at

play_history       播放历史
  id, room_id, song_id, played_at, duration_played

separation_tasks   分离任务（独立任务表，用于队列管理）
  id, song_id, status, model, priority
  progress, stage, error
  created_at, started_at, completed_at

ai_parse_tasks     AI解析任务（独立任务表，用于队列管理）
  id, song_id, status (pending|processing|completed|failed|reviewing)
  model, prompt_template, result (JSON), error
  confidence, need_review
  created_at, started_at, completed_at

settings           系统配置
  key, value
  -- AI相关配置key示例：
  -- ai_enabled, ai_base_url, ai_api_key, ai_model, ai_temperature
  -- ai_prompt_template, ai_auto_parse_after_scan
  -- ai_auto_parse_after_upload, ai_confidence_threshold
  -- separation_auto_enable, separation_default_model, separation_max_concurrent
```

### 5.2 索引设计

- `songs.title` + `songs.artist_id` — 列表查询
- `songs.separation_status` — 分离任务筛选
- `songs.ai_parsed` + `songs.ai_need_review` — AI解析任务筛选
- `room_queues.room_id` + `room_queues.status` — 队列查询
- `artists.first_letter` — 歌手A-Z索引
- `artists.name` UNIQUE — 防止重复歌手
- `songs.file_path` UNIQUE — 防止重复入库
- `rooms.device_id` UNIQUE — 一个设备对应一个房间
- `rooms.code` UNIQUE — 房间码唯一
- `rooms.authorized` + `rooms.status` — 授权管理筛选
- `rooms.authorize_type` + `rooms.authorize_expires_at` — 临时授权过期检查
- `category_items.category_id` — 分类项按组查询
- `song_categories.song_id` + `song_categories.category_item_id` — 歌曲分类关联查询

---

## 六、项目目录结构

```
nasktv/
├── package.json                    # pnpm workspace根
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml              # 飞牛NAS部署编排
├── .env.example
├── DEVELOPMENT_PLAN.md             # 本文档
│
├── packages/
│   ├── shared/                     # 共享代码（前后端公用）
│   │   └── src/
│   │       ├── schema/             # Drizzle表定义
│   │       │   ├── users.ts
│   │       │   ├── songs.ts
│   │       │   ├── artists.ts
│   │       │   ├── categories.ts
│   │       │   ├── rooms.ts
│   │       │   ├── separation.ts
│   │       │   ├── ai-parse.ts
│   │       │   └── index.ts
│   │       ├── types/              # WS消息类型、API契约
│   │       │   ├── ws.ts
│   │       │   └── api.ts
│   │       └── utils/              # pinyin、duration格式化、LRC解析
│   │
│   ├── backend/                    # Node.js API + WS服务
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # 管理员登录
│   │   │   │   ├── songs.ts        # 歌曲CRUD + 上传
│   │   │   │   ├── scan.ts         # 扫描触发/状态
│   │   │   │   ├── separation.ts   # 分离任务管理
│   │   │   │   ├── ai-parse.ts     # AI解析任务管理 + 配置
│   │   │   │   ├── artists.ts      # 歌手管理（CRUD/合并）
│   │   │   │   ├── categories.ts   # 分类组/分类项管理
│   │   │   │   ├── devices.ts      # 设备注册 + 授权管理（临时/永久）
│   │   │   │   ├── rooms.ts        # 房间加入（含授权校验）
│   │   │   │   ├── playlists.ts
│   │   │   │   └── stats.ts        # 仪表盘统计
│   │   │   ├── ws/
│   │   │   │   ├── index.ts        # WS服务器
│   │   │   │   ├── device-handler.ts   # 设备授权状态推送（含过期提醒）
│   │   │   │   ├── room-handler.ts # 房间消息处理（含授权校验）
│   │   │   │   └── admin-handler.ts# Admin进度推送（分离+AI解析）
│   │   │   ├── services/
│   │   │   │   ├── scanner.ts      # 歌曲库扫描器
│   │   │   │   ├── id3.ts          # 标签解析
│   │   │   │   ├── pinyin.ts       # 拼音生成
│   │   │   │   ├── device-manager.ts    # 设备注册与授权管理（含临时授权过期）
│   │   │   │   ├── room-manager.ts # 房间状态管理
│   │   │   │   ├── separator-client.ts  # 调用Python微服务
│   │   │   │   ├── separation-queue.ts  # 分离任务队列管理
│   │   │   │   ├── ai-client.ts         # OpenAI兼容接口调用封装
│   │   │   │   ├── ai-parse-queue.ts    # AI解析任务队列管理
│   │   │   │   ├── ai-prompt.ts         # 提示词模板构造
│   │   │   │   ├── artist-manager.ts    # 歌手管理（含合并逻辑）
│   │   │   │   └── category-manager.ts  # 分类管理
│   │   │   ├── middleware/
│   │   │   │   ├── jwt.ts
│   │   │   │   └── error.ts
│   │   │   ├── db/
│   │   │   │   └── index.ts        # SQLite连接
│   │   │   └── index.ts            # Express启动入口
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── separator/                  # 人声分离微服务（Python）
│   │   ├── pyproject.toml          # uv管理
│   │   ├── app/
│   │   │   ├── main.py             # FastAPI服务入口
│   │   │   ├── worker.py           # 分离任务执行器
│   │   │   ├── demucs_runner.py    # Demucs调用封装
│   │   │   ├── audio_utils.py      # 音频提取/转码（ffmpeg）
│   │   │   └── models.py           # 任务模型
│   │   ├── Dockerfile              # PyTorch基础镜像
│   │   └── README.md
│   │
│   ├── admin-web/                  # 管理后台
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Songs.tsx       # 歌曲管理（含上传、AI解析状态）
│   │   │   │   ├── Scan.tsx        # 扫描任务
│   │   │   │   ├── Separation.tsx  # 人声分离管理
│   │   │   │   ├── AiParse.tsx     # AI解析中心（任务/审核/配置）
│   │   │   │   ├── Artists.tsx     # 歌手管理（新增/合并）
│   │   │   │   ├── Categories.tsx  # 分类管理（组/项）
│   │   │   │   ├── Playlists.tsx
│   │   │   │   ├── Devices.tsx     # 设备授权管理（临时/永久）
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/
│   │   │   ├── api/                # axios封装
│   │   │   ├── stores/             # Zustand
│   │   │   ├── ws/                 # WS客户端
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   ├── mobile-h5/                  # 手机点歌H5
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Join.tsx        # 加入房间
│   │   │   │   ├── Search.tsx      # 搜索点歌
│   │   │   │   ├── Categories.tsx  # 分类浏览
│   │   │   │   ├── Artists.tsx     # 歌手A-Z索引
│   │   │   │   ├── ArtistDetail.tsx # 歌手详情
│   │   │   │   ├── Queue.tsx       # 当前队列
│   │   │   │   ├── Mine.tsx        # 我的点歌
│   │   │   │   └── Playlists.tsx
│   │   │   ├── components/
│   │   │   ├── ws/                 # WS客户端
│   │   │   ├── stores/
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── tv-app/                     # Tauri电视端
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Register.tsx    # 首次启动注册（生成device_id）
│       │   │   ├── Pending.tsx     # 等待授权界面（显示房间码）
│       │   │   ├── Revoked.tsx     # 授权被撤销界面
│       │   │   ├── Player.tsx      # 主播放界面（授权后）
│       │   │   └── Queue.tsx       # 队列面板
│       │   ├── components/
│       │   │   ├── VideoPlayer.tsx # 音视频播放器
│       │   │   ├── AudioPlayer.tsx # 纯音频播放器+可视化
│       │   │   ├── Lyric.tsx       # 歌词同步组件
│       │   │   └── RemoteControl.tsx # 遥控器键值处理
│       │   ├── hooks/
│       │   │   ├── useRemote.ts    # 遥控器按键hook
│       │   │   ├── useDevice.ts    # 设备注册与授权状态hook
│       │   │   └── useRoom.ts      # 房间WS连接
│       │   ├── stores/
│       │   └── App.tsx
│       ├── src-tauri/
│       │   ├── tauri.conf.json
│       │   ├── Cargo.toml
│       │   └── src/main.rs
│       └── package.json
│
└── data/                           # 部署时挂载（gitignore）
    ├── db/nasktv.db
    ├── songs/                      # 歌曲库（音频+MV）
    ├── separated/                  # 分离结果
    │   └── song_123/
    │       ├── vocals.mp3
    │       └── instrumental.mp3
    ├── uploads/                    # 上传临时目录
    └── models/                     # Demucs模型缓存
        └── htdemucs_base.pth
```

---

## 七、Docker Compose 编排

```yaml
services:
  nasktv-backend:
    image: nasktv/backend:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data/db:/app/data/db
      - ./data/songs:/app/data/songs:ro
      - ./data/separated:/app/data/separated
      - ./data/uploads:/app/data/uploads
      - /share/音乐:/media/music:ro       # 飞牛NAS音乐共享目录
    environment:
      - JWT_SECRET=your-secret
      - SCAN_PATH=/media/music
      - DB_PATH=/app/data/db/nasktv.db
      - SEPARATOR_SERVICE_URL=http://nasktv-separator:8000
      - SEPARATION_OUTPUT_DIR=/app/data/separated
      - SEPARATION_AUTO_ENABLE=true
      # AI解析配置（也可在后台系统设置页配置，写入settings表）
      - AI_ENABLED=false
      - AI_BASE_URL=https://api.openai.com/v1
      - AI_API_KEY=
      - AI_MODEL=gpt-4o-mini
      - AI_AUTO_PARSE_AFTER_SCAN=true
    restart: unless-stopped

  nasktv-separator:
    image: nasktv/separator:latest
    ports:
      - "8001:8000"
    volumes:
      - ./data/songs:/media/songs:ro
      - ./data/separated:/media/separated
      - ./data/models:/app/models
    environment:
      - MAX_CONCURRENT=1
      - DEFAULT_MODEL=htdemucs
      - HIGH_QUALITY_MODEL=htdemucs_ft
      - LOG_LEVEL=info
    restart: unless-stopped

  nasktv-web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./admin-web/dist:/usr/share/nginx/html/admin
      - ./mobile-h5/dist:/usr/share/nginx/html/h5
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - nasktv-backend
    restart: unless-stopped
```

**访问方式**：
- 管理后台：`http://NAS_IP:8080/admin`
- 手机H5：`http://NAS_IP:8080/h5`（或扫码直接进入房间）
- 电视APK：单独安装到Android TV，启动后配置后端地址

---

## 八、API 接口规划

### 8.1 认证接口

```
POST   /api/auth/login              管理员登录
POST   /api/auth/logout             退出登录
GET    /api/auth/me                 获取当前用户
```

### 8.2 歌曲接口

```
GET    /api/songs                   歌曲列表（分页/搜索/筛选）
GET    /api/songs/:id               歌曲详情
PUT    /api/songs/:id               编辑歌曲信息
DELETE /api/songs/:id               删除歌曲
POST   /api/songs/upload            上传歌曲（音频/MV）
GET    /api/songs/:id/lyrics        获取歌词
GET    /api/songs/:id/stream        音频流（支持range）
GET    /api/songs/:id/mv            MV视频流
```

### 8.3 扫描接口

```
POST   /api/scan/trigger            触发扫描
GET    /api/scan/status             扫描状态
GET    /api/scan/history            扫描历史
```

### 8.4 人声分离接口

```
POST   /api/songs/:id/separate              触发单首分离
POST   /api/songs/separate-batch            批量分离
GET    /api/songs/:id/separation            查询分离状态
DELETE /api/songs/:id/separation            取消分离任务
GET    /api/songs/:id/vocals                人声音频流
GET    /api/songs/:id/instrumental          伴奏音频流
GET    /api/admin/separation/stats          分离统计
GET    /api/admin/separation/queue          任务队列
POST   /api/admin/separation/retry          批量重试
```

### 8.5 设备与房间接口

```
# 设备注册（电视端调用，无需JWT）
POST   /api/devices/register        电视端首次启动注册（生成房间码）
GET    /api/devices/:device_id/status  查询设备授权状态（含授权类型/过期时间）

# 设备授权管理（管理员，需JWT）
GET    /api/admin/devices           设备列表（支持按状态/授权类型筛选）
GET    /api/admin/devices/pending   待授权设备列表
POST   /api/admin/devices/:id/authorize  授权设备
  Body: {
    "type": "permanent|temporary",       -- 授权类型
    "expires_hours": 24,                 -- 临时授权时长（小时），type=temporary时必填
    "name": "客厅电视"                   -- 可选，设备名称
  }
POST   /api/admin/devices/:id/revoke     撤销授权
POST   /api/admin/devices/:id/renew      续期临时授权
  Body: { "expires_hours": 24, "type": "temporary|permanent" }
PUT    /api/admin/devices/:id       编辑设备信息（名称等）
DELETE /api/admin/devices/:id       删除设备记录

# 房间加入（手机端调用，无需JWT但需房间码）
POST   /api/rooms/join              加入房间（校验授权状态及是否过期）
                                     -- 已授权且未过期：返回session_token
                                     -- 未授权/已过期：返回403
```

### 8.6 AI解析接口

```
# AI配置管理
GET    /api/admin/ai/config         获取AI配置（API Key脱敏返回）
PUT    /api/admin/ai/config         更新AI配置
  Body: {
    "enabled": true,
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-xxx",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "prompt_template": "...",            -- 自定义提示词模板
    "auto_parse_after_scan": true,
    "auto_parse_after_upload": true,
    "confidence_threshold": 0.85
  }
POST   /api/admin/ai/test           测试AI连接（发送一个简单请求验证配置）

# AI解析任务管理
POST   /api/songs/:id/ai-parse              触发单首AI解析
POST   /api/songs/ai-parse-batch            批量AI解析
  Body: { "song_ids": [1,2,3] }
GET    /api/songs/:id/ai-parse              查询AI解析状态/结果
GET    /api/admin/ai-parse/stats            AI解析统计
GET    /api/admin/ai-parse/queue            任务队列
GET    /api/admin/ai-parse/review           待审核列表
POST   /api/admin/ai-parse/retry            批量重试
POST   /api/admin/ai-parse/:id/approve      审核通过（应用解析结果）
POST   /api/admin/ai-parse/:id/reject       审核拒绝
PUT    /api/admin/ai-parse/:id              修改解析结果后应用
```

### 8.7 歌手管理接口

```
GET    /api/artists                歌手列表（分页/搜索/首字母筛选）
GET    /api/artists/:id            歌手详情（含歌曲列表）
POST   /api/artists                新增歌手
  Body: { "name": "张学友", "avatar": "...", "bio": "..." }
PUT    /api/artists/:id            编辑歌手
DELETE /api/artists/:id            删除歌手（关联歌曲迁移到指定歌手或"未知"）
  Body: { "migrate_to": 123 }      -- 迁移目标歌手ID，不传则改为"未知歌手"
POST   /api/artists/merge          合并歌手
  Body: { "source_ids": [1,2], "target_id": 3 }  -- 多个源歌手合并到目标歌手
GET    /api/artists/:id/songs      歌手下所有歌曲
```

### 8.8 分类管理接口

```
# 分类组管理
GET    /api/categories             所有分类组（含分类项树）
POST   /api/categories             新增分类组
  Body: { "name": "主题", "sort_order": 5 }
PUT    /api/categories/:id         编辑分类组
DELETE /api/categories/:id         删除分类组（需先清空分类项）

# 分类项管理
POST   /api/categories/:id/items   新增分类项
  Body: { "name": "抖音热歌", "sort_order": 1 }
PUT    /api/category-items/:id     编辑分类项
DELETE /api/category-items/:id     删除分类项（自动解除歌曲关联）

# 歌曲-分类关联
POST   /api/songs/:id/categories   为歌曲添加分类
  Body: { "category_item_ids": [1,2,3] }
DELETE /api/songs/:id/categories/:itemId  从歌曲移除某分类
GET    /api/category-items/:id/songs      分类项下所有歌曲
```

### 8.9 歌单接口

```
GET    /api/playlists               歌单列表
POST   /api/playlists               创建歌单
PUT    /api/playlists/:id           编辑歌单
DELETE /api/playlists/:id           删除歌单
POST   /api/playlists/:id/songs     添加歌曲到歌单
DELETE /api/playlists/:id/songs/:songId  从歌单移除
```

### 8.10 内部回调接口

```
POST   /api/internal/separation-callback    Separator服务回调
POST   /api/internal/scan-callback          扫描完成回调
```

---

## 九、开发阶段路线图

### 阶段1：基础设施 + 后端核心（地基）
**目标**：搭建monorepo + 后端框架 + 数据库

- [x] pnpm workspace 脚手架（packages/shared, backend, admin-web, mobile-h5, tv-app, separator）
- [x] tsconfig.base.json 共享配置
- [x] Drizzle schema 全表定义（含分离字段）
- [x] drizzle.config.ts + 首次迁移脚本
- [x] Express框架 + JWT中间件 + 错误处理
- [x] SQLite连接（better-sqlite3）
- [x] 管理员登录、歌曲CRUD接口
- [x] ESLint + Prettier 代码规范配置
- [x] Docker 多阶段构建配置
- [x] Docker Compose 部署编排

**验证标准**：能用REST API登录、增删改查歌曲

---

### 阶段2：歌曲库扫描器 + 歌手分类基础
**目标**：自动扫描NAS目录并入库，建立歌手和分类基础数据

- [x] 递归扫描（支持 .mp3/.flac/.m4a/.mp4）
- [x] music-metadata 解析ID3/Vorbis标签
- [x] chardet 编码检测（解决GBK乱码）
- [x] pinyin-pro 生成拼音首字母
- [x] MV/音频文件类型识别
- [x] 歌词文件(.lrc)关联匹配
- [x] 增量扫描（基于mtime）
- [x] 扫描进度WS推送
- [x] 歌手自动入库（标签中的歌手自动创建记录）
- [x] 默认分类组初始化（语种/年代/风格/心情）

**验证标准**：扫描本地1000+歌曲，标签解析正确，可重复扫描不重复入库，歌手和默认分类已建立

---

### 阶段2.5：人声分离微服务
**目标**：Python服务跑通Demucs分离

- [x] Python + FastAPI + Demucs 环境搭建
- [x] uv 包管理配置（pyproject.toml）
- [x] 音频/视频统一处理（ffmpeg提取音频）
- [x] Demucs v4 调用封装
- [x] 进度回调机制
- [x] MP3转码输出
- [x] Dockerfile（PyTorch基础镜像）
- [x] 模型缓存持久化

**验证标准**：手动调用API分离一首MV/音频，产出vocals.mp3 + instrumental.mp3

---

### 阶段2.6：AI辅助解析服务
**目标**：后端集成OpenAI兼容接口，实现歌曲元数据AI解析

- [x] openai npm 包集成（兼容OpenAI协议）
- [x] ai-client 封装（Base URL/API Key/Model 可配置）
- [x] ai-prompt 提示词模板构造（含已有歌手/分类参考）
- [x] AI解析任务队列（ai-parse-queue）
- [x] 解析结果JSON解析与校验
- [x] 歌手自动匹配/新建逻辑
- [x] 分类自动关联逻辑
- [x] 置信度阈值判断（自动应用 vs 待审核）
- [x] AI配置接口（GET/PUT /api/admin/ai/config）
- [x] AI连接测试接口
- [x] 解析进度WS推送

**验证标准**：
- 配置AI接口后，手动触发单首歌曲解析，返回正确的歌手/分类信息
- 扫描后自动触发AI解析（开关开启时）
- 低置信度结果进入待审核状态

---

### 阶段3：管理后台UI
**目标**：Admin Web可视化操作

> **Hallmark 强制要求**：本阶段所有页面与组件的开发，**第一步**必须 `Use Skill: hallmark`。Admin Web 默认走 `modern-minimal` genre + Coral/Cobalt 主题聚类；每个页面（Login / Dashboard / Songs / Scan / Separation / AiParse / Artists / Categories / Playlists / Devices / Settings）均需独立走完整 Hallmark 设计流程（Pre-flight → 设计上下文网关 → 宏结构 → 主题 → 视觉规则集 → Hero enrichment → Preview → Build → Slop test），并通过 `.hallmark/log.json` 触发结构多样化。视觉决策必须由 `tokens.css` 令牌驱动，不得手写硬编码颜色/字体/间距。详见 §2.6。

- [x] **调用 `Use Skill: hallmark` 完成 Pre-flight 扫描**（产出 `.hallmark/preflight.json` + 项目根 `tokens.css`）
- [x] Vite + React + TailwindCSS 搭建（Tailwind 仅作为 Hallmark 令牌的渲染载体）
- [x] 路由结构（Login/Dashboard/Songs/Scan/Separation/AiParse/Artists/Categories/Playlists/Devices/Settings）— 每个路由页面单独走一次 Hallmark 构建
- [x] Zustand 状态管理
- [x] Axios + JWT拦截器
- [x] 仪表盘统计图表（含AI解析统计）— Hallmark 产出，stat-led / bento grid 等宏结构候选
- [x] 歌曲管理（列表/搜索/编辑/删除/AI解析状态标识）— Hallmark 产出列表/网格视图、表格 8 状态交互
- [x] 歌曲上传（拖拽+批量）— Hallmark 产出上传组件与拖拽视觉反馈
- [x] 扫描任务页 — Hallmark 产出进度可视化
- [x] 歌手管理页（列表/新增/编辑/删除/合并）— Hallmark 产出表单、合并流程视觉
- [x] 分类管理页（分类组/分类项树形管理）— Hallmark 产出树形组件视觉
- [x] AI解析中心页（任务概览/队列/审核/配置）— Hallmark 产出任务卡片、审核表单
- [x] 设备授权管理页（待授权列表/临时授权/永久授权/续期/撤销）— Hallmark 产出授权操作流、倒计时视觉
- [x] 系统设置页（含AI配置区）— Hallmark 产出表单分组与配置面板
- [x] **每页面交付前必须通过 Hallmark 58 道 slop-test 门禁**

**验证标准**：后台可视化操作所有歌曲功能，能看到待授权设备并完成临时/永久授权，能管理歌手和分类，能配置AI并查看解析任务；所有页面 CSS 首行带 Hallmark stamp，`.hallmark/log.json` 记录 11 个页面的宏结构/主题多样化轨迹

---

### 阶段3.5：后端集成分离服务
**目标**：后端管理分离任务全流程

- [x] separator-client 实现（HTTP调用Python服务）
- [x] separation-queue 任务队列（并发控制、重试）
- [x] 扫描后自动入队分离任务
- [x] 分离任务WS进度推送
- [x] Admin 分离管理页（任务概览/队列/重试/试听）
- [x] 分离结果音频流接口
- [x] 失败重试机制

**验证标准**：后台上传MV/音频，Admin页面实时看到分离进度，完成后可试听

---

### 阶段4：WebSocket + 设备授权 + 房间机制
**目标**：多房间实时通信 + 设备授权流程（含临时/永久授权）

- [x] WS服务器 + 设备连接路由（按device_id）
- [x] 房间码生成（后端生成6位随机码，注册时分配）
- [x] 设备注册接口（POST /api/devices/register）
- [x] 授权状态管理（pending/active/revoked/closed）
- [x] **临时授权/永久授权逻辑**（authorize_type + authorize_expires_at）
- [x] **临时授权过期定时检查任务**（每分钟扫描即将过期的授权）
- [x] **过期前10分钟推送 ROOM_EXPIRING_SOON 提醒**（实现为提前5分钟推送，见 index.ts setInterval）
- [x] **授权状态校验中间件**（WS消息处理前校验authorized字段及临时授权是否过期）
- [x] 授权/撤销授权/续期 WS推送
- [x] 点歌/插队/切歌消息协议（仅授权且未过期房间可用）
- [x] WS断线重连（TV App 和移动 H5 客户端均实现 exponential backoff 重连）
- [x] 心跳检测
- [x] 设备活跃状态更新（心跳上报last_active_at）
- [x] 房间状态恢复

**验证标准**：
- 电视端模拟注册 → 后台临时授权 → 电视端收到授权消息并显示倒计时
- 临时授权过期后自动撤销，电视端回到等待授权界面
- 两个浏览器实例能建立WS并互发点歌消息
- 未授权/已过期房间尝试点歌被拒绝

---

### 阶段5：手机点歌H5
**目标**：移动端点歌全流程

> **Hallmark 强制要求**：本阶段所有页面与组件的开发，**第一步**必须 `Use Skill: hallmark`。Mobile H5 默认走 `editorial` genre（或 `playful`，视设计上下文网关结果）+ Specimen/Atelier/Newsprint/Studio/Garden/Hum 主题聚类；每个页面（Join / Search / Categories / Artists / ArtistDetail / Queue / Mine / Playlists）均需独立走完整 Hallmark 设计流程，并通过 `.hallmark/log.json` 触发结构多样化。所有页面必须通过 320 / 375 / 414 / 768 px 四档移动端响应验证。详见 §2.6。

- [x] **调用 `Use Skill: hallmark` 完成 Pre-flight 扫描**（复用项目根 `tokens.css`，按 mobile genre 切换主题子集）
- [x] 移动端UI（搜索/队列/我的点歌/歌单/分类/歌手）— Hallmark 产出每个页面，复用三端共享令牌
- [x] WS客户端 + 房间加入流程（含授权校验及过期提示）— Hallmark 产出加入房间与过期提示界面
- [x] 拼音搜索（首字母/全拼）— Hallmark 产出搜索框、候选列表、A-Z 索引视觉
- [x] 歌手索引A-Z + 歌手详情页 — Hallmark 产出索引栏与详情布局
- [x] 分类浏览页（按语种/年代/风格/心情/主题筛选）— Hallmark 产出筛选 chip 与歌曲网格
- [x] 点歌/插队/取消操作 — Hallmark 产出操作按钮 8 状态、动画反馈
- [x] 播放状态实时同步 — Hallmark 产出当前播放卡片与队列视觉
- [x] 未授权/已过期房间提示界面 — Hallmark 产出空状态与提示插画
- [x] **每页面交付前必须通过 Hallmark 58 道 slop-test 门禁（含移动端响应四档）**

**验证标准**：
- 手机扫码加入已授权房间，点歌能进入队列
- 扫码加入未授权/已过期房间，显示相应提示
- 能按分类和歌手浏览歌曲并点歌
- 所有页面 CSS 首行带 Hallmark stamp，`.hallmark/log.json` 记录 8 个页面的宏结构/主题多样化轨迹

---

### 阶段6：电视端Tauri App（基础）
**目标**：Android TV播放器跑通 + 设备授权流程

> **Hallmark 强制要求**：本阶段 Tauri Rust 外壳与 Android TV 打包配置不适用 Hallmark；但 **WebView 内所有 React 页面**（Register / Pending / Revoked / Player / Queue）的视觉设计与实现，**第一步**必须 `Use Skill: hallmark`。TV 端默认走 `atmospheric` genre + Bloom/Midnight/Terminal/Aurora/Lumen 主题聚类以适配客厅暗光远距离观看；遥控器焦点视觉、倒计时弹窗、二维码界面均由 Hallmark 产出。详见 §2.6。

- [x] Tauri项目搭建 + Android TV打包配置（Rust 外壳，非 Hallmark 范围）
- [x] **调用 `Use Skill: hallmark` 完成 Pre-flight 扫描**（复用项目根 `tokens.css`，按 atmospheric genre 切换主题子集）
- [x] **首次启动注册流程**（生成device_id + 调用注册接口）— Hallmark 产出注册页视觉
- [x] **等待授权界面**（显示房间码 + 提示信息）— Hallmark 产出大字号房间码展示页
- [x] **授权状态WS监听**（接收授权/撤销/过期消息）— Hallmark 产出状态变更过渡视觉
- [x] **临时授权倒计时显示**（角落显示剩余时间，即将到期弹窗提醒）— Hallmark 产出倒计时组件与弹窗
- [x] 授权后正常界面（二维码生成 + 播放器）— Hallmark 产出二维码展示与播放器外壳
- [x] 音频播放器 + 歌词同步 — Hallmark 产出歌词逐行高亮、播放控件 8 状态
- [x] MV视频播放器 — Hallmark 产出全屏播放器覆盖层（控件/字幕/原伴唱切换）
- [x] 房间WS连接 + 队列监听 — Hallmark 产出右侧悬浮队列面板
- [x] 基础遥控器键值映射 — Hallmark 产出焦点环、方向键导航视觉
- [x] **每页面交付前必须通过 Hallmark 58 道 slop-test 门禁**

**验证标准**：
- 电视APK安装后首次启动能注册并显示房间码
- 管理员临时授权后电视端显示倒计时，永久授权无倒计时
- 授权过期后电视端自动回到等待授权界面
- 电视端能播放手机点的歌
- WebView 内所有页面 CSS 首行带 Hallmark stamp，`.hallmark/log.json` 记录 5 个页面的宏结构/主题多样化轨迹

---

### 阶段6.5：TV端原伴唱切换 + 高级控制
**目标**：完整KTV体验

> **Hallmark 强制要求**：本阶段涉及的所有 TV WebView 视觉元素（原伴唱切换控件、音调滑块、混响面板、遥控器焦点视觉、Leanback 适配样式）必须通过 `Use Skill: hallmark` 产出，继续延用阶段6 的 `atmospheric` genre 与主题聚类，复用 `tokens.css` 令牌。详见 §2.6。

- [x] 双音轨同步播放（原文件 + 伴奏）— 底层音频逻辑，非视觉层
- [x] 原伴唱三模式切换（原唱/伴奏/人声辅助）— Hallmark 产出三模式切换控件 8 状态
- [x] 音调调整（Web Audio API）— Hallmark 产出音调滑块与数值显示
- [x] 混响效果 — Hallmark 产出混响调节面板
- [x] 遥控器完整交互（方向键+OK+原伴唱键）— Hallmark 产出焦点环、按键提示视觉
- [x] Android TV Leanback UI规范适配 — Hallmark 产出 Leanback 风格的浏览卡片与栅格
- [ ] **每页面/组件交付前必须通过 Hallmark 58 道 slop-test 门禁**

**验证标准**：电视播放MV/音频时按遥控器能切换原伴唱，音调可调；所有新增控件 CSS 首行带 Hallmark stamp

---

### 阶段7：飞牛NAS Docker部署
**目标**：一键部署到NAS

- [x] backend 多阶段Dockerfile
- [x] admin-web 构建产物Dockerfile
- [x] mobile-h5 构建产物Dockerfile
- [x] separator Dockerfile（PyTorch基础镜像）
- [x] docker-compose.yml 完整编排
- [x] nginx反代配置
- [x] 数据目录挂载规范
- [x] 部署文档（README）

**验证标准**：NAS上一键 `docker compose up` 全部服务可用（`docker compose config` 已通过语法校验；运行时验证需启动 Docker Desktop 后执行 `docker compose up -d --build`）

---

### 阶段8：体验优化（可选）
**目标**：打磨细节

> **Hallmark 强制要求**：本阶段所有视觉/动效相关优化（歌词逐字高亮、音频可视化、收藏交互、虚拟滚动视觉）必须通过 `Use Skill: hallmark` 产出，复用既有 `tokens.css` 令牌与 `.hallmark/log.json` 多样化约束。详见 §2.6。

- [ ] 拼音搜索优化（模糊匹配）— 算法层，非视觉
- [ ] 歌词动效（卡拉OK逐字高亮）— Hallmark 产出逐字高亮组件，遵守 `transform`/`opacity` 动效纪律
- [ ] 音频可视化动效（频谱/波形）— Hallmark 产出频谱/波形组件，Tier-A CSS art 优先
- [ ] 房间切歌投票机制 — Hallmark 产出投票卡片与进度视觉
- [ ] 歌曲收藏/历史 — Hallmark 产出收藏按钮 8 状态、历史列表
- [ ] 多语言支持 — 复用 Hallmark 文案令牌，多语言切换不影响布局
- [ ] 性能优化（大列表虚拟滚动）— Hallmark 产出虚拟滚动行视觉，遵守 4pt 间距
- [ ] **每页面/组件交付前必须通过 Hallmark 58 道 slop-test 门禁**

---

## 十、关键风险与应对

| 风险 | 应对 |
|------|------|
| Tauri Android TV打包环境复杂 | 备选方案：先做Web版TV界面，浏览器访问验证流程，再迭代Tauri |
| FLAC/ID3标签乱码 | chardet库自动检测编码（GBK/UTF-8） |
| 大量歌曲扫描慢 | 流式扫描 + 进度WS推送，后台异步任务 |
| Android TV遥控器适配 | 优先使用方向键+OK键的最小交互集，复杂操作引导用手机 |
| WS断线重连 | 心跳检测 + 自动重连 + 房间状态恢复 |
| Demucs CPU推理慢（10分钟MV需15分钟） | 异步队列 + 后台静默处理，不阻塞上传 |
| 飞牛NAS内存不足（ARM设备普遍2-4GB） | 限制并发=1，分块处理长MV，监控内存 |
| 模型文件大（htdemucs约80MB） | 首次启动自动下载到持久化目录，避免重建容器重下 |
| 分离失败（音频格式异常） | 错误捕获 + 重试机制 + 失败原因记录 |
| NAS无GPU | CPU模式运行，提供「高质量模型」可选开关 |
| 存储占用增加（每MV+约2倍MP3体积） | 提供清理功能（删除已分离的音轨） |
| 电视端伪造device_id注册多个房间 | 限制同一IP的注册频率，管理员可手动清理无效设备 |
| 未授权电视端尝试WS点歌 | WS消息处理前校验authorized字段，拒绝并返回错误 |
| 已授权房间被撤销时正在播放 | 立即停止播放，推送ROOM_UNAUTHORIZED，清空队列 |
| 电视端App重装生成新device_id | 旧房间记录保留（状态改为closed），新device_id重新注册 |
| 设备长时间未活跃 | 定时任务检查last_active_at，超时（如30天）自动改为closed |
| 临时授权过期但用户正在唱歌 | 过期前10分钟WS提醒，过期后立即撤销并停止播放 |
| AI接口不可用/超时 | 任务失败入队重试，不影响扫描入库主流程，可后续手动重试 |
| AI解析结果不准确 | 置信度阈值过滤，低置信度进入待审核，管理员可手动修正 |
| AI接口费用失控 | 提供批量解析开关和每日解析上限配置，避免误触大批量解析 |
| AI API Key泄露 | 配置页脱敏显示，不返回完整Key给前端，仅写入settings表 |
| 歌手合并误操作 | 合并前二次确认，合并操作记录日志，支持撤销（保留7天） |
| 分类被删除后歌曲孤立 | 删除分类项时自动解除关联，歌曲不丢失，仅无分类 |

---

## 十一、系统配置项

### 11.1 环境变量（.env）

```bash
# 后端
PORT=3000
JWT_SECRET=your-jwt-secret
DB_PATH=./data/db/nasktv.db
SCAN_PATH=/media/music
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

# 分离服务
SEPARATOR_SERVICE_URL=http://localhost:8001
SEPARATION_OUTPUT_DIR=./data/separated
SEPARATION_AUTO_ENABLE=true
SEPARATION_DEFAULT_MODEL=htdemucs
SEPARATION_MAX_CONCURRENT=1

# AI解析（初始默认值，可在后台系统设置页修改并写入settings表）
AI_ENABLED=false
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3
AI_AUTO_PARSE_AFTER_SCAN=true
AI_AUTO_PARSE_AFTER_UPLOAD=true
AI_CONFIDENCE_THRESHOLD=0.85
AI_DAILY_LIMIT=500

# 前端
VITE_API_BASE_URL=http://NAS_IP:3000
VITE_WS_BASE_URL=ws://NAS_IP:3000
```

### 11.2 系统设置页可配置项

```
[扫描相关]
扫描路径                     /media/music
支持的音频扩展名              .mp3,.flac,.m4a,.wav
支持的视频扩展名              .mp4,.mkv,.avi,.mov
增量扫描                     开

[人声分离]
分离功能总开关               开
扫描后自动分离               开
默认分离模型                 htdemucs ▼   # htdemucs | htdemucs_ft
最大并发任务数               1
MP3码率                      320 kbps
分离失败自动重试             开
重试次数                     2

[AI辅助解析]
AI功能总开关                 关
AI接口地址                   https://api.openai.com/v1
API Key                      sk-********（脱敏显示）
模型名称                     gpt-4o-mini
温度参数                     0.3
提示词模板                   [可编辑文本框，含默认模板]
扫描后自动AI解析             开
上传后自动AI解析             开
置信度阈值                   0.85         # 低于此值进入待审核
每日解析上限                 500          # 防止费用失控

[设备授权]
房间码长度                   6             # 固定6位，数字+字母混合
默认授权类型                 永久 ▼        # 永久 | 临时
临时授权默认时长（小时）      24
设备自动关闭天数             30            # 超过30天未活跃自动closed
注册频率限制（次/小时）       5             # 防止恶意注册

[房间]
房间空闲超时（分钟）          30
切歌模式                     独享 ▼        # 独享 | 投票

[安全]
JWT过期时间（小时）           24
```

---

## 十二、待确认事项

以下为开发前需确认的细节，请在核对时反馈：

1. **管理员账号初始化**：首次启动是否使用环境变量创建默认admin账户？还是命令行交互式创建？
2. **房间码格式**：6位数字+字母混合（已确定，避免易混淆字符0/O、1/I）？
3. **切歌机制**：默认独享（谁点谁切）还是投票制（多数同意才能切）？
4. **歌词来源**：仅依赖本地 .lrc 文件？还是需要在线API补全（如网易云歌词）？
5. **专辑封面**：仅从音频标签提取？还是支持在线补全？
6. **TV端首次配置**：手动输入NAS IP？还是通过mDNS自动发现？
7. **H5端是否需要登录**：手机端进入房间是否需要昵称/头像？还是匿名加入？
8. **分离结果清理**：是否提供自动清理策略（如删除歌曲时同步删除分离文件）？
9. **设备授权审批方式**：管理员手动逐一授权？还是支持批量授权？
10. **授权撤销后电视端行为**：立即清空队列并回到等待界面？还是给30秒缓冲提示？
11. **临时授权默认时长选项**：提供哪些预设选项？（如 2小时/4小时/8小时/1天/7天/自定义）
12. **临时授权过期前提醒时间**：10分钟是否合适？是否需要可配置？
13. **AI解析默认对接哪个服务**：OpenAI官方？DeepSeek？通义千问？还是留空让用户自己配？
14. **AI解析并发数**：AI接口通常有QPS限制，建议并发数（如2-5）？
15. **AI解析失败重试次数**：默认重试几次后标记为失败？
16. **歌手合并是否需要审计日志**：合并操作是否需要记录日志以便追溯？

---

## 十三、开发优先级建议

**MVP（最小可用版本）路径**：

```
阶段1 → 阶段2 → 阶段3 → 阶段4 → 阶段5 → 阶段6 → 阶段7
        ↓
        阶段2.5（可与阶段3并行，人声分离微服务）
        阶段2.6（可与阶段3并行，AI解析服务）
                ↓
                阶段3.5（依赖阶段2.5和3，集成分离服务）
                                ↓
                                阶段6.5（依赖阶段3.5的伴奏分离结果）
```

**先跑通核心闭环**：扫描歌曲 → 手机点歌 → 电视播放 → 再叠加人声分离和AI解析高级功能

**AI解析和人声分离均为可选增强功能**，不开启时不影响基础KTV流程。

---

## 文档变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-29 | 初版规划，含三端架构 + 人声分离功能 |
| v1.1 | 2026-07-29 | 调整房间码机制：电视端App安装时固定生成，默认未授权，需管理员授权后才能使用 |
| v1.2 | 2026-07-29 | ①房间授权支持临时/永久两种方式；②新增AI辅助解析歌曲信息（OpenAI标准接口）；③新增歌手和分类手动维护功能 |
| v1.3 | 2026-07-29 | 阶段1基础设施搭建完成：①项目配置（ESLint、Prettier）；②Docker多阶段构建；③Docker Compose部署编排；④阶段1开发任务全部完成 |
| v1.4 | 2026-07-29 | 阶段2歌曲库扫描器完成：①音频标签解析（music-metadata）；②歌手自动入库；③歌词关联；④默认分类初始化；⑤扫描进度WebSocket推送 |
| v1.5 | 2026-07-29 | 阶段2.5人声分离微服务完成：①Python+FastAPI+Demucs框架；②ffmpeg音频提取；③Demucs v4封装；④任务队列和进度回调；⑤Docker容器化。阶段2.6 AI解析服务完成：①OpenAI兼容客户端；②提示词模板；③解析任务队列；④置信度阈值判断；⑤歌手自动匹配；⑥AI配置和解析API；⑦WebSocket进度推送 |
| v1.6 | 2026-07-29 | 强制要求所有前端UI设计与页面实现（Admin Web / Mobile H5 / TV App WebView）全部使用 Hallmark 技能（Use Skill: hallmark）进行设计与构建：①新增 §2.6 前端UI设计与实现规范（Hallmark 强制约束）章节，明确适用范围、设计流程、硬性约束、三端调性指引、项目级设计系统落盘、技能调用方式；②在 §2.2 / §2.3 技术栈表格加入 Hallmark 行；③在阶段3 / 5 / 6 / 6.5 / 8 各阶段开头加入 Hallmark 强制要求说明，并将每个页面/组件的开发任务标注由 Hallmark 产出；④所有视觉决策必须由 `tokens.css` 令牌驱动，每页面需通过 58 道 slop-test 门禁，CSS 首行带 Hallmark stamp，`.hallmark/log.json` 记录多样化轨迹 |
| v1.7 | 2026-07-30 | 阶段4 剩余三项补全完成：①心跳检测——客户端 25s 发应用层 PING，服务端回 PONG，35s 扫描 lastSeenAt，超 60s terminate；②设备活跃状态更新——room-handler 在 PING 收到时节流写库（每房间 30s 最多一次）更新 `rooms.last_active_at`，复用已有 schema 字段无需迁移；③房间状态恢复——room-handler 内存缓存 PLAYER_STATE，连接建立时主动推送 `ROOM_STATE_SNAPSHOT`（含 room/queue/playerState/serverTime），新增 `GET /rooms/:code/snapshot` HTTP 备用接口；④修复前端 ws client disconnect 时未复位 reconnectAttempts 的潜在 bug；⑤TV/Mobile 前端均监听 `ROOM_STATE_SNAPSHOT` 同步 queueStore/roomStore |
| v1.8 | 2026-07-30 | 阶段7 飞牛NAS Docker部署完成：①新增 `packages/admin-web/Dockerfile` + `packages/mobile-h5/Dockerfile`（四阶段构建：node 编译 → nginx:alpine 托管 SPA）；②新增 admin-web/mobile-h5/根三层 nginx.conf（SPA 回退 + gzip + 反代路由 /admin→admin-web /h5→mobile-h5 /api→backend /ws→backend WebSocket 升级）；③扩展 `docker-compose.yml` 为 5 服务（backend + separator + admin-web + mobile-h5 + web 反代），对外仅暴露 8080 端口；④修复数据卷挂载不一致 bug（separator 原 `./data/music` 改为 `./data/songs:ro` 与 backend 对齐；backend 新增 `./data/songs` 挂载；SCAN_PATH 默认值改为 `/app/data/songs`）；⑤backend 服务名从 `nasktv-backend` 改为 `backend`，`SEPARATOR_SERVICE_URL` 改为 `http://separator:8001` 容器内通信；⑥separator 移除对外端口暴露（仅容器内通信）；⑦新增根 `.dockerignore` + `packages/separator/.dockerignore`；⑧前端 vite 生产构建 base path（admin-web `/admin/`、mobile-h5 `/h5/`）；⑨新增 `deploy/README.md` 部署文档（环境要求/目录结构/.env 配置/启动命令/访问地址/数据备份/常见问题/升级流程）；⑩`docker compose config` 语法校验通过（运行时验证需启动 Docker Desktop） |

---

**阶段1、2、2.5、2.6、3、3.5、4、5、6、7 已完成，可继续执行阶段6.5（TV端原伴唱切换+高级控制，功能代码已就位仅剩 Task 12 运行时验证）或阶段8（体验优化，可选）。**
**注意：自 v1.6 起，所有前端 UI 设计与页面实现必须先 `Use Skill: hallmark`，详见 §2.6。**
