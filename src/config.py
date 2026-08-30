import os
import json
from dotenv import load_dotenv, set_key

load_dotenv(override=True)

SETTINGS_FILE = "data/global_settings.json"

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

class Config:
    """Power BI API 配置类"""
    
    _settings = load_settings()

    CLIENT_ID: str = os.getenv("PBI_CLIENT_ID", "")
    CLIENT_SECRET: str = os.getenv("PBI_CLIENT_SECRET", "")
    AUTH_MODE: str = _settings.get("PBI_AUTH_MODE", os.getenv("PBI_AUTH_MODE", "service_principal"))
    USERNAME: str = os.getenv("PBI_USERNAME", "")
    PASSWORD: str = os.getenv("PBI_PASSWORD", "")
    TENANT_ID: str = _settings.get("PBI_TENANT_ID", os.getenv("PBI_TENANT_ID", ""))
    TENANT_NAME: str = _settings.get("PBI_TENANT_NAME", os.getenv("PBI_TENANT_NAME", ""))
    AUTHORITY: str = os.getenv("PBI_AUTHORITY", "https://login.microsoftonline.com/")
    SCOPE: list[str] = [
        os.getenv("PBI_SCOPE", "https://analysis.windows.net/powerbi/api/.default")
    ]
    BASE_URL: str = "https://api.powerbi.com/v1.0/myorg"

    # ==========================================
    # Security Configuration
    # ==========================================
    APP_ACCESS_PASSWORD: str = os.getenv("APP_ACCESS_PASSWORD", "")
    MFA_SECRET: str = os.getenv("MFA_SECRET", "")
    DEV_MODE: bool = os.getenv("DEV_MODE", "false").lower() in ("true", "1")

    # ==========================================
    # Smart DataOps Pipeline 共享配置
    # ==========================================
    SQL_CONN_STR: str = _settings.get("SQL_CONN_STR", os.getenv("SQL_CONN_STR", ""))
    
    PBI_WORKSPACES: list = _settings.get("PBI_WORKSPACES", json.loads(os.getenv("PBI_WORKSPACES", "[]")) if os.getenv("PBI_WORKSPACES") else [])
    PBI_DATASETS: list = _settings.get("PBI_DATASETS", json.loads(os.getenv("PBI_DATASETS", "[]")) if os.getenv("PBI_DATASETS") else [])
    PBI_REPORTS: list = _settings.get("PBI_REPORTS", json.loads(os.getenv("PBI_REPORTS", "[]")) if os.getenv("PBI_REPORTS") else [])

    @property
    def authority_url(self) -> str:
        tenant = self.TENANT_ID if self.TENANT_ID else "organizations"
        return f"{self.AUTHORITY}{tenant}"

    @classmethod
    def get_all(cls) -> dict:
        settings = load_settings()
        if settings.get("PBI_WORKSPACES"):
            cls.PBI_WORKSPACES = settings["PBI_WORKSPACES"]
        if settings.get("PBI_DATASETS"):
            cls.PBI_DATASETS = settings["PBI_DATASETS"]
        if settings.get("PBI_REPORTS"):
            cls.PBI_REPORTS = settings["PBI_REPORTS"]
        if settings.get("PBI_AUTH_MODE"):
            cls.AUTH_MODE = settings["PBI_AUTH_MODE"]
        if settings.get("PBI_TENANT_ID"):
            cls.TENANT_ID = settings["PBI_TENANT_ID"]
        if settings.get("PBI_TENANT_NAME"):
            cls.TENANT_NAME = settings["PBI_TENANT_NAME"]
        if settings.get("SQL_CONN_STR"):
            cls.SQL_CONN_STR = settings["SQL_CONN_STR"]

        return {
            "CLIENT_ID": cls.CLIENT_ID,
            "CLIENT_SECRET": cls.CLIENT_SECRET,
            "AUTH_MODE": cls.AUTH_MODE,
            "USERNAME": cls.USERNAME,
            "PASSWORD": cls.PASSWORD,
            "TENANT_ID": cls.TENANT_ID,
            "TENANT_NAME": cls.TENANT_NAME,
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

        env_keys = {
            "CLIENT_ID": "PBI_CLIENT_ID",
            "CLIENT_SECRET": "PBI_CLIENT_SECRET",
            "USERNAME": "PBI_USERNAME",
            "PASSWORD": "PBI_PASSWORD",
        }
        
        json_keys = {
            "AUTH_MODE": "PBI_AUTH_MODE",
            "TENANT_ID": "PBI_TENANT_ID",
            "TENANT_NAME": "PBI_TENANT_NAME",
            "SQL_CONN_STR": "SQL_CONN_STR",
            "PBI_WORKSPACES": "PBI_WORKSPACES",
            "PBI_DATASETS": "PBI_DATASETS",
            "PBI_REPORTS": "PBI_REPORTS",
        }

        # Load existing json settings
        settings = load_settings()
        json_updated = False

        for k, v in updates.items():
            if hasattr(cls, k):
                setattr(cls, k, v)
                if k in env_keys:
                    set_key(env_file, env_keys[k], str(v))
                elif k in json_keys:
                    settings[json_keys[k]] = v
                    json_updated = True

        if json_updated:
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(settings, f, ensure_ascii=False, indent=4)
