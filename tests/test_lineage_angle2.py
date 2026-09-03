"""
Test Angle 2: Backend API & Metadata Contract Verification
Tests the /api/datasource/inspect endpoint and M expression extraction engine.
"""

from typing import Any, Dict
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.datasource_inspector import extract_native_sql_and_server_info


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_m_expression_extraction_dialects() -> None:
    """Verify regex extraction of SQL Server, PostgreSQL, and Value.NativeQuery."""
    m_sql = (
        'let Source = Sql.Database("sql-srv.corp", "crm_db", '
        '[Query="SELECT id, name FROM customers WHERE active=1"]) in Source'
    )
    res_sql: Dict[str, Any] = extract_native_sql_and_server_info(m_sql)
    assert res_sql["server"] == "sql-srv.corp"
    assert res_sql["database"] == "crm_db"
    assert "SELECT id, name" in res_sql["native_sql"]
    assert res_sql["source_type"] == "SQL Server / Azure SQL"

    m_pg = (
        'let Source = PostgreSQL.Database("localhost:5434", "bi_semantic_dw"), '
        'Data = Source{[Schema="sap_silver",Item="agg_sales"]}[Data] in Data'
    )
    res_pg: Dict[str, Any] = extract_native_sql_and_server_info(m_pg)
    assert res_pg["source_type"] == "PostgreSQL"


def test_datasource_inspector_api_contract(client: TestClient) -> None:
    """Verify that /api/datasource/inspect returns full lineage schema including relationships."""
    payload = {
        "workspace_id": "2c51e061-0f9f-4d02-bed0-c169019e5d83",
        "dataset_id": None,
        "report_id": None,
    }
    response = client.post("/api/datasource/inspect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "tables" in data
    assert "datasources" in data
    assert "relationships" in data
    assert isinstance(data["tables"], list)
    assert isinstance(data["datasources"], list)
    assert isinstance(data["relationships"], list)
    if data["tables"]:
        first_table = data["tables"][0]
        assert "tableName" in first_table
        assert "mode" in first_table
        assert "mExpression" in first_table
        assert "columnsCount" in first_table


if __name__ == "__main__":
    pytest.main(["-v", __file__])
