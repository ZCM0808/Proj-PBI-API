import json
import os
import tempfile
from unittest.mock import MagicMock, patch

from src.gist_store import _merge_lockout_records, fetch_from_gist, push_to_gist_sync


def test_merge_lockout_records():
    # Case 1: remote has records that local doesn't
    local = {
        "dev1": {
            "attempts": 1,
            "locked_until": 100,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 300},
        }
    }
    remote = {
        "dev1": {
            "attempts": 2,
            "locked_until": 200,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 600},
        },
        "dev2": {
            "attempts": 3,
            "locked_until": 1800,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 3600},
        },
    }

    merged = _merge_lockout_records(local, remote)

    # dev1 should have max of attempts, locked_until, and used_seconds when updated_at is absent
    assert merged["dev1"]["attempts"] == 2
    assert merged["dev1"]["locked_until"] == 200
    assert merged["dev1"]["daily_usage"]["used_seconds"] == 600

    # dev2 should be preserved
    assert merged["dev2"]["attempts"] == 3
    assert merged["dev2"]["daily_usage"]["used_seconds"] == 3600


def test_merge_lockout_records_updated_at():
    # Case 2: local has reset attempts to 0 with a newer updated_at timestamp
    local = {
        "dev1": {
            "attempts": 0,
            "locked_until": 0,
            "updated_at": 1727575000.0,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 600},
        }
    }
    remote = {
        "dev1": {
            "attempts": 2,
            "locked_until": 1727574000.0,
            "updated_at": 1727574000.0,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 300},
        }
    }

    merged = _merge_lockout_records(local, remote)
    # Newer local record overrides attempts to 0
    assert merged["dev1"]["attempts"] == 0
    assert merged["dev1"]["locked_until"] == 0
    assert merged["dev1"]["updated_at"] == 1727575000.0
    # Usage is still monotonically increasing
    assert merged["dev1"]["daily_usage"]["used_seconds"] == 600


def test_merge_lockout_records_different_dates():
    local = {
        "dev1": {
            "attempts": 0,
            "locked_until": 0,
            "daily_usage": {"date": "2026-09-29", "used_seconds": 120},
        }
    }
    remote = {
        "dev1": {
            "attempts": 0,
            "locked_until": 0,
            "daily_usage": {"date": "2026-09-28", "used_seconds": 3600},
        }
    }

    merged = _merge_lockout_records(local, remote)
    # 2026-09-29 is newer than 2026-09-28, so local should take precedence
    assert merged["dev1"]["daily_usage"]["date"] == "2026-09-29"
    assert merged["dev1"]["daily_usage"]["used_seconds"] == 120


def test_fetch_from_gist_mocked():
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".json") as tf:
        tf.write(json.dumps({"dev1": {"attempts": 1, "locked_until": 0}}))
        tf_name = tf.name

    try:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "files": {
                "pbi_device_lockouts.json": {
                    "content": json.dumps({"dev1": {"attempts": 2, "locked_until": 1000}})
                }
            }
        }

        with patch("requests.get", return_value=mock_response):
            data = fetch_from_gist(local_path=tf_name)
            assert data["dev1"]["attempts"] == 2
            assert data["dev1"]["locked_until"] == 1000

            # Verify persisted back to file
            with open(tf_name, "r", encoding="utf-8") as f:
                saved = json.load(f)
                assert saved["dev1"]["locked_until"] == 1000
    finally:
        if os.path.exists(tf_name):
            os.remove(tf_name)


def test_push_to_gist_sync_pre_fetch_merge():
    # Mock GET returning remote dev2
    mock_get = MagicMock()
    mock_get.status_code = 200
    mock_get.json.return_value = {
        "files": {
            "pbi_device_lockouts.json": {
                "content": json.dumps({"dev2": {"attempts": 1, "locked_until": 0}})
            }
        }
    }

    # Mock PATCH
    mock_patch = MagicMock()
    mock_patch.status_code = 200

    with patch("requests.get", return_value=mock_get):
        with patch("requests.patch", return_value=mock_patch) as mock_p:
            success = push_to_gist_sync({"dev1": {"attempts": 0}})
            assert success is True
            # Verify payload includes both dev1 and dev2
            call_kwargs = mock_p.call_args[1]
            sent_content = json.loads(call_kwargs["json"]["files"]["pbi_device_lockouts.json"]["content"])
            assert "dev1" in sent_content
            assert "dev2" in sent_content
