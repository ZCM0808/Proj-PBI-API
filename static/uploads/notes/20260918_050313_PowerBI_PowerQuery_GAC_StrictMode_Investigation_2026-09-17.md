# Power BI Power Query、GAC 与 Strict Mode 完整调查记录

更新日期：2026-09-18  
调查范围：VFC tenant 的 `DA_APAC_BI_QA`、`DA_APAC_BI_PROD`，以及私有 tenant `seven@carman.ccwu.cc` 的可控验证。  
调查方法：Power BI/Fabric API、模型 `getModel` 服务响应、XMLA/TMDL、浏览器 Edge NetLog、Power BI 前端包逻辑、Microsoft 文档和私有 tenant 对照实验。

## 1. 最终结论

### 1.1 QA 和 PROD Power Query 行为不同的根因

根因是两个工作区的**工作区级 Granular Access Control（GAC）有效状态不同**：

| 工作区 | 已验证状态 | `isInStrictMode` | 非模型 owner 且具备所有连接使用权限的用户 |
|---|---|---:|---|
| `DA_APAC_BI_PROD` | 工作区级 GAC 已启用 | `true` | 可以打开 Power Query |
| `DA_APAC_BI_QA` | 对已检查模型未生效 | `false` | 不能打开 Power Query |

PROD semantic model 的 GAC 页面显示：

```text
An admin has enabled granular access control for all data connection types
in this workspace.
```

这是直接的产品界面证据，确认 `DA_APAC_BI_PROD` 已启用工作区级 GAC。它解释了 Tina_Teng 即使不是某些 semantic model owner，仍可打开这些模型的 Power Query。

### 1.2 QA 的修复

应在 `DA_APAC_BI_QA` 启用工作区级 GAC：

```text
Workspace
  > Settings
  > 左侧导航 Power BI
  > Data connections
  > 勾选 Enable granular access control for all data connections
  > Apply
```

启用后重新读取 QA 模型的 `modeling/getModel`，预期：

```text
isInStrictMode=true
hasAccessToAllDataConnections=true
```

在此前提下，Tina_Teng 作为 Workspace Admin 且具备连接使用权限，即使不是 model owner，也应能打开 Power Query。

模型级 GAC 也是可行的单模型替代方案：

```text
Semantic model > Settings > Open settings pane > Data access
```

但它只能处理单个模型，并且需要对应的 model owner 操作。QA 同时存在 APAC 和 DUT 等多个模型、且 owner 不同，因此工作区级 GAC 是本事件的推荐修复。

### 1.3 不应采取的“修复”

- 不要重新绑定 QA APAC 的 connection。QA APAC 与能够工作的 PROD Sales 已使用相同 connection、gateway 和 Databricks source。
- 不要修改 TMDL/XMLA annotation，例如 `PBI_ProTooling` 中的 `WebModelingEdit`。它不控制 GAC 或 strict mode。
- 不要仅通过更改 connection owner/user 或 Workspace Admin 角色来解决。它们不是 strict mode 的替代条件。
- 不要为了测试 QA 而在 VFC 全 tenant 强制启用 GAC，除非已完成影响评估。强制 tenant GAC 可能在不具备连接使用权限的用户编辑共享项目时断开 data source。
- 不要把 Fabric 通用的 `delegateToWorkspace` tenant-setting API 当作 GAC 的工作区配置入口。该 API 不是这个 setting 的配置机制。

## 2. 原始问题和用户可见现象

### 2.1 QA

在 `DA_APAC_BI_QA`：

- Tina_Teng 是 Workspace Admin。
- Tina_Teng 是相关 connection 的 owner/user，具有连接使用权限。
- Tina_Teng 可以打开 semantic model，但不能打开其中的 Power Query。
- 典型提示为：

```text
To use Power Query editor, ask the model owner to enable granular access
control and set up Shared Cloud Connections for all data sources.
```

同类现象也发生在 QA 的 `DUT report testing`：用户具备连接使用权限且是 Workspace Admin，但仍无法在非模型 owner 身份下打开 Power Query。

### 2.2 PROD

在 `DA_APAC_BI_PROD`，Tina_Teng 可以打开：

- `APAC Channel performance Analytics`
- `Sales Store Market Day`

`Sales Store Market Day` 的 model owner 与 Tina_Teng 不同，但 Power Query 仍可打开。这说明问题不是“只有模型 owner 才能打开 Power Query”，而是由 GAC/strict mode 和连接权限共同决定。

