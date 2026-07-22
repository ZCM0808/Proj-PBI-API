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

## 2. 快速启动指南 (How to Start the Project)
为了快速拉起本地开发服务器并体验完整的交互，只需在项目根目录下执行后端入口文件：

```bash
# 确保你位于项目根目录 D:\ZCM\Proj-PBI-API
python src/main.py
```

执行后，Uvicorn 会自动以 `reload=True` 热重载模式在 `http://127.0.0.1:8000` 端口拉起 Web 服务。直接在浏览器中访问该地址即可进入 API 沙盒界面。

---

## 3. 核心架构与重要逻辑 (Core Architecture & Critical Logic)

### 3.1 请求构建器状态机 (Request Builder State Machine)
前端的 Request Builder 存在两种核心模式，由一个徽章（Badge）动态指示：
- **Bound Mode (官方绑定模式)**：
  - 当用户点击左侧 API Tree 时触发。
  - 徽章显示为绿色的 `Bound to: [API Name]`。
  - JS 变量 `originalPath`、`originalMethod` 被赋值并锁定。用户此时如果修改了内容但想后悔，点击 `Reset` 按钮会读取这些 `original` 变量瞬间恢复所有参数，并在左侧树状图中重新高亮（加上 `.active` 类）原有的 API 节点（通过 `activeApiElement` 变量追踪）。
- **Free Mode (自由散漫模式)**：
  - 当用户点击 `+ New` 或从历史记录点击某个野生请求时触发。
  - 徽章显示为蓝色的 `Free Mode`。
  - 在此模式下，Method 下拉框解锁，可以自由组装。

### 3.2 本地存储与健壮性 (LocalStorage & Robustness)
项目中大量使用了 `localStorage` 来构建无后端的极速用户体验（如请求历史、SQL 历史）。
- **极度防崩原则**：所有的 `JSON.parse(localStorage.getItem(...))` 必须、绝对包裹在 `try...catch` 语句中。如果捕获到抛错（意味着用户缓存了脏数据或 JSON 破损），**必须静默执行 `localStorage.removeItem(...)` 清空脏数据**，绝不能允许 `SyntaxError` 向上冒泡导致前端全局 JS 引擎崩溃。
- **历史记录 (History)**：
  - 请求历史全局收录所有的（Bound 模式和 Free 模式的）发送动作。
  - 数据结构：`{ method, url, body, time, mode }`。
  - 下拉框自带 Sticky 顶部的**全局模糊搜索 (Fuzzy Search)**，可过滤 Method、URL、Body 和 Mode。
  - 防止事件冒泡冲突：下拉框内的搜索框自带 `e.stopPropagation()` 保护。

### 3.3 设置面板与环境变量 (Settings & Env Sanitization)
- **隐患预警**：用户在设置（Settings Modal）中可以填写多行的 `SQL_CONN_STR`。由于这个值会被 Python 写入后端的 `.env` 文件，如果不经过清洗，textarea 里的换行符（`\n`, `\r`）会直接**截断或污染** `.env` 文件的解析格式。
- **安全防线**：前端通过 `replace(/\r?\n|\r/g, '')` 强制把用户的回车键转换/抹除，保证提交给后端的一定是一条无回车的干净字符串。

### 3.4 左侧菜单交互 (API Tree Interaction)
- 依靠 `expandedCategories` (ES6 Set) 来持久化记录用户打开了哪些文件夹。
- 一键“全部展开/折叠”按钮（`#toggle-all-categories-btn`）不仅要批量 `list.style.display = 'flex'`（注意：不能是 block），还要批量把分类名字加入或移出 `expandedCategories`，以保证状态数据流的绝对一致性。

---

## 4. UI / UX 极客守则 (UI/UX Geek Rules)
- **外观第一**：不要使用生硬的纯色。按钮要带有微弱的 rgba 背景，Hover 态必须包含流畅的 0.2s `transition` 过渡动画。
- **空间利用**：对溢出文本（比如长 URL 或长 SQL）要进行截断加省略号（`text-overflow: ellipsis` 或者用 substring 切片），不能把弹窗和列表撑爆。
- **FLIP 动画**：所有弹窗使用自定义的 FLIP (First, Last, Invert, Play) 动画进行缩放平滑过渡。如果新增 Modal，必须复用 `setupFLIPModal` 函数，绝不能采用简单的 display none/block 生硬切换。

---

## 5. 全局 AI 对话纪律 (Global AI Constraints)
1. **强制中文**：任何与用户的非代码文字交流，必须使用中文。
2. **术语扫盲**：如果在对话中使用了技术黑话（如 UX、FLIP、JSON 等），必须带上科普后缀，格式为：`词汇(解释或全拼)`。例如：`LocalStorage(浏览器本地存储)`。
3. **Markdown 产出**：只有在用户明确许可时才能生成 `.md` 文件。如果不指定路径，默认全部写入 `C:\Users\ZCM\Desktop` 桌面目录。（注：本文档属项目内核记忆文件，经特许存放于项目根目录）。
4. **工具优先级与文件操作**：优先使用 `grep_search` 等专用工具替代 bash 的 `cat/ls/grep`。**严禁使用 PowerShell (`Set-Content`, `echo`) 拼接或修改文件**，以防破坏全局 UTF-8 编码引发极其严重的中文/特殊字符乱码事故，强制使用内置的 `replace_file_content` 原子化工具。
5. **代码洁癖**：保持“0 错误、0 高危漏洞”标准。前端的 `script.js` 经常用 `node -c` 自检。

