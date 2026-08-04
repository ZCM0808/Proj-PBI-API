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
3. **绝对禁止擅建 MD 文件 (Markdown Generation Ban)**：**未经明确许可，绝对禁止生成新的 Markdown (.md) 文件！这是红线！** 如果用户特许生成 `.md` 文件且未指定路径，**必须将其默认存放到用户的桌面 (`C:\Users\ZCM\Desktop`)**，绝不允许擅自保存到缓存、隐藏目录或通过 Artifact 机制生成未授权文档。（注：本文档属项目内核记忆文件，经特许存放于项目根目录）。
4. **工具优先级与文件操作**：优先使用 `grep_search` 等专用工具替代 bash 的 `cat/ls/grep`。**严禁使用 PowerShell (`Set-Content`, `echo`) 拼接或修改文件**，以防破坏全局 UTF-8 编码引发极其严重的中文/特殊字符乱码事故，强制使用内置的 `replace_file_content` 原子化工具。
5. **代码洁癖**：保持“0 错误、0 高危漏洞”标准。前端的 `script.js` 经常用 `node -c` 自检。
6. **提交流程铁律**：**绝对不要再随时、频繁地运行 Playwright 测试！** 取而代之的是，必须养成“随时高频提交代码”的习惯，一旦有功能修复或阶段性成果，立刻执行 `git add .` 与 `git commit`，将修改锁定在 Git 历史中以防丢失。

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
   - **测试纪律更新**：根据最新指令，**已全面禁用 Playwright 端到端自动化测试**。在交付前不再强制运行 `npx playwright test`，直接交付代码即可，节约时间。
   - **前端缓存清理防御 (Cache Busting)**：修改了纯静态原生前端项目文件（`.js` 或 `.css`）后，**必须同步在引用的 `.html` 文件中修改该静态资源的硬编码版本号后缀 (如 `?v=xxx`)**，强制浏览器刷新缓存。
   - **微动效与交互动画 (Micro-animations)**：对于任何涉及新 UI 弹窗、组件出现/消失、悬浮 (Hover) 或状态变更的交互功能，**必须强制添加 CSS 过渡动画 (Animations/Transitions)**（如渐隐渐显、缩放弹出等），绝对禁止生硬的瞬间切换。

### 当前核心测试覆盖地图 (12 Core Test Cases)
**🟢 后端防线：Pytest (4 个用例)**
1. `test_config_structure`: 验证 PBIConfig 单例加载敏感字段的完整性。
2. `test_config_get_all`: 验证下发环境变量的 JSON 结构与敏感信息脱敏。
3. `test_frontend_delivery_contract`: 根路由 `/` 契约，确保正确交付前端 `index.html`。
4. `test_api_settings_contract`: 校验 `/api/settings` GET/POST 接口读写连通性。

**🔵 前端防线：Playwright E2E (16 个用例)**
1. `下拉框防污染`: 刷新后历史下拉框必须默认隐藏。
2. `侧边栏交互`: 一键“展开/折叠”按钮正确控制树状图层级。
3. `模式切换引擎`: 点击 New Request 正确切换 Badge 为 Free Mode。
4. `官方绑定模式`: 点击 API 树节点实现表单参数绑定，Reset 按钮完美一键复原。
5. `配置项清洗防御`: **(重中之重)** 验证设置弹窗成功拦截并抹除恶意的多行 SQL_CONN_STR 回车换行符，防止污染后端。
6. `历史记录搜索`: 验证全局 Fuzzy Search 模糊搜索与清空机制的可用性。
7. `环境隔离与去重`: 全局环境配置 (Global Settings)：Scan Workspace 能够严格过滤重复添加的 GUID。
8. `全页视觉回归`: 主页 UI 必须与基准快照保持像素级一致。
9. `组件视觉回归`: 侧边栏 API 树状图滚动条截断、文字溢出排版验证。
10. `组件微动效回归`: Pipeline 弹窗内执行按钮的 Hover 闪光态。
11. `结构防御 (DOM Hierarchy)`: context-toolbar 必须严格被 request-builder-top 包裹，防止掉落外层导致间距异常。
12. `结构防御 (DOM Hierarchy)`: Response 面板必须严格被 main-content 包裹，防止意外的闭合标签导致布局崩塌。
13. `溢出防御 (Overflow Defense)`: 动作按钮组绝对不能跑到右侧面板之外。
14. `弹性布局抗挤压测试 (Flex bounds)`: 请求体 textarea 不能被上方的错误空白完全挤压。
15. `垂直调整器防御 (Vertical Resizer)`: 向上极限拖拽时，请求面板不能被压到不可用状态。
16. `组件视觉回归`: Request 面板防间距空洞及布局偏移检查。
6. **CI/CD Pipeline (持续集成流水线)**：
   - GitHub Actions (`.github/workflows/ci.yml`) 将上述所有流程自动化，在 Push 时跑通所有测试。

