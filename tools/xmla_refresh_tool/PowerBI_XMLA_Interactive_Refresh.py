import json
import requests
import xml.etree.ElementTree as ET
from msal import PublicClientApplication

XMLA_ENDPOINT = "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA"

print("==========================================================================")
print("         Power BI XMLA 语义模型 / 表 / 分区 交互式扫描与刷新工具 (Python)    ")
print("==========================================================================")
print(f"当前 XMLA 端点: {XMLA_ENDPOINT}\n")

# 1. 个人身份交互式登录 (MSAL)
CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46" # Azure CLI Client ID
AUTHORITY = "https://login.microsoftonline.com/organizations"

print("[1/4] 正在进行个人身份认证登录...")
app = PublicClientApplication(client_id=CLIENT_ID, authority=AUTHORITY)
scopes = ["https://analysis.windows.net/powerbi/api/.default"]

result = app.acquire_token_interactive(scopes=scopes)

if "access_token" not in result:
    print(f"❌ 认证失败: {result.get('error_description')}")
    input("\n按 Enter 键退出...")
    exit(1)

access_token = result["access_token"]
print("✅ 个人身份认证成功！\n")

pbi_headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# 2. 借助 Power BI REST API 获取模型
print("[2/4] 正在扫描工作区中的语义模型 (Datasets)...")

workspace_name = "DA_APAC_BI_QA"
groups_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)

workspace_id = None
if groups_res.status_code == 200:
    groups = groups_res.json().get("value", [])
    for g in groups:
        if g.get("name", "").lower() == workspace_name.lower():
            workspace_id = g.get("id")
            break

datasets = []
if workspace_id:
    ds_res = requests.get(f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets", headers=pbi_headers)
    if ds_res.status_code == 200:
        datasets = ds_res.json().get("value", [])

if not datasets:
    ds_res = requests.get("https://api.powerbi.com/v1.0/myorg/datasets", headers=pbi_headers)
    if ds_res.status_code == 200:
        datasets = ds_res.json().get("value", [])

if not datasets:
    print("⚠️ 该工作区中未找到任何语义模型 (Datasets)。")
    input("\n按 Enter 键退出...")
    exit(1)

print("\n==================== 扫描到以下语义模型 (Datasets) ====================")
for idx, ds in enumerate(datasets, 1):
    ds_name = ds.get("name", "Unknown")
    print(f" [{idx}] {ds_name}")
print("========================================================================")

selected_db_idx = -1
while selected_db_idx < 0 or selected_db_idx >= len(datasets):
    try:
        val = input(f"请输入模型编号 [1-{len(datasets)}]: ")
        selected_db_idx = int(val) - 1
    except ValueError:
        pass

selected_ds = datasets[selected_db_idx]
selected_db_name = selected_ds.get("name")
selected_ds_id = selected_ds.get("id")
print(f"👉 已选择模型: {selected_db_name}\n")

# 3. 深度扫描模型下的表和分区
print(f"[3/4] 正在深度扫描模型 '{selected_db_name}' 中的数据表与分区...")

tables = []
HTTP_XMLA_URL = XMLA_ENDPOINT.replace("powerbi://", "https://") + "/xmla"
headers_xmla = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'
}

# 途径 1: 发送完整的 XMLA DISCOVER_TMSL_METADATA
tmsl_discover_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <Discover xmlns="urn:schemas-microsoft-com:xmla">
            <RequestType>DISCOVER_TMSL_METADATA</RequestType>
            <Restrictions />
            <Properties>
                <PropertyList>
                    <Catalog>{selected_db_name}</Catalog>
                </PropertyList>
            </Properties>
        </Discover>
    </soap:Body>
