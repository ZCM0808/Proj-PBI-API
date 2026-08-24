
# 在 main.py 文件顶部导入 requests 和 httpx
$mainPath = 'D:\ZCM\Proj-PBI-API\src\main.py'
$mainContent = [System.IO.File]::ReadAllText($mainPath, [System.Text.Encoding]::UTF8)

if ($mainContent -notlike "*import requests*") {
    $mainContent = $mainContent.Replace("import sys`nimport os", "import sys`nimport os`nimport requests")
    [System.IO.File]::WriteAllText($mainPath, $mainContent, [System.Text.Encoding]::UTF8)
}