---

## 7. 近期重大架构迭代 (Recent Major Updates)
- **数据导出工作流 (Export Dataset Tables Workflow)**：
  - **后端实现**：使用 DAX 的 `executeQueries` 绕过了 `INFO.TABLES` 的兼容性问题（通过 `EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])` 拉取表列表，然后再针对单表执行 `EVALUATE 'TableName'` 导出最高 10w 行数据）。
  - **前端体验**：实现了与 `Export Report to File` 完全一致的 **Step 1 / Step 2 UI 分步日志流**（极客风 Console 输出），完美支持了独立步骤触发和 `Run Full Workflow` 自动串联执行逻辑。
  - **稳定性修复**：排除了因按钮 ID 查找失败导致的隐藏 TypeError 从而引发的“死锁（永久 Loading）”问题，重写了纯净的 JS 代码规避了多行字符串插值的换行符注入错误。

- **全局弹窗拖拽体验 (Draggable Popups)**：所有的浮层弹窗 (Modal/Popup) 必须支持通过头部自由拖拽移动位置，避免遮挡底部重要内容，并且在关闭后再次打开时必须自动重置回居中位置。

- **同质功能外观一致性 (Consistent Button Appearance)**：如果不同按钮具有相同或类似的功能（例如“关闭”弹窗、“保存”等），它们必须在整个项目中保持完全相同的外观设计（如相同的 HTML/SVG 结构、统一 of CSS 类名、悬停反馈及过渡动画等），绝对禁止在不同组件中出现多种不同的样式变体。

- **自动化工作流扩展与 UI 防御 (Automated Workflows & UI Defense)**：
  - **组件边界截断修复 (Modal Boundary Clipping)**：自定义下拉列表在弹窗底部展开时会被 `overflow-y: auto` 截断。解决方案为动态物理反转：依靠 `bottom: calc(100% + 4px)` 实现完美向上弹出。同时统一了所有自定义下拉框的悬浮层级，采用 `var(--overlay-10)` Alpha 透明色完美适配深浅双色主题。
  - **Power BI 渲染挂起防御 (PBI SDK Suspension Fix)**：曾因将 `iframe` 移出屏幕 (`left: -9999px`) 导致 PBI Embedded SDK 强制挂起并阻塞 `loaded` 事件触发，进而造成获取页面时永远 Loading 的死锁。现已将 `pbi-embed-container` 重构为真实的内联可视化容器（高 400px），既解决了卡死问题，又赋予了用户直观的实时加载体验。
  - **新增 API 审计流 (Admin Report View Count)**：由于标准用户无法直接获取报表访问量，我们上线了全新的自动化审计流，基于 Fabric Admin Activity Events 接口进行游标分页拉取，精准过滤 `ViewReport` 事件以生成当日的“总访问量”及“独立访客数”。
  - **便捷性优化**：工作流下拉选项旁集成了原生 📋 Copy Icon，支持无缝复制当前名称并提供原生的绿色 Success 反馈色，消除操作不确定感。