---

## 6. QA 与自动化测试防线 (QA & Automated Testing Best Practices)
项目目前实施了现代工业级“大前端 + 稳定后端”的五大质量防线，所有的改动必须通过以下卡点：

1. **Static Analysis (静态检查)**：
   - 使用 `Ruff` 和 `Mypy` 对 Python 后端进行极速的格式化与类型安全推导。
2. **Pre-commit Hooks (提交前安全钩子)**：
   - 每次 `git commit` 时触发，自动修复代码格式，阻断脏代码污染 Git 历史。
3. **Unit Testing & API Contract Testing (单元与契约测试)**：
   - 后端使用 `Pytest` 验证核心逻辑 (如 `Config` 单例加载) 以及 FastAPI 路由返回的 JSON/HTML 数据结构是否符合契约标准。
4. **End-to-End Testing (端到端测试)**：
   - 引入业界顶级框架 `Playwright` 模拟真实用户行为，测试所有核心 UI 操作 (如 Badge 切换、API 树状图渲染逻辑、弹窗显示隐藏等)。
5. **Visual Regression Testing (视觉回归测试)**：
   - 通过 Playwright 的 `toHaveScreenshot()` 进行全页面像素级对比，精准拦截微小的 CSS 错误、层级覆盖 Bug、或是任何因编码错误导致的乱码。
   - **自测铁律 (TDD Loop)**：在任何涉及 UI/CSS/DOM 的修改后，**交付前必须强制在后台运行 `npx playwright test` 并等待执行结果**，绝不能依赖肉眼查错！
   - **前端缓存清理防御 (Cache Busting)**：修改了纯静态原生前端项目文件（`.js` 或 `.css`）后，**必须同步在引用的 `.html` 文件中修改该静态资源的硬编码版本号后缀 (如 `?v=xxx`)**，强制浏览器刷新缓存。
   - **微动效与交互动画 (Micro-animations)**：对于任何涉及新 UI 弹窗、组件出现/消失、悬浮 (Hover) 或状态变更的交互功能，**必须强制添加 CSS 过渡动画 (Animations/Transitions)**（如渐隐渐显、缩放弹出等），绝对禁止生硬的瞬间切换。

### 当前核心测试覆盖地图 (12 Core Test Cases)
**🟢 后端防线：Pytest (4 个用例)**
1. `test_config_structure`: 验证 PBIConfig 单例加载敏感字段的完整性。
2. `test_config_get_all`: 验证下发环境变量的 JSON 结构与敏感信息脱敏。
3. `test_frontend_delivery_contract`: 根路由 `/` 契约，确保正确交付前端 `index.html`。
4. `test_api_settings_contract`: 校验 `/api/settings` GET/POST 接口读写连通性。

**🔵 前端防线：Playwright E2E (9 个用例)**
1. `下拉框防污染`: 刷新后历史下拉框必须默认隐藏。
2. `侧边栏交互`: 一键“展开/折叠”按钮正确控制树状图层级。
3. `模式切换引擎`: 点击 New Request 正确切换 Badge 为 Free Mode。
4. `官方绑定模式`: 点击 API 树节点实现表单参数绑定，Reset 按钮完美一键复原。
5. `配置项清洗防御`: **(重中之重)** 验证设置弹窗成功拦截并抹除恶意的多行 SQL_CONN_STR 回车换行符，防止污染后端。
6. `历史记录搜索`: 验证全局 Fuzzy Search 模糊搜索与清空机制的可用性。
7. `全页视觉回归`: 主页像素级快照对比，严防乱码与全局 CSS 崩塌。
8. `组件视觉回归`: 侧边栏专门快照对比，严防长字符串文本溢出撑破布局。
9. `弹窗动效视觉回归`: Pipeline 弹窗按钮 Hover 闪光态快照对比，严格监控 absolute 动画元素是否因缺少 overflow 而溢出污染背景。
6. **CI/CD Pipeline (持续集成流水线)**：
   - GitHub Actions (`.github/workflows/ci.yml`) 将上述所有流程自动化，在 Push 时跑通所有测试。

---
> **最后更新状态**：已完成全局最佳测试实践 (Playwright + Pytest) 的整合，引入 GitHub Actions 流水线，并更新了 PAT。系统处于高度健壮状态。

- **全局弹窗拖拽体验 (Draggable Popups)**：所有的浮层弹窗 (Modal/Popup) 必须支持通过头部自由拖拽移动位置，避免遮挡底部重要内容，并且在关闭后再次打开时必须自动重置回居中位置。

- **同质功能外观一致性 (Consistent Button Appearance)**：如果不同按钮具有相同 or 类似的功能（例如“关闭”弹窗、“保存”等），它们必须在整个项目中保持完全相同的外观设计（如相同的 HTML/SVG 结构、统一 of CSS 类名、悬停反馈及过渡动画等），绝对禁止在不同组件中出现多种不同的样式变体。

