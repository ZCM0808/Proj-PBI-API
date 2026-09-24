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
    workspace_datasets: Dict[str, List[Dict[str, Any]]] = {}
    dataset_users_map: Dict[str, Dict[str, str]] = {}  # dsId -> { userIdentifierLower -> right }

    # 1. 建立用户唯一身份归一化与别名映射系统 (Identity Normalization & Query Deduplication)
    alias_to_primary: Dict[str, str] = {}
    primary_to_aliases: Dict[str, Set[str]] = {}

    def register_user_identity(email_str: str, graph_id_str: str, extra_alias: Optional[str] = None) -> str:
        candidates: List[str] = []
        if email_str and email_str.strip().lower() not in ("unknown", ""):
            candidates.append(email_str.strip().lower())
        if graph_id_str and graph_id_str.strip().lower() not in ("unknown", ""):
            candidates.append(graph_id_str.strip().lower())
        if extra_alias and extra_alias.strip().lower() not in ("unknown", ""):
            candidates.append(extra_alias.strip().lower())

        if not candidates:
            return ""

        # 检查候选标识中是否已有分配的 primary 代表元
        existing_primary = None
        for c in candidates:
            if c in alias_to_primary:
                existing_primary = alias_to_primary[c]
                break

        primary = existing_primary or candidates[0]
        if primary not in primary_to_aliases:
            primary_to_aliases[primary] = set()

        for c in candidates:
            alias_to_primary[c] = primary
            primary_to_aliases[primary].add(c)

        return primary

    # 将所有 target_users 显式登记进别名映射表
    for tu in target_users_clean:
        register_user_identity(tu, "")

    # 2. 并发信号量池与限流保护 (Concurrency Semaphores & Rate Limiting Defense)
    ws_sem = asyncio.Semaphore(8)        # 工作区元数据及直属用户并发拉取池
    ds_sem = asyncio.Semaphore(12)       # 数据集授权底表高频并发池
    artifact_sem = asyncio.Semaphore(6) # 重量级 /artifactAccess 全量穿透并发池

    # 异步协程：全并发处理单个工作区
    async def process_single_workspace(ws: Dict[str, Any]) -> Dict[str, Any]:
        ws_id = ws.get("id") or ""
        ws_name = ws.get("name") or "Unnamed Workspace"
        ws_type = ws.get("type") or ""

        # 个人工作区 (PersonalGroup) 与 Fabric 系统监控工作区 (AdminWorkspace) 不支持且无需多用户数据集查询
        is_personal_or_system = (
            ws_type in ("PersonalGroup", "AdminWorkspace")
            or ws_name.startswith("PersonalWorkspace ")
        )

        # 提取或并发拉取数据集 (若字典中已有 datasets 键说明已完成 expand，绝不重复网络请求)
        datasets = ws.get("datasets")
        if datasets is None and ws_id and not is_personal_or_system:
            async with ws_sem:
                try:
                    ds_res = await asyncio.to_thread(cli.request, "GET", f"/groups/{ws_id}/datasets")
                    datasets = ds_res.get("value", [])
                except Exception:
                    datasets = []
        elif datasets is None:
            datasets = []

        # 并发获取当前工作区下所有数据集的独立授权明细 (跳过必定 404 的个人及系统内部工作区)
        async def fetch_single_dataset_users(ds_item: Dict[str, Any]) -> tuple[str, Dict[str, str]]:
            ds_id_str = ds_item.get("id") or ""
            if not ds_id_str or not ws_id or is_personal_or_system:
                return ds_id_str, {}
            async with ds_sem:
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

        ds_user_tasks = [fetch_single_dataset_users(d) for d in datasets] if not is_personal_or_system else []
        ds_user_results = await asyncio.gather(*ds_user_tasks) if ds_user_tasks else []

        # 提取或并发拉取工作区直属用户 (若字典中已有 users 键说明已完成 expand，绝不重复网络请求)
        users = ws.get("users")
        if users is None and ws_id and not is_personal_or_system:
            async with ws_sem:
                try:
                    u_res = await asyncio.to_thread(cli.request, "GET", f"/groups/{ws_id}/users")
                    users = u_res.get("value", [])
                except Exception:
                    users = []
        elif users is None:
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

        return {
            "ws_id": ws_id,
            "ws_name": ws_name,
            "datasets": datasets,
            "ds_user_results": ds_user_results,
            "users": users
        }

    # 工作区全面并发并行化调度
    ws_tasks = [process_single_workspace(ws) for ws in workspaces]
    ws_results = await asyncio.gather(*ws_tasks) if ws_tasks else []

    for item in ws_results:
        ws_id = item["ws_id"]
        ws_name = item["ws_name"]
        datasets = item["datasets"]
        ds_user_results = item["ds_user_results"]
        users = item["users"]

        workspace_datasets[ws_id] = datasets
        for ds_id_key, u_map_data in ds_user_results:
            dataset_users_map[ds_id_key] = u_map_data

        for u in users:
            graph_id = u.get("graphId") or u.get("identifier") or ""
            email = u.get("emailAddress") or u.get("identifier") or "Unknown"
            disp = u.get("displayName") or email
            ptype = u.get("principalType") or "User"
            direct_role = u.get("groupUserAccessRight") or "Viewer"

            # 注册归一化身份：微软官方 /artifactAccess 仅支持合法 User 实体 (UPN/GUID)
            # 过滤非 User 实体 (如 Group 组名称、App 应用 GUID、AdminInsights 系统内部主体)，防 400/404 挂起
            is_real_user = (
                (ptype.lower() == "user" or not ptype)
                and not email.startswith("AdminInsights-")
                and not email.startswith("mail#")
            )
            if is_real_user:
                register_user_identity(email, graph_id)

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

    # 3. 深度穿透模式：并发请求 /admin/users/{userId}/artifactAccess 获取合并生效快照 (受控并发与 429 退避)
    artifact_access_cache: Dict[str, List[Dict[str, Any]]] = {}
    if deep_scan and primary_to_aliases:
        async def fetch_user_artifact_access(uid_key: str) -> tuple[str, List[Dict[str, Any]]]:
            items: List[Dict[str, Any]] = []
            clean_id = uid_key.strip()
            quoted_id = quote(clean_id, safe='')
            url: Optional[str] = f"/admin/users/{quoted_id}/artifactAccess"
            async with artifact_sem:
                max_retries = 3
                retry_delay = 1.0
                while url:
                    current_url: str = url
                    attempt = 0
                    while attempt < max_retries:
                        try:
                            res = await asyncio.to_thread(cli.request, "GET", current_url)
                            page_items = res.get("ArtifactAccessEntities", [])
                            if not page_items:
                                url = None
                                break
                            items.extend(page_items)
                            # 若首页返回条目数不足默认页容 (通常单页 100-5000)，说明已获取全量数据，无需后续空请求
                            if len(page_items) < 50:
                                url = None
                                break
                            cont_uri = res.get("continuationUri")
                            if cont_uri and "v1.0/myorg" in cont_uri:
                                url = cont_uri.split("v1.0/myorg")[1]
                            else:
                                url = None
                            break
                        except Exception as ex:
                            attempt += 1
                            ex_str = str(ex).lower()
                            # 遭遇 429 Rate Limit 或临时网络限流时进行指数退避
                            if ("429" in ex_str or "rate" in ex_str or "throttled" in ex_str) and attempt < max_retries:
                                await asyncio.sleep(retry_delay)
                                retry_delay *= 2
                            else:
                                url = None
                                break
            return clean_id.lower(), items

        tasks = [fetch_user_artifact_access(pid) for pid in primary_to_aliases.keys()]
        user_artifact_results = await asyncio.gather(*tasks) if tasks else []
        for pid_key, items_val in user_artifact_results:
            if items_val:
                # 归一化写回：同时更新 primary 及其所有别名缓存 (如 email, graphId)
                aliases = primary_to_aliases.get(pid_key, {pid_key})
                for alias in aliases:
                    artifact_access_cache[alias] = items_val
                artifact_access_cache[pid_key] = items_val

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


