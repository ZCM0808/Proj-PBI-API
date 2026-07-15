"""Power BI API 配置管理"""

import os
from dotenv import load_dotenv, set_key

load_dotenv()


class Config:
    """Power BI API 配置类"""

    CLIENT_ID: str = os.getenv("PBI_CLIENT_ID", "")
    CLIENT_SECRET: str = os.getenv("PBI_CLIENT_SECRET", "")
    TENANT_ID: str = os.getenv("PBI_TENANT_ID", "")
    AUTH_MODE: str = os.getenv("PBI_AUTH_MODE", "service_principal")
    AUTHORITY: str = os.getenv("PBI_AUTHORITY", "https://login.microsoftonline.com/")
    SCOPE: list[str] = [
        os.getenv("PBI_SCOPE", "https://analysis.windows.net/powerbi/api/.default")
    ]
    BASE_URL: str = "https://api.powerbi.com/v1.0/myorg"

    # ==========================================
    # Smart DataOps Pipeline 共享配置
    # ==========================================
    SQL_CONN_STR: str = os.getenv("SQL_CONN_STR", "")
    WORKSPACE_ID: str = os.getenv("PBI_WORKSPACE_ID", "")
    DATASET_ID: str = os.getenv("PBI_DATASET_ID", "")
    REPORT_ID: str = os.getenv("PBI_REPORT_ID", "")

    @property
    def authority_url(self) -> str:
        tenant = self.TENANT_ID if self.TENANT_ID else "organizations"
        return f"{self.AUTHORITY}{tenant}"

    @classmethod
    def get_all(cls) -> dict:
        return {
            "CLIENT_ID": cls.CLIENT_ID,
            "CLIENT_SECRET": cls.CLIENT_SECRET,
            "TENANT_ID": cls.TENANT_ID,
            "AUTH_MODE": cls.AUTH_MODE,
            "SQL_CONN_STR": cls.SQL_CONN_STR,
            "WORKSPACE_ID": cls.WORKSPACE_ID,
            "DATASET_ID": cls.DATASET_ID,
            "REPORT_ID": cls.REPORT_ID,
        }

    @classmethod
    def update_config(cls, updates: dict) -> None:
        env_file = ".env"
        if not os.path.exists(env_file):
            with open(env_file, "w", encoding="utf-8") as f:
                f.write("")

        key_map = {
            "CLIENT_ID": "PBI_CLIENT_ID",
            "CLIENT_SECRET": "PBI_CLIENT_SECRET",
            "TENANT_ID": "PBI_TENANT_ID",
            "AUTH_MODE": "PBI_AUTH_MODE",
            "SQL_CONN_STR": "SQL_CONN_STR",
            "WORKSPACE_ID": "PBI_WORKSPACE_ID",
            "DATASET_ID": "PBI_DATASET_ID",
            "REPORT_ID": "PBI_REPORT_ID",
        }

        for k, v in updates.items():
            if hasattr(cls, k) and k in key_map:
                setattr(cls, k, v)
                set_key(env_file, key_map[k], v)
