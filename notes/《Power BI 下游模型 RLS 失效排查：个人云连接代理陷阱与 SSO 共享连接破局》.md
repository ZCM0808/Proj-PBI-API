### ▶️ [步骤 1/5] 上游模型开放数据源调用权（赋 Build 权限）

  目的：允许下游复合模型代表查看者向远程上游发送 DirectQuery(直接查询) 计算请求。
  • 登录 Power BI Service，在左侧导航进入上游工作区 DA_APAC_BI_PROD
  • 找到语义模型 Sales Store Market Day，点击右侧 ... -> 选择 【管理权限 (Manage permissions)】
  • 点击上方 【+ 添加用户 (+ Add user)】
  • 输入群组名称：GRP_WW_APAC_uap_powerbi_apac_tnf_viewer（或 Tony_Yao@vfc.com）
  • 配置权限勾选项：
  • ☑️ 读取 (Read)：保持勾选
  • ☑️ 生成 (Build)：务必勾选（“使用与此语义模型关联的数据生成内容”）
  • ❌ 重新共享 (Reshare)：取消勾选
  • 点击右下角 【授予 (Grant)】
  ──────
  ### ▶️ [步骤 2/5] 创建企业级“可共享云连接 (SCC)”
  目的：打通纯云端通信通道，并开启 SSO(Single Sign-On / 单点登录) 真实身份委托。

  • 点击网页右上角 【设置 ⚙️ (齿轮)】 -> 选择 【管理连接和网关 (Manage connections and gateways)】
  • 切换到顶部选项卡 【连接 (Connections)】，点击左上方 【+ 新建 (+ New)】
  • 在右侧滑出的面板中严格按以下参数录入：
  • 连接类型 (Connection type)：单选选择 【云 (Cloud)】（切勿选网关）
  • 连接名称: 填写 DA_APAC_Sales_Store_CloudConn（可自定）
  • 数据源类型: 下拉选择 【Analysis Services】
  • 服务器 (Server): 输入 powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_PROD
  • 数据库 (Database): 输入 Sales Store Market Day
  • 身份验证方法: 选择 【OAuth 2.0】
  • 编辑凭据: 点击并登录您本人的组织管理员账号打通首连
  • 隐私级别: 选择 【组织 (Organizational)】
  • 网关中继选项: 【保持不勾选】（“Allow this connection to be utilized with...” 必须留空）
  • 核心关键开关: 务必勾选【通过 Microsoft Entra ID 将 SSO 用于 DirectQuery 查询】
  • 点击底部 【创建 (Create)】 保存
  ──────
  ### ▶️ [步骤 3/5] 为群组赋予云连接的“使用权”

  目的：给群组成员下发使用该云端连接通道的通行证。
  • 留在【连接 (Connections)】列表中，找到刚建好的 DA_APAC_Sales_Store_CloudConn
  • 点击该行右侧的 ... -> 选择 【管理人员 (Manage users)】
  • 输入框中填入：GRP_WW_APAC_uap_powerbi_apac_tnf_viewer（或 Tony_Yao@vfc.com）
  • 下拉角色选择：【用户 (User)】（切勿选 Owner）
  • 点击 【共享 (Share)】 完成授权
  ──────
  ### ▶️ [步骤 4/5] 下游模型解绑个人连接，切换绑定新通道

  目的：彻底拔除开发者特权代理，将下游模型切换到刚建好的 SSO 管道上。

  • 导航进入下游报表所在工作区，找到下游语义模型 VF APAC DTC Performance Dashboard
  • 点击其右侧 ... -> 选择 【设置 (Settings)】
  • 展开 【网关和云连接 (Gateway and cloud connections)】 区域
  • 找到指向 powerbi://... 的 Analysis Services 数据源
  • 在其右侧的 “映射到 (Maps to)” 下拉框中：
  • 选中刚才新建的 DA_APAC_Sales_Store_CloudConn（替换掉原来的“个人云连接”）
  • 点击下方蓝色的 【应用 (Apply)】 按钮（核心动作，不可遗漏！）
  ──────
  ### ▶️ [步骤 5/5] 下游工作区查看者角色确认

  目的：确保普通查看者在下游遵循最小权限安全基线。
  • 在下游报表所在工作区，点击右上角 【管理访问权限 (Manage access)】
  • 确认群组 GRP_WW_APAC_uap_powerbi_apac_tnf_viewer（或 Tony Yao）的权限为 【查看者 (Viewer)】
  • 注: 下游模型层面无需单独配置（自动继承工作区 Viewer 只读），严禁赋予下游 Admin/Member/Contributor