## 3. Power Query 的实际授权逻辑

Power BI web modeling bundle 中的逻辑等价于：

```text
非 model owner 可以执行 Transform Data / 打开 Power Query 的条件：

isInStrictMode == true
AND
hasAccessToAllDataConnections == true
```

因此：

| 条件 | 结果 |
|---|---|
| 用户是 semantic model owner | 可以打开 Power Query，即使 strict mode 为 false |
| 用户不是 owner，strict=true，且有所有连接使用权限 | 可以打开 Power Query |
| 用户不是 owner，strict=false | 前端在启动 MashupEditor 前拒绝 Power Query |
| 用户不是 owner，strict=true，但缺少任一连接权限 | 不能打开 Power Query |

角色区分：

| 角色/权限 | 含义 | 是否自动赋予非 owner Power Query 权限 |
|---|---|---|
| Workspace Admin | 管理工作区项目和成员 | 否 |
| Semantic model owner | 模型所有者 | owner 本人可以 |
| Connection owner | 管理 connection 本身 | 否 |
| Connection user | 可以使用 connection | 仅在 strict=true 时是必要条件之一 |

## 4. VFC 已验证的模型状态

模型状态来自：

```text
GET https://{WABI-cluster}/modeling/getModel/{modelId}
  ?languageLocale=en-US
  &requestQueryEditingInfo=true
```

服务端返回的 `securityInfo` 包含：

```text
isInStrictMode
hasAccessToAllDataConnections
isModelOwner
```

### 4.1 关键模型对照

| 工作区 | Semantic model | Model ID | `isInStrictMode` | `hasAccessToAllDataConnections` |
|---|---|---|---:|---:|
| `DA_APAC_BI_QA` | APAC Channel performance Analytics | `dca83ecc-9699-4c9a-9a5a-42ab372a1ec6` | `false` | `true` |
| `DA_APAC_BI_QA` | DUT report testing | `670e68de-26da-44e6-a02f-1d46149bac4a` | `false` | `true` |
| `DA_APAC_BI_PROD` | APAC Channel performance Analytics | `d5c58dd9-48ae-49a1-95ef-a44a10f3991f` | `true` | `true` |
| `DA_APAC_BI_PROD` | Sales Store Market Day | `3f5b70c5-5b81-432d-a7f8-74853bbd6cec` | `true` | `true` |

其他成功读取的 PROD 模型也返回 `isInStrictMode=true`：

- `Data Checking For If_Inseason`
- `Channel Performance Analytics Allbrand`
- `GLOBAL SELL IN DASHBOARD - APAC`
- `TNF APAC SELL IN DASHBOARD`

### 4.2 模型 owner 信息

- QA APAC 的 model owner 是 Carman。
- QA DUT 的 model owner 不是 Carman。
- PROD Sales 的 model owner 不是 Carman。

这些差异不改变核心结论：QA 的 `strict=false` 阻止非 owner 打开 PQ；PROD 的 `strict=true` 加上连接访问权限允许非 owner 打开 PQ。

## 5. 已排除的差异

### 5.1 Connection、gateway 和数据源

QA APAC 与 PROD Sales 使用完全相同的 item connection：

```text
Connection ID: ab753d67-90cf-4187-a6e3-c4502a648f59
Gateway ID:    09392006-8c76-477a-a096-ae3cfeee59d7
Source:        同一 Databricks warehouse
```

因此 QA/PROD 差异不是由 connection binding、gateway 或 Databricks source 引起。

### 5.2 Capacity 和区域

QA 与 PROD 位于相同 dedicated capacity：

```text
Capacity ID: b50f2f5e-25a7-4718-ab61-8f2883cc3eb5
Region: Southeast Asia
```

因此不是 capacity 或 capacity region 差异。

### 5.3 Workspace 角色

Tina_Teng 在 QA 和 PROD 都是 Workspace Admin。因此 Workspace Admin 本身不决定非 owner 能否打开 PQ。

### 5.4 XMLA、TMDL 与 annotation

检查模型 metadata/TMDL 后：

- 没有可编辑的 `strict`、`granular`、`accesscontrol` 模型属性。
- `isInStrictMode` 是服务端计算出的有效状态，不是 XMLA/TMDL 可直接设置的属性。
- `PBI_ProTooling` annotation 不具有因果性。

曾观察到：

