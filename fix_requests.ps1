
# 在每一个 XMLA 路由函数内部都显式 import requests 作为绝对防线
$mainPath = 'D:\ZCM\Proj-PBI-API\src\main.py'
$mainContent = [System.IO.File]::ReadAllText($mainPath, [System.Text.Encoding]::UTF8)

$old1 = "async def scan_xmla_datasets(req: XMLAScanRequest):`n    \"\"\"扫描指定 XMLA 端点/工作区下的所有 Datasets\"\"\"`n    try:"
$new1 = "async def scan_xmla_datasets(req: XMLAScanRequest):`n    \"\"\"扫描指定 XMLA 端点/工作区下的所有 Datasets\"\"\"`n    import requests`n    try:"

$old2 = "async def scan_xmla_tables(req: XMLATablesRequest):`n    \"\"\"扫描指定 Dataset 模型下的数据表与分区列表\"\"\"`n    try:"
$new2 = "async def scan_xmla_tables(req: XMLATablesRequest):`n    \"\"\"扫描指定 Dataset 模型下的数据表与分区列表\"\"\"`n    import requests`n    try:"

$old3 = "async def trigger_xmla_refresh(req: XMLARefreshRequest):`n    \"\"\"下发 XMLA / TMSL 定向刷新任务\"\"\"`n    try:"
$new3 = "async def trigger_xmla_refresh(req: XMLARefreshRequest):`n    \"\"\"下发 XMLA / TMSL 定向刷新任务\"\"\"`n    import requests`n    try:"

$old4 = "async def get_xmla_refresh_status(req: XMLARefreshRequest):`n    \"\"\"查询指定模型云端的刷新状态历史与当前目标表真实行数\"\"\"`n    try:"
$new4 = "async def get_xmla_refresh_status(req: XMLARefreshRequest):`n    \"\"\"查询指定模型云端的刷新状态历史与当前目标表真实行数\"\"\"`n    import requests`n    try:"

$mainContent = $mainContent.Replace($old1, $new1).Replace($old2, $new2).Replace($old3, $new3).Replace($old4, $new4)
[System.IO.File]::WriteAllText($mainPath, $mainContent, [System.Text.Encoding]::UTF8)