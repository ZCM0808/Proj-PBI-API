"""Power BI API 配置管理"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Power BI API 配置类"""

    CLIENT_ID: str = os.getenv("PBI_CLIENT_ID", "")
    CLIENT_SECRET: str = os.getenv("PBI_CLIENT_SECRET", "")
    TENANT_ID: str = os.getenv("PBI_TENANT_ID", "")
    AUTHORITY: str = os.getenv("PBI_AUTHORITY", "https://login.microsoftonline.com/")
    SCOPE: list[str] = [
        os.getenv("PBI_SCOPE", "https://analysis.windows.net/powerbi/api/.default")
    ]
    BASE_URL: str = "https://api.powerbi.com/v1.0/myorg"

    @property
    def authority_url(self) -> str:
        tenant = self.TENANT_ID if self.TENANT_ID else "organizations"
        return f"{self.AUTHORITY}{tenant}"
