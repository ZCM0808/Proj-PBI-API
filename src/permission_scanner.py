"""
Power BI Full-Spectrum Permission Scanner & Governance Engine
穿透级全景权限与生效治理扫描模块 (支持直属角色、组继承生效权限、数据集细粒度读写与提权偏离检测)
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel
from src.config import Config
from src.pbi_client import PBIClient

# 模块级租户工作区元数据缓存 (TTL 180s，支持在 429 限流时优雅降级复用)
_TENANT_WORKSPACES_CACHE: Dict[str, Any] = {
    "timestamp": 0.0,
    "workspaces": []
}


class DeepPermissionScanRequest(BaseModel):
    workspace_id: Optional[str] = None
    workspace_ids: Optional[List[str]] = None
    scope: Optional[str] = "tenant"
    deep_scan: bool = True
    access_token: Optional[str] = None
    target_users: Optional[List[str]] = None


async def scan_permissions_deep(
    workspace_id: Optional[str] = None,
    workspace_ids: Optional[List[str]] = None,
    scope: Optional[str] = "tenant",
    deep_scan: bool = True,
    config: Optional[Config] = None,
    client: Optional[PBIClient] = None,
    target_users: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    全景扫描工作区用户权限与语义模型细粒度读写构成
    1. 工作区直属角色 (Direct Workspace Roles)
    2. 数据集直接权限 (Direct Dataset Rights)
    3. 全局生效权限 (Effective Artifact Access via Admin API /artifactAccess)
    4. 穿透/继承用户无死角补全 (Targeted / Inherited Principals Discovery)
    5. 异常提权偏离检测 (Elevation Drift Detection)
    6. 可视化图表数据包 (KPIs, Donut Breakdown, Role Comparison, Model Coverage)
    """
    from urllib.parse import quote

    cfg = config or Config()
    cli = client or PBIClient(cfg)
    target_set = {u.strip().lower() for u in (target_users or []) if u.strip()}
    target_users_clean = [u.strip() for u in (target_users or []) if u.strip()]

    # 1. 规范化目标工作区集合与审计层级 (Tenant Level vs Workspace Level)
    target_ws_list: List[str] = []
    if workspace_ids and isinstance(workspace_ids, list):
        target_ws_list = [str(w).strip() for w in workspace_ids if str(w).strip()]
    elif workspace_id and str(workspace_id).strip() and str(workspace_id).lower() not in ("all", "null", "undefined", ""):
        target_ws_list = [str(w).strip() for w in str(workspace_id).split(",") if str(w).strip()]

    is_tenant_level = (scope == "tenant") or (not target_ws_list)
    target_ws_set = {w.lower() for w in target_ws_list}

    workspaces: List[Dict[str, Any]] = []

    now = time.time()
    cached_workspaces: List[Dict[str, Any]] = _TENANT_WORKSPACES_CACHE.get("workspaces", [])
    cache_age = now - _TENANT_WORKSPACES_CACHE.get("timestamp", 0.0)

    try:
        if not is_tenant_level and len(target_ws_list) == 1:
            # 单工作区精准命中
            single_id = target_ws_list[0]
            cached_single = next((w for w in cached_workspaces if str(w.get("id", "")).lower() == single_id.lower()), None)
            if cached_single and cache_age < 180 and cached_single.get("users"):
                workspaces = [cached_single]
            else:
                try:
                    ws_res = await asyncio.to_thread(
                        cli.request, "GET", f"/admin/groups?$top=1&$filter=id eq '{single_id}'&$expand=users,datasets"
                    )
                    workspaces = ws_res.get("value", [])
                    if workspaces:
                        if not cached_workspaces:
                            _TENANT_WORKSPACES_CACHE["workspaces"] = [workspaces[0]]
                            _TENANT_WORKSPACES_CACHE["timestamp"] = now
                        else:
                            existing_idx = next((i for i, w in enumerate(cached_workspaces) if str(w.get("id", "")).lower() == single_id.lower()), -1)
                            if existing_idx >= 0:
                                cached_workspaces[existing_idx] = workspaces[0]
                            else:
                                cached_workspaces.append(workspaces[0])
                except Exception as ex:
                    ex_msg = str(ex)
                    if "429" in ex_msg or "exceeded the amount of requests" in ex_msg.lower():
                        if cached_single:
                            workspaces = [cached_single]
                        else:
                            return {"success": False, "message": f"⚠️ 微软 Power BI Admin API 租户级频次限流 (429 Rate Limit)，请稍候重试。详情: {ex_msg}"}
                    else:
                        try:
                            ws_single = await asyncio.to_thread(cli.request, "GET", f"/groups/{single_id}")
                            if isinstance(ws_single, dict) and "id" in ws_single:
                                workspaces = [ws_single]
                        except Exception as sub_ex:
                            return {"success": False, "message": f"拉取工作区失败 (Admin 与常规接口均未命中): {str(sub_ex)}"}
        elif not is_tenant_level and len(target_ws_list) > 1:
            # 多工作区定向集合模式：优先从全租户缓存匹配，未命中则请求 Admin API 并精准过滤
            if cached_workspaces and cache_age < 180:
                workspaces = [w for w in cached_workspaces if str(w.get("id", "")).lower() in target_ws_set]
            
            if len(workspaces) < len(target_ws_list):
                try:
                    ws_res = await asyncio.to_thread(
                        cli.request, "GET", "/admin/groups?$top=500&$expand=users,datasets"
                    )
                    all_fetched = ws_res.get("value", [])
                    if all_fetched:
                        _TENANT_WORKSPACES_CACHE["timestamp"] = now
                        _TENANT_WORKSPACES_CACHE["workspaces"] = all_fetched
                        workspaces = [w for w in all_fetched if str(w.get("id", "")).lower() in target_ws_set]
                except Exception:
                    if not workspaces:
                        # 降级：并发逐个请求
                        async def _fetch_one(wid: str) -> Optional[Dict[str, Any]]:
                            try:
                                return await asyncio.to_thread(cli.request, "GET", f"/groups/{wid}")
                            except Exception:
                                return None
                        results = await asyncio.gather(*[_fetch_one(wid) for wid in target_ws_list])
                        workspaces = [r for r in results if r and isinstance(r, dict) and "id" in r]
        else:
            # 全租户模式
            if cached_workspaces and cache_age < 120 and len(cached_workspaces) > 1:
                workspaces = cached_workspaces
            else:
                try:
                    ws_res = await asyncio.to_thread(
                        cli.request, "GET", "/admin/groups?$top=500&$expand=users,datasets"
                    )
                    workspaces = ws_res.get("value", [])
                    if workspaces:
                        _TENANT_WORKSPACES_CACHE["timestamp"] = now
                        _TENANT_WORKSPACES_CACHE["workspaces"] = workspaces
                except Exception as ex:
                    ex_msg = str(ex)
                    if "429" in ex_msg or "exceeded the amount of requests" in ex_msg.lower():
                        if cached_workspaces:
                            workspaces = cached_workspaces
                        else:
                            return {"success": False, "message": f"⚠️ 微软 Power BI Admin API 租户级频次限流 (429 Rate Limit)，请稍候重试。详情: {ex_msg}"}
                    else:
                        try:
                            ws_res = await asyncio.to_thread(cli.request, "GET", "/groups?$top=100")
                            workspaces = ws_res.get("value", [])
                        except Exception as sub_ex:
                            return {"success": False, "message": f"拉取工作区失败: {str(sub_ex)}"}
    except Exception as e:
        return {"success": False, "message": f"拉取工作区失败: {str(e)}"}

    all_records: List[Dict[str, Any]] = []
    unique_user_query_ids: Set[str] = set()
    workspace_datasets: Dict[str, List[Dict[str, Any]]] = {}
    dataset_users_map: Dict[str, Dict[str, str]] = {}  # dsId -> { userIdentifierLower -> right }

    # 将所有 target_users 显式加入待查 API 列表
    for tu in target_users_clean:
        unique_user_query_ids.add(tu)

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

        # 提取工作区直属用户
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
                graph_val = (u.get("graphId") or "").strip().lower()
                if any(t == email_val or t == disp_val or t == graph_val or t in email_val or t in disp_val or email_val in t for t in target_set):
                    matched_users.append(u)
            users = matched_users

        for u in users:
            graph_id = u.get("graphId") or u.get("identifier") or ""
            email = u.get("emailAddress") or u.get("identifier") or "Unknown"
            disp = u.get("displayName") or email
            ptype = u.get("principalType") or "User"
            direct_role = u.get("groupUserAccessRight") or "Viewer"

            if graph_id:
                unique_user_query_ids.add(graph_id)
            if email and email != "Unknown":
                unique_user_query_ids.add(email)

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
    if deep_scan and unique_user_query_ids:
        async def fetch_user_artifact_access(uid_or_gid: str) -> tuple[str, List[Dict[str, Any]]]:
            items: List[Dict[str, Any]] = []
            clean_id = uid_or_gid.strip()
            quoted_id = quote(clean_id, safe='')
            url: Optional[str] = f"/admin/users/{quoted_id}/artifactAccess"
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
            return clean_id.lower(), items

        tasks = [fetch_user_artifact_access(uid) for uid in unique_user_query_ids]
        user_artifact_results = await asyncio.gather(*tasks)
        for uid_key, items_val in user_artifact_results:
            if items_val:
                artifact_access_cache[uid_key] = items_val

    # 已存在的 (wsId, identifierLower) 避免重复录入
    existing_records_keys: Set[tuple[str, str]] = {
        (r["workspaceId"].lower(), r["identifier"].lower()) for r in all_records
    }

    # 4. 穿透/继承用户补全 (针对 target_users 发现非直属但有生效权限的记录)
    if target_users_clean:
        ws_lookup: Dict[str, str] = {w.get("id", "").lower(): w.get("name") or "Unnamed Workspace" for w in workspaces}
        dataset_to_ws: Dict[str, str] = {}
        for w_id, d_list in workspace_datasets.items():
            for d_item in d_list:
                d_id_str = (d_item.get("id") or "").lower()
                if d_id_str:
                    dataset_to_ws[d_id_str] = w_id

        for t_user in target_users_clean:
            t_lower = t_user.lower()
            access_entities = artifact_access_cache.get(t_lower, [])

            found_any_record_for_user = any(r["identifier"].lower() == t_lower for r in all_records)

            for entity in access_entities:
                art_id = (entity.get("artifactId") or "").lower()
                art_type = entity.get("artifactType") or ""
                access_right = entity.get("accessRight") or "Viewer"

                matched_ws_id = None
                matched_ws_name = None

                if art_type == "Workspace" and art_id in ws_lookup:
                    matched_ws_id = next((w.get("id") for w in workspaces if w.get("id", "").lower() == art_id), art_id)
                    matched_ws_name = ws_lookup[art_id]
                elif art_type == "Dataset" and art_id in dataset_to_ws:
                    parent_ws_id = dataset_to_ws[art_id]
                    if parent_ws_id.lower() in ws_lookup:
                        matched_ws_id = parent_ws_id
                        matched_ws_name = ws_lookup[parent_ws_id.lower()]

                if matched_ws_id and (matched_ws_id.lower(), t_lower) not in existing_records_keys:
                    rec: Dict[str, Any] = {
                        "workspaceId": matched_ws_id,
                        "workspaceName": matched_ws_name,
                        "identifier": t_user,
                        "displayName": t_user,
                        "graphId": t_user,
                        "principalType": "User",
                        "directRole": "None (继承/穿透)",
                        "effectiveRole": access_right,
                        "isElevated": True,
                        "elevationReason": f"非工作区直属成员，但穿透拥有 {access_right} 生效权限（继承自工作区特权组或全局租户管理员）",
                        "securityStatus": f"⚠️ 穿透继承 ({access_right})",
                        "canEditModels": access_right in ["Admin", "Member", "Contributor"],
                        "datasetsDetail": []
                    }
                    all_records.append(rec)
                    existing_records_keys.add((matched_ws_id.lower(), t_lower))
                    found_any_record_for_user = True

            # 若此 target_user 在已被查工作区中一条记录都没有，提供一条无风险告知记录，防前端空盲
            if not found_any_record_for_user:
                fallback_ws_id = ",".join(target_ws_list) if target_ws_list else "Tenant-Wide"
                all_records.append({
                    "workspaceId": fallback_ws_id,
                    "workspaceName": "未找到关联工作区 / 无生效权限",
                    "identifier": t_user,
                    "displayName": t_user,
                    "graphId": t_user,
                    "principalType": "User",
                    "directRole": "None",
                    "effectiveRole": "None",
                    "isElevated": False,
                    "elevationReason": "指定扫描范围内未检测到该用户在此工作区的直属或继承授权",
                    "securityStatus": "🟢 无生效权限 (Unprivileged)",
                    "canEditModels": False,
                    "datasetsDetail": []
                })

    # 5. 交叉碰撞计算每个用户的最终有效权限与提权偏离
    for rec in all_records:
        ws_id_val = rec["workspaceId"]
        gid_val = (rec["graphId"] or "").lower()
        email_clean = (rec["identifier"] or "").strip().lower()
        ws_datasets_list = workspace_datasets.get(ws_id_val, [])

        # 查找 artifactAccess 缓存
        user_access_entities = artifact_access_cache.get(email_clean) or artifact_access_cache.get(gid_val) or []

        # 从 artifactAccess 中匹配该工作区的真实生效角色
        if user_access_entities:
            for a in user_access_entities:
                if (a.get("artifactId") or "").lower() == ws_id_val.lower() and a.get("artifactType") == "Workspace":
                    rec["effectiveRole"] = a.get("accessRight") or rec["effectiveRole"]
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
            if user_access_entities:
                for a in user_access_entities:
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
            if rec["directRole"].startswith("None") and rec["effectiveRole"] != "None":
                rec["isElevated"] = True
                rec["elevationReason"] = f"非直属成员，但实际拥有 {rec['effectiveRole']} 生效权限（通过安全组/特权继承）"
                rec["securityStatus"] = f"⚠️ 穿透继承 ({rec['effectiveRole']})"
            elif rec["directRole"] == "Viewer" and (rec["effectiveRole"] in ["Admin", "Member", "Contributor"] or can_edit_any):
                rec["isElevated"] = True
                rec["elevationReason"] = f"直属为 Viewer，但实际拥有 {rec['effectiveRole']} 权限（继承自工作区特权组或全局租户管理员）"
                rec["securityStatus"] = "⚠️ 继承提权 (Inherited Elevation)"
            elif rec["directRole"] == rec["effectiveRole"]:
                rec["securityStatus"] = f"🟢 正常 ({rec['directRole']})"
            else:
                rec["securityStatus"] = f"ℹ️ 变更 ({rec['directRole']} -> {rec['effectiveRole']})"
        else:
            rec["securityStatus"] = "ℹ️ 安全组主体 (Group Principal)"

        # 标明最终权限来源 (Permission Source / Origin)
        if rec.get("principalType") in ["Group", "SecurityGroup"]:
            rec["permissionSource"] = "Group Principal(安全组主体)"
        elif rec.get("isElevated"):
            if "租户" in rec.get("elevationReason", "") or (rec.get("effectiveRole") == "Admin" and rec.get("directRole", "").startswith("None")):
                rec["permissionSource"] = "Tenant Admin(租户管理员特权)"
            else:
                rec["permissionSource"] = "Group Membership(安全组继承穿透)"
        elif rec.get("directRole") and not rec["directRole"].startswith("None"):
            rec["permissionSource"] = "Direct Assignment(工作区直接授权)"
        elif any(d.get("directRight") and d.get("directRight") != "None" for d in rec.get("datasetsDetail", [])):
            rec["permissionSource"] = "Item Sharing(模型单独共享)"
        elif rec.get("effectiveRole") == "None" or rec.get("directRole") == "None":
            rec["permissionSource"] = "Unassigned(无生效授权)"
        else:
            rec["permissionSource"] = "Direct Assignment(工作区直接授权)"

    # 6. 汇聚图表数据 (KPIs, Role Comparison, Donut Breakdown, Model Coverage)
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
