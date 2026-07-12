# Proj-PBI-API 项目上下文与架构记忆库 (Project Memory)

> **文档用途**：本文档旨在为 AI Agent（Antigravity）提供一个持久化、全局性的项目状态与规则上下文字典。每次接手新任务时，请快速扫视本文档以保证上下文不丢失，避免重复踩坑或引入破坏现有逻辑的 Bug。

---

## 1. 项目概览 (Project Overview)
本项目是一个专为 **Power BI Admin API** 设计的高颜值、极客风的 API 沙盒/调试客户端。它由后端的 FastAPI 引擎支撑，并在前端使用了高度定制化的原生 JavaScript 与 CSS 来实现复杂的交互面板。

- **主要解决的问题**：让开发者脱离繁琐的 Postman 或 Curl，通过结构化的左侧树状菜单点击即用，同时又提供了比 Swagger 更灵活的“自由测试模式（Free Mode）”。
- **技术栈**：
  - **后端**: Python (FastAPI, Uvicorn) -> 位于 `src/` 目录下（`main.py`, `config.py`, `pbi_client.py`）。
  - **前端**: 原生 HTML / CSS / JS -> 位于 `static/` 目录下（`index.html`, `script.js`）。
  - **数据驱动**: API 结构高度依赖一个外部静态 JSON（`pbi_admin_apis.json` 或类似）。

---

## 2. 核心架构与重要逻辑 (Core Architecture & Critical Logic)

### 2.1 请求构建器状态机 (Request Builder State Machine)
前端的 Request Builder 存在两种核心模式，由一个徽章（Badge）动态指示：
- **Bound Mode (官方绑定模式)**：
  - 当用户点击左侧 API Tree 时触发。
  - 徽章显示为绿色的 `Bound to: [API Name]`。
  - JS 变量 `originalPath`、`originalMethod` 被赋值并锁定。用户此时如果修改了内容但想后悔，点击 `Reset` 按钮会读取这些 `original` 变量瞬间恢复所有参数，并在左侧树状图中重新高亮（加上 `.active` 类）原有的 API 节点（通过 `activeApiElement` 变量追踪）。
- **Free Mode (自由散漫模式)**：
  - 当用户点击 `+ New` 或从历史记录点击某个野生请求时触发。
  - 徽章显示为蓝色的 `Free Mode`。
  - 在此模式下，Method 下拉框解锁，可以自由组装。

### 2.2 本地存储与健壮性 (LocalStorage & Robustness)
项目中大量使用了 `localStorage` 来构建无后端的极速用户体验（如请求历史、SQL 历史）。
- **极度防崩原则**：所有的 `JSON.parse(localStorage.getItem(...))` 必须、绝对包裹在 `try...catch` 语句中。如果捕获到抛错（意味着用户缓存了脏数据或 JSON 破损），**必须静默执行 `localStorage.removeItem(...)` 清空脏数据**，绝不能允许 `SyntaxError` 向上冒泡导致前端全局 JS 引擎崩溃。
- **历史记录 (History)**：
  - 请求历史全局收录所有的（Bound 模式和 Free 模式的）发送动作。
  - 数据结构：`{ method, url, body, time, mode }`。
  - 下拉框自带 Sticky 顶部的**全局模糊搜索 (Fuzzy Search)**，可过滤 Method、URL、Body 和 Mode。
  - 防止事件冒泡冲突：下拉框内的搜索框自带 `e.stopPropagation()` 保护。

### 2.3 设置面板与环境变量 (Settings & Env Sanitization)
- **隐患预警**：用户在设置（Settings Modal）中可以填写多行的 `SQL_CONN_STR`。由于这个值会被 Python 写入后端的 `.env` 文件，如果不经过清洗，textarea 里的换行符（`\n`, `\r`）会直接**截断或污染** `.env` 文件的解析格式。
- **安全防线**：前端通过 `replace(/\r?\n|\r/g, '')` 强制把用户的回车键转换/抹除，保证提交给后端的一定是一条无回车的干净字符串。

### 2.4 左侧菜单交互 (API Tree Interaction)
- 依靠 `expandedCategories` (ES6 Set) 来持久化记录用户打开了哪些文件夹。
- 一键“全部展开/折叠”按钮（`#toggle-all-categories-btn`）不仅要批量 `list.style.display = 'flex'`（注意：不能是 block），还要批量把分类名字加入或移出 `expandedCategories`，以保证状态数据流的绝对一致性。

---

## 3. UI / UX 极客守则 (UI/UX Geek Rules)
- **外观第一**：不要使用生硬的纯色。按钮要带有微弱的 rgba 背景，Hover 态必须包含流畅的 0.2s `transition` 过渡动画。
- **空间利用**：对溢出文本（比如长 URL 或长 SQL）要进行截断加省略号（`text-overflow: ellipsis` 或者用 substring 切片），不能把弹窗和列表撑爆。
- **FLIP 动画**：所有弹窗使用自定义的 FLIP (First, Last, Invert, Play) 动画进行缩放平滑过渡。如果新增 Modal，必须复用 `setupFLIPModal` 函数，绝不能采用简单的 display none/block 生硬切换。

---

## 4. 全局 AI 对话纪律 (Global AI Constraints)
1. **强制中文**：任何与用户的非代码文字交流，必须使用中文。
2. **术语扫盲**：如果在对话中使用了技术黑话（如 UX、FLIP、JSON 等），必须带上科普后缀，格式为：`词汇(解释或全拼)`。例如：`LocalStorage(浏览器本地存储)`。
3. **Markdown 产出**：只有在用户明确许可时才能生成 `.md` 文件。如果不指定路径，默认全部写入 `C:\Users\ZCM\Desktop` 桌面目录。（注：本文档属项目内核记忆文件，经特许存放于项目根目录）。
4. **工具优先级**：优先使用 `grep_search` 等专用工具替代 bash 的 `cat/ls/grep`。
5. **代码洁癖**：保持“0 错误、0 高危漏洞”标准。前端的 `script.js` 经常用 `node -c` 自检。

---
> **最后更新状态**：已完成 History 全局高级搜索、Badge 双模驱动、SQL Env 防御等重大 Feature 迭代，系统处于 v22 稳定基线。
