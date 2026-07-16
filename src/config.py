"""Power BI API 配置管理"""

import os
from dotenv import load_dotenv, set_key

load_dotenv(override=True)


class Config:
    """Power BI API 配置类"""

    CLIENT_ID: str = os.getenv("PBI_CLIENT_ID", "")
    CLIENT_SECRET: str = os.getenv("PBI_CLIENT_SECRET", "")
    AUTH_MODE: str = os.getenv("PBI_AUTH_MODE", "service_principal") # 'service_principal' or 'personal'
    USERNAME: str = os.getenv("PBI_USERNAME", "")
    PASSWORD: str = os.getenv("PBI_PASSWORD", "")
    TENANT_ID: str = os.getenv("PBI_TENANT_ID", "")
    AUTHORITY: str = os.getenv("PBI_AUTHORITY", "https://login.microsoftonline.com/")
    SCOPE: list[str] = [
        os.getenv("PBI_SCOPE", "https://analysis.windows.net/powerbi/api/.default")
    ]
    BASE_URL: str = "https://api.powerbi.com/v1.0/myorg"

    # ==========================================
    # Smart DataOps Pipeline 共享配置
    # ==========================================
    SQL_CONN_STR: str = os.getenv("SQL_CONN_STR", "")
    
    import json

    PBI_WORKSPACES: list = json.loads(os.getenv("PBI_WORKSPACES", "[]")) if os.getenv("PBI_WORKSPACES") else []
    PBI_DATASETS: list = json.loads(os.getenv("PBI_DATASETS", "[]")) if os.getenv("PBI_DATASETS") else []
    PBI_REPORTS: list = json.loads(os.getenv("PBI_REPORTS", "[]")) if os.getenv("PBI_REPORTS") else []

    @property
    def authority_url(self) -> str:
        tenant = self.TENANT_ID if self.TENANT_ID else "organizations"
        return f"{self.AUTHORITY}{tenant}"

    @classmethod
    def get_all(cls) -> dict:
        return {
            "CLIENT_ID": cls.CLIENT_ID,
            "CLIENT_SECRET": cls.CLIENT_SECRET,
            "AUTH_MODE": cls.AUTH_MODE,
            "USERNAME": cls.USERNAME,
            "PASSWORD": cls.PASSWORD,
            "TENANT_ID": cls.TENANT_ID,
            "SQL_CONN_STR": cls.SQL_CONN_STR,
            "PBI_WORKSPACES": cls.PBI_WORKSPACES,
            "PBI_DATASETS": cls.PBI_DATASETS,
            "PBI_REPORTS": cls.PBI_REPORTS,
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
            "AUTH_MODE": "PBI_AUTH_MODE",
            "USERNAME": "PBI_USERNAME",
            "PASSWORD": "PBI_PASSWORD",
            "TENANT_ID": "PBI_TENANT_ID",
            "SQL_CONN_STR": "SQL_CONN_STR",
            "PBI_WORKSPACES": "PBI_WORKSPACES",
            "PBI_DATASETS": "PBI_DATASETS",
            "PBI_REPORTS": "PBI_REPORTS",
        }

        for k, v in updates.items():
            if hasattr(cls, k) and k in key_map:
                setattr(cls, k, v)
                import json
                val_to_save = json.dumps(v, ensure_ascii=False) if isinstance(v, list) else v
                set_key(env_file, key_map[k], val_to_save)