</soap:Envelope>"""

try:
    r_xmla = requests.post(HTTP_XMLA_URL, data=tmsl_discover_xml.encode('utf-8'), headers=headers_xmla, timeout=15)
    if r_xmla.status_code == 200:
        raw_text = r_xmla.text
        if "<METADATA>" in raw_text:
            json_str = raw_text.split("<METADATA>")[1].split("</METADATA>")[0]
            import html
            json_str = html.unescape(json_str)
            m_json = json.loads(json_str)
            raw_tables = m_json.get("model", {}).get("tables", [])
            for t in raw_tables:
                t_name = t.get("name")
                if t_name and not t_name.startswith("DateTableTemplate") and not t_name.startswith("LocalDateTable"):
                    raw_parts = t.get("partitions", [])
                    p_list = [{"name": p.get("name"), "mode": p.get("mode", "import")} for p in raw_parts if p.get("name")]
                    if not p_list:
                        p_list = [{"name": t_name, "mode": "import"}]
                    tables.append({"name": t_name, "partitions": p_list})
except Exception:
    pass

# 途径 2: 使用 Power BI REST API 的 Execute Queries 查询 DAX 提取
if not tables:
    dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{selected_ds_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{selected_ds_id}/executeQueries"
    
    dax_body = {
        "queries": [{"query": "EVALUATE SELECTCOLUMNS(INFO.TABLES(), \"Name\", [Name], \"ExplicitName\", [ExplicitName])"}],
        "serializerSettings": {"incNull": True}
    }
    try:
        r_dax = requests.post(dax_url, json=dax_body, headers=pbi_headers, timeout=15)
        if r_dax.status_code == 200:
            res_rows = r_dax.json().get("results", [])[0].get("tables", [])[0].get("rows", [])
            for row in res_rows:
                t_name = row.get("ExplicitName") or row.get("Name")
                if t_name and not t_name.startswith("DateTableTemplate") and not t_name.startswith("LocalDateTable") and not t_name.startswith("RowNumber"):
                    tables.append({"name": t_name, "partitions": [{"name": t_name, "mode": "import"}]})
    except Exception:
        pass

# 兜底防线 3: 手动输入表名
if not tables:
    print(f"\n⚠️ 自动枚举表名受限 (由于权限或容量限制)。")
    print(f"💡 请直接输入您在 Power BI Desktop/服务中看到的【目标表名】:")
    manual_name = input("目标表名: ").strip()
    if manual_name:
        tables = [{"name": manual_name, "partitions": [{"name": manual_name, "mode": "import"}]}]

if not tables:
    print(f"❌ 未指定目标表。")
    input("\n按 Enter 键退出...")
    exit(1)

print("\n==================== 模型中的数据表列表 ====================")
for idx, tbl in enumerate(tables, 1):
    t_name = tbl.get("name", "Unknown")
    parts = tbl.get("partitions", [])
    print(f" [{idx}] 表名: {t_name} (包含 {len(parts)} 个分区)")
print("=============================================================")

selected_tbl_idx = -1
while selected_tbl_idx < 0 or selected_tbl_idx >= len(tables):
    try:
        val = input(f"请输入要刷新的表编号 [1-{len(tables)}]: ")
        selected_tbl_idx = int(val) - 1
    except ValueError:
        pass

selected_table = tables[selected_tbl_idx]
target_tbl_name = selected_table.get("name")
target_partitions = selected_table.get("partitions", [])

print(f"👉 已选择表: {target_tbl_name}\n")

# 扫描/选择分区
print(f"==================== 表 '{target_tbl_name}' 刷新范围 ====================")
print(" [0] 刷新整个表 (全表包含所有分区)")
for idx, part in enumerate(target_partitions, 1):
    p_name = part.get("name", f"Partition_{idx}")
    p_mode = part.get("mode", "import")
    print(f" [{idx}] 分区名: {p_name} | 模式: {p_mode}")
print(" [99] 手动输入特定分区名")
print("==========================================================================")

selected_part_idx = -1
while selected_part_idx < 0 or (selected_part_idx > len(target_partitions) and selected_part_idx != 99):
    try:
        val = input(f"请输入刷新选项 [0 全表刷新，1-{len(target_partitions)} 选择分区，99 手动输入分区名]: ")
        selected_part_idx = int(val)
    except ValueError:
        pass

print("\n请选择刷新类型 (Refresh Type):")
print(" [1] full (完全刷新数据 - 默认)")
print(" [2] dataOnly (仅刷新数据)")
print(" [3] calculate (仅重新计算度量值/计算列)")
print(" [4] clearValues (清空数据)")

ref_type_choice = input("请选择刷新类型 [1-4，默认 1]: ").strip()
refresh_type_map = {"1": "full", "2": "dataOnly", "3": "calculate", "4": "clearValues"}
refresh_type = refresh_type_map.get(ref_type_choice, "full")

# 4. 执行刷新
print("\n[4/4] 准备执行刷新操作...")

if selected_part_idx == 0:
    print(f"🎯 目标: 模型 [{selected_db_name}] -> 表 [{target_tbl_name}] (全表)")
    tmsl_payload = {
        "refresh": {
            "type": refresh_type,
            "objects": [
                {
                    "database": selected_db_name,
                    "table": target_tbl_name
                }
            ]
        }
    }
elif selected_part_idx == 99:
    custom_part = input("请输入确切的分区名: ").strip()
    print(f"🎯 目标: 模型 [{selected_db_name}] -> 表 [{target_tbl_name}] -> 分区 [{custom_part}]")
    tmsl_payload = {
        "refresh": {
            "type": refresh_type,
            "objects": [
                {
                    "database": selected_db_name,
                    "table": target_tbl_name,
                    "partition": custom_part
                }
            ]
        }
    }
else:
    target_part_name = target_partitions[selected_part_idx - 1].get("name")
    print(f"🎯 目标: 模型 [{selected_db_name}] -> 表 [{target_tbl_name}] -> 分区 [{target_part_name}]")
    tmsl_payload = {
        "refresh": {
            "type": refresh_type,
            "objects": [
                {
                    "database": selected_db_name,
                    "table": target_tbl_name,
                    "partition": target_part_name
                }
            ]
        }
    }

confirm = input("\n确认开始刷新？(Y/N) [默认 Y]: ").strip().upper()
if confirm and confirm != "Y":
    print("已取消操作。按 Enter 退出重新运行脚本即可。")
    input("\n按 Enter 键退出...")
    exit(0)

print("\n🚀 正在发送刷新指令...")

# 发送 XMLA Execute 刷新命令
xmla_execute_headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": '"urn:schemas-microsoft-com:xmla:Execute"'
}

xmla_soap_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <Execute xmlns="urn:schemas-microsoft-com:xmla">
            <Command>
                <Statement>{json.dumps(tmsl_payload)}</Statement>
            </Command>
            <Properties>
                <PropertyList>
                    <Catalog>{selected_db_name}</Catalog>
                </PropertyList>
            </Properties>
        </Execute>
    </soap:Body>
</soap:Envelope>"""

exec_res = requests.post(HTTP_XMLA_URL, data=xmla_soap_body.encode('utf-8'), headers=xmla_execute_headers)

if exec_res.status_code == 200 and "<Error" not in exec_res.text:
    print("\n==========================================================================")
    print(" ✅ 刷新指令已成功发送并完成！")
    print("==========================================================================")
else:
    # 降级尝试 Enhanced Refresh REST API
    refresh_api_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{selected_ds_id}/refreshes" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{selected_ds_id}/refreshes"
    refresh_body = {
        "type": refresh_type.capitalize(),
        "commitMode": "transactional",
        "objects": tmsl_payload["refresh"]["objects"]
    }
    resp = requests.post(refresh_api_url, json=refresh_body, headers=pbi_headers)
    if resp.status_code in [200, 202]:
        print("\n==========================================================================")
        print(" ✅ 局部刷新任务已成功下发至 Power BI 引擎！")
        print("==========================================================================")
    else:
        print("\n❌ 刷新失败，服务端响应:")
        print(exec_res.text if exec_res.text else resp.text)
        print("\n💡 提示: 请检查表名拼写是否与 Power BI 报表中完全一致（区分大小写和空格）。")

input("\n按 Enter 键退出...")