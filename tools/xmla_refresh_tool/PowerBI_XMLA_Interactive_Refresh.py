import json
import requests
import html
import os
import sys
import time
import threading
import datetime
import xml.etree.ElementTree as ET
from msal import PublicClientApplication, SerializableTokenCache

XMLA_ENDPOINT = "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA"
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "refresh_history.json")
CACHE_FILE = os.path.join(os.path.dirname(__file__), "msal_token_cache.bin")

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_history(entry):
    history = load_history()
    history.insert(0, entry)
    history = history[:20]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def convert_utc_to_bj(utc_str):
    if not utc_str:
        return None, "进行中..."
    try:
        clean_str = utc_str[:19].replace("T", " ")
        dt_utc = datetime.datetime.strptime(clean_str, "%Y-%m-%d %H:%M:%S")
        dt_bj = dt_utc + datetime.timedelta(hours=8)
        return dt_bj, dt_bj.strftime("%Y-%m-%d %H:%M:%S") + " (UTC+8)"
    except Exception:
        return None, utc_str

def format_duration(start_dt, end_dt):
    if not start_dt or not end_dt:
        return "计算中..."
    diff_sec = int((end_dt - start_dt).total_seconds())
    if diff_sec < 0:
        return "0秒"
    m, s = divmod(diff_sec, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}小时 {m}分 {s}秒"
    elif m > 0:
        return f"{m}分 {s}秒"
    else:
        return f"{s}秒"

# 优雅的控制台动态 Loading Spinner 旋转图标上下文类
class Spinner:
    def __init__(self, message="正在查询处理中..."):
        self.message = message
        self.spinner_symbols = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self.stop_running = False
        self.thread = None

    def _spin(self):
        idx = 0
        while not self.stop_running:
            symbol = self.spinner_symbols[idx % len(self.spinner_symbols)]
            sys.stdout.write(f"\r{symbol} {self.message}")
            sys.stdout.flush()
            idx += 1
            time.sleep(0.08)

    def __enter__(self):
        self.stop_running = False
        self.thread = threading.Thread(target=self._spin, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop_running = True
        if self.thread and self.thread.is_alive():
            self.thread.join()
        sys.stdout.write('\r' + ' ' * (len(self.message) + 10) + '\r')
        sys.stdout.flush()

print("==========================================================================")
print("   Power BI XMLA 语义模型 / 表 / 分区 交互式扫描、刷新与历史追踪工具    ")
print("==========================================================================")
print(f"当前 XMLA 端点: {XMLA_ENDPOINT}\n")

# 1. 动态持久化 MSAL Token Cache (免重复网页弹窗登录)
cache = SerializableTokenCache()
if os.path.exists(CACHE_FILE):
    try:
        cache.deserialize(open(CACHE_FILE, "r").read())
    except Exception:
        pass

CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
AUTHORITY = "https://login.microsoftonline.com/organizations"

app = PublicClientApplication(client_id=CLIENT_ID, authority=AUTHORITY, token_cache=cache)
scopes = ["https://analysis.windows.net/powerbi/api/.default"]

accounts = app.get_accounts()
result = None

if accounts:
    with Spinner("检测到本地未过期的认证缓存，正在进行无感静默登录..."):
        result = app.acquire_token_silent(scopes=scopes, account=accounts[0])

if not result or "access_token" not in result:
    print("[1/4] 首次运行或凭据过期，正在打开浏览器进行个人身份认证登录...")
    result = app.acquire_token_interactive(scopes=scopes)

if "access_token" not in result:
    print(f"❌ 认证失败: {result.get('error_description')}")
    input("\n按 Enter 键退出...")
    exit(1)

if cache.has_state_changed:
    try:
        with open(CACHE_FILE, "w") as f:
            f.write(cache.serialize())
    except Exception:
        pass

access_token = result["access_token"]
print("✅ 个人身份认证成功！(已安全缓存凭据，下次免弹窗)\n")

pbi_headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

workspace_id = None
with Spinner("正在拉取工作区凭据..."):
    groups_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)
    if groups_res.status_code == 200:
        groups = groups_res.json().get("value", [])
        for g in groups:
            if g.get("name", "").lower() == "DA_APAC_BI_QA".lower():
                workspace_id = g.get("id")
                break

