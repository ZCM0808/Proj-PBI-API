
$scriptPath = 'D:\ZCM\Proj-PBI-API\static\script.js'
$scriptContent = [System.IO.File]::ReadAllText($scriptPath, [System.Text.Encoding]::UTF8)

$cleanBlock = @"
    // 1. 个人认证按钮 (自动抽取本地缓存与后台已认证 Token)
    btnAuth.addEventListener('click', async () => {
        try {
            btnAuth.innerText = "⏳ 获取中...";
            const res = await fetch('/api/xmla/get-token');
            const data = await res.json();
            btnAuth.innerText = "⚡ 自动获取当前 Token";
            if (data && data.success && data.token) {
                tokenInput.value = data.token;
                alert("✅ 已成功从静默凭据缓存中无感提取未过期的 Access Token！");
            } else {
                // 尝试从全域配置中提取
                const r2 = await fetch('/api/check-permissions');
                const d2 = await r2.json();
                if (d2 && d2.token) {
                    tokenInput.value = d2.token;
                    alert("✅ 已为您提取系统全局连接生效的 Access Token！");
                } else {
                    alert("💡 提示：您可以先双击桌面【运行PowerBI刷新工具.bat】登录一次，系统将自动记录免登录凭据。");
                }
            }
        } catch (e) {
            btnAuth.innerText = "⚡ 自动获取当前 Token";
            alert("❌ 提取异常: " + e.message);
        }
    });
"@

$idx1 = $scriptContent.IndexOf("// 1. 个人认证按钮")
$idx2 = $scriptContent.IndexOf("// 2. 扫描模型 (Datasets)")

if ($idx1 -ge 0 -and $idx2 -gt $idx1) {
    $sub = $scriptContent.Substring($idx1, $idx2 - $idx1)
    $scriptContent = $scriptContent.Replace($sub, $cleanBlock + "`n`n    ")
    [System.IO.File]::WriteAllText($scriptPath, $scriptContent, [System.Text.Encoding]::UTF8)
}