| 模型 | `PBI_ProTooling` |
|---|---|
| QA APAC | `DaxQueryView_Desktop` |
| QA DUT | 无/`null` |
| PROD APAC | `DaxQueryView_Desktop`, `WebModelingEdit` |
| PROD Sales | `WebModelingEdit` |

私有 tenant 后续出现过带 `WebModelingEdit` 且 `strict=false` 的模型，因此 `WebModelingEdit` 不能解释或修复 strict mode。

## 6. Edge NetLog 证据

已分析的浏览器网络日志：

| 场景 | 文件 |
|---|---|
| QA DUT 无法打开 PQ | `C:\Users\czhao2\Downloads\edge-net-export-log.json` |
| PROD Sales 能打开 PQ | `C:\Users\czhao2\Downloads\edge-net-export-log PROD Sales.json` |
| 私有 tenant 测试 | `C:\Users\czhao2\Downloads\private_carman.json` |

### 6.1 QA DUT

日志中有模型预检请求，例如：

- `diagramLayouts`
- `saveVersion`
- `applyQueriesStatus`

但没有：

```text
powerquery.microsoft.com/MashupEditor
```

### 6.2 PROD Sales

日志顺序为：

```text
modeling/getModel?...requestQueryEditingInfo=true
  -> powerquery.microsoft.com/MashupEditor
  -> /api/editor/.../queryAndStepDependentGraph
  -> /api/connections/get
```

结论：QA 的失败发生在 Power Query 服务启动之前。它不是 MashupEditor 已启动后被 data connection 拒绝，而是 Power BI modeling 前端因 strict mode 条件不满足而阻止启动。

## 7. GAC 的三个层级和实际 UI 入口

Microsoft 当前文档说明 GAC 可以在 tenant、workspace 和 semantic model 三层生效，优先级为：

```text
Tenant enforcement
  > Workspace enforcement
    > Semantic model / artifact owner setting
```

### 7.1 Tenant 级

```text
Settings
  > Admin portal
  > Tenant settings
  > Integration settings
  > Enable granular access control for all data connections
```

如果 tenant admin 开启“整个组织强制执行”，tenant 设置覆盖 workspace 和 model；兼容的 semantic model 会被强制进入 strict mode。

### 7.2 Workspace 级

当前官方截图显示的准确入口：

```text
Workspace
  > Settings
  > Power BI
  > Data connections
  > Enable granular access control for all data connections
  > Apply
```

该项位于 Workspace Settings 左侧导航的 `Power BI` 分组下，与 `General`、`Embed codes` 并列。

官方文档和截图：

```text
https://learn.microsoft.com/en-us/power-bi/connect-data/service-create-share-cloud-data-sources#granular-access-control

https://learn.microsoft.com/en-us/power-bi/connect-data/media/service-create-share-cloud-data-sources/service-create-share-cloud-data-sources-08.png
```

已下载的官方截图：

```text
C:\Users\czhao2\Downloads\service-create-share-cloud-data-sources-08.png
```

### 7.3 Semantic model 级

```text
Semantic model
  > Settings
  > Open settings pane
  > Data access
```

PROD 的模型页并不是 workspace 开关所在位置；它显示“workspace admin 已启用”的继承结果。

## 8. VFC PROD 与 QA 的最终解释

### 8.1 PROD

PROD 模型 Data access 页面明确显示：

```text
An admin has enabled granular access control for all data connection types
in this workspace.
```

因此 PROD 的 `isInStrictMode=true` 已有确定解释：**PROD 工作区级 GAC 已启用。**

### 8.2 QA

QA APAC 和 QA DUT 当前返回 `isInStrictMode=false`。

因此 QA 的工作区级 GAC 当前没有对这些模型形成有效 strict enforcement。QA 中打开并保存 Power Query 不会自动启用 strict mode；模型保存不是配置 workspace GAC 的动作。

### 8.3 QA 修复和验收

1. 进入 `DA_APAC_BI_QA`。
2. 打开 `Workspace > Settings > Power BI > Data connections`。
3. 勾选 `Enable granular access control for all data connections`。
4. 选择 `Apply`。
5. 等待设置传播，重新打开模型设置页或调用 `modeling/getModel`。
6. 验收 QA APAC 和 QA DUT：

```text
isInStrictMode=true
hasAccessToAllDataConnections=true
```

7. 以 Tina_Teng 的非 owner 场景重新点击 `Transform data`，应能进入 MashupEditor。