def fetch_model_tables(selected_db_name, selected_ds_id):
    tables = []
    if selected_ds_id:
        dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{selected_ds_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{selected_ds_id}/executeQueries"
        
        dax_queries = [
            "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])",
            "EVALUATE SELECTCOLUMNS(INFO.TABLES(), \"Table Name\", COALESCE([ExplicitName], [Name]))",
            "EVALUATE SELECTCOLUMNS(FILTER(INFO.TABLES(), [IsHidden] = FALSE()), \"Table Name\", [ExplicitName])"
        ]
        
        for q_str in dax_queries:
            if tables:
                break
            dax_body = {"queries": [{"query": q_str}], "serializerSettings": {"incNull": True}}
            try:
                r_dax = requests.post(dax_url, json=dax_body, headers=pbi_headers, timeout=25)
                if r_dax.status_code == 200:
                    res_j = r_dax.json()
                    results = res_j.get("results", [])
                    if results and "tables" in results[0]:
                        rows = results[0]["tables"][0].get("rows", [])
                        raw_names = list(set([r.get("[Table Name]") or r.get("Table Name") or r.get("ExplicitName") or r.get("[ExplicitName]") for r in rows if (r.get("[Table Name]") or r.get("Table Name") or r.get("ExplicitName"))]))
                        for t_name in sorted(raw_names):
                            if t_name and not str(t_name).startswith("DateTableTemplate") and not str(t_name).startswith("LocalDateTable") and not str(t_name).startswith("RowNumber"):
                                tables.append({"name": t_name, "partitions": [{"name": t_name, "mode": "import"}]})
            except Exception:
                pass

    if not tables and selected_ds_id:
        try:
            t_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{selected_ds_id}/tables" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{selected_ds_id}/tables"
            r_t = requests.get(t_url, headers=pbi_headers, timeout=6)
            if r_t.status_code == 200:
                t_list = r_t.json().get("value", [])
                for t in t_list:
                    t_name = t.get("name")
                    if t_name and not str(t_name).startswith("DateTableTemplate") and not str(t_name).startswith("LocalDateTable") and not str(t_name).startswith("RowNumber"):
                        tables.append({"name": t_name, "partitions": [{"name": t_name, "mode": "import"}]})
        except Exception:
            pass

    if not tables:
        HTTP_XMLA_URL = XMLA_ENDPOINT.replace("powerbi://", "https://") + "/xmla"
        headers_xmla = {"Authorization": f"Bearer {access_token}", "Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'}
        tmsl_discover_xml = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Discover xmlns="urn:schemas-microsoft-com:xmla"><RequestType>DISCOVER_TMSL_METADATA</RequestType><Restrictions /><Properties><PropertyList><Catalog>{selected_db_name}</Catalog></PropertyList></Properties></Discover></soap:Body></soap:Envelope>"""
        try:
            r_xmla = requests.post(HTTP_XMLA_URL, data=tmsl_discover_xml.encode('utf-8'), headers=headers_xmla, timeout=12)
            if r_xmla.status_code == 200 and "<METADATA>" in r_xmla.text:
                json_str = r_xmla.text.split("<METADATA>")[1].split("</METADATA>")[0]
                m_json = json.loads(html.unescape(json_str))
                for t in m_json.get("model", {}).get("tables", []):
                    t_name = t.get("name")
                    if t_name and not t_name.startswith("DateTableTemplate") and not t_name.startswith("LocalDateTable"):
                        raw_parts = t.get("partitions", [])
                        p_list = [{"name": p.get("name"), "mode": p.get("mode", "import")} for p in raw_parts if p.get("name")]
                        tables.append({"name": t_name, "partitions": p_list or [{"name": t_name, "mode": "import"}]})
        except Exception:
            pass

    return tables

def query_table_row_count(dataset_id, dataset_name, table_name=None):
    dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{dataset_id}/executeQueries"
    
    if table_name:
        dax_str = f"EVALUATE {{ COUNTROWS('{table_name}') }}"
    else:
        dax_str = "EVALUATE SELECTCOLUMNS(FILTER(INFO.TABLES(), [IsHidden] = FALSE()), \"Table\", [ExplicitName], \"Rows\", [TableID])"

    dax_body = {
        "queries": [{"query": dax_str}],
        "serializerSettings": {"incNull": True}
    }
    try:
        r_dax = requests.post(dax_url, json=dax_body, headers=pbi_headers, timeout=10)
        if r_dax.status_code == 200:
            res_rows = r_dax.json().get("results", [])[0].get("tables", [])[0].get("rows", [])
            if table_name and res_rows:
                return res_rows[0].get("[Value]") or res_rows[0].get("Value")
    except Exception:
        pass
    return None

def check_cloud_status(dataset_name, dataset_id, target_table=None):
    ref_status_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/refreshes?$top=5" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{dataset_id}/refreshes?$top=5"
    
    status_res = None
    with Spinner(f"正在查询模型 [{dataset_name}] 最新云端刷新记录与目标表数据量..."):
        status_res = requests.get(ref_status_url, headers=pbi_headers)
        current_rows = None
        if target_table:
            current_rows = query_table_row_count(dataset_id, dataset_name, target_table)

    print(f"\n📊 模型 [{dataset_name}] 最新 5 次云端刷新状态记录 (已转换为 UTC+8 北京时间)：")
    print("=" * 85)
    if status_res and status_res.status_code == 200:
        ref_items = status_res.json().get("value", [])
        if not ref_items:
            print("暂无历史刷新记录。")
        for item in ref_items:
            r_type = item.get("refreshType", "Unknown")
            r_status = item.get("status", "Unknown")
            start_dt, r_start = convert_utc_to_bj(item.get("startTime"))
            end_dt, r_end = convert_utc_to_bj(item.get("endTime"))
            
            duration_str = format_duration(start_dt, end_dt) if end_dt else "进行中..."
            status_icon = "✅ 成功" if r_status == "Completed" else ("⏳ 进行中" if r_status == "Unknown" or not item.get("endTime") else f"❌ 失败 ({r_status})")
            r_err = item.get("serviceExceptionJson", "")
            
            print(f"• 起止时间: {r_start}  至  {r_end}")
            print(f"  ⏱️ 刷新耗时: {duration_str} | 刷新类型: {r_type} | 状态: {status_icon}")
            
            if target_table and current_rows is not None:
                print(f"  📊 目标表 [{target_table}] 刷新后当前总行数: {current_rows:,} 行")
            
            if r_err and r_status == "Failed":
                print(f"  ❌ 错误明细: {r_err[:150]}...")
            print("-" * 85)
    else:
        print("❌ 获取云端状态失败或权限不足。")
        print("=" * 85)

def prompt_nav(msg, valid_max, allow_b=True):
    while True:
        prompt_str = f"{msg} [输入 0 返回主菜单" + (", B 返回上一级]: " if allow_b else "]: ")
        inp = input(prompt_str).strip()
        if inp == "0":
            return "MAIN"
        if allow_b and inp.upper() == "B":
            return "BACK"
        if inp.isdigit():
            val = int(inp)
            if 1 <= val <= valid_max:
                return val
            elif val == 0:
                return "MAIN"
        print(f"⚠️ 输入无效，请输入 1 到 {valid_max} 之间的数字" + ("，或输入 B 返回上一级，0 返回主菜单。" if allow_b else "，或输入 0 返回主菜单。"))

# 主循环
while True:
    print("\n==================== 主功能选择 ====================")
    print(" [1] 扫描并发起新的表/分区刷新")
    print(" [2] 查看历史记录 (支持一键重刷 & 查状态)")
    print(" [3] 选择工作区中任意模型查询云端状态")
    print(" [0] 退出程序")
    print("====================================================")

    main_choice = input("请选择功能编号 [0-3，默认 1]: ").strip()

    if main_choice == "0":
        print("感谢使用，已退出程序。")
        break

    if main_choice == "3":
        while True:
            datasets = []
            with Spinner("正在拉取工作区中的语义模型..."):
                ds_res = requests.get(f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets", headers=pbi_headers) if workspace_id else requests.get("https://api.powerbi.com/v1.0/myorg/datasets", headers=pbi_headers)
                datasets = ds_res.json().get("value", []) if ds_res.status_code == 200 else []
            
            if not datasets:
                print("⚠️ 未扫描到任何模型。")
                break

            print("\n==================== 选择要查询状态的模型 ====================")
            print(" [0] 返回主菜单 | [B] 返回上一级")
            for idx, ds in enumerate(datasets, 1):
                print(f" [{idx}] {ds.get('name')}")
            print("===============================================================")
            
            nav = prompt_nav("请输入模型编号", len(datasets))
            if nav == "MAIN" or nav == "BACK" or nav == 0:
                break
            
            sel_ds = datasets[nav - 1]
            check_cloud_status(sel_ds.get("name"), sel_ds.get("id"))
            
            nav_end = prompt_nav("\n下一步操作：", 0, allow_b=True)
            if nav_end == "MAIN" or nav_end == 0:
                break
            elif nav_end == "BACK":
                continue
        continue

    quick_target = None
    if main_choice == "2":
        while True:
            history_list = load_history()
            if not history_list:
                print("\n⚠️ 暂无本地历史刷新记录。按 Enter 返回主菜单...")
                input()
                break
            
            print("\n==================== 本地历史刷新记录 (最近 20 条) ====================")
            print(" [0] 返回主菜单 | [B] 返回上一级")
            for idx, h in enumerate(history_list, 1):
                p_info = f" -> 分区 [{h.get('partition')}]" if h.get('partition') else " (全表)"
                print(f" [{idx}] [{h.get('time')}] 模型: {h.get('dataset')} -> 表: {h.get('table')}{p_info}")
            print("=========================================================================")
            
            nav_h = prompt_nav("请输入历史记录编号", len(history_list))
            if nav_h == "MAIN" or nav_h == "BACK" or nav_h == 0:
                break
            
            selected_history = history_list[nav_h - 1]
            
            print(f"\n已选中历史记录: [{selected_history.get('dataset')}] -> [{selected_history.get('table')}]")
            print(" [1] ⚡ 一键重复刷新此表/分区")
            print(" [2] 🔍 直接查询此模型的云端最新刷新状态")
            print(" [0] 返回主菜单")
            print(" [B] 返回上一级 (历史列表)")
            
            nav_act = prompt_nav("请选择要执行的操作 [1-2，默认 1]", 2)
            if nav_act == "MAIN" or nav_act == 0:
                break
            elif nav_act == "BACK":
                continue
            elif nav_act == 2:
                check_cloud_status(selected_history.get("dataset"), selected_history.get("dataset_id"), selected_history.get("table"))
                nav_end = prompt_nav("\n下一步操作：", 0, allow_b=True)
                if nav_end == "MAIN" or nav_end == 0:
                    break
                elif nav_end == "BACK":
                    continue
            else:
                quick_target = selected_history
                break

        if not quick_target and main_choice == "2":
            continue

    if not quick_target:
        step_cancelled = False
        while True:
            datasets = []
            with Spinner("正在扫描工作区中的语义模型 (Datasets)..."):
                ds_res = requests.get(f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets", headers=pbi_headers) if workspace_id else requests.get("https://api.powerbi.com/v1.0/myorg/datasets", headers=pbi_headers)
                datasets = ds_res.json().get("value", []) if ds_res.status_code == 200 else []

            if not datasets:
                print("⚠️ 该工作区中未找到任何语义模型。")
                input("\n按 Enter 返回主菜单...")
                step_cancelled = True
                break

            print("\n==================== 扫描到以下语义模型 (Datasets) ====================")
            print(" [0] 返回主菜单 | [B] 返回上一级")
            for idx, ds in enumerate(datasets, 1):
                print(f" [{idx}] {ds.get('name')}")
            print("========================================================================")

            nav_ds = prompt_nav("请输入模型编号", len(datasets))
            if nav_ds == "MAIN" or nav_ds == "BACK" or nav_ds == 0:
                step_cancelled = True
                break

            selected_ds = datasets[nav_ds - 1]
            selected_db_name = selected_ds.get("name")
            selected_ds_id = selected_ds.get("id")
            print(f"👉 已选择模型: {selected_db_name}\n")

            tables_step_back = False
            while True:
                tables = []
                with Spinner(f"正在深度扫描模型 '{selected_db_name}' 中的数据表与分区..."):
                    tables = fetch_model_tables(selected_db_name, selected_ds_id)

                if not tables:
                    print(f"\n⚠️ 自动枚举表名受限。")
                    raw_in = input("请输入要刷新的目标表名 [0 返回主菜单，B 返回上一级]: ").strip()
                    if raw_in == "0":
                        step_cancelled = True
                        break
                    elif raw_in.upper() == "B":
                        tables_step_back = True
                        break
                    manual_name = raw_in
                    tables = [{"name": manual_name, "partitions": [{"name": manual_name, "mode": "import"}]}]

                print("\n==================== 模型中的数据表列表 ====================")
                print(" [0] 返回主菜单 | [B] 返回上一级 (重新选择模型)")
                for idx, tbl in enumerate(tables, 1):
                    print(f" [{idx}] 表名: {tbl.get('name')} (包含 {len(tbl.get('partitions', []))} 个分区)")
                print("=============================================================")

                nav_tbl = prompt_nav("请输入要刷新的表编号", len(tables))
                if nav_tbl == "MAIN" or nav_tbl == 0:
                    step_cancelled = True
                    break
                elif nav_tbl == "BACK":
                    tables_step_back = True
                    break

                selected_table = tables[nav_tbl - 1]
                target_tbl_name = selected_table.get("name")
                target_partitions = selected_table.get("partitions", [])

                print(f"\n==================== 表 '{target_tbl_name}' 刷新范围 ====================")
                print(" [0] 刷新整个表 (全表包含所有分区)")
                for idx, part in enumerate(target_partitions, 1):
                    print(f" [{idx}] 分区名: {part.get('name')} | 模式: {part.get('mode', 'import')}")
                print(" [99] 手动输入特定分区名")
                print("==========================================================================")

                selected_part_idx = -1
                part_back = False
                while True:
                    p_in = input(f"请输入刷新选项 [0 全表，99 手动分区，B 返回上一级]: ").strip().upper()
                    if p_in == "0":
                        selected_part_idx = 0
                        break
                    if p_in == "B":
                        part_back = True
                        break
                    if p_in == "99" or (p_in.isdigit() and 1 <= int(p_in) <= len(target_partitions)):
                        selected_part_idx = int(p_in)
                        break

                if part_back:
                    continue

                custom_part = None
                if selected_part_idx == 99:
                    custom_part = input("请输入确切的分区名: ").strip()
                elif selected_part_idx > 0:
                    custom_part = target_partitions[selected_part_idx - 1].get("name")

                print("\n请选择刷新类型 (Refresh Type):")
                print(" [1] full (完全刷新数据 - 默认)")
                print(" [2] dataOnly (仅刷新数据)")
                print(" [3] calculate (仅重新计算度量值)")
                print(" [4] clearValues (清空数据)")

                ref_type_choice = input("请选择刷新类型 [1-4，默认 1]: ").strip()
                refresh_type = {"1": "full", "2": "dataOnly", "3": "calculate", "4": "clearValues"}.get(ref_type_choice, "full")
                break

            if tables_step_back:
                continue
            break

        if step_cancelled:
            continue

    print("\n[4/4] 准备执行刷新操作...")
    if custom_part:
        print(f"🎯 目标: 模型 [{selected_db_name}] -> 表 [{target_tbl_name}] -> 分区 [{custom_part}] (类型: {refresh_type})")
        tmsl_obj = {"database": selected_db_name, "table": target_tbl_name, "partition": custom_part}
    else:
        print(f"🎯 目标: 模型 [{selected_db_name}] -> 表 [{target_tbl_name}] (全表, 类型: {refresh_type})")
        tmsl_obj = {"database": selected_db_name, "table": target_tbl_name}

    tmsl_payload = {"refresh": {"type": refresh_type, "objects": [tmsl_obj]}}

    confirm = input("\n确认开始刷新？(Y/N) [默认 Y]: ").strip().upper()
    if confirm and confirm != "Y":
        print("已取消操作，返回主菜单。")
        continue

    success = False
    with Spinner("🚀 正在下发 XMLA / TMSL 刷新指令至 Power BI 引擎..."):
        HTTP_XMLA_URL = XMLA_ENDPOINT.replace("powerbi://", "https://") + "/xmla"
        xmla_execute_headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"urn:schemas-microsoft-com:xmla:Execute"'}
        xmla_soap_body = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Execute xmlns="urn:schemas-microsoft-com:xmla"><Command><Statement>{json.dumps(tmsl_payload)}</Statement></Command><Properties><PropertyList><Catalog>{selected_db_name}</Catalog></PropertyList></Properties></Execute></soap:Body></soap:Envelope>"""

        current_time_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        exec_res = requests.post(HTTP_XMLA_URL, data=xmla_soap_body.encode('utf-8'), headers=xmla_execute_headers)

        if exec_res.status_code == 200 and "<Error" not in exec_res.text:
            success = True
        else:
            refresh_api_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{selected_ds_id}/refreshes" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{selected_ds_id}/refreshes"
            refresh_body = {"type": refresh_type.capitalize(), "commitMode": "transactional", "objects": [tmsl_obj]}
            resp = requests.post(refresh_api_url, json=refresh_body, headers=pbi_headers)
            if resp.status_code in [200, 202]:
                success = True

    if success:
        print("\n==========================================================================")
        print(" ✅ 局部刷新指令已成功下发至 Power BI 引擎！")
        print("==========================================================================")
        save_history({
            "time": current_time_str,
            "dataset": selected_db_name,
            "dataset_id": selected_ds_id,
            "table": target_tbl_name,
            "partition": custom_part,
            "type": refresh_type
        })
        
        check_cloud_status(selected_db_name, selected_ds_id, target_tbl_name)
    else:
        print("\n❌ 刷新指令下发失败。")

    nav_post_ref = prompt_nav("\n下一步操作：", 0, allow_b=False)