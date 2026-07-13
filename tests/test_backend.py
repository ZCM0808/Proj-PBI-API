import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.config import Config

client = TestClient(app)

# --------------------------
# 4. Unit Testing (单元测试)
# --------------------------
def test_config_structure():
    """单元测试：确保后端的 Config 结构完整，能够正确暴露关键的配置项"""
    assert hasattr(Config, "TENANT_ID")
    assert hasattr(Config, "CLIENT_ID")
    assert hasattr(Config, "SQL_CONN_STR")

def test_config_get_all():
    """单元测试：确保 get_all 方法能返回字典"""
    data = Config.get_all()
    assert isinstance(data, dict)
    assert "CLIENT_ID" in data
    assert "SQL_CONN_STR" in data

# --------------------------------
# 5. API Contract Testing (契约测试)
# --------------------------------
def test_frontend_delivery_contract():
    """契约测试：确保前端资源 (index.html) 能够正确被返回，内容类型必须是 HTML"""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_api_settings_contract():
    """契约测试：确保后端的 /api/settings 接口契约正常，返回合法的 JSON 对象"""
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    
    data = response.json()
    assert isinstance(data, dict), "返回格式必须是 JSON Object"
    assert "TENANT_ID" in data
    assert "CLIENT_ID" in data