如果 QA 工作区的 `Power BI > Data connections` 菜单确实不可见，或启用后模型仍保持 `isInStrictMode=false`，再提交 Microsoft Fabric Support case，并附上第 14 节的证据包。

## 9. VFC tenant setting 查询限制

使用 `carman_zhao@vfc.com` 调用：

```text
GET https://api.fabric.microsoft.com/v1/admin/tenantsettings
```

返回：

```text
HTTP 403
errorCode: InsufficientScopes
requestId: 72a07292-f007-4e08-8f0f-55f9ff13239e
```

含义：

- 当前账号不是 Fabric tenant admin，不能读取 VFC 的 tenant GAC setting。
- 该 `403` 不表示 setting 已开启或关闭。
- 因为已从 PROD UI 直接确认 workspace-level GAC，查询 tenant setting 不再是解释 QA/PROD 差异的前置条件。

## 10. 私有 tenant 对照实验

私有 tenant 用户：

```text
seven@carman.ccwu.cc
```

### 10.1 私有 tenant 工作区

| 工作区 | Workspace ID | 备注 |
|---|---|---|
| `WorkSpace_DEV` | `2c51e061-0f9f-4d02-bed0-c169019e5d83` | dedicated capacity，主要测试空间 |
| `Workspace-2` | `0373c69f-d701-475e-afc6-30c2bafa6146` | 工作区隔离对照 |
| `Admin monitoring` | `5f0a49b0-a02e-4c86-bf44-4f6a5d4d4af5` | 系统管理模型 |
| `Microsoft Fabric Capacity Metrics` | `9b9146c9-f8fe-4c9e-b026-f4f2e25c233c` | 系统容量指标模型 |

### 10.2 Tenant-wide GAC 的动态验证

先前在私有 tenant 将以下 tenant setting 开启为全组织强制：

```text
Enable granular access control for all data connections
Enabled for the entire organization
```

兼容 V3 模型随即返回 `isInStrictMode=true`。

2026-09-18 用户关闭 tenant-level GAC 后，使用同一 model ID 重新读取：

| 模型 | tenant GAC 开启时 | tenant GAC 关闭后 |
|---|---:|---:|
| `PBI_BI_SAP_Demo` | `true` | `false` |
| `PBI_Salesforce_demo` | `true` | `false` |
| `AstraZeneca_SFE` | `true` | `false` |

同时部分模型仍保留 `WebModelingEdit` annotation。

结论：

- strict mode 是当前有效服务策略的动态结果。
- strict mode 不由模型 ID 或 `WebModelingEdit` annotation 固定决定。
- tenant-wide 强制 GAC 会使兼容模型跨工作区进入 strict mode。

### 10.3 私有 tenant setting API 验证

成功读取：

```text
GET /v1/admin/tenantsettings
```

当前返回的 GAC setting：

```text
settingName: ASShareableCloudConnectionBindingSecurityModeTenant
title: Enable granular access control for all data connections
enabled: false
canSpecifySecurityGroups: false
tenantSettingGroup: Integration settings
```

这与“关闭私有 tenant 的全局 GAC”操作一致。

### 10.4 通用 delegated tenant-setting API 的验证和边界

私有 tenant 中读取：

```text
GET /v1/admin/capacities/delegatedTenantSettingOverrides
GET /v1/admin/workspaces/delegatedTenantSettingOverrides
```

均返回 0 条记录。

随后针对同一个 GAC setting 调用：

```text
POST /v1/admin/tenantsettings/
  ASShareableCloudConnectionBindingSecurityModeTenant/update
```

结果：

| 请求 body | 结果 |
|---|---|
| `{"enabled":false}` | `HTTP 200` |
| `{"enabled":false,"delegateToWorkspace":true}` | `HTTP 400 BadRequest` |
| `{"enabled":false,"delegateToWorkspace":false}` | `HTTP 400 BadRequest` |

结论：

- 该 GAC setting 不接受 Fabric 通用 `delegateToWorkspace` 字段。
- 不能用“tenant setting 没有 delegate 给 workspace”解释 Workspace Settings 中 GAC UI 的显示或缺失。
- 这不表示 GAC 不支持 workspace-level 配置；PROD UI 和官方文档已经证明 workspace-level GAC 存在。
- 截至 2026-09-18，未找到 Microsoft 已文档化的 Fabric Admin REST API，可用于读取或写入此 workspace-level GAC setting。

### 10.5 在 WorkSpace_DEV 启用 workspace-level GAC 后的验证

