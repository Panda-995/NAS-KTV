# 飞牛 NAS KTV 系统（nasktv）

![Release](https://img.shields.io/github/v/release/fengmuxi/NAS-KTV?label=release)
![License](https://img.shields.io/github/license/fengmuxi/NAS-KTV)
![Build](https://github.com/fengmuxi/NAS-KTV/actions/workflows/release.yml/badge.svg)

部署在飞牛 NAS 上的家庭 KTV 系统，通过三端协同提供完整的点歌与演唱体验：**Admin Web**（管理员后台）负责歌曲库管理、MV/音频上传、人声分离任务监控、设备授权与 AI 辅助解析配置；**TV App**（Android TV 端播放器，Tauri 2 外壳）负责大屏播放、原伴唱切换、歌词同步与遥控器操作；**Mobile H5**（手机点歌端）负责扫码加入房间、搜索点歌、队列管理与播放控制。

## 核心特色

- **AI 人声分离（Demucs v4）**：自动分离人声与伴奏，实现原伴唱无缝切换，无需准备双音轨。
- **AI 辅助解析（OpenAI 兼容接口）**：歌曲入库后自动解析歌手、分类、语种、年代，降低人工标注成本。
- **设备授权机制**：电视端 App 安装时生成固定房间码，默认未授权，管理员可临时或永久授权。
- **多房间支持**：一台 NAS 可同时服务多台电视，房间之间相互隔离。
- **NAS 本地化部署**：SQLite 单文件存储，Docker Compose 一键部署，数据全量留存在本地。

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 编程语言 | TypeScript（主） / Python（分离服务） / Rust（Tauri 外壳） |
| 后端 | Node.js LTS 20+ / Express / WebSocket (ws) / SQLite3 (better-sqlite3) / Drizzle ORM / JWT + bcrypt / pino |
| 前端（Admin Web + Mobile H5） | React 18 + TypeScript / Vite / TailwindCSS / React Router DOM / Zustand / Axios / lucide-react / sonner / react-hook-form |
| TV App | Tauri 2 (Rust) 外壳 + React + Vite WebView / HTML5 video/audio + Web Audio API / qrcode |
| 人声分离 | FastAPI (Python) / Demucs v4 (htdemucs_base / htdemucs_ft) / ffmpeg + torchaudio / uv 包管理 |
| 包管理 | pnpm workspace（monorepo） |
| 部署 | Docker 多阶段构建 / Docker Compose / Nginx 反向代理 |

## 项目结构

```
nasktv/
├── packages/
│   ├── backend/          # Node.js API + WebSocket（端口 3000）
│   ├── admin-web/        # 管理后台 SPA（端口 5173 dev）
│   ├── mobile-h5/        # 手机点歌 H5 SPA（端口 5174 dev）
│   ├── tv-app/           # Tauri Android TV App
│   ├── separator/        # Python + Demucs 人声分离微服务（端口 8001）
│   ├── web/              # 合并前端镜像（admin-web + mobile-h5 静态托管 + 反代）
│   └── shared/           # 共享类型与 Drizzle schema
├── deploy/               # 部署文档
│   └── README.md
├── .trae/specs/          # 各阶段规格说明（phase1~phase7）
├── docker-compose.yml    # 3 服务编排（backend + separator + web）
├── .env.example          # 环境变量示例
├── DEVELOPMENT_PLAN.md   # 开发计划（v1.8，阶段 1-7 已完成）
├── pnpm-workspace.yaml
└── package.json
```

## 运行环境需求

### 本地开发

| 依赖 | 版本要求 | 用途 | 必需 |
|------|---------|------|------|
| Node.js | LTS 20+ | 后端 + 前端构建运行 | ✅ 必需 |
| pnpm | 8+ | monorepo 包管理 | ✅ 必需 |
| Python | 3.10+ | separator 人声分离服务 | ⚠️ 仅 separator |
| uv | 最新 | Python 包管理（替代 pip） | ⚠️ 仅 separator |
| ffmpeg | 6+ | 音频转码（separator 依赖） | ⚠️ 仅 separator |
| Rust | stable（1.77+） | Tauri 外壳编译 | ⚠️ 仅 TV App |
| Tauri CLI | 2.x | TV App 构建工具链 | ⚠️ 仅 TV App |
| Android SDK + NDK | SDK 36 / NDK 26+ | 打包 Android TV APK | ⚠️ 仅 TV App 打包 |
| JDK | 17+ | Android Gradle 构建 | ⚠️ 仅 TV App 打包 |
| Docker Desktop | 20.10+ | 本地 Docker 部署验证 | 🔵 可选 |

> **提示**：若仅开发后端 + Admin Web + Mobile H5，只需 Node.js + pnpm。separator 与 TV App 可按需安装。

### 生产部署（飞牛 NAS）

| 项目 | 要求 |
|------|------|
| 操作系统 | 飞牛 NAS 系统（原生 Docker 支持） |
| CPU 架构 | aarch64 (ARM64) 或 x86_64 |
| Docker | 20.10+ |
| Docker Compose | v2.0+ |
| 可用内存 | ≥ 2GB（separator 推理需要；若不启用分离可降至 512MB） |
| 可用磁盘 | ≥ 10GB（模型缓存 ~80MB + 歌曲库 + 分离结果） |
| 网络 | 局域网可达，手机与电视需能访问 NAS 的 8080 端口 |
| 端口 | 8080（web 反代，必须）；3000（backend，可选调试） |

> **说明**：TV App 为 Tauri Android APK，不走 Docker，需单独在开发机用 Android Studio 打包后安装到电视。

## 快速启动

### 本地开发（一键）

```bash
# 安装依赖（根目录执行，自动处理 workspace 链接）
pnpm install

# 启动所有 dev server（并行）
pnpm dev

# 数据库迁移（首次运行或 schema 变更后）
pnpm --filter @nasktv/backend db:migrate
```

### Docker 部署

```bash
docker compose up -d --build
```

## 各子项目详细命令

> 以下命令均在项目根目录执行，使用 `pnpm --filter <包名>` 选择子项目。

### 1. shared（共享类型与 Schema）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Node.js 20+ / pnpm 8+ | 无独立运行入口 |
| 类型检查 | `pnpm --filter @nasktv/shared tsc --noEmit` | 验证类型正确性 |
| 构建 | 无（源码直接被引用） | main 指向 `src/index.ts` |

> shared 包是 TS 源码直接导出（无编译步骤），其他包通过 workspace 链接引用。

### 2. backend（后端 API + WebSocket）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Node.js 20+ / pnpm 8+ / Python 3.11+（仅 separator 调用时） | 端口 3000 |
| 开发模式 | `pnpm --filter @nasktv/backend dev` | tsx 热重载，监听 :3000 |
| 类型检查 | `pnpm --filter @nasktv/backend tsc --noEmit` | |
| 生成迁移 | `pnpm --filter @nasktv/backend drizzle-kit generate` | 基于 shared/schema 生成 SQL |
| 执行迁移 | `pnpm --filter @nasktv/backend drizzle-kit migrate` | 应用到 SQLite |
| 打包 Docker 镜像 | `docker build -f packages/backend/Dockerfile -t nasktv/backend .` | 多阶段构建 |
| 运行容器 | `docker run -p 3000:3000 -v $(pwd)/data:/app/data nasktv/backend` | 需挂载 data 卷 |

**环境变量**（见 `.env.example`）：
- `PORT=3000` / `JWT_SECRET=...` / `DB_PATH=/app/data/db/nasktv.db`
- `SCAN_PATH=/app/data/songs`（容器内）或 `./data/songs`（本地开发）
- `SEPARATOR_SERVICE_URL=http://localhost:8001`（本地）或 `http://separator:8001`（容器）
- `SEPARATION_CONCURRENCY=2` / `AI_PARSE_CONCURRENCY=2`（并发数：settings 表 > 环境变量 > 默认 1）
- `AI_ENABLED` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`

### 3. admin-web（管理后台 SPA）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Node.js 20+ / pnpm 8+ | dev 端口 5173 |
| 开发模式 | `pnpm --filter @nasktv/admin-web dev` | Vite dev server，监听 :5173 |
| 类型检查 + 构建 | `pnpm --filter @nasktv/admin-web build` | `tsc && vite build`，产物在 `dist/` |
| 预览构建产物 | `pnpm --filter @nasktv/admin-web preview` | 本地预览生产包 |
| 打包 Docker 镜像 | `docker build -f packages/admin-web/Dockerfile -t nasktv/admin-web .` | 四阶段构建 |
| 运行容器 | `docker run -p 8081:80 nasktv/admin-web` | 监听 80 端口 |

**构建说明**：
- 生产构建 `base` 为 `/admin/`（vite.config.ts 中按 `NODE_ENV` 切换）
- 开发模式 `base` 为 `/`，dev server 代理 `/api` 和 `/ws` 到 `localhost:3000`

### 4. mobile-h5（手机点歌 H5 SPA）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Node.js 20+ / pnpm 8+ | dev 端口 5174 |
| 开发模式 | `pnpm --filter @nasktv/mobile-h5 dev` | Vite dev server，监听 :5174 |
| 类型检查 + 构建 | `pnpm --filter @nasktv/mobile-h5 build` | `tsc && vite build`，产物在 `dist/` |
| 预览构建产物 | `pnpm --filter @nasktv/mobile-h5 preview` | 本地预览生产包 |
| 打包 Docker 镜像 | `docker build -f packages/mobile-h5/Dockerfile -t nasktv/mobile-h5 .` | 四阶段构建 |
| 运行容器 | `docker run -p 8082:80 nasktv/mobile-h5` | 监听 80 端口 |

**构建说明**：
- 生产构建 `base` 为 `/h5/`（vite.config.ts 中按 `NODE_ENV` 切换）
- 开发模式 `base` 为 `/`，dev server 代理 `/api` 和 `/ws` 到 `localhost:3000`

### 5. tv-app（Android TV App · Tauri 2）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Node.js 20+ / pnpm 8+ / Rust stable / Tauri CLI 2 / JDK 17+ / Android SDK + NDK | dev 端口 1420 |
| WebView 开发模式 | `pnpm --filter @nasktv/tv-app dev` | 仅前端，Vite 监听 :1420，浏览器访问 |
| WebView 构建 | `pnpm --filter @nasktv/tv-app build` | `tsc && vite build`，产物在 `dist/` |
| Tauri 桌面开发模式 | `pnpm --filter @nasktv/tv-app tauri:dev` | Rust 外壳 + WebView，调试 Tauri API |
| 初始化 Android 工程 | `pnpm --filter @nasktv/tv-app exec tauri android init` | 生成 `src-tauri/gen/android/`，首次一次 |
| 打包 Release APK | `pnpm --filter @nasktv/tv-app exec tauri android build --apk` | 生成 universal APK（4 ABI），需 NDK + JDK 17 |
| 打包 Debug APK | `pnpm --filter @nasktv/tv-app exec tauri android build --apk --debug` | 带 sourcemap 的调试包 |
| 打包 Windows 桌面版 | `pnpm --filter @nasktv/tv-app exec tauri build --bundles nsis` | 生成便携 exe + NSIS 安装包，仅需 Rust + MSVC（不需 JDK/NDK） |

**构建说明**：
- TV App 不走 Docker，需在开发机用 Tauri CLI 打包成 APK（电视）或 exe（Windows 桌面）后安装
- 三种开发模式：WebView（浏览器）/ Tauri 桌面（Rust+WebView）/ Android APK
- vite.config.ts 中 `base: '/'`（Tauri 不支持相对路径）
- `devUrl: http://localhost:1420` / `frontendDist: ../dist`（见 `src-tauri/tauri.conf.json`，v2 schema）
- Tauri 外壳代码在 `packages/tv-app/src-tauri/src/lib.rs`（入口 `main.rs`），移动端命令与 UDP/HTTP 服务在 lib.rs
- 权限模型为 v2 capabilities（`src-tauri/capabilities/default.json`），fs 走 `@tauri-apps/plugin-fs`
- 最低支持 Android 7.0（minSdk 24），默认 universal APK 含 arm64-v8a / armeabi-v7a / x86 / x86_64
- 详细开发调试打包指南见 [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) §4.5

**Windows 桌面版打包**：
1. 前置条件：Rust stable（含 MSVC 工具链），不需 JDK / Android SDK / NDK
2. 执行 `pnpm --filter @nasktv/tv-app exec tauri build --bundles nsis`（自动先跑前端 build）
3. 产物：便携 exe `packages/tv-app/src-tauri/target/release/nasktv.exe` + NSIS 安装包 `target/release/bundle/nsis/NASKTV_<版本>_x64-setup.exe`
4. 运行依赖 WebView2 运行时（Win10/11 自带；旧系统需单独安装）
5. 若配置了 cargo 代理，打包前临时设置 `$env:NO_PROXY="*"`（同 APK 打包）

**APK 打包前置条件**：
1. 安装 Rust stable + JDK 17+ + Android SDK（cmdline-tools）+ NDK 26+
2. 添加 Android target：`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
3. 配置环境变量：`JAVA_HOME`（JDK 17）/ `ANDROID_HOME` / `NDK_HOME`
4. 初始化 Android 工程（仅首次）：`pnpm --filter @nasktv/tv-app exec tauri android init`
5. 配置签名（Release 必需）：`keytool -genkey ...` 并修改 `gen/android/app/build.gradle.kts`
6. 打包：`pnpm --filter @nasktv/tv-app exec tauri android build --apk`（产物在 `gen/android/app/build/outputs/apk/`）

### 6. separator（人声分离微服务 · Python）

| 项目 | 命令 | 说明 |
|------|------|------|
| 环境需求 | Python 3.11+ / uv / ffmpeg 6+ | 端口 8001 |
| 安装依赖 | `cd packages/separator && uv sync` | 创建虚拟环境并安装 |
| 开发模式 | `cd packages/separator && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001` | 热重载 |
| 开发模式（pnpm） | `pnpm --filter @nasktv/separator dev` | 同上，封装在 package.json |
| 生产启动 | `pnpm --filter @nasktv/separator start` | 无 `--reload` |
| 打包 Docker 镜像 | `docker build -f packages/separator/Dockerfile -t nasktv/separator ./packages/separator` | PyTorch 基础镜像 |
| 运行容器 | `docker run -p 8001:8001 -v $(pwd)/data/songs:/data/songs:ro -v $(pwd)/data/separated:/data/separated -v $(pwd)/data/separator-cache:/app/cache nasktv/separator` | 需挂载共享卷 |

**首次运行说明**：
- 首次启动会下载 Demucs 模型（~80MB）到 `/app/cache`（或本地 `cache/` 目录）
- 模型缓存持久化后，后续启动无需重新下载
- ffmpeg 必须可用（`ffmpeg -version` 验证）

### 7. separator（Python 环境独立安装）

若不使用 Docker，本机直接运行 separator：

```bash
# 1. 安装 uv（一次性）
pip install uv

# 2. 进入 separator 目录
cd packages/separator

# 3. 创建虚拟环境并安装依赖（含 PyTorch + Demucs）
uv sync

# 4. 验证 ffmpeg 可用
ffmpeg -version

# 5. 启动开发服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# 6. 验证健康检查
curl http://localhost:8001/health
```

> **PyTorch 说明**：separator 依赖 PyTorch 2.1+，体积较大（~2GB）。若本机已有 CUDA 环境，可手动安装对应版本以启用 GPU 加速。CPU 推理亦可工作，但分离速度较慢。

## 全量构建与打包

```bash
# 构建所有 TS 包（shared + backend 类型检查 + admin-web + mobile-h5 + tv-app）
pnpm build

# 构建 Docker 镜像（3 个：backend / separator / web 合并前端）
docker compose build

# 一键启动全部服务（3 个容器）
docker compose up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f [服务名]

# 停止全部服务
docker compose down
```

部署详情参见 [deploy/README.md](./deploy/README.md)。

## 访问地址

### NAS 部署后

| 入口 | 地址 |
|------|------|
| 管理后台 | http://NAS_IP:8080/admin |
| 手机 H5 | http://NAS_IP:8080/h5 |
| API | http://NAS_IP:8080/api |
| WebSocket | ws://NAS_IP:8080/ws |

### 本地开发

| 入口 | 地址 |
|------|------|
| Admin Web | http://localhost:5173 |
| Mobile H5 | http://localhost:5174 |
| Backend API | http://localhost:3000/api |
| Separator | http://localhost:8001 |

## CI/CD 与版本管理

本项目使用 **GitHub Actions + release-please** 实现全自动的版本管理、打包与发布。打 `v*` tag 时自动构建 Docker 镜像、TV 桌面端与安卓端，并把产物挂到 GitHub Release。

> 完整的密钥与环境变量清单（含 ACR 配置、自动变量、已移除的签名密钥、与后端运行时变量的区别）见 [.github/CI.md](./.github/CI.md)。

### 工作流

| 文件 | 触发 | 作用 |
|------|------|------|
| `.github/workflows/version.yml` | 推送 `main` | release-please：解析约定式提交，开/更新 Release PR、算版本、维护 `CHANGELOG.md`、打 tag、建 Release |
| `.github/workflows/docker.yml` | tag（`v*`） | 矩阵构建 `backend` / `separator` / `web`，多架构 `linux/amd64 + arm64`，推送阿里云 ACR |
| `.github/workflows/desktop.yml` | tag（`v*`） | TV 桌面端：Windows（`x86_64`/`i686`）+ macOS（`x86_64`/`aarch64`），**无签名** |
| `.github/workflows/android.yml` | tag（`v*`） | TV 安卓端：`arm64-v8a`(64) / `armeabi-v7a`(32)，`tauri android build --apk`，**无签名** |
| `.github/workflows/release.yml` | tag（`v*`） | 编排器：等 Release 就绪后串行调用上面三个构建任务，并挂产物 |

> macOS 物理上无法出 32 位包（Apple 自 Catalina 起移除），故桌面 32 位仅 Windows 支持。当前未启用代码签名（Windows SmartScreen 会拦截、安卓为 debug 签名，仅适合内网/KTV 侧载）。

### 版本从哪来

- 统一版本源：`scripts/set-version.mjs` 在打包前把 `backend` / `admin-web` / `mobile-h5` / `tv-app` 的 `package.json` 与 `tauri.conf.json` 的版本号统一写成 git tag。
- 各端展示位置：后端 `GET /system/info`、Admin Web 左侧栏底部、Mobile H5 底部导航下方、TV App 首页右下角水印。

### 提交信息约定（决定版本号）

| 前缀 | 示例 | 版本变化（当前 0.1.0） |
|------|------|------------------------|
| `feat:` | `feat: 新增歌单批量导入` | 0.1.0 → **0.2.0** |
| `fix:` | `fix: 修复二维码刷新闪烁` | 0.1.0 → **0.1.1** |
| `feat!:` 或含 `BREAKING CHANGE:` | `feat!: 重构房间协议` | 0.1.0 → **1.0.0** |
| `chore:` / `docs:` / `refactor:` / `perf:` | `chore: 升级依赖` | 不升版本（仍进 Release 说明） |

**日常节奏**：按约定提交到 `main` → release-please 自动开/更新「Release vX.Y.Z」PR → 合并该 PR 即完成打 tag + 发布 + 构建。不要手动改版本号、手动打 tag 或手动建 Release（会与机器人冲突）。

## 文档导航
- [deploy/README.md](./deploy/README.md) — 生产部署指南
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 本地开发指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 系统架构说明
- [AGENTS.md](./AGENTS.md) — AI 编码助手项目指令
- [.env.example](./.env.example) — 环境变量完整示例

## License

[MIT](./LICENSE) © 2026 fengmuxi
