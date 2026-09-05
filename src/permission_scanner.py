"""
Power BI Full-Spectrum Permission Scanner & Governance Engine
穿透级全景权限与生效治理扫描模块 (支持直属角色、组继承生效权限、数据集细粒度读写与提权偏离检测)
"""

import asyncio
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel
from src.config import Config
from src.pbi_client import PBIClient


class DeepPermissionScanRequest(BaseModel):
    workspace_id: Optional[str] = None
    deep_scan: bool = True
    access_token: Optional[str] = None
    target_users: Optional[List[str]] = None


async def scan_permissions_deep(
    workspace_id: Optional[str] = None,
    deep_scan: bool = True,
    config: Optional[Config] = None,
    client: Optional[PBIClient] = None,
    target_users: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    全景扫描工作区用户权限与语义模型细粒度读写构成
    1. 工作区直属角色 (Direct Workspace Roles)
    2. 数据集直接权限 (Direct Dataset Rights)
    3. 全局生效权限 (Effective Artifact Access via Admin API)
    4. 异常提权偏离检测 (Elevation Drift Detection)
    5. 可视化图表数据包 (KPIs, Donut Breakdown, Role Comparison, Model Coverage)
    6. 支持指定目标用户列表过滤 (Targeted Principals Auditing)
    """
    cfg = config or Config()
    cli = client or PBIClient(cfg)
    target_set = {u.strip().lower() for u in (target_users or []) if u.strip()}

    # 1. 获取目标工作区
    target_ws = (workspace_id or "").strip()
    workspaces: List[Dict[str, Any]] = []

    try:
        if target_ws and target_ws.lower() not in ("all", "null", "undefined", ""):
            try:
                ws_res = await asyncio.to_thread(
                    cli.request, "GET", f"/admin/groups?$top=1&$filter=id eq '{target_ws}'&$expand=users,datasets"
                )
                workspaces = ws_res.get("value", [])
            except Exception:
                ws_single = await asyncio.to_thread(cli.request, "GET", f"/groups/{target_ws}")
                if isinstance(ws_single, dict) and "id" in ws_single:
                    workspaces = [ws_single]
        else:
            try:
                ws_res = await asyncio.to_thread(
                    cli.request, "GET", "/admin/groups?$top=500&$expand=users,datasets"
                )
                workspaces = ws_res.get("value", [])
            except Exception:
                ws_res = await asyncio.to_thread(cli.request, "GET", "/groups?$top=100")
                workspaces = ws_res.get("value", [])
    except Exception as e:
        return {"success": False, "message": f"拉取工作区失败: {str(e)}"}

    all_records: List[Dict[str, Any]] = []
    unique_user_graph_ids: Set[str] = set()
    workspace_datasets: Dict[str, List[Dict[str, Any]]] = {}
    dataset_users_map: Dict[str, Dict[str, str]] = {}  # dsId -> { userIdentifierLower -> right }

    # 2. 遍历各工作区，提取数据集及数据集授权底表
    for ws in workspaces:
        ws_id = ws.get("id") or ""
        ws_name = ws.get("name") or "Unnamed Workspace"

        datasets = ws.get("datasets", [])
        if not datasets and ws_id:
            try:
                ds_res = await asyncio.to_thread(cli.request, "GET", f"/groups/{ws_id}/datasets")
                datasets = ds_res.get("value", [])
            except Exception:
                datasets = []
        workspace_datasets[ws_id] = datasets

        # 并发获取当前工作区下所有数据集的独立授权明细
        async def fetch_single_dataset_users(ds_item: Dict[str, Any]) -> tuple[str, Dict[str, str]]:
            ds_id_str = ds_item.get("id") or ""
            if not ds_id_str or not ws_id:
                return ds_id_str, {}
            try:
                du_res = await asyncio.to_thread(
                    cli.request, "GET", f"/groups/{ws_id}/datasets/{ds_id_str}/users"
                )
                u_map: Dict[str, str] = {}
                for du in du_res.get("value", []):
                    ident = du.get("emailAddress") or du.get("identifier") or ""
                    if ident:
                        u_map[ident.strip().lower()] = du.get("datasetUserAccessRight") or "Read"
                return ds_id_str, u_map
            except Exception:
                return ds_id_str, {}

        ds_user_tasks = [fetch_single_dataset_users(d) for d in datasets]
        if ds_user_tasks:
            ds_user_results = await asyncio.gather(*ds_user_tasks)
            for ds_id_key, u_map_data in ds_user_results:
                dataset_users_map[ds_id_key] = u_map_data

        # 提取工作区用户
        users = ws.get("users", [])
        if not users and ws_id:
            try:
                u_res = await asyncio.to_thread(cli.request, "GET", f"/groups/{ws_id}/users")
                users = u_res.get("value", [])
            except Exception:
                users = []

        if target_set:
            matched_users = []
            for u in users:
                email_val = (u.get("emailAddress") or u.get("identifier") or "").strip().lower()
                disp_val = (u.get("displayName") or "").strip().lower()
                if any(t in email_val or t in disp_val or email_val in t for t in target_set):
                    matched_users.append(u)
            users = matched_users

        for u in users:
            graph_id = u.get("graphId") or u.get("identifier") or ""
            email = u.get("emailAddress") or u.get("identifier") or "Unknown"
            disp = u.get("displayName") or email
            ptype = u.get("principalType") or "User"
            direct_role = u.get("groupUserAccessRight") or "Viewer"

            if ptype == "User" and graph_id and "-" in str(graph_id):
                unique_user_graph_ids.add(graph_id)

            all_records.append({
                "workspaceId": ws_id,
                "workspaceName": ws_name,
                "identifier": email,
                "displayName": disp,
                "graphId": graph_id,
                "principalType": ptype,
                "directRole": direct_role,
                "effectiveRole": direct_role,  # 默认回退直属角色
                "isElevated": False,
                "elevationReason": "",
                "canEditModels": direct_role in ["Admin", "Member", "Contributor"],
                "datasetsDetail": []
            })

    # 3. 深度穿透模式：并发请求 /admin/users/{userId}/artifactAccess 获取合并生效快照
    artifact_access_cache: Dict[str, List[Dict[str, Any]]] = {}
    if deep_scan and unique_user_graph_ids:
        async def fetch_user_artifact_access(gid: str) -> tuple[str, List[Dict[str, Any]]]:
            items: List[Dict[str, Any]] = []
            url: Optional[str] = f"/admin/users/{gid}/artifactAccess"
            try:
                while url:
                    res = await asyncio.to_thread(cli.request, "GET", url)
                    items.extend(res.get("ArtifactAccessEntities", []))
                    cont_uri = res.get("continuationUri")
                    if cont_uri and "v1.0/myorg" in cont_uri:
                        url = cont_uri.split("v1.0/myorg")[1]
                    else:
                        url = None
            except Exception:
                pass
            return gid, items

        tasks = [fetch_user_artifact_access(gid) for gid in unique_user_graph_ids]
        user_artifact_results = await asyncio.gather(*tasks)
        for gid_key, items_val in user_artifact_results:
            artifact_access_cache[gid_key] = items_val

    # 4. 交叉碰撞计算每个用户的最终有效权限与提权偏离
    for rec in all_records:
        ws_id_val = rec["workspaceId"]
        gid_val = rec["graphId"]
        email_clean = (rec["identifier"] or "").strip().lower()
        ws_datasets_list = workspace_datasets.get(ws_id_val, [])

        # 从 artifactAccess 中匹配该工作区的真实生效角色
        if gid_val in artifact_access_cache:
            for a in artifact_access_cache[gid_val]:
                if (a.get("artifactId") or "").lower() == ws_id_val.lower() and a.get("artifactType") == "Workspace":
                    rec["effectiveRole"] = a.get("accessRight") or rec["directRole"]
                    break

        # 细粒度数据集权限与模型编辑能力判定
        datasets_detail = []
        can_edit_any = rec["effectiveRole"] in ["Admin", "Member", "Contributor"]

        for ds in ws_datasets_list:
            ds_id = ds.get("id") or ""
            ds_name = ds.get("name") or "Unnamed Dataset"
            direct_ds_right = dataset_users_map.get(ds_id, {}).get(email_clean, "None")

            # 匹配该数据集在 /artifactAccess 中的有效生效权限
            effective_ds_right = direct_ds_right
            if gid_val in artifact_access_cache:
                for a in artifact_access_cache[gid_val]:
                    if (a.get("artifactId") or "").lower() == ds_id.lower():
                        effective_ds_right = a.get("accessRight") or direct_ds_right
                        break

            can_edit_this = (
                rec["effectiveRole"] in ["Admin", "Member", "Contributor"]
                or effective_ds_right in ["Write", "ReadWrite", "ReadWriteReshareExplore"]
            )
            if can_edit_this:
                can_edit_any = True

            datasets_detail.append({
                "datasetId": ds_id,
                "datasetName": ds_name,
                "directRight": direct_ds_right,
                "effectiveRight": effective_ds_right,
                "canEdit": can_edit_this
            })

        rec["canEditModels"] = can_edit_any
        rec["datasetsDetail"] = datasets_detail

        # 提权偏离判定 (Elevation Drift Detection)
        if rec["principalType"] == "User":
            if rec["directRole"] == "Viewer" and (rec["effectiveRole"] in ["Admin", "Member", "Contributor"] or can_edit_any):
                rec["isElevated"] = True
                rec["elevationReason"] = f"直属为 Viewer，但实际拥有 {rec['effectiveRole']} 权限（继承自工作区特权组或全局租户管理员）"
                rec["securityStatus"] = "⚠️ 继承提权 (Inherited Elevation)"
            elif rec["directRole"] == rec["effectiveRole"]:
                rec["securityStatus"] = f"🟢 正常 ({rec['directRole']})"
            else:
                rec["securityStatus"] = f"ℹ️ 变更 ({rec['directRole']} -> {rec['effectiveRole']})"
        else:
            rec["securityStatus"] = "ℹ️ 安全组主体 (Group Principal)"

    # 5. 汇聚图表数据 (KPIs, Role Comparison, Donut Breakdown, Model Coverage)
    total_principals = len(all_records)
    direct_admins = sum(1 for r in all_records if r["directRole"] == "Admin")
    direct_members = sum(1 for r in all_records if r["directRole"] == "Member")
    direct_viewers = sum(1 for r in all_records if r["directRole"] == "Viewer")

    effective_admins = sum(1 for r in all_records if r["effectiveRole"] == "Admin")
    effective_members = sum(1 for r in all_records if r["effectiveRole"] == "Member")
    effective_viewers = sum(1 for r in all_records if r["effectiveRole"] == "Viewer")

    elevated_count = sum(1 for r in all_records if r.get("isElevated"))
    total_models = sum(len(d_list) for d_list in workspace_datasets.values())

    donut_breakdown = [
        {"label": "直属管理员 (Direct Admin)", "count": direct_admins, "color": "var(--accent, #6366f1)"},
        {"label": "直属成员 (Direct Member)", "count": direct_members, "color": "var(--info, #0284c7)"},
        {"label": "安全组继承提权 (Inherited Elevation)", "count": elevated_count, "color": "var(--warning, #eab308)"},
        {"label": "纯只读查看者 (Pure Viewer)", "count": max(0, direct_viewers - elevated_count), "color": "var(--text-secondary, #94a3b8)"}
    ]

    role_comparison = [
        {"role": "Admin", "direct": direct_admins, "effective": effective_admins},
        {"role": "Member", "direct": direct_members, "effective": effective_members},
        {"role": "Viewer", "direct": direct_viewers, "effective": effective_viewers}
    ]

    # 模型读写覆盖度矩阵
    model_coverage = []
    for ws_id_key, ds_items in workspace_datasets.items():
        ws_name_val = next((w.get("name") for w in workspaces if w.get("id") == ws_id_key), ws_id_key)
        for ds in ds_items:
            ds_id_val = ds.get("id") or ""
            ds_name_val = ds.get("name") or "Unnamed"
            
            # 计算有多少用户具有该模型的编辑权限
            writers_count = 0
            readers_count = 0
            for r in all_records:
                if r["workspaceId"] == ws_id_key:
                    for d_det in r.get("datasetsDetail", []):
                        if d_det.get("datasetId") == ds_id_val:
                            if d_det.get("canEdit"):
                                writers_count += 1
                            else:
                                readers_count += 1

            model_coverage.append({
                "datasetId": ds_id_val,
                "datasetName": ds_name_val,
                "workspaceName": ws_name_val,
                "writersCount": writers_count,
                "readersCount": readers_count,
                "totalUsers": writers_count + readers_count
            })

    return {
        "success": True,
        "kpis": {
            "total_principals": total_principals,
            "direct_admins": direct_admins,
            "effective_admins": effective_admins,
            "elevated_count": elevated_count,
            "total_models": total_models,
            "workspaces_count": len(workspaces)
        },
        "chart_data": {
            "donut_breakdown": donut_breakdown,
            "role_comparison": role_comparison,
            "model_coverage": model_coverage
        },
        "records": all_records
    }
