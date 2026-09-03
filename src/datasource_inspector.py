"""
Power BI / Fabric 报表与语义模型数据源全景穿透检测引擎 (Report & Dataset Datasource Inspector)
Dual-Engine Architecture:
  1. Primary: Power BI Admin Scanner API (PostWorkspaceInfo -> GetScanStatus -> GetScanResult)
  2. Fallback: XMLA / TMSL Metadata Soap + REST API (GetReport, GetDatasourcesInGroup, GetTablesInGroup)
"""

import asyncio
import json
import re
import urllib.parse
from typing import Any, Dict, List, Optional
import requests  # type: ignore[import-untyped]
from src.config import Config
from src.pbi_client import PBIClient


def extract_native_sql_and_server_info(m_expression: str) -> Dict[str, Any]:
    """
    从 Power Query M 表达式中提取 Native SQL(原生数据库查询) 及连接服务器/数据库参数
    """
    result: Dict[str, Any] = {
        "server": "",
        "database": "",
        "native_sql": "",
        "source_type": ""
    }
    if not m_expression:
        return result

    # 1. 匹配 PostgreSQL.Database("server", "db", ...)
    pg_match = re.search(
        r'\bPostgreSQL\.Database\s*\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']',
        m_expression,
        re.IGNORECASE
    )
    if pg_match:
        result["source_type"] = "PostgreSQL"
        result["server"] = pg_match.group(1).strip()
        result["database"] = pg_match.group(2).strip()

    # 2. 匹配 Sql.Database("server", "db", [Query="SELECT..."])
    if not result["source_type"]:
        sql_match = re.search(
            r'\bSql\.Database\s*\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*(?:,\s*\[([^\]]+)\])?',
            m_expression,
            re.IGNORECASE | re.DOTALL
        )
        if sql_match:
            result["source_type"] = "SQL Server / Azure SQL"
            result["server"] = sql_match.group(1).strip()
            result["database"] = sql_match.group(2).strip()
            opt_block = sql_match.group(3) or ""
            # 提取 Query="SELECT ..."
            query_match = re.search(r'Query\s*=\s*["\'](.*?)["\']\s*(?:,|\)|$)', opt_block, re.IGNORECASE | re.DOTALL)
            if query_match:
                result["native_sql"] = query_match.group(1).replace('""', '"').strip()

    # 2. 匹配 Value.NativeQuery(..., "SELECT...")
    if not result["native_sql"]:
        native_match = re.search(
            r'Value\.NativeQuery\s*\([^,]+,\s*["\'](.*?)["\']\s*(?:,|\))',
            m_expression,
            re.IGNORECASE | re.DOTALL
        )
        if native_match:
            result["native_sql"] = native_match.group(1).replace('""', '"').strip()

    # 3. 匹配通用数据源驱动
    if not result["source_type"]:
        if "Oracle.Database" in m_expression:
            result["source_type"] = "Oracle Database"
        elif "PostgreSQL.Database" in m_expression:
            result["source_type"] = "PostgreSQL"
        elif "MySQL.Database" in m_expression:
            result["source_type"] = "MySQL"
        elif "Snowflake.Databases" in m_expression:
            result["source_type"] = "Snowflake"
        elif "Web.Contents" in m_expression:
            result["source_type"] = "Web API / HTTP"
        elif "Excel.Workbook" in m_expression or "File.Contents" in m_expression:
            result["source_type"] = "File (Excel/CSV/Text)"
        elif "SharePoint.Files" in m_expression or "SharePoint.Tables" in m_expression:
            result["source_type"] = "SharePoint Online"
        elif "OData.Feed" in m_expression:
            result["source_type"] = "OData Feed"
        elif "SapHana.Database" in m_expression:
            result["source_type"] = "SAP HANA"
        elif "AmazonRedshift.Database" in m_expression:
            result["source_type"] = "Amazon Redshift"
        elif "FabricDataWarehouse" in m_expression or "FabricLakehouse" in m_expression:
            result["source_type"] = "Fabric Lakehouse/Warehouse"

    return result


