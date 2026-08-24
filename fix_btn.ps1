
$scriptPath = 'D:\ZCM\Proj-PBI-API\static\script.js'
$scriptContent = [System.IO.File]::ReadAllText($scriptPath, [System.Text.Encoding]::UTF8)

$cleanBlock = @"
    // 1. 个人认证按钮
    btnAuth.addEventListener('click', async () => {
        try {
            btnAuth.innerText = "⏳ 获取中...";
            const res = await fetch('/api/check-permissions');
            const data = await res.json();
            btnAuth.innerText = "⚡ 自动获取当前 Token";
            if (data && data.token) {
                tokenInput.value = data.token;
                alert("✅ 已成功提取当前系统生效的 Access Token！");
            } else if (window.backendSettingsCache && window.backendSettingsCache.ACCESS_TOKEN) {
                tokenInput.value = window.backendSettingsCache.ACCESS_TOKEN;
                alert("✅ 已为您自动提取后台生效的 Access Token！");
            } else {
                alert("💡 提示：您可以直接使用桌面工具【运行PowerBI刷新工具.bat】（已实现无感静默登录），或将已有的 Token 直接贴入下方框中。");
            }
        } catch (e) {
            btnAuth.innerText = "⚡ 自动获取当前 Token";
            alert("💡 提示：您可以直接使用桌面工具【运行PowerBI刷新工具.bat】（已实现无感静默登录），或将已有的 Token 直接贴入下方框中。");
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