用户在 `WorkSpace_DEV` 启用 workspace-level GAC 后，以下普通模型均返回 `isInStrictMode=true`：

- `PBI_BI_SAP_Demo`
- `Usage Metrics Report`
- `PBI_Salesforce_demo`
- `AstraZeneca_SFE`

`Report Usage Metrics Model` 是系统/使用率模型。它在不同调用路径中出现过 `OperationNotSupportedOnModel` 或 `403`，不应被解释为 `strict=false`，也不用于验证普通模型的 GAC 行为。

### 10.6 其他私有工作区状态

| 工作区 | 结果 |
|---|---|
| `WorkSpace_DEV` | 4 个普通模型均 strict=true，确认工作区 GAC 已生效 |
| `Workspace-2` | 初始没有 semantic model |
| `Admin monitoring` | 系统管理模型，当前 WABI 模型读取返回 `404`；不能判为 strict=false |
| `Microsoft Fabric Capacity Metrics` | 系统容量指标模型，模型读取返回 `403`；不能判为 strict=false |

## 11. 控制实验：复制模型到不同工作区

目的：验证 strict mode 是否随 semantic model definition 一起复制，还是由目标 workspace 的 GAC 有效状态决定。

### 11.1 复制方式

使用 Fabric REST definition API，而不是 Power BI Service 的 report copy：

```text
1. POST /v1/workspaces/{sourceWorkspaceId}/semanticModels/{sourceModelId}/getDefinition
2. POST /v1/workspaces/{targetWorkspaceId}/semanticModels
   body:
   {
     "displayName": "...",
     "description": "...",
     "definition": { ...source definition... }
   }
3. 轮询 Fabric long-running operation，直到 Succeeded。
```

实际复制：

| 属性 | 值 |
|---|---|
| 源工作区 | `WorkSpace_DEV` |
| 源模型 | `PBI_BI_SAP_Demo` |
| 源模型 ID | `8f2a320c-7ab8-44df-ae3d-c722664ee9d1` |
| 源模型 strict | `true` |
| 目标工作区 | `Workspace-2` |
| 新模型 | `PBI_BI_SAP_Demo_GAC_Test` |
| 新模型 ID | `1ced1c75-c5f9-4c89-9b77-919f106d7980` |
| 异步操作状态 | `Succeeded` |

没有复制：

- 源模型关联 report。
- workspace 成员和权限。
- report/dashboard 等其他 artifact。
- 刷新操作。

### 11.2 控制实验结果

复制完成并等待模型初始化后：

| 模型 | 工作区 | `isInStrictMode` | `hasAccessToAllDataConnections` | `isModelOwner` |
|---|---|---:|---:|---:|
| 源 `PBI_BI_SAP_Demo` | `WorkSpace_DEV` | `true` | 已具备 | 是 |
| 副本 `PBI_BI_SAP_Demo_GAC_Test` | `Workspace-2` | `false` | `true` | `true` |

结论：

```text
相同 semantic model definition
  + 不同目标 workspace
  = 不同 isInStrictMode
```

strict mode 不存储在 copied model definition 中，而是跟随目标 workspace 的有效 GAC 策略。

### 11.3 Service 是否有直接“复制模型到其他工作区”的选项

本次没有使用 Service UI 的复制按钮。

Microsoft 标准文档描述了 report 的 `Save a copy`：复制后的 report 仍引用源工作区的 semantic model；它不是“复制 semantic model”的功能。

截至 2026-09-18，未找到 Microsoft 文档化的、与 report `Save a copy` 等价的直接跨工作区 semantic model copy UI。替代方案：

- 下载可下载的 PBIX 后重新发布到目标工作区。
- 使用 Deployment pipeline、Git/definition API 或其他受控发布流程。
- 使用本次验证使用的 Fabric semantic model definition API。

## 12. 全 tenant 清单尝试和限制

使用当前 Carman VFC token：

- 可见 12 个 VFC workspaces。
- 可枚举 863 个 semantic models。

初始批量 `getModel` 扫描受以下限制：

| 结果 | 数量 | 含义 |
|---|---:|---|
| HTTP `429` | 805 | 被节流，不能当作 false |
| `PowerBIEntityNotFound` | 30 | 通常是模型位于其他 WABI cluster |
| timeout | 21 | 未完成，不能当作 false |
| 成功完成的 PROD 模型 | 6 | 均 strict=true |

结论：

