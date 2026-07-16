"""Power BI REST API 客户端"""

import os
import requests
from msal import ConfidentialClientApplication, PublicClientApplication, SerializableTokenCache  # type: ignore[import-untyped]
from src.config import Config


class PBIClient:
    """Power BI API 客户端封装"""

    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self.cache = SerializableTokenCache()
        self.cache_file = ".msal_token_cache.json"
        if os.path.exists(self.cache_file):
            with open(self.cache_file, "r") as f:
                self.cache.deserialize(f.read())


    def _save_cache(self):
        if self.cache.has_state_changed:
            with open(self.cache_file, "w") as f:
                f.write(self.cache.serialize())

    def _get_token(self, api_type: str = "powerbi") -> str:
        """获取访问令牌"""
        api_type_clean = api_type.strip().lower()
        scope = ["https://api.fabric.microsoft.com/.default"] if api_type_clean == "fabric" else self.config.SCOPE
        
        result = None
        if self.config.USERNAME and self.config.PASSWORD:
            app = PublicClientApplication(
                client_id=self.config.CLIENT_ID,
                authority=self.config.authority_url,
                token_cache=self.cache
            )
            result = app.acquire_token_by_username_password(
                username=self.config.USERNAME,
                password=self.config.PASSWORD,
                scopes=scope
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
            return result["access_token"]
        raise Exception(f"获取令牌失败: {result.get('error_description', '未知错误') if result else '未返回结果'}")

    @property
    def headers(self) -> dict:
        """请求头"""
        token = self._get_token("powerbi")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, endpoint: str, api_type: str = "powerbi", **kwargs) -> dict:
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
        if not (url.startswith("https://api.powerbi.com/") or url.startswith("https://api.fabric.microsoft.com/")):
            raise Exception("Security Violation: Target URL must belong to Power BI or Fabric domains.")
        
        # 获取对应类型的 Token 并生成 headers
        token = self._get_token(api_type)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        
        response = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            timeout=kwargs.pop('timeout', 30),
            **kwargs
        )

        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            error_msg = str(e)
            if e.response is not None and e.response.text:
                try:
                    error_detail = e.response.json()
                    error_msg = f"{error_msg}\n{error_detail}"
                except ValueError:
                    error_msg = f"{error_msg}\n{e.response.text}"
            raise Exception(error_msg)

        # 尝试解析 JSON 返回，对于没有主体的响应（如 202, 204）返回空字典
        if response.content:
            try:
                return response.json()
            except ValueError:
                return {"status_code": response.status_code, "text": response.text}
        return {"status_code": response.status_code}
