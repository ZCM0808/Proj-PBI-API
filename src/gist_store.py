"""
GitHub Secret Gist 远程持久化状态存储模块
彻底解决 Render/Docker 临时无状态容器重启导致设备锁定时长与配额丢失的问题。
"""

import asyncio
import copy
import json
import logging
import os
import time
from typing import Any, Dict, Optional

import requests  # type: ignore[import-untyped]

from src.config import load_settings

logger = logging.getLogger(__name__)

# 专属 Secret Gist 配置 (Gist 资源唯一标识)
DEFAULT_GIST_ID = "37c50831834ef4c2fb96d2774c5ca113"
GIST_FILE_NAME = "pbi_device_lockouts.json"

_LAST_SYNC_TIME: float = 0.0
_IS_SYNCING: bool = False
_PENDING_FORCE_DATA: Optional[Dict[str, Any]] = None


def _get_gist_config() -> tuple[str, str]:
    gist_id = os.getenv("LOCKOUTS_GIST_ID", DEFAULT_GIST_ID).strip()
    pat = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN")
    if not pat or pat.startswith("ghp_x0dma"):
        try:
            from dotenv import dotenv_values
            pat = dotenv_values(".env").get("GITHUB_PAT", "")
        except Exception:
            pass
    pat = (pat or load_settings().get("GITHUB_PAT", "")).strip()
    return gist_id, pat


def _merge_lockout_records(local: Dict[str, Any], remote: Dict[str, Any]) -> Dict[str, Any]:
    """智能双向合并本地与云端 Gist 的记录，确保锁定与累计秒数绝不倒退"""
    merged = copy.deepcopy(local)
    for dev_id, r_rec in remote.items():
        if not isinstance(r_rec, dict):
            continue
        if dev_id not in merged:
            merged[dev_id] = copy.deepcopy(r_rec)
            continue

        l_rec = merged[dev_id]
        if not isinstance(l_rec, dict):
            merged[dev_id] = copy.deepcopy(r_rec)
            continue

        # 1. 尝试次数与锁定状态：若有 updated_at 则以最新记录为准；若无则保守取最大值
        l_up = float(l_rec.get("updated_at", 0.0))
        r_up = float(r_rec.get("updated_at", 0.0))
        if l_up > r_up:
            merged[dev_id]["attempts"] = l_rec.get("attempts", 0)
            merged[dev_id]["locked_until"] = l_rec.get("locked_until", 0)
            merged[dev_id]["updated_at"] = l_up
        elif r_up > l_up:
            merged[dev_id]["attempts"] = r_rec.get("attempts", 0)
            merged[dev_id]["locked_until"] = r_rec.get("locked_until", 0)
            merged[dev_id]["updated_at"] = r_up
        else:
            merged[dev_id]["attempts"] = max(l_rec.get("attempts", 0), r_rec.get("attempts", 0))
            merged[dev_id]["locked_until"] = max(l_rec.get("locked_until", 0), r_rec.get("locked_until", 0))

        # 2. 每日用时合并（单调递增，杜绝时钟倒流或被旧值覆盖）
        l_usage = l_rec.get("daily_usage", {})
        r_usage = r_rec.get("daily_usage", {})
        if l_usage and not r_usage:
            merged[dev_id]["daily_usage"] = l_usage
        elif r_usage and not l_usage:
            merged[dev_id]["daily_usage"] = r_usage
        elif l_usage and r_usage:
            l_date = l_usage.get("date", "")
            r_date = r_usage.get("date", "")
            if l_date > r_date:
                merged[dev_id]["daily_usage"] = l_usage
            elif r_date > l_date:
                merged[dev_id]["daily_usage"] = r_usage
            else:
                max_sec = max(int(l_usage.get("used_seconds", 0)), int(r_usage.get("used_seconds", 0)))
                merged[dev_id]["daily_usage"] = {"date": l_date, "used_seconds": max_sec}

    return merged


def fetch_from_gist(local_path: str = "data/lockouts.json") -> Dict[str, Any]:
    """从 GitHub Secret Gist 获取最新的云端记录，并与本地文件安全合并"""
    local_data: Dict[str, Any] = {}
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                local_data = json.load(f)
        except Exception:
            local_data = {}

    gist_id, pat = _get_gist_config()
    if not pat or not gist_id:
        return local_data

    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Proj-PBI-API-GistStore",
    }
    try:
        resp = requests.get(f"https://api.github.com/gists/{gist_id}", headers=headers, timeout=3.5)
        if resp.status_code == 200:
            files = resp.json().get("files", {})
            file_entry = files.get(GIST_FILE_NAME)
            if file_entry and "content" in file_entry:
                remote_data = json.loads(file_entry["content"])
                merged = _merge_lockout_records(local_data, remote_data)
                # 刷回本地文件持久化
                try:
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    with open(local_path, "w", encoding="utf-8") as f:
                        json.dump(merged, f, indent=2)
                except Exception:
                    pass
                return merged
    except Exception as e:
        logger.warning(f"Failed to fetch lockouts from Gist: {e}")

    return local_data


def push_to_gist_sync(data: Dict[str, Any]) -> bool:
    """同步推送到 GitHub Secret Gist（带读-合并-写防覆盖保护）"""
    gist_id, pat = _get_gist_config()
    if not pat or not gist_id:
        return False

    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Proj-PBI-API-GistStore",
    }

    # 获取远端最新数据执行合并，防止覆盖并发客户端更新
    payload_data = copy.deepcopy(data)
    try:
        resp_get = requests.get(f"https://api.github.com/gists/{gist_id}", headers=headers, timeout=3.5)
        if resp_get.status_code == 200:
            remote_files = resp_get.json().get("files", {})
            file_entry = remote_files.get(GIST_FILE_NAME)
            if file_entry and "content" in file_entry:
                remote_data = json.loads(file_entry["content"])
                payload_data = _merge_lockout_records(payload_data, remote_data)
    except Exception as e:
        logger.debug(f"Pre-push fetch skipped: {e}")

    payload = {
        "files": {
            GIST_FILE_NAME: {
                "content": json.dumps(payload_data, indent=2)
            }
        }
    }
    try:
        resp = requests.patch(f"https://api.github.com/gists/{gist_id}", headers=headers, json=payload, timeout=4.0)
        return resp.status_code == 200
    except Exception as e:
        logger.warning(f"Failed to push lockouts to Gist: {e}")
        return False


async def async_push_to_gist(data: Dict[str, Any], force: bool = False) -> None:
    """非阻塞异步推送到 Gist (带节流控制与强同步排队防丢机制)"""
    global _LAST_SYNC_TIME, _IS_SYNCING, _PENDING_FORCE_DATA
    now = time.time()
    snapshot = copy.deepcopy(data)

    if not force and (now - _LAST_SYNC_TIME < 120):
        return

    if _IS_SYNCING:
        # 若已有同步在进行，强同步任务绝不丢弃，挂起待当前同步完成后自动补发
        if force:
            _PENDING_FORCE_DATA = snapshot
        return

    _IS_SYNCING = True
    _LAST_SYNC_TIME = now

    def _worker(payload: Dict[str, Any]):
        global _IS_SYNCING, _PENDING_FORCE_DATA
        try:
            push_to_gist_sync(payload)
        finally:
            _IS_SYNCING = False
            # 检查是否有在同步期间到达的强同步数据需要补发
            pending = _PENDING_FORCE_DATA
            if pending is not None:
                _PENDING_FORCE_DATA = None
                _IS_SYNCING = True
                try:
                    push_to_gist_sync(pending)
                finally:
                    _IS_SYNCING = False

    await asyncio.to_thread(_worker, snapshot)
