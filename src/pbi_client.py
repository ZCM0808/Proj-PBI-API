"""Power BI REST API 客户端"""

import requests
from msal import ConfidentialClientApplication
from src.config import Config


class PBIClient:
    """Power BI API 客户端封装"""

    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self._access_token: str | None = None
        self._app = ConfidentialClientApplication(
            client_id=self.config.CLIENT_ID,
            client_credential=self.config.CLIENT_SECRET,
            authority=self.config.authority_url,
        )

    def _get_token(self) -> str:
        """获取访问令牌"""
        result = self._app.acquire_token_for_client(scopes=self.config.SCOPE)
        if "access_token" in result:
            self._access_token = result["access_token"]
            return self._access_token
        raise Exception(f"获取令牌失败: {result.get('error_description', '未知错误')}")

    @property
    def headers(self) -> dict:
        """请求头"""
        token = self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def get_workspaces(self) -> list[dict]:
        """获取所有工作区"""
        url = f"{self.config.BASE_URL}/groups"
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json().get("value", [])

    def get_datasets(self, workspace_id: str) -> list[dict]:
        """获取工作区中的所有数据集"""
        url = f"{self.config.BASE_URL}/groups/{workspace_id}/datasets"
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json().get("value", [])

    def get_reports(self, workspace_id: str) -> list[dict]:
        """获取工作区中的所有报表"""
        url = f"{self.config.BASE_URL}/groups/{workspace_id}/reports"
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json().get("value", [])

    def refresh_dataset(self, workspace_id: str, dataset_id: str) -> dict:
        """触发数据集刷新"""
        url = f"{self.config.BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/refreshes"
        response = requests.post(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return {"status": "刷新已触发"}