- **全局色彩重构与硬编码清剿 (Global Color & Theme Variable Refactor)**：
  - **核心痛点解决**：彻底根除全局项目中硬编码的“刺眼黄色”及所有静态色值（Hex、rgba），解决了在“明亮模式（Light Theme）”下字体和背景对比度极差、难以阅读的问题。
  - **深浅模式引擎**：全面引入基于 `[data-theme="light"]` 和 `:root` 的语义化 CSS 变量架构（如 `var(--error)`, `var(--success)`, `var(--warning)`, `var(--info)`），超过 150 处硬编码颜色被成功脱水剥离。
  - **品牌资产防御**：通过精准的脚本拦截机制，完美避开了对官方 Power BI 徽标 SVG 颜色（`#F2C811`）的误伤。
  - **视觉回归防御**：所有改动及长尾组件（如下拉菜单悬浮色、动态删除按钮反馈等）全部通过 Playwright 的端到端与像素级视觉快照测试断言，确保结构 0 崩塌，UI 100% 还原。

- **深度审计与 SSRF 分页防御 (Deep Drill-down & SSRF Pagination Defense)**：
  - **SSRF 代理防御绕过 (SSRF Defense)**：修复了由于 `activityevents` 接口返回的 `continuationUri` 是完整 URL（携带域名），被底层安全代理判定为 SSRF 攻击而静默阻断的严重 Bug。前端现已重构，通过 URL Parser 剥离域名，仅保留 relative path 继续进行游标分页轮询，找回了由于中断丢失的数以百计的日志记录。
  - **极致深钻交互 (Drill-down Table Interaction)**：
    - 将汇总报表的静态数字升级为交互式连接，点击即可弹出“全局拖拽级别”的底层明细审查弹窗 (Draggable Drilldown Modal)。
    - **Shift 多列联合排序 (Multi-Column Sort)**：完全打通了底层的 `window.sortTable` 函数，允许用户按住 Shift 键进行极高自由度的多维度聚合排序。
    - **高级 PBI 字段解码**：动态注入东八区时间 (UTC+8) 换算，并提取出关键的底层事件字段（如 `ConsumptionMethod` / Access Route 访问途径 和 `IsSuccess` 渲染状态），大大增强了排障与审计能力。
  - **空间释放与动态折叠 (Collapsible UI)**：引入了纯 CSS 原生的日志面板折叠机制，通过精确清零 `padding` 和 `border-width` 解决了折叠后的残留“空心框”问题，最大限度把屏幕高度还给数据表。

> **最后更新状态**：完成了 SSRF 代理分页安全策略适配找回完整 PBI 审计数据，并成功上线高交互性的 Drill-down 数据透视表弹窗与多维度联合排序功能。同时完美闭环了所有 CSS 动画与空间折叠防御逻辑。

---

## 8. 针对 Power BI 本地模型 (MCP Server) 的动态端口防偏离纪律 (Dynamic Port Defense)
- **动态端口陷阱**：当我们使用官方 `Power BI Modeling MCP Server` 插件对当前运行的本地 Power BI Desktop 实例进行 DAX 验证或 TMDL 建模时，它的底层实际依赖于 `msmdsrv.exe` 进程。**该进程的监听端口会在每次 Power BI Desktop 重启时随机发生改变**。
- **强制约束**：因此，AI Agent 绝对**禁止将硬编码的 localhost 端口号（如 59496）视为永久可靠的配置**。
- **自动抓取与热更策略**：
  在开始对本地模型进行任何交互前（或者当用户提示需要重新连接时），**必须主动在后台运行以下 PowerShell 命令来动态抓取存活的端口**：
  ```powershell
  (Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id -State Listen -ErrorAction SilentlyContinue).LocalPort
  ```
  获取到最新端口后，必须主动将新的连接字符串 `Data Source=localhost:<新端口>;Application Name=MCP-PBIModeling` 覆写更新至全局配置文件 `C:\Users\ZCM\.gemini\antigravity-cli\mcp.json` 中，并在写入后提醒用户重启客户端或开启新会话以完成热重载。
