"""Power BI REST API 客户端"""

import os
import time
from typing import Any, Dict, Optional

import requests  # type: ignore[import-untyped]
from msal import (  # type: ignore[import-untyped]
    ConfidentialClientApplication,
    PublicClientApplication,
    SerializableTokenCache,
)
from requests.adapters import HTTPAdapter  # type: ignore[import-untyped]

from src.config import Config

# 模块级全局连接池与 Token 内存缓存 (彻底消除频繁 TCP/TLS 跨洋握手与磁盘反序列化耗时)
_GLOBAL_HTTP_SESSION: Optional[requests.Session] = None
_GLOBAL_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}


def get_shared_session() -> requests.Session:
    """获取全局复用的 HTTP Keep-Alive 连接池会话"""
    global _GLOBAL_HTTP_SESSION
    if _GLOBAL_HTTP_SESSION is None:
        s = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=25,
            pool_maxsize=50,
            max_retries=0
        )
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        _GLOBAL_HTTP_SESSION = s
    return _GLOBAL_HTTP_SESSION


def reset_shared_session() -> None:
    """重置全局 Session 连接池 (在网络连接异常或脏连接时安全重建)"""
    global _GLOBAL_HTTP_SESSION
    if _GLOBAL_HTTP_SESSION is not None:
        try:
            _GLOBAL_HTTP_SESSION.close()
        except Exception:
            pass
        _GLOBAL_HTTP_SESSION = None


def set_manual_token(token: str, auth_mode: str = "personal", identity: str = "", expires_in: int = 3600) -> None:
    """手动注入外部（如设备流）获取的有效 Access Token 到内存缓存中"""
    now = time.time()
    for api_type in ["powerbi", "fabric"]:
        cache_key = f"{auth_mode}_{api_type}_{identity}"
        _GLOBAL_TOKEN_CACHE[cache_key] = {
            "token": token,
            "expires_at": now + expires_in
        }
        generic_key = f"{auth_mode}_{api_type}_"
        _GLOBAL_TOKEN_CACHE[generic_key] = {
            "token": token,
            "expires_at": now + expires_in
        }