class CandidateUsersScanRequest(BaseModel):
    scope: Optional[str] = "tenant"
    workspace_ids: Optional[List[str]] = None
    force_refresh: bool = False


async def scan_candidate_users(
    scope: Optional[str] = "tenant",
    workspace_ids: Optional[List[str]] = None,
    force_refresh: bool = False,
    config: Optional[Config] = None,
    client: Optional[PBIClient] = None
) -> Dict[str, Any]:
    """
    极速扫描工作区候选用户名单 (用于 GUM 搜索下拉列表人员快速填充与定向审计)
    1. 内存缓存优先复用 (0ms 极速响应)
    2. 后端异步并发拉取 Admin API
    3. 支持全租户与指定工作区智能过滤
    """
    cfg = config or Config()
    cli = client or PBIClient(cfg)
    now = time.time()

    cached_workspaces = _TENANT_WORKSPACES_CACHE.get("workspaces", [])
    cache_age = now - _TENANT_WORKSPACES_CACHE.get("timestamp", 0.0)
    has_valid_cache = bool(cached_workspaces and cache_age < 180 and not force_refresh)

    warning_msg: Optional[str] = None
    rate_limited = False

    # 规范化目标工作区集合
    target_ws_set = {str(w).strip().lower() for w in (workspace_ids or []) if str(w).strip()}

    # 若缓存极其新鲜 (例如最近 15 秒内刚刚更新)，直接复用内存快照，保护租户请求频次
    if cached_workspaces and cache_age < 15:
        workspaces = cached_workspaces
        has_valid_cache = True
        elapsed = max(1, int(cache_age))
        warning_msg = f"⚡ 当前名单为 {elapsed} 秒前同步的最新快照（已自动启动微软 API 15 秒超频保护）"
    elif has_valid_cache:
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
            ex_str = str(ex)
            if "429" in ex_str or "exceeded the amount of requests" in ex_str.lower():
                rate_limited = True
                warning_msg = "⚠️ 微软 API 频次保护中 (429 Rate Limit)，已秒级切换至最新内存快照"
                if cached_workspaces:
                    workspaces = cached_workspaces
                    has_valid_cache = True
                else:
                    return {
                        "success": False,
                        "message": f"⚠️ 微软 Power BI Admin API 租户级频次限流 (429)，请稍候重试。详情: {ex_str}",
                        "users": []
                    }
            else:
                # 尝试智能降级：非全租户管理员账号 (401/403/404) 自动降级为标准组织工作区通道 (/groups + 并发各工作区 /users)
                fallback_success = False
                try:
                    ws_res = await asyncio.to_thread(cli.request, "GET", "/groups?$top=1000")
                    raw_workspaces = ws_res.get("value", [])
                    if raw_workspaces:
                        target_list = raw_workspaces
                        # 若指定了工作区范围，则优先精准拉取指定工作区，大幅节省耗时
                        if scope == "workspaces" and target_ws_set:
                            target_list = [w for w in raw_workspaces if str(w.get("id", "")).lower() in target_ws_set]

                        sem = asyncio.Semaphore(12)
                        async def _fetch_ws_users(w: Dict[str, Any]) -> Dict[str, Any]:
                            wid = w.get("id") or ""
                            async with sem:
                                try:
                                    u_res = await asyncio.to_thread(cli.request, "GET", f"/groups/{wid}/users")
                                    w_copy = dict(w)
                                    w_copy["users"] = u_res.get("value", [])
                                    return w_copy
                                except Exception:
                                    w_copy = dict(w)
                                    w_copy["users"] = []
                                    return w_copy

                        workspaces = await asyncio.gather(*[_fetch_ws_users(w) for w in target_list])
                        if workspaces:
                            _TENANT_WORKSPACES_CACHE["timestamp"] = now
                            _TENANT_WORKSPACES_CACHE["workspaces"] = workspaces
                            has_valid_cache = True
                            fallback_success = True
                            warning_msg = f"💡 当前账号未被授予全租户管理员特权 (Tenant Admin)，已智能降级为标准授权模式（已同步 {len(workspaces)} 个授权工作区成员）"
                except Exception:
                    pass

                if not fallback_success:
                    if cached_workspaces:
                        workspaces = cached_workspaces
                        has_valid_cache = True
                        warning_msg = f"⚠️ 云端网络波动，已自动加载高可用内存快照 ({ex_str[:80]})"
                    else:
                        return {"success": False, "message": f"拉取工作区失败: {ex_str}", "users": []}

    # 过滤工作区范围
    if scope == "workspaces" and target_ws_set:
        filtered_workspaces = [w for w in workspaces if str(w.get("id", "")).lower() in target_ws_set]
        found_ids = {str(w.get("id", "")).lower() for w in filtered_workspaces}
        missing_ids = [wid for wid in target_ws_set if wid not in found_ids]
        # 仅在非 429 状态下尝试补充缺失的工作区，避免限流期并发请求堆叠雪崩
        if missing_ids and not rate_limited:
            async def _fetch_missing(wid: str) -> Optional[Dict[str, Any]]:
                try:
                    res = await asyncio.to_thread(cli.request, "GET", f"/groups/{wid}/users")
                    return {"id": wid, "name": wid, "users": res.get("value", [])}
                except Exception:
                    return None
            missing_res = await asyncio.gather(*[_fetch_missing(wid) for wid in missing_ids])
            for mr in missing_res:
                if mr:
                    filtered_workspaces.append(mr)
        workspaces = filtered_workspaces

    merged_users: Dict[str, Dict[str, Any]] = {}
    for ws in workspaces:
        wid = ws.get("id") or ""
        wname = ws.get("name") or wid
        for u in ws.get("users", []):
            email = (u.get("emailAddress") or u.get("userPrincipalName") or "").strip()
            ident = (u.get("identifier") or "").strip()
            gid = (u.get("graphId") or "").strip()
            ptype = u.get("principalType") or "User"
            role = u.get("groupUserAccessRight") or "Viewer"
            disp = (u.get("displayName") or email or ident).strip()

            key = (email or ident or gid).lower()
            if not key:
                continue

            if key not in merged_users:
                merged_users[key] = {
                    "identifier": email or ident or gid,
                    "displayName": disp,
                    "graphId": gid,
                    "principalType": ptype,
                    "role": role,
                    "workspaceId": wid,
                    "workspaceName": wname
                }

    candidates = list(merged_users.values())
    res_dict: Dict[str, Any] = {
        "success": True,
        "users": candidates,
        "count": len(candidates),
        "cached": has_valid_cache
    }
    if warning_msg:
        res_dict["warning"] = warning_msg
    return res_dict

