[PowerBI_PowerQuery_GAC_StrictMode_Investigation_2026-09-17.md](/static/uploads/notes/20260918_050313_PowerBI_PowerQuery_GAC_StrictMode_Investigation_2026-09-17.md)
• 文档摘要

  VFC 中 QA 与 PROD 的 Power Query 差异已定位为工作区级 GAC 状态不同：PROD 已启用 GAC，因此模型 isInStrictMode=true，
  Tina 即使不是模型 owner、只要具备所有连接权限，也能打开 Power Query；QA 模型为 isInStrictMode=false，前端会在启动
  MashupEditor 前阻止非 owner 打开 PQ。

  这不是 connection、gateway、Databricks source、capacity、Workspace Admin 权限或 WebModelingEdit annotation 导致的。QA
  APAC 与 PROD Sales 实际使用相同 connection 和 gateway。

  推荐处理：在 DA_APAC_BI_QA > Settings > Power BI > Data connections 启用 Enable granular access control for all data
  connections 并 Apply；然后验证 QA APAC 与 DUT 的 isInStrictMode=true，再以 Tina 非 owner 身份测试 Transform data。

  私有 tenant 的控制实验进一步证明：strict mode 是目标工作区的有效 GAC 策略，不会随模型 definition 一起复制。将
  strict=true 的模型复制到未启用 GAC 的 Workspace-2 后，新模型变为 isInStrictMode=false。