class PBIClient:
    """Power BI API 客户端封装"""

    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self.cache = SerializableTokenCache()
        self.cache_file = ".msal_token_cache.json"

        # 优先从环境变量加载 Base64 编码的 MSAL 缓存 (适用于 Render/Docker 云端无头容器永久免登录)
        b64_cache = os.getenv("MSAL_TOKEN_CACHE_B64", "").strip()
        if b64_cache:
            try:
                import base64
                cache_str = base64.b64decode(b64_cache).decode("utf-8")
                self.cache.deserialize(cache_str)
                with open(self.cache_file, "w", encoding="utf-8") as f:
                    f.write(cache_str)
            except Exception:
                pass

        if os.path.exists(self.cache_file) and not b64_cache:
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    self.cache.deserialize(f.read())
            except Exception:
                pass

    def _save_cache(self):
        if self.cache.has_state_changed:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                f.write(self.cache.serialize())

    def _get_token(self, api_type: str = "powerbi") -> str:
        """获取访问令牌 (优先内存缓存 0ms 瞬间返回)"""
        api_type_clean = api_type.strip().lower()
        scope = ["https://api.fabric.microsoft.com/.default"] if api_type_clean == "fabric" else self.config.SCOPE

        now = time.time()
        auth_identity = self.config.USERNAME if self.config.AUTH_MODE == "personal" else self.config.CLIENT_ID
        cache_key = f"{self.config.AUTH_MODE}_{api_type_clean}_{auth_identity}"
        cached_entry = _GLOBAL_TOKEN_CACHE.get(cache_key)
        if cached_entry and cached_entry.get("expires_at", 0) > now + 180:
            return str(cached_entry["token"])

        # 兜底：通用 key 与同模式可用 Token 借用探测
        generic_key = f"{self.config.AUTH_MODE}_{api_type_clean}_"
        gen_entry = _GLOBAL_TOKEN_CACHE.get(generic_key)
        if gen_entry and gen_entry.get("expires_at", 0) > now + 180:
            return str(gen_entry["token"])
        for k, v in _GLOBAL_TOKEN_CACHE.items():
            if k.startswith(f"{self.config.AUTH_MODE}_{api_type_clean}") and v.get("expires_at", 0) > now + 180:
                return str(v["token"])

        result = None
        if self.config.AUTH_MODE == "personal":
            app = PublicClientApplication(
                client_id=self.config.CLIENT_ID,
                authority=self.config.authority_url,
                token_cache=self.cache
            )

            # First try silent cache
            accounts = app.get_accounts(username=self.config.USERNAME)
            if accounts:
                result = app.acquire_token_silent(scope, account=accounts[0])

            if not result:
                result = app.acquire_token_by_username_password(
                    username=self.config.USERNAME,
                    password=self.config.PASSWORD,
                    scopes=scope
                )

            # Fallback to interactive if MFA is required or interaction needed
            if result and "error" in result:
                error_codes = result.get("error_codes", [])
                error_msg = result.get("error", "").lower()
                if 50076 in error_codes or 50158 in error_codes or 65001 in error_codes or "interaction_required" in error_msg or "invalid_grant" in error_msg:
                    # 关键防御：在 Linux 无头容器（如 Render/Docker 无 DISPLAY 环境）下严禁拉起交互式浏览器，避免永久死锁
                    is_headless = (os.name != "nt") and not os.getenv("DISPLAY")
                    if is_headless:
                        for k, v in _GLOBAL_TOKEN_CACHE.items():
                            if k.startswith("personal_") and v.get("expires_at", 0) > now + 60:
                                return str(v["token"])
                        raise Exception(
                            "当前运行于云端无头容器环境，且微软账号需要交互式验证或多因素认证(MFA)。"
                            "请在系统中使用设备流(Device Code)完成授权登录。"
                        )
                    result = app.acquire_token_interactive(
                        scopes=scope,
                        login_hint=self.config.USERNAME
                    )
        else:
            app = ConfidentialClientApplication(
                client_id=self.config.CLIENT_ID,
                client_credential=self.config.CLIENT_SECRET,
                authority=self.config.authority_url,
                token_cache=self.cache
            )
            result = app.acquire_token_for_client(scopes=scope)

        self._save_cache()
        if result and "access_token" in result:
            token_val = result["access_token"]
            expires_in = int(result.get("expires_in", 3600))
            _GLOBAL_TOKEN_CACHE[cache_key] = {
                "token": token_val,
                "expires_at": now + expires_in
            }
            return token_val
        raise Exception(f"获取令牌失败: {result.get('error_description', '未知错误') if result else '未返回结果'}")

    @property
    def headers(self) -> dict:
        """请求头"""
        token = self._get_token("powerbi")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, endpoint: str, api_type: str = "powerbi", raw_response: bool = False, **kwargs):
        """
        通用 API 请求方法，避免硬编码逻辑。

        参数:
            method: HTTP 方法 (例如 'GET', 'POST', 'PATCH', 'DELETE')
            endpoint: API 路径 (例如 '/groups' 或完整 URL)
            api_type: 接口类型 ('powerbi' 或 'fabric')
            kwargs: 传递给 requests.request 的其他参数 (如 params, json, data)
        """
        api_type_clean = api_type.strip().lower()
        base_url = "https://api.fabric.microsoft.com/v1" if api_type_clean == "fabric" else self.config.BASE_URL

        # 兼容处理，确保拼接时路径斜线没有重复
        if endpoint.startswith("/") and base_url.endswith("/"):
            url = f"{base_url}{endpoint[1:]}"
        else:
            url = f"{base_url}{endpoint}"

        # [安全验证] 双重防御：确保组装后的 URL 必须指向官方域
        allowed_prefixes = (
            "https://api.powerbi.com/",
            "https://api.fabric.microsoft.com/",
            "https://powerquery.microsoft.com/",
        )
        is_official = any(url.startswith(p) for p in allowed_prefixes)
        if not is_official and (url.startswith("https://") and ".analysis.windows.net/" in url):
            is_official = True

        if not is_official:
            raise Exception("Security Violation: Target URL must belong to Power BI, Fabric, WABI Analysis or Power Query official domains.")

        # 获取对应类型的 Token 并生成 headers
        token = self._get_token(api_type)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        # 采用全局 Keep-Alive 连接池发送请求，复用 TCP/TLS 会话
        session = get_shared_session()
        req_timeout = kwargs.pop('timeout', 12)
        try:
            response = session.request(
                method=method.upper(),
                url=url,
                headers=headers,
                timeout=req_timeout,
                **kwargs
            )
        except (requests.exceptions.ConnectionError, requests.exceptions.ChunkedEncodingError) as conn_err:
            # 遇到脏连接或底层长连接断开，重置 Session 避免后续请求死锁
            reset_shared_session()
            raise conn_err

        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            # 自动降级处理：Personal Workspace (My Workspace) 不支持 /groups/{id} 的 API 路径
            # 遇到 GroupNotAccessible 错误时，剥离 /groups/{id} 前缀并重试
            if e.response is not None and e.response.status_code in (401, 403, 400):
                resp_text = e.response.text.lower()
                if ("groupnotaccessible" in resp_text and "personal workspace" in resp_text) or "powerbinotauthorizedexception" in resp_text:
                    import re
                    new_endpoint = re.sub(r'^/?groups/[^/]+', '', endpoint)
                    if new_endpoint != endpoint:
                        if not new_endpoint.startswith("/"):
                            new_endpoint = "/" + new_endpoint
                        try:
                            res = self.request(method, new_endpoint, api_type, raw_response, **kwargs)
                            if not raw_response and isinstance(res, dict):
                                res["_fallback_applied"] = True
                            return res
                        except Exception as fallback_e:
                            fallback_err_str = str(fallback_e)
                            # 如果是因为 Service Principal 访问个人工作区被拦截，抛出友好的双重提示
                            if "is not accessible for application" in fallback_err_str:
                                raise Exception(f"Original Auth Error: {e.response.text}\n[Service Principal Blocked] 尝试降级为 Personal Workspace 路由失败，因为 Service Principal (App) 永远无法访问个人工作区。请在设置中切换为 Personal Auth 模式，或者使用标准的 App 工作区。")
                            # 否则，可能是真正没有权限访问的普通工作区，静默忽略降级错误，抛出原始错误
                            pass

            error_msg = str(e)
            if e.response is not None and e.response.text:
                try:
                    error_detail = e.response.json()
                    error_msg = f"{error_msg}\n{error_detail}"
                except ValueError:
                    error_msg = f"{error_msg}\n{e.response.text}"
            raise Exception(error_msg)

        if raw_response:
            return response

        # 尝试解析 JSON 返回，对于没有主体的响应（如 202, 204）返回空字典
        if response.content:
            try:
                return response.json()
            except ValueError:
                return {"status_code": response.status_code, "text": response.text}
        return {"status_code": response.status_code}

    def get_internal_model_security(self, model_id: str, cluster_url: Optional[str] = None, custom_token: Optional[str] = None) -> Dict[str, Any]:
        """
        调用微软内部 WABI 建模微服务 (modeling/getModel)，实时探测语义模型的真实 GAC 状态与连接安全上下文。
        """
        # 优先使用显式指定的 cluster，否则读取环境变量，默认回退至 VFC 租户的真实宿主集群 (美东二区)
        cluster = (cluster_url or os.getenv("PBI_WABI_CLUSTER") or "wabi-us-east2-c-primary-redirect.analysis.windows.net").strip()
        if cluster.startswith("http://") or cluster.startswith("https://"):
            from urllib.parse import urlparse
            cluster = urlparse(cluster).netloc

        token = custom_token or self._get_token("powerbi")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-PowerBI-User-Locale": "en-US",
        }

        # 候选集群列表 (优先当前集群，失败时具备跨地理大区自愈穿透能力)
        candidate_clusters = [cluster]
        for fallback in ["wabi-us-east2-c-primary-redirect.analysis.windows.net", "wabi-south-east-asia-b-primary-redirect.analysis.windows.net"]:
            if fallback not in candidate_clusters:
                candidate_clusters.append(fallback)

        session = get_shared_session()
        last_error_resp: Optional[Dict[str, Any]] = None

        for cur_cluster in candidate_clusters:
            # 微软内部 modeling 接口权威规范路由 (无 /metadata 前缀)
            target_url = f"https://{cur_cluster}/modeling/getModel/{model_id}?languageLocale=en-US&requestQueryEditingInfo=true"
            try:
                resp = session.get(target_url, headers=headers, timeout=20)
                if resp.status_code == 200:
                    data = resp.json()
                    sec_info = data.get("securityInfo", {})
                    return {
                        "success": True,
                        "is_live": True,
                        "cluster": cur_cluster,
                        "model_id": model_id,
                        "security_info": {
                            "isInStrictMode": sec_info.get("isInStrictMode", False),
                            "hasAccessToAllDataConnections": sec_info.get("hasAccessToAllDataConnections", False),
                            "isModelOwner": sec_info.get("isModelOwner", False),
                        },
                        "raw_security_info": sec_info,
                    }
                elif resp.status_code in (403, 404):
                    # 403 Tenant not authorized 或 404 EntityNotFound 说明集群不匹配，尝试下一个候选集群
                    last_error_resp = {
                        "success": False,
                        "status_code": resp.status_code,
                        "error": f"模型未在集群 [{cur_cluster}] 命中 (HTTP {resp.status_code})",
                        "cluster": cur_cluster,
                    }
                    continue
                elif resp.status_code == 429:
                    return {
                        "success": False,
                        "status_code": 429,
                        "error": "微软云端 WABI 微服务限流节流 (HTTP 429 Too Many Requests)，请稍后重试",
                        "cluster": cur_cluster,
                    }
                else:
                    last_error_resp = {
                        "success": False,
                        "status_code": resp.status_code,
                        "error": f"WABI 接口返回异常状态码: HTTP {resp.status_code}",
                        "cluster": cur_cluster,
                    }
            except Exception as e:
                last_error_resp = {
                    "success": False,
                    "error": f"连接 WABI 集群 [{cur_cluster}] 超时或网络异常: {str(e)}",
                    "cluster": cur_cluster,
                }
                continue

        return last_error_resp or {"success": False, "error": "所有候选 WABI 集群均未返回成功响应"}

