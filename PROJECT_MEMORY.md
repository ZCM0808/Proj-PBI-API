# Proj-PBI-API 项目上下文与核心架构宪章 (Project Memory Charter)

> **文档定位与使用规范**：
> 本文档是为 AI 智能体（Antigravity）及核心开发者量身打造的**最高信噪比架构字典与开发铁律**。接手任何任务前必须严格遵循本文档。
> 原始 74 个历史演进章节与详尽踩坑过程已无损归档至：[docs/PROJECT_MEMORY_HISTORY.md](file:///D:/ZCM/Proj-PBI-API/docs/PROJECT_MEMORY_HISTORY.md)。

---

## 1. 项目概览与拓扑架构 (System Overview & Topology)

本项目是一个专为 **Power BI Admin API** 设计的高颜值、极客风的 API 沙盒、权限拓扑分析与决策平台。
- **后端架构**: Python 3.10+ (FastAPI, Uvicorn, MSAL, Requests, PyOTP) -> [src/](file:///D:/ZCM/Proj-PBI-API/src)
- **前端架构**: 原生极客风单页应用 (Native HTML / CSS / JS，零笨重打包框架) -> [static/](file:///D:/ZCM/Proj-PBI-API/static)
- **公网与访问**: Cloudflare Tunnel 双向加密直通 -> 专属二级域名 `pbi.carman.ccwu.cc`
- **运行拓扑与五维运维脚本集**:
  - `status_tunnel.ps1`: 实时诊断本地端口、进程存活性、自启动状态及公网 200 OK 连通性
  - `start_tunnel.ps1`: 100% 隐藏无窗口拉起 FastAPI 与 Cloudflare Tunnel，自动健康自检
  - `stop_tunnel.ps1`: 精准安全终止 FastAPI 与 Tunnel 对应 PID，清理运行时数据
  - `enable_autostart.ps1`: 写入 Windows 当前用户注册表，实现开机或重启后静默自愈拉起
  - `disable_autostart.ps1`: 一键剥离自启动项，恢复纯手动按需控制

---

## 2. 核心红线与最高指令 (Supreme Priority Directives)

1. **便签记事本 (Quick Note) 同步防线 (Top Priority Directive)**:
   - 便签保存并同步至 GitHub 是全平台核心底座，任何改动必须保证同步永不中断；
   - 严格维护 `window._noteCancelTimeout` 全局定时器，彻底防止连续点击取消导致进度条丢失；
   - 取消按钮受 `#btn-cancel-save-note { display: none !important; }` 样式防护，仅在保存流中动态挂载 `.is-active`。
2. **零 UI 手动操作原则 (Zero UI Manual Operation Rule)**:
   - 坚决禁止要求用户手动在 UI 界面配置、拖拽或排错。AI 必须全权通过修改底层代码、配置文件或自动化脚本搞定一切。
3. **桌面零干扰与后台静默铁律 (Zero Desktop Interruption Directive)**:
   - 严禁为了只读探测随意拉起终端黑框，只读检查强制优先使用内置工具；
   - 必须通过 Windows WMI (`Win32_Process.Create`) 配合 `Win32_ProcessStartup.ShowWindow = 0` (SW_HIDE) 运行后台常驻服务，严禁在桌面上闪烁或弹出控制台黑框 (`conhost.exe` / `cmd.exe`)。
4. **UTF-8 BOM 防御与拒绝终端拼接**:
   - 绝不使用终端命令（PowerShell `Set-Content`、`echo`）拼接或修改代码文件；
   - 所有 PowerShell 管理脚本强制采用带 BOM 的 UTF-8 (`utf-8-sig`) 存储，彻底免疫 Windows PowerShell 5.1 默认 ANSI 字符集解析崩溃。

---

## 3. 核心支撑系统与底层机制 (Core Engine Systems)

### 3.1 双轨认证与会话熔断机制
- **密码模式 (`pwd1`)**: 验证主密码 `Config.APP_ACCESS_PASSWORD`。会话单次最长 1 小时 (3600s)，受单日累计使用时长限制与设备防爆破锁定；超时由全局中间件物理抹除 Cookie 并 307 重定向至 `/login?expired=1`。
- **MFA 动态口令模式 (`mfa`)**: 基于标准 RFC 6238 TOTP 算法 (`Config.MFA_SECRET`)，支持 Google/微软 Authenticator 每 30 秒 6 位动态口令，单次会话最长 3 小时，无需输入主密码直接秒进。

### 3.2 跨日 UTC 时区防御与 GitHub Secret Gist 云端持久化
- **时区强制对齐**: 后端服务端强制绑定 `ZoneInfo("Asia/Shanghai")`（中国标准时间 UTC+8），前端使用 `getLocalDateStr()` 提取系统本地当前日期，跨日时自动归零 `pbi-daily-time` 并解锁，彻底免疫海外容器 UTC 导致的早晨误锁。
- **专属 Secret Gist (`37c50831834ef4c2fb96d2774c5ca113`)**:
  - 云端持久化存储 `pbi_device_lockouts.json`，解决容器重启或跨设备时本地数据被刷空的隐患；
  - 双向单调递增合并 (`_merge_lockout_records`)，严格遵循 `max()` 规则与时间戳仲裁，彻底防御恶意篡改时钟作弊与丢失更新 (Lost Update)。

### 3.3 本地 Power BI 实例嗅探与 DAX 查询 ([src/local_pbi.py](file:///D:/ZCM/Proj-PBI-API/src/local_pbi.py))
- 底层利用 PowerShell 指令 `Get-CimInstance Win32_Process -Filter "Name = 'msmdsrv.exe'"` 动态扫描宿主机运行中的 Power BI Desktop 进程与工作区端口；
- 通过 `pythonnet` 加载 Windows 本地动态链接库 `Microsoft.PowerBI.AdomdClient.dll` 直连本地端口执行原生 DAX 分析查询。

### 3.4 Cloudflare Tunnel 极简直通与 Windows WMI 守护
- **极简直通策略**: 专属隧道 `pbi-api-tunnel`（ID: `7936bf8d-17cd-4131-a02f-17af58b4b054`）将 `pbi.carman.ccwu.cc` 直通本地 `127.0.0.1:8000`；坚决不启用外部邮箱验证码门禁，无缝直达系统原生登录页。
- **Windows WMI 脱壳守护**: 采用 `cmd.exe /c "python src/main.py > logs\api_server.log 2>&1"` 由 WMI Create 拉起，断开父子进程链，终端关闭或编辑器重启依然后台永久常驻。
- **开机自启自愈**: 配置 `HKCU:\Software\Microsoft\Windows\CurrentVersion\Run` 注册表原生启动项，实现免管理员权限、开机登录即自启。

### 3.5 故障容错三端隔离与热重载排查
- **三端隔离**: 代码出错崩溃时，桌面端由 SW_HIDE 压制保持零弹窗，公网端由 Cloudflare 返回友好 502 错误页隔离内部细节，报错堆栈毫秒级落盘至 `logs/api_server.log`。
- **Uvicorn StatReload**: 日常开发修改代码语法出错时，主重载进程挂起保护不暴毙，修复代码保存后 0.2 秒内全自动热重载自愈。
- **端口抢占识别 (Port Conflict)**: 终端前台敲 `python src/main.py` 秒退说明 8000 端口正被后台静默老进程占领；需先运行 `.\stop_tunnel.ps1` 释放端口后方可在前台观察。

---

## 4. UI / UX 极客守则与前端防线 (UI/UX Engineering Charter)

1. **纯血 SVG 图标与同质按钮规范 (方案 B 铁律)**:
   - 全局操作按钮必须统一采用纯血 SVG 矢量动效与统一尺寸规范，坚决禁止混杂非规范 Emoji 或中英文字符；
   - 严格遵循全生命周期尺寸锁死铁律：异步交互中禁止用破坏性代码清空尺寸，必须通过专属规范类锁死 `min/max-width` 与 `min/max-height`。
2. **GPU 硬件加速微动效**:
   - 交互微缩放 (`:active { transform: scale(0.92); }`)、悬浮上浮 (`:hover { transform: translateY(-1.5px); }`) 与辉光扩散必须全部基于 GPU `transform` 渲染层进行，绝对禁止触碰 DOM 盒模型的物理尺寸，实现零重排 (Reflow)。
3. **FLIP 弹窗平滑动画**:
   - 所有弹窗组件必须复用 `setupFLIPModal` 实现 First, Last, Invert, Play 弹性物理动画，严禁生硬切换 `display: none/block`。
4. **LocalStorage 极度防崩原则**:
   - 所有的 `JSON.parse(localStorage.getItem(...))` 必须包裹在 `try...catch` 中；捕获到语法损坏时静默调用 `localStorage.removeItem(...)`，绝不让脏数据导致全局 JS 引擎雪崩。
5. **全局沉浸模式与 Tooltip 凝练**:
   - 全局顶栏首位常驻沉浸模式 `#gtb-zen-btn`；全站 Tooltip 严格遵循极简高质标准中文短语，坚决杜绝双语冗长堆砌。

---

## 5. QA 质量防线与 Git 推送工作流 (QA & Git Workflow)

1. **工业级静态分析卡点**:
   - 提交代码前必须主动运行 `python -m ruff check src`，确保零语法错误、零未定义引用与零冗余代码；
   - 必要时运行 `python -m mypy src --ignore-missing-imports` 确保类型安全。
2. **高频提交与智能级联推送**:
   - 杜绝随意运行笨重的端到端自动化测试，养成阶段性成果即时 `git add .` 与 `git commit` 的习惯；
   - 云端同步必须强制使用项目专属 [push.ps1](file:///D:/ZCM/Proj-PBI-API/push.ps1)，利用其 OpenSSL / SChannel 智能级联降级策略彻底防御网络连接重置。
3. **前端缓存清理防御 (Cache Busting)**:
   - 修改静态原生文件（`.js` 或 `.css`）后，必须同步在引用的 `.html` 文件中修改硬编码版本号后缀（如 `?v=20261004_v01`），强制浏览器刷新缓存。
