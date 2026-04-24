# M3U8 Player

基于 WASM 的 HLS (m3u8) 流媒体播放器，支持在 Chrome 等浏览器中软解码 HEVC (H.265) 视频。本仓库使用 Electron 作为 Demo 外壳进行演示。

## 功能特性

- **HEVC WASM 软解码** — 通过 ll-video 自定义元素在浏览器中实现 H.265/H.264 WASM 软解码，无需浏览器原生 HEVC 支持
- **HLS 流媒体播放** — 输入 m3u8 URL 即可播放，支持本地文件路径与网络地址
- **自适应解码策略** — 优先使用原生硬解码，不可用时自动切换 WASM SIMD 软解码
- **SIMD 加速** — 支持 WebAssembly SIMD 指令集，提升软解码性能
- **强制软解** — 提供"强制软解"开关，方便调试和对比

## 技术栈

| 层级 | 技术 |
|------|------|
| 解码器 | ll-video 自定义元素 (WASM H.264/H.265) |
| 播放器 | xgplayer + xgplayer-hls |
| 前端 | Vue 3 + TypeScript |
| Demo 外壳 | Electron 39 + electron-vite 5 |

## 项目结构

```
src/renderer/                   # 核心播放器（可独立在浏览器中运行）
├── public/
│   ├── ll-video.js             # WASM 解码器自定义元素（核心）
│   └── decoder/                # WASM 解码器文件
│       ├── h264/               #   H.264 解码器
│       └── h265/               #   H.265 解码器 (base / simd / thread / asm)
├── src/
│   ├── App.vue                 # 播放器主界面
│   ├── decoder-init.ts         # 解码器初始化与能力检测
│   └── main.ts                 # Vue 入口
└── index.html                  # HTML 入口 (加载 ll-video.js)

src/main/                       # Electron Demo 外壳
└── index.ts                    # 主进程，窗口管理 & local-resource 协议

scripts/
├── download-decoders.mjs       # 从 CDN 下载 WASM 解码器文件
└── generate-hevc-hls.mjs       # 生成 HEVC HLS 测试流
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装依赖

```bash
npm install
```

### 下载 WASM 解码器

首次使用需要下载解码器文件到 `src/renderer/public/decoder/`：

```bash
node scripts/download-decoders.mjs
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 解码策略

ll-video 自定义元素作为 xgplayer 的 `mediaType` 接入，播放时自动选择最优解码方式：

```
启动播放
  ├─ 检测 MediaSource HEVC 硬解支持（Chrome 107+）
  │   └─ 支持 → 原生硬解码
  └─ 不支持
      ├─ WASM 解码器已加载 && SIMD 可用
      │   └─ WASM 软解码（ll-video）
      └─ 否则
          └─ 仅支持 H.264 播放
```

用户可勾选"强制软解"跳过硬解检测，强制使用 WASM 解码。

### 浏览器兼容性

| 特性 | 最低版本 |
|------|----------|
| WebAssembly | Chrome 57 / Firefox 52 / Safari 11 |
| WASM SIMD | Chrome 91 / Firefox 89 |
| WASM Threads | Chrome 74 / Firefox 79 |

## IDE 配置

推荐使用 [VSCode](https://code.visualstudio.com/)，搭配以下插件：

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动 (Electron) |
| `npm run build` | 类型检查 + 构建 |
| `npm run build:win` | 构建 Windows 安装包 |
| `npm run format` | Prettier 格式化 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
