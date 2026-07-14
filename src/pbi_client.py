"""Power BI REST API 客户端"""

import requests
from msal import ConfidentialClientApplication  # type: ignore[import-untyped]
from src.config import Config


class PBIClient:
    """Power BI API 客户端封装"""

    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self._app = ConfidentialClientApplication(
            client_id=self.config.CLIENT_ID,
            client_credential=self.config.CLIENT_SECRET,
            authority=self.config.authority_url,
        )

    def _get_token(self) -> str:
        """获取访问令牌"""
        result = self._app.acquire_token_for_client(scopes=self.config.SCOPE)
        if "access_token" in result:
            return result["access_token"]
        raise Exception(f"获取令牌失败: {result.get('error_description', '未知错误')}")

    @property
    def headers(self) -> dict:
        """请求头"""
        token = self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, endpoint: str, **kwargs) -> dict:
        """
        通用 API 请求方法，避免硬编码逻辑。

        参数:
            method: HTTP 方法 (例如 'GET', 'POST', 'PATCH', 'DELETE')
            endpoint: API 路径 (例如 '/groups' 或完整 URL)
            kwargs: 传递给 requests.request 的其他参数 (如 params, json, data)
        """
        # [安全验证] 双重防御：确保组装后的 URL 必须指向官方域
        url = f"{self.config.BASE_URL}{endpoint}"
        if not url.startswith("https://api.powerbi.com/"):
            raise Exception(
                "Security Violation: Target URL must belong to https://api.powerbi.com/"
            )

        response = requests.request(
            method=method.upper(),
            url=url,
            headers=self.headers,
            timeout=kwargs.pop("timeout", 30),
            **kwargs,
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
