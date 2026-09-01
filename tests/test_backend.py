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


def test_api_auth_mode_contract():
    """契约测试：确保全局认证模式切换接口 /api/auth-mode 能够正确切换并响应"""
    # 1. 切换至 personal
    resp_personal = client.post("/api/auth-mode", json={"auth_mode": "personal"})
    assert resp_personal.status_code == 200
    res_p = resp_personal.json()
    assert res_p.get("success") is True
    assert res_p.get("auth_mode") == "personal"

    # 2. 切换回 service_principal
    resp_sp = client.post("/api/auth-mode", json={"auth_mode": "service_principal"})
    assert resp_sp.status_code == 200
    res_sp = resp_sp.json()
    assert res_sp.get("success") is True
    assert res_sp.get("auth_mode") == "service_principal"

    # 3. 非法参数防御
    resp_err = client.post("/api/auth-mode", json={"auth_mode": "invalid_mode"})
    assert resp_err.status_code == 200
    assert resp_err.json().get("success") is False