async def inspect_datasource_full(
    workspace_id: str,
    report_id: Optional[str] = None,
    dataset_id: Optional[str] = None,
    access_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    全景穿透获取报表与数据集的数据源架构、连接模式、Native SQL 与 表级 M 表达式
    """
    config = Config()
    client = PBIClient(config)
    
    # 确定有效 Token
    token = access_token.strip() if access_token and access_token.strip() else client._get_token("powerbi")
    if not token:
        return {"success": False, "message": "未能获取有效的 Power BI 认证 Token (Authentication Token)"}

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    workspace_id = workspace_id.strip()
    report_id = report_id.strip() if report_id else ""
    dataset_id = dataset_id.strip() if dataset_id else ""
    
    logs: List[str] = []
    def log(msg: str):
        logs.append(msg)

    log("[INIT] 🚀 启动报表与数据源全景穿透检测引擎 (Datasource & Model Inspector)...")

    # 1. 如果传入了 report_id，先解析 Report 信息以判定是否为 Live Connection
    report_meta: Dict[str, Any] = {}
    is_live_connection = False
    report_dataset_id = ""
    report_name = ""

    if report_id and workspace_id:
        log(f"[STEP 1] 查询报表元数据 (Report ID: {report_id})...")
        rep_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports/{report_id}"
        try:
            r_rep = await asyncio.to_thread(requests.get, rep_url, headers=headers, timeout=10)
            if r_rep.status_code == 200:
                report_meta = r_rep.json()
                report_name = report_meta.get("name", "")
                report_dataset_id = report_meta.get("datasetId", "")
                
                log(f"  ↳ 报表名称: 「{report_name}」，绑定数据集 ID: {report_dataset_id}")
                
                # 若数据集归属的工作区与报表所在工作区不同，或者是专门的 Direct Live 报表
                if report_meta.get("datasetWorkspaceId") and report_meta.get("datasetWorkspaceId") != workspace_id:
                    is_live_connection = True
                    log(f"  ↳ 🔗 检测到跨工作区连接 (Live Connection)，源模型位于工作区: {report_meta.get('datasetWorkspaceId')}")
                
                if not dataset_id:
                    dataset_id = report_dataset_id
            else:
                log(f"  ⚠️ 读取报表接口返回 HTTP {r_rep.status_code}: {r_rep.text[:120]}")
        except Exception as e:
            log(f"  ⚠️ 查询报表异常: {str(e)}")

    if not dataset_id and not workspace_id:
        return {"success": False, "message": "请提供 Workspace ID 及 Report ID 或 Dataset ID", "logs": logs}

    dataset_name = ""
    dataset_datasources: List[Dict[str, Any]] = []
    dataset_relationships: List[Dict[str, Any]] = []
    tables_result: List[Dict[str, Any]] = []
    engine_used = ""
    overall_mode = "Import"

    # =========================================================================
    # 方案 A: 尝试 Admin Scanner API (PostWorkspaceInfo -> GetScanResult)
    # =========================================================================
    scanner_success = False
    log("[STEP 2] 🔥 尝试执行方案 A: Power BI Admin Scanner API (深层次元数据与 M 表达式全量扫描)...")
    
    scanner_url = "https://api.powerbi.com/v1.0/myorg/admin/workspaces/getInfo?datasetExpressions=True&datasetSchema=True&datasourceDetails=True&lineage=True"
    scanner_body = {"workspaces": [workspace_id]}
    
    try:
        r_scan_init = await asyncio.to_thread(requests.post, scanner_url, json=scanner_body, headers=headers, timeout=12)
        if r_scan_init.status_code in [200, 202]:
            scan_id = r_scan_init.json().get("id")
            log(f"  ↳ 成功创建 Admin 扫描任务 (Scan ID: {scan_id})，开始轮询扫描结果...")
            
            # 轮询状态，最多等待 12 秒
            status_url = f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanStatus/{scan_id}"
            scan_ready = False
            for poll_idx in range(1, 8):
                await asyncio.sleep(1.5)
                r_status = await asyncio.to_thread(requests.get, status_url, headers=headers, timeout=8)
                if r_status.status_code == 200:
                    status_json = r_status.json()
                    st = status_json.get("status")
                    log(f"  ↳ [轮询 {poll_idx}/7] 扫描状态: {st}")
                    if st == "Succeeded":
                        scan_ready = True
                        break
                    elif st == "Failed":
                        log("  ❌ Admin 扫描任务标记为 Failed")
                        break
            
            if scan_ready:
                res_url = f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanResult/{scan_id}"
                r_res = await asyncio.to_thread(requests.get, res_url, headers=headers, timeout=15)
                if r_res.status_code == 200:
                    scan_data = r_res.json()
                    workspaces = scan_data.get("workspaces", [])
                    target_ws = next((w for w in workspaces if w.get("id") == workspace_id), (workspaces[0] if workspaces else None))
                    
                    if target_ws:
                        raw_datasets = target_ws.get("datasets", [])
                        target_ds = None
                        if dataset_id:
                            target_ds = next((d for d in raw_datasets if d.get("id") == dataset_id), None)
                        if not target_ds and raw_datasets:
                            target_ds = raw_datasets[0]
                            
                        if target_ds:
                            scanner_success = True
                            engine_used = "Admin Scanner API (Official)"
                            dataset_name = target_ds.get("name", "")
                            dataset_id = target_ds.get("id", dataset_id)
                            log(f"  🎉 成功从 Scanner API 获取目标数据集: 「{dataset_name}」({dataset_id})")
                            
                            # 提取数据源连接配置
                            for ds_item in target_ds.get("datasources", []):
                                conn_details = ds_item.get("connectionDetails", {})
                                dataset_datasources.append({
                                    "datasourceType": ds_item.get("datasourceType", "Unknown"),
                                    "server": conn_details.get("server", ""),
                                    "database": conn_details.get("database", ""),
                                    "url": conn_details.get("url", "") or conn_details.get("path", ""),
                                    "connectionString": ds_item.get("connectionString", ""),
                                    "gatewayId": ds_item.get("gatewayId", "-"),
                                    "datasourceId": ds_item.get("datasourceId", "-")
                                })
                            
                            # 提取表间模型关系 (Model Relationships)
                            for rel in target_ds.get("relationships", []):
                                dataset_relationships.append({
                                    "fromTable": rel.get("fromTable", ""),
                                    "fromColumn": rel.get("fromColumn", ""),
                                    "toTable": rel.get("toTable", ""),
                                    "toColumn": rel.get("toColumn", ""),
                                    "isActive": rel.get("isActive", True),
                                    "crossFilteringBehavior": rel.get("crossFilteringBehavior", "OneDirection")
                                })

                            # 提取表、分区模式、M 表达式、SQL
                            all_modes = set()
                            for t in target_ds.get("tables", []):
                                t_name = t.get("name", "")
                                if t_name.startswith("LocalDateTable_") or t_name.startswith("DateTableTemplate_"):
                                    continue
                                
                                # 获取 table 的 source (包含 M 表达式)
                                m_expr = ""
                                raw_source = t.get("source", [])
                                if isinstance(raw_source, list) and len(raw_source) > 0:
                                    m_expr = raw_source[0].get("expression", "")
                                elif isinstance(raw_source, dict):
                                    m_expr = raw_source.get("expression", "")
                                    
                                # 分析表分区模式
                                p_mode = "Import"
                                raw_parts = t.get("partitions", [])
                                if raw_parts:
                                    p_mode = raw_parts[0].get("mode", "Import")
                                    if not m_expr:
                                        m_expr = raw_parts[0].get("source", {}).get("expression", "")
                                
                                all_modes.add(p_mode.lower())
                                parsed_sql_info = extract_native_sql_and_server_info(m_expr)
                                
                                tables_result.append({
                                    "tableName": t_name,
                                    "mode": p_mode,
                                    "sourceType": parsed_sql_info["source_type"] or ("M Query / Calculated" if m_expr else "Direct/Push"),
                                    "server": parsed_sql_info["server"],
                                    "database": parsed_sql_info["database"],
                                    "nativeSql": parsed_sql_info["native_sql"],
                                    "mExpression": m_expr,
                                    "columnsCount": len(t.get("columns", [])),
                                    "measuresCount": len(t.get("measures", []))
                                })
                                
                            # 判定整体模式
                            if is_live_connection:
                                overall_mode = "Live Connection (Direct Live)"
                            elif "directquery" in all_modes and "import" in all_modes:
                                overall_mode = "Composite / Dual (混合复合模式)"
                            elif "directquery" in all_modes:
                                overall_mode = "DirectQuery (直接查询)"
                            else:
                                overall_mode = "Import (导入模式)"
        else:
            log(f"  ⚠️ Admin Scanner API 无法直接调用 (HTTP {r_scan_init.status_code}: {r_scan_init.text[:100]})，触发方案 B 回退...")
    except Exception as scan_err:
        log(f"  ⚠️ Admin Scanner API 异常: {str(scan_err)}，无缝切换到方案 B...")

    # =========================================================================
    # 方案 B: Fallback (XMLA / TMSL SOAP + REST API 组合分析)
    # =========================================================================
    if not scanner_success:
        log("[STEP 3] ⚡ 执行方案 B (Fallback): 激活 XMLA / TMSL + REST API 多路分析引擎...")
        engine_used = "XMLA / TMSL & REST API (Hybrid Fallback)"
        
        # 1. 尝试通过 REST API 获取数据集基本信息与数据源连接配置
        if workspace_id and dataset_id:
            try:
                # 获取 Dataset 名字
                ds_info_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}"
                r_ds = await asyncio.to_thread(requests.get, ds_info_url, headers=headers, timeout=8)
                if r_ds.status_code == 200:
                    ds_data = r_ds.json()
                    dataset_name = ds_data.get("name", "")
                
                # 获取 Datasources
                ds_conn_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/datasources"
                r_conn = await asyncio.to_thread(requests.get, ds_conn_url, headers=headers, timeout=8)
                if r_conn.status_code == 200:
                    for d_src in r_conn.json().get("value", []):
                        cd = d_src.get("connectionDetails", {})
                        dataset_datasources.append({
                            "datasourceType": d_src.get("datasourceType", "Unknown"),
                            "server": cd.get("server", ""),
                            "database": cd.get("database", ""),
                            "url": cd.get("url", "") or cd.get("path", ""),
                            "connectionString": d_src.get("connectionString", ""),
                            "gatewayId": d_src.get("gatewayId", "-"),
                            "datasourceId": d_src.get("datasourceId", "-")
                        })
                    log(f"  ↳ 通过 REST API 成功获取 {len(dataset_datasources)} 个物理数据源配置！")
            except Exception as e:
                log(f"  ⚠️ REST API 数据源查询异常: {e}")

        # 2. 尝试通过 XMLA DISCOVER_TMSL_METADATA 提取完整 M 表达式与表分区模式
        if dataset_name:
            try:
                # 获取 Workspace 别名或名称
                ws_alias_name = workspace_id
                try:
                    r_ws_list = await asyncio.to_thread(requests.get, "https://api.powerbi.com/v1.0/myorg/groups", headers=headers, timeout=8)
                    if r_ws_list.status_code == 200:
                        for g in r_ws_list.json().get("value", []):
                            if g.get("id") == workspace_id:
                                ws_alias_name = g.get("name")
                                break
                except Exception:
                    pass

                xmla_url = f"https://api.powerbi.com/v1.0/myorg/{urllib.parse.quote(ws_alias_name)}/xmla"
                xmla_headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'
                }
                tmsl_soap = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Discover xmlns="urn:schemas-microsoft-com:xmla"><RequestType>DISCOVER_TMSL_METADATA</RequestType><Restrictions /><Properties><PropertyList><Catalog>{dataset_name}</Catalog></PropertyList></Properties></Discover></soap:Body></soap:Envelope>"""
                
                log(f"  ↳ 尝试向 XMLA 端点 ({ws_alias_name}) 发起 TMSL 元数据穿透请求...")
                r_xmla = await asyncio.to_thread(requests.post, xmla_url, data=tmsl_soap.encode('utf-8'), headers=xmla_headers, timeout=15)
                
                if r_xmla.status_code == 200 and "<METADATA>" in r_xmla.text:
                    import html
                    json_str = r_xmla.text.split("<METADATA>")[1].split("</METADATA>")[0]
                    m_json = json.loads(html.unescape(json_str))
                    all_modes = set()
                    
                    for t in m_json.get("model", {}).get("tables", []):
                        t_name = t.get("name", "")
                        if t_name.startswith("LocalDateTable_") or t_name.startswith("DateTableTemplate_"):
                            continue
                        
                        m_expr = ""
                        p_mode = "Import"
                        for p in t.get("partitions", []):
                            p_mode = p.get("mode", "Import")
                            src = p.get("source", {})
                            if isinstance(src, dict) and src.get("expression"):
                                raw_exp = src.get("expression")
                                if isinstance(raw_exp, list):
                                    m_expr = "\n".join(str(item) for item in raw_exp)
                                elif raw_exp:
                                    m_expr = str(raw_exp)
                                break
                            elif isinstance(src, str):
                                m_expr = src
                                break
                        
                        all_modes.add(p_mode.lower())

                        parsed_sql_info = extract_native_sql_and_server_info(m_expr)
                        
                        tables_result.append({
                            "tableName": t_name,
                            "mode": p_mode,
                            "sourceType": parsed_sql_info["source_type"] or ("M Query / Calculated" if m_expr else "Direct/Push"),
                            "server": parsed_sql_info["server"],
                            "database": parsed_sql_info["database"],
                            "nativeSql": parsed_sql_info["native_sql"],
                            "mExpression": m_expr,
                            "columnsCount": len(t.get("columns", [])),
                            "measuresCount": len(t.get("measures", []))
                        })
                    
                    log(f"  🎉 XMLA TMSL 成功穿透！解析出 {len(tables_result)} 张物理表及其 M/SQL 表达式！")
                    
                    if is_live_connection:
                        overall_mode = "Live Connection (Direct Live)"
                    elif "directquery" in all_modes and "import" in all_modes:
                        overall_mode = "Composite / Dual (混合复合模式)"
                    elif "directquery" in all_modes:
                        overall_mode = "DirectQuery (直接查询)"
                    else:
                        overall_mode = "Import (导入模式)"
            except Exception as e:
                log(f"  ⚠️ XMLA TMSL 解析异常: {e}")

        # 3. 若 XMLA 仍未提取到表（如 Pro 工作区），使用 REST API `/tables` 兜底获取表名
        if not tables_result and workspace_id and dataset_id:
            log("  ↳ XMLA 穿透受限，执行终极 REST Tables 模式聚合...")
            try:
                t_rest_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/tables"
                r_tbls = await asyncio.to_thread(requests.get, t_rest_url, headers=headers, timeout=8)
                if r_tbls.status_code == 200:
                    for t in r_tbls.json().get("value", []):
                        t_name = t.get("name", "")
                        if not t_name.startswith("LocalDateTable_") and not t_name.startswith("DateTableTemplate_"):
                            tables_result.append({
                                "tableName": t_name,
                                "mode": "Import (Pro Default)",
                                "sourceType": "Standard Model Table",
                                "server": dataset_datasources[0]["server"] if dataset_datasources else "",
                                "database": dataset_datasources[0]["database"] if dataset_datasources else "",
                                "nativeSql": "",
                                "mExpression": "[需 Admin Scanner API 或 XMLA 权限以查看完整 M 源码]",
                                "columnsCount": len(t.get("columns", [])),
                                "measuresCount": 0
                            })
                    overall_mode = "Live Connection" if is_live_connection else "Import (Standard / Pro)"
            except Exception as e:
                log(f"  ⚠️ REST Tables 兜底异常: {e}")

    log(f"[COMPLETE] ✅ 穿透完成！连接模式判定: 【{overall_mode}】，执行引擎: 【{engine_used}】")

    return {
        "success": True,
        "engine_used": engine_used,
        "overall_mode": overall_mode,
        "is_live_connection": is_live_connection,
        "report_id": report_id,
        "report_name": report_name,
        "workspace_id": workspace_id,
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "datasources": dataset_datasources,
        "tables": tables_result,
        "relationships": dataset_relationships,
        "logs": logs
    }