- 不能把失败、跨集群或被限流的请求统计成 strict=false。
- 完整 tenant inventory 需要按 workspace/模型发现 WABI cluster，并限速、重试。
- 当前 incident 不需要完整 inventory，因为 QA/PROD 对照、同连接对照和 PROD UI 已足够确认根因。

## 13. 已撤回或不成立的推断

| 旧推断 | 为什么不成立 |
|---|---|
| `WebModelingEdit` 控制 Power Query/GAC | 私有 tenant 中存在带该 annotation 且 strict=false 的模型 |
| QA/PROD 差异来自 connection 或 gateway | QA APAC 与 PROD Sales 使用同一 connection 和 gateway |
| Workspace Admin 或 connection owner 自动可以打开 PQ | QA 反例证明不成立 |
| `delegateToWorkspace` 是 GAC 的配置入口 | 对 exact GAC setting 提交该字段即返回 400 |
| PROD strict 的来源尚未确认 | PROD 模型 UI 已明确显示 workspace admin 启用了 GAC |
| strict mode 会随着 model definition 复制 | WorkSpace_DEV -> Workspace-2 复制实验否定该推断 |
| 打开并保存 QA Power Query 会自动初始化/授权 GAC | QA 模型仍为 strict=false；保存不是 workspace GAC 配置 |

## 14. 何时需要 Microsoft Fabric Support

优先按第 8.3 节在 QA 工作区启用 workspace-level GAC。

仅在下列情况之一出现时提交 Support case：

1. `DA_APAC_BI_QA > Settings > Power BI > Data connections` 中没有 GAC 开关，且 Workspace Admin 无法看到。
2. 成功启用并 `Apply` 后，等待设置传播和重新读取仍显示 `isInStrictMode=false`。
3. `isInStrictMode=true` 且 `hasAccessToAllDataConnections=true`，但 Tina_Teng 的非 owner Power Query 仍无法打开。
4. 开启 QA workspace GAC 后出现不符合说明的 shared-item / connection disconnect。

Support case 建议附带：

```text
QA APAC
  Workspace: DA_APAC_BI_QA
  Model ID: dca83ecc-9699-4c9a-9a5a-42ab372a1ec6
  isInStrictMode=false
  hasAccessToAllDataConnections=true

QA DUT
  Workspace: DA_APAC_BI_QA
  Model ID: 670e68de-26da-44e6-a02f-1d46149bac4a
  isInStrictMode=false
  hasAccessToAllDataConnections=true

PROD Sales
  Workspace: DA_APAC_BI_PROD
  Model ID: 3f5b70c5-5b81-432d-a7f8-74853bbd6cec
  isInStrictMode=true
  hasAccessToAllDataConnections=true
  Model UI message: workspace admin enabled GAC for all data connection types

Shared connection comparison
  Connection ID: ab753d67-90cf-4187-a6e3-c4502a648f59
  Gateway ID: 09392006-8c76-477a-a096-ae3cfeee59d7
  Same Databricks warehouse

NetLog behavior
  QA does not launch MashupEditor.
  PROD launches MashupEditor and Power Query editor APIs.
```

Support request:

```text
Please verify why the workspace-level GAC control is unavailable or ineffective
in DA_APAC_BI_QA. DA_APAC_BI_PROD is confirmed to enforce GAC at workspace
level and its models return isInStrictMode=true. QA models share the same
connection/gateway source but return isInStrictMode=false and reject
non-owner Power Query access before MashupEditor starts.
```

## 15. 当前状态和下一步

### 已完成

- 根因定位：QA/PROD 的 workspace-level GAC effective state 不同。
- PROD workspace-level GAC 已通过模型 UI 直接确认。
- QA/PROD strict mode、connection、gateway、capacity、NetLog 和前端逻辑均已对照。
- 私有 tenant 已验证 tenant-level、workspace-level 和 model-copy 情况。
- 复制模型控制实验已证明 strict mode 不随 definition 复制。
- 已定位 QA 应使用的 workspace UI 入口。

### 待执行

1. 在 `DA_APAC_BI_QA` 的 `Power BI > Data connections` 启用 workspace-level GAC 并 `Apply`。
2. 重新读取 QA APAC 和 QA DUT 的 `isInStrictMode`。
3. 以 Tina_Teng 的非 owner 场景重新测试 `Transform data`。
4. 仅在 UI 缺失、状态不传播或 strict=true 后仍失败时提交 Fabric